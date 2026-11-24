/**
 * Admin panel data access: statistics, users, moderation, categories,
 * reports, broadcasts and the audit log. Every write either reaches the server
 * or throws, so the panel never shows a change that was not saved.
 */

import { apiClient } from './authClient';
import { normalizeApiRow } from './http';
import type { Post } from './types';

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  activePosts: number;
  pendingModeration: number;
  totalSuppliers: number;
  totalBusinesses: number;
  totalB2BProducts: number;
  totalOrders: number;
  todayOrders: number;
  totalSales: number;
  totalCommission: number;
  activeSellers: number;
  /** Real orders/sales for each of the last 7 calendar days (oldest first). */
  weeklyChart: { day: string; orders: number; sales: number }[];
}

const WEEKDAY_ABBR = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']; // Date.getDay(): 0=Yakshanba..6=Shanba

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  handle: string;
  phone: string;
  role: 'seller' | 'buyer' | 'user' | 'business' | 'business_buyer' | 'supplier' | 'admin' | string;
  isAdmin: boolean;
  status: 'active' | 'banned';
  createdAt: string;
  postsCount: number;
  ordersCount: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  orderIndex: number;
  isActive: boolean;
  /** Which area this category appears in. Missing/undefined is treated as 'both'. */
  scope?: 'post' | 'market' | 'both';
  createdAt?: string;
}

export interface AdminReport {
  id: string;
  reporterId?: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
}

export interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  targetRole: 'all' | 'business' | 'supplier';
  sentCount: number;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId?: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
}

function mapCategory(c: any): CategoryItem {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon || '',
    orderIndex: c.order_index || 0,
    isActive: c.is_active ?? true,
    scope: c.scope || 'both',
    createdAt: c.created_at,
  };
}

