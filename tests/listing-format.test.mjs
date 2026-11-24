// node --experimental-vm-modules --test tests/listing-format.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

async function load(file) {
  const source = stripTypeScriptTypes(await readFile(new URL(`../src/utils/${file}`, import.meta.url), 'utf8'));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const { formatPrice, hasPriceAmount, priceUnitOf, PRICE_UNITS } = await load('price.ts');
const { regionFromPlace, regionFromIsoCode } = await load('region.ts');

test('ISO region codes from the map service map to our regions', () => {
  assert.equal(regionFromIsoCode('UZ-TK'), 'Toshkent sh.');
  assert.equal(regionFromIsoCode('UZ-TO'), 'Toshkent v.');
  assert.equal(regionFromIsoCode('uz-qa'), 'Qashqadaryo');
  assert.equal(regionFromIsoCode('KZ-TUR'), null);
  assert.equal(regionFromIsoCode(undefined), null);
});

test('a price saved without an amount reads as negotiable, never as a bare unit', () => {
  assert.equal(formatPrice("so'm/kg"), 'Narx kelishiladi');
  assert.equal(formatPrice("so'm / dona"), 'Narx kelishiladi');
  assert.equal(formatPrice(''), 'Narx kelishiladi');
  assert.equal(formatPrice(undefined), 'Narx kelishiladi');
  assert.equal(hasPriceAmount("so'm/kg"), false);
  assert.equal(hasPriceAmount("15,000 so'm/kg"), true);
});

test('units are shown in one spacing style', () => {
  assert.equal(formatPrice("15,000 so'm / dona"), "15,000 so'm/dona");
  assert.equal(formatPrice("  8,500   so'm/kg "), "8,500 so'm/kg");
  assert.equal(formatPrice("7,000 so'm"), "7,000 so'm");
});

test('the unit is read back from a stored price, old spacing included', () => {
  assert.equal(priceUnitOf("15,000 so'm/kg"), "so'm/kg");
  assert.equal(priceUnitOf("15,000 so'm / tonna"), "so'm/tonna");
  assert.equal(priceUnitOf("7,000 so'm"), "so'm");
  assert.equal(priceUnitOf('7,000'), null);
  assert.equal(priceUnitOf("15,000 so'm/litr"), null);
  assert.equal(PRICE_UNITS[0], "so'm");
});

test('regions are recognised in Uzbek, Russian and English, with any apostrophe', () => {
  assert.equal(regionFromPlace('Shahrisabz, Qashqadaryo viloyati'), 'Qashqadaryo');
  assert.equal(regionFromPlace('Шахрисабз, Кашкадарьинская область'), 'Qashqadaryo');
  assert.equal(regionFromPlace('Fargʻona viloyati'), "Farg'ona");
  assert.equal(regionFromPlace('Farg‘ona'), "Farg'ona");
  assert.equal(regionFromPlace('Qoraqalpogʻiston Respublikasi'), "Qoraqalpog'iston R.");
  assert.equal(regionFromPlace('Samarkand Region'), 'Samarqand');
});

test('Tashkent city and Tashkent region are told apart', () => {
  assert.equal(regionFromPlace('Toshkent'), 'Toshkent sh.');
  assert.equal(regionFromPlace('Toshkent shahri'), 'Toshkent sh.');
  assert.equal(regionFromPlace('Chirchiq, Toshkent viloyati'), 'Toshkent v.');
  assert.equal(regionFromPlace('Ташкентская область'), 'Toshkent v.');
});

test('the first name that identifies a region wins; unknown places give null', () => {
  assert.equal(regionFromPlace(undefined, '', 'Navoiy viloyati'), 'Navoiy');
  assert.equal(regionFromPlace('Mening uyim'), null);
});
