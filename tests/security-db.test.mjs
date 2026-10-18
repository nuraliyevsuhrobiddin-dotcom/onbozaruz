// PGLITE_MODULE=file:///.../@electric-sql/pglite/dist/index.js
// node --test --test-isolation=none tests/security-db.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Security migration enforces permissions in PostgreSQL', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA cron;
      GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
      CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
      CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON storage.objects TO authenticated;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1, '/') $$;
      CREATE TABLE cron.job(jobname text);
      CREATE FUNCTION cron.unschedule(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
      CREATE PUBLICATION supabase_realtime;
    `);
    const schema = (await readFile(new URL('../supabase_schema.sql', import.meta.url), 'utf8'))
      .replace(/CREATE EXTENSION IF NOT EXISTS[^;]+;/g, '');
    const migration = await readFile(new URL('../supabase/migrations/202610180002_security_hardening.sql', import.meta.url), 'utf8');
    const [baseline, freshHardening] = schema.split('-- Security hardening (202610180002). Keep in sync with the migration.');
    assert.equal(freshHardening.trim(), migration.trim(), 'Fresh and upgrade SQL must match');
    await db.exec(baseline);
    // Exercise upgrading the old schema and applying the migration twice.
    await db.exec(migration);
    await db.exec(migration);
    const user = '11111111-1111-4111-8111-111111111111';
    const other = '22222222-2222-4222-8222-222222222222';
    await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ('${user}','user@test.invalid',now()),('${other}','other@test.invalid',now());`);
    const asRole = async (role, id = '') => {
      await db.exec(`RESET ROLE; SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${id}',false), set_config('request.jwt.claim.role','${role}',false);`);
    };
    const rows = async sql => (await db.query(sql)).rows;
    const rejected = async sql => assert.rejects(db.exec(sql), /permission denied|row-level security|Akkaunt faol emas/i);
    await asRole('authenticated', user);
    await db.exec('UPDATE public.profiles SET is_admin = true;');
    assert.equal((await rows('SELECT public.is_admin() AS admin'))[0].admin, false);
    await rejected(`DELETE FROM public.profiles WHERE id='${user}'`);

    // Missing-profile repair cannot inject admin rights or spoof another email.
    await asRole('postgres');
    await db.exec(`DELETE FROM public.profiles WHERE id='${other}'`);
    await asRole('authenticated', other);
    await db.exec(`INSERT INTO public.profiles(id,email,is_admin,status) VALUES('${other}','spoof@test.invalid',true,'banned')`);
    assert.deepEqual((await rows(`SELECT email,is_admin,status FROM public.profiles WHERE id='${other}'`))[0],
      { email: 'other@test.invalid', is_admin: false, status: 'active' });

    await asRole('postgres');
    await db.exec(`INSERT INTO public.posts(user_id,seller_name,location,phone,telegram,title,category,category_name,price,type,media_url,status)
      VALUES('${user}','Seller','City','+998901234567','secret_contact','Approved','fruit','Fruit','100','image','https://test.invalid/a.jpg','approved'),
      ('${user}','Seller','City','+998901234567','secret_contact','Pending','fruit','Fruit','100','image','https://test.invalid/b.jpg','pending');`);
    // Moderation normally forces pending, so approve through the trusted admin.
    await db.exec(`UPDATE public.profiles SET is_admin=true WHERE id='${user}';`);
    await asRole('authenticated', user);
    await db.exec(`UPDATE public.posts SET status='approved' WHERE title='Approved'`);
    assert.equal((await rows(`SELECT phone FROM public.posts WHERE title='Approved'`))[0].phone, '+998901234567');
    await asRole('anon');
    await rejected('SELECT phone FROM public.posts');
    const publicPosts = await rows('SELECT title,phone,telegram FROM public.posts_public');
    assert.deepEqual(publicPosts, [{ title: 'Approved', phone: '', telegram: '' }]);
    const nearby = await rows('SELECT title,phone,telegram FROM public.nearby_posts(41,69)');
    assert.deepEqual(nearby, publicPosts);
    await rejected(`SELECT public.claim_welcome_email('${user}')`);

    await asRole('service_role');
    const claims = await Promise.all(Array.from({ length: 8 }, () => rows(`SELECT public.claim_welcome_email('${user}') AS ok`)));
    assert.equal(claims.filter(result => result[0].ok).length, 1);
    await asRole('postgres');
    await db.exec(`UPDATE public.profiles SET status='banned' WHERE id='${user}'`);
    await asRole('authenticated', user);
    assert.equal((await rows('SELECT public.is_admin() AS admin'))[0].admin, false);
    assert.equal((await rows('SELECT * FROM public.posts')).length, 0);
    assert.equal((await rows('SELECT * FROM public.posts_public')).length, 0);
    assert.equal((await rows('SELECT * FROM public.nearby_posts(41,69)')).length, 0);
    assert.equal((await rows('SELECT status FROM public.profiles'))[0].status, 'banned');
    assert.equal((await rows(`UPDATE public.profiles SET status='active' WHERE id='${user}' RETURNING *`)).length, 0);
    await rejected(`INSERT INTO public.comments(post_id,user_id,user_name,user_avatar,content)
      VALUES(gen_random_uuid(),'${user}','User','','Blocked')`);
    await rejected(`SELECT public.create_agro_request('{}')`);
    await rejected(`SELECT public.respond_agro_offer(gen_random_uuid(),'accept',1)`);
    await rejected(`SELECT public.request_cashback_withdrawal(gen_random_uuid(),1,'card')`);
    await db.exec(`SELECT public.increment_post_views((SELECT id FROM public.posts_public LIMIT 1))`);
  } finally {
    await db.close();
  }
});