export const adminRepository = {
  // Moderation must include all statuses, independent of feed location and expiry.
  async getPosts(): Promise<Post[]> {
    const posts: Post[] = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await apiClient.from('posts').select('*')
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`E'lonlar yuklanmadi: ${error.message}`);
      posts.push(...normalizeApiRow<Post[]>(data || []));
      if (!data || data.length < pageSize) return posts;
    }
  },

  async getStats(): Promise<AdminStats> {
    try {
      const [
        usersRes,
        sellersRes,
        postsRes,
        suppliersRes,
        businessesRes,
        b2bProductsRes,
        b2bOrdersRes,
        ledgerRes,
      ] = await Promise.all([
        apiClient.from('profiles').select('id', { count: 'exact', head: true }),
        apiClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
        apiClient.from('posts').select('id, status', { count: 'exact' }),
        apiClient.from('supplier_profiles').select('id, verification_status', { count: 'exact' }),
        apiClient.from('business_profiles').select('id', { count: 'exact', head: true }),
        apiClient.from('b2b_products').select('id, status', { count: 'exact' }),
        apiClient.from('b2b_orders').select('id, created_at, total', { count: 'exact' }),
        apiClient.from('commission_ledger').select('commission_amount', { count: 'exact' }),
      ]);
      for (const result of [usersRes, sellersRes, postsRes, suppliersRes, businessesRes, b2bProductsRes, b2bOrdersRes, ledgerRes]) {
        if (result.error) throw result.error;
      }

      const totalUsers = usersRes.count || 0;
      const activeSellers = sellersRes.count || 0;
      const totalPosts = postsRes.count || 0;
      const postsData = postsRes.data || [];
      const activePosts = postsData.filter((p) => (p.status || 'approved') === 'approved').length;
      const pendingPosts = postsData.filter((p) => p.status === 'pending').length;

      const suppliersData = suppliersRes.data || [];
      const totalSuppliers = suppliersRes.count || 0;
      const pendingSuppliers = suppliersData.filter((s) => s.verification_status === 'pending').length;

      const totalBusinesses = businessesRes.count || 0;

      const b2bProductsData = b2bProductsRes.data || [];
      const totalB2BProducts = b2bProductsRes.count || 0;
      const pendingB2BProducts = b2bProductsData.filter((p) => p.status === 'pending').length;

      const ordersData = b2bOrdersRes.data || [];
      const totalOrders = b2bOrdersRes.count || 0;

      const todayStr = new Date().toISOString().split('T')[0];
      const todayOrders = ordersData.filter((o) => o.created_at && o.created_at.startsWith(todayStr)).length;
      const totalSales = ordersData.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

      const ledgerData = ledgerRes.data || [];
      const totalCommission = ledgerData.reduce((acc, l) => acc + (Number(l.commission_amount) || 0), 0);

      const weeklyChart = WEEKDAY_ABBR.map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toISOString().split('T')[0];
        const dayOrders = ordersData.filter((o) => o.created_at && o.created_at.startsWith(dayStr));
        return {
          day: WEEKDAY_ABBR[d.getDay()],
          orders: dayOrders.length,
          sales: dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        };
      });

      return {
        totalUsers,
        totalPosts,
        activePosts,
        pendingModeration: pendingPosts + pendingSuppliers + pendingB2BProducts,
        totalSuppliers,
        totalBusinesses,
        totalB2BProducts,
        totalOrders,
        todayOrders,
        totalSales,
        totalCommission,
        activeSellers,
        weeklyChart,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Statistikani yuklab bo‘lmadi');
    }
  },

  async getUsers(search = '', page = 1, pageSize = 20): Promise<{ users: AdminUserItem[]; total: number }> {
    try {
      let query = apiClient.from('profiles').select('*', { count: 'exact' });
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);

      if (error || !data) return { users: [], total: 0 };

      const users: AdminUserItem[] = data.map((u) => ({
        id: u.id,
        email: u.email || '',
        name: u.name || 'Foydalanuvchi',
        handle: u.handle || '',
        phone: u.phone || '',
        role: u.role || 'seller',
        isAdmin: Boolean(u.is_admin),
        status: u.status || 'active',
        createdAt: u.created_at || new Date().toISOString(),
        postsCount: 0,
        ordersCount: 0,
      }));

      return { users, total: count || users.length };
    } catch {
      return { users: [], total: 0 };
    }
  },

  async updateUserStatus(userId: string, status: 'active' | 'banned', role?: string): Promise<void> {
    const updatePayload: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (role) updatePayload.role = role;

    const { error } = await apiClient.from('profiles').update(updatePayload).eq('id', userId);
    if (error) throw new Error(`Foydalanuvchi statusi saqlanmadi: ${error.message}`);
  },

  async updateUserRole(userId: string, role: string, isAdmin = false): Promise<void> {
    const { error } = await apiClient.from('profiles').update({
      role,
      is_admin: isAdmin,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) throw new Error(`Foydalanuvchi roli saqlanmadi: ${error.message}`);
  },

  async sendBroadcastAnnouncement(title: string, message: string, targetRole: 'all' | 'business' | 'supplier' = 'all'): Promise<number> {
    let query = apiClient.from('profiles').select('id');
    if (targetRole === 'business') query = query.in('role', ['business', 'business_buyer']);
    if (targetRole === 'supplier') query = query.eq('role', 'supplier');
    const { data: users, error: usersError } = await query;
    if (usersError) throw new Error(usersError.message);
    if (!users?.length) return 0;
    const notifications = users.map(u => ({
      user_id: u.id, type: 'broadcast', title, body: message,
      target_type: 'announcement', target_id: '', is_read: false,
    }));
    const { error } = await apiClient.from('notifications').insert(notifications);
    if (error) throw new Error(`Xabarnoma yuborilmadi: ${error.message}`);

    // The notifications are already delivered; a failed history row must not report the send as failed.
    const { data: session } = await apiClient.auth.getUser();
    const { error: historyError } = await apiClient.from('broadcast_announcements').insert({
      admin_id: session?.user?.id || null,
      title,
      message,
      target_role: targetRole,
      sent_count: notifications.length,
    });
    if (historyError) console.warn('[admin] broadcast history not saved:', historyError.message);
    return notifications.length;
  },

  async getBroadcastHistory(): Promise<BroadcastItem[]> {
    const { data, error } = await apiClient.from('broadcast_announcements').select('*')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return (data || []).map((b) => ({
      id: b.id,
      title: b.title,
      message: b.message || '',
      targetRole: b.target_role || 'all',
      sentCount: Number(b.sent_count) || 0,
      createdAt: b.created_at,
    }));
  },

  async updatePostModeration(postId: string, status: 'approved' | 'rejected' | 'blocked', rejectionReason = ''): Promise<void> {
    const { data, error } = await apiClient.from('posts').update({
      status,
      rejection_reason: rejectionReason,
      updated_at: new Date().toISOString(),
    }).eq('id', postId).select('id, status').single();

    if (error) throw new Error(`E'lon moderatsiyasi yangilanmadi: ${error.message}`);
    if (!data || data.status !== status) throw new Error("E'lon holati saqlanmadi. Admin huquqlarini tekshiring.");
  },

  async deletePostByAdmin(postId: string): Promise<void> {
    const { error } = await apiClient.from('posts').delete().eq('id', postId).select('id').single();
    if (error) throw new Error(`E'lon o'chirilmadi: ${error.message}`);
  },

  async getCategories(): Promise<CategoryItem[]> {
    const { data, error } = await apiClient.from('categories').select('*').order('order_index', { ascending: true });
    if (error) throw new Error(`Kategoriyalar yuklanmadi: ${error.message}`);
    return (data || []).map(mapCategory);
  },

  async saveCategory(cat: Partial<CategoryItem>): Promise<CategoryItem> {
    const { data, error } = await apiClient.from('categories').upsert({
      id: cat.id || `cat-${Date.now()}`,
      name: cat.name,
      icon: cat.icon || '',
      order_index: cat.orderIndex || 0,
      is_active: cat.isActive ?? true,
      scope: cat.scope || 'both',
    }).select().single();
    if (error || !data) throw new Error(`Kategoriya saqlanmadi: ${error?.message || "server javob bermadi"}`);
    return mapCategory(data);
  },

  async deleteCategory(catId: string): Promise<void> {
    const { error } = await apiClient.from('categories').delete().eq('id', catId);
    if (error) throw new Error(`Kategoriya o'chirilmadi: ${error.message}`);
  },

  async getReports(): Promise<AdminReport[]> {
    try {
      const { data, error } = await apiClient.from('reports').select('*').order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map((r) => ({
        id: r.id,
        reporterId: r.reporter_id,
        targetType: r.target_type,
        targetId: r.target_id,
        reason: r.reason,
        details: r.details || '',
        status: r.status || 'pending',
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  async updateReportStatus(reportId: string, status: 'pending' | 'resolved' | 'rejected'): Promise<void> {
    const { error } = await apiClient.from('reports').update({ status }).eq('id', reportId);
    if (error) throw new Error(`Shikoyat holati saqlanmadi: ${error.message}`);
  },

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    try {
      const { data, error } = await apiClient.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error || !data) return [];
      return data.map((l) => ({
        id: l.id,
        adminId: l.admin_id,
        adminEmail: l.admin_email,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        oldValue: l.old_value,
        newValue: l.new_value,
        createdAt: l.created_at,
      }));
    } catch {
      return [];
    }
  },

  async logAdminAction(adminEmail: string, action: string, targetType: string, targetId: string, oldValue?: any, newValue?: any): Promise<void> {
    try {
      const { data: session } = await apiClient.auth.getUser();
      await apiClient.from('audit_logs').insert({
        admin_id: session?.user?.id || null,
        admin_email: adminEmail,
        action,
        target_type: targetType,
        target_id: targetId,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
      });
    } catch {
      // Ignore logging failure
    }
  },

};
