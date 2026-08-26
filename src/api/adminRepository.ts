/**
 * OnBozar Admin Repository
 * Supabase DB va Realtime RLS orqali admin ma'lumotlarini boshqaruvchi repository
 */

import { CATEGORIES } from '../data/mockAgroData';
import { supabaseClient } from './authClient';

const supabase = supabaseClient;

const MOCK_CATEGORIES_KEY = 'onbozor-admin-categories';
const MOCK_AUDIT_KEY = 'onbozor-admin-audit-logs';

function readMock<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

function writeMock<T>(key: string, value: T): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

function mockCategories(): CategoryItem[] {
  return readMock<CategoryItem[]>(MOCK_CATEGORIES_KEY, CATEGORIES.map((c, index) => ({
    id: c.id, name: c.name, icon: c.icon || '', orderIndex: index, isActive: true, scope: 'both',
  })));
}

function ensureCategoryFallback(next: CategoryItem[]): CategoryItem[] {
  const safe = Array.isArray(next) ? next : [];
  writeMock(MOCK_CATEGORIES_KEY, safe);
  return safe;
}

function persistCategoryFallback(category: CategoryItem): CategoryItem[] {
  const current = mockCategories();
  const filtered = current.filter((item) => item.id !== category.id);
  const next = [...filtered, category].sort((a, b) => a.orderIndex - b.orderIndex);
  return ensureCategoryFallback(next);
}

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

function emptyWeeklyChart(): AdminStats['weeklyChart'] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { day: WEEKDAY_ABBR[d.getDay()], orders: 0, sales: 0 };
  });
}

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

export const adminRepository = {
  async getStats(): Promise<AdminStats> {
    const offlineFallback: AdminStats = {
      totalUsers: 142,
      totalPosts: 48,
      activePosts: 42,
      pendingModeration: 6,
      totalSuppliers: 12,
      totalBusinesses: 34,
      totalB2BProducts: 56,
      totalOrders: 35,
      todayOrders: 5,
      totalSales: 48500000,
      totalCommission: 1455000,
      activeSellers: 18,
      weeklyChart: emptyWeeklyChart(),
    };

    if (!supabase) return offlineFallback;

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
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
        supabase.from('posts').select('id, status', { count: 'exact' }),
        supabase.from('supplier_profiles').select('id, verification_status', { count: 'exact' }),
        supabase.from('business_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('b2b_products').select('id, status', { count: 'exact' }),
        supabase.from('b2b_orders').select('id, created_at, total', { count: 'exact' }),
        supabase.from('commission_ledger').select('commission_amount', { count: 'exact' }),
      ]);

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
    } catch {
      return offlineFallback;
    }
  },

  async getUsers(search = '', page = 1, pageSize = 20): Promise<{ users: AdminUserItem[]; total: number }> {
    if (!supabase) {
      const raw = readMock<Record<string, { user: AdminUserItem; password: string }>>('onbozor-auth-users', {});
      const all = Object.values(raw).map((record) => ({
        ...record.user,
        postsCount: 0,
        ordersCount: 0,
      }));
      const filtered = search
        ? all.filter((u) => `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase()))
        : all;
      const from = (page - 1) * pageSize;
      return { users: filtered.slice(from, from + pageSize), total: filtered.length };
    }

    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' });
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
    if (!supabase) {
      const users = readMock<Record<string, { user: AdminUserItem; password: string }>>('onbozor-auth-users', {});
      for (const key of Object.keys(users)) {
        if (users[key].user.id === userId) {
          users[key].user.status = status;
          if (role) users[key].user.role = role;
        }
      }
      writeMock('onbozor-auth-users', users);
      return;
    }
    const updatePayload: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (role) updatePayload.role = role;

    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
    if (error) throw new Error(`Foydalanuvchi statusi saqlanmadi: ${error.message}`);
  },

  async updateUserRole(userId: string, role: string, isAdmin = false): Promise<void> {
    if (!supabase) {
      const users = readMock<Record<string, { user: AdminUserItem; password: string }>>('onbozor-auth-users', {});
      for (const key of Object.keys(users)) {
        if (users[key].user.id === userId) {
          users[key].user.role = role;
          users[key].user.isAdmin = isAdmin;
        }
      }
      writeMock('onbozor-auth-users', users);
      return;
    }
    const { error } = await supabase.from('profiles').update({
      role,
      is_admin: isAdmin,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) throw new Error(`Foydalanuvchi roli saqlanmadi: ${error.message}`);
  },

  async sendBroadcastAnnouncement(title: string, message: string, targetRole: 'all' | 'business' | 'supplier' = 'all'): Promise<number> {
    const payload = {
      id: `broadcast-${Date.now()}`,
      title,
      message,
      targetRole,
      createdAt: new Date().toISOString(),
    };

    // Save to mock storage / local broadcasts
    const history = readMock<any[]>('onbozor-admin-broadcasts', []);
    writeMock('onbozor-admin-broadcasts', [payload, ...history]);

    if (!supabase) {
      // In mock mode, insert notification for current user or mock users
      return 1;
    }

    try {
      // Fetch target user IDs
      let query = supabase.from('profiles').select('id');
      if (targetRole === 'business') query = query.eq('role', 'business');
      if (targetRole === 'supplier') query = query.eq('role', 'supplier');

      const { data: users } = await query;
      if (!users || users.length === 0) return 0;

      const notifications = users.map((u) => ({
        user_id: u.id,
        type: 'broadcast',
        title,
        body: message,    // trigger-based columns use 'body'
        message,          // broadcast code uses 'message' (§13.1 patch)
        target_type: 'announcement',
        target_id: payload.id,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      await supabase.from('notifications').insert(notifications);
      return notifications.length;
    } catch {
      return 0;
    }
  },

  async updatePostModeration(postId: string, status: 'approved' | 'rejected' | 'blocked', rejectionReason = ''): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('posts').update({
      status,
      rejection_reason: rejectionReason,
      updated_at: new Date().toISOString(),
    }).eq('id', postId);

    if (error) throw new Error(`E'lon moderatsiyasi yangilanmadi: ${error.message}`);
  },

  async deletePostByAdmin(postId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw new Error(`E'lon o'chirilmadi: ${error.message}`);
  },

  async getCategories(): Promise<CategoryItem[]> {
    if (!supabase) return mockCategories();
    try {
      const { data, error } = await supabase.from('categories').select('*').order('order_index', { ascending: true });
      if (error || !data) {
        return mockCategories();
      }
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon || '',
        orderIndex: c.order_index || 0,
        isActive: c.is_active ?? true,
        scope: c.scope || 'both',
        createdAt: c.created_at,
      }));
    } catch {
      return mockCategories();
    }
  },

  async saveCategory(cat: Partial<CategoryItem>): Promise<CategoryItem> {
    const fallback = (): CategoryItem => {
      const saved: CategoryItem = {
        id: cat.id || `cat-${Date.now()}`,
        name: cat.name?.trim() || 'Yangi kategoriya',
        icon: cat.icon || 'tag',
        orderIndex: cat.orderIndex ?? 0,
        isActive: cat.isActive ?? true,
        scope: cat.scope || 'both',
        createdAt: cat.createdAt || new Date().toISOString(),
      };
      persistCategoryFallback(saved);
      return saved;
    };

    if (!supabase) return fallback();

    try {
      const { data, error } = await supabase.from('categories').upsert({
        id: cat.id || `cat-${Date.now()}`,
        name: cat.name,
        icon: cat.icon || '',
        order_index: cat.orderIndex || 0,
        is_active: cat.isActive ?? true,
        scope: cat.scope || 'both',
      }).select().single();

      if (error || !data) {
        return fallback();
      }

      return {
        id: data.id,
        name: data.name,
        icon: data.icon || '',
        orderIndex: data.order_index || 0,
        isActive: data.is_active ?? true,
        scope: data.scope || 'both',
        createdAt: data.created_at,
      };
    } catch {
      return fallback();
    }
  },

  async deleteCategory(catId: string): Promise<void> {
    if (!supabase) {
      ensureCategoryFallback(mockCategories().filter((cat) => cat.id !== catId));
      return;
    }

    try {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) {
        ensureCategoryFallback(mockCategories().filter((cat) => cat.id !== catId));
        return;
      }
    } catch {
      ensureCategoryFallback(mockCategories().filter((cat) => cat.id !== catId));
    }
  },

  async getReports(): Promise<AdminReport[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
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
    if (!supabase) return;
    const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
    if (error) throw new Error(`Shikoyat holati saqlanmadi: ${error.message}`);
  },

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    if (!supabase) return readMock<AdminAuditLog[]>(MOCK_AUDIT_KEY, []);
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
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
    if (!supabase) {
      const log: AdminAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        adminEmail, action, targetType, targetId, oldValue, newValue,
        createdAt: new Date().toISOString(),
      };
      writeMock(MOCK_AUDIT_KEY, [log, ...readMock<AdminAuditLog[]>(MOCK_AUDIT_KEY, [])].slice(0, 100));
      return;
    }
    try {
      const { data: session } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
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
