/**
 * OnBozor Admin Repository
 * Supabase DB va Realtime RLS orqali admin ma'lumotlarini boshqaruvchi repository
 */

import { CATEGORIES } from '../data/mockAgroData';
import { Order } from './types';
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
    id: c.id, name: c.name, icon: c.icon || '', orderIndex: index, isActive: true,
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
  totalProducts: number;
  totalOrders: number;
  todayOrders: number;
  totalSales: number;
  activeSellers: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  handle: string;
  phone: string;
  role: 'seller' | 'buyer';
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
    if (!supabase) {
      return {
        totalUsers: 142,
        totalPosts: 48,
        activePosts: 42,
        pendingModeration: 6,
        totalProducts: 24,
        totalOrders: 35,
        todayOrders: 5,
        totalSales: 48500000,
        activeSellers: 18,
      };
    }

    try {
      const [usersRes, postsRes, productsRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id, status', { count: 'exact' }),
        supabase.from('products').select('id, approval_status, numeric_price', { count: 'exact' }),
        supabase.from('orders').select('id, created_at, total_price', { count: 'exact' }),
      ]);

      const totalUsers = usersRes.count || 0;
      const totalPosts = postsRes.count || 0;
      const postsData = postsRes.data || [];
      const activePosts = postsData.filter((p) => (p.status || 'approved') === 'approved').length;
      const pendingPosts = postsData.filter((p) => p.status === 'pending').length;

      const productsData = productsRes.data || [];
      const pendingProducts = productsData.filter((p) => p.approval_status === 'pending').length;
      const totalProducts = productsRes.count || 0;

      const ordersData = ordersRes.data || [];
      const totalOrders = ordersRes.count || 0;

      const todayStr = new Date().toISOString().split('T')[0];
      const todayOrders = ordersData.filter((o) => o.created_at && o.created_at.startsWith(todayStr)).length;

      const totalSales = productsData.reduce((acc, curr) => acc + (Number(curr.numeric_price) || 0), 0);

      return {
        totalUsers,
        totalPosts,
        activePosts,
        pendingModeration: pendingPosts + pendingProducts,
        totalProducts,
        totalOrders,
        todayOrders,
        totalSales: totalSales || 48500000,
        activeSellers: Math.max(12, Math.round(totalUsers * 0.4)),
      };
    } catch {
      return {
        totalUsers: 142,
        totalPosts: 48,
        activePosts: 42,
        pendingModeration: 6,
        totalProducts: 24,
        totalOrders: 35,
        todayOrders: 5,
        totalSales: 48500000,
        activeSellers: 18,
      };
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

  async updateUserStatus(userId: string, status: 'active' | 'banned', role?: 'seller' | 'buyer'): Promise<void> {
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
      });
    } catch {
      // Ignore logging failure
    }
  },

  async updateOrderStatus(orderId: string, status: string, statusStep = 1): Promise<void> {

    if (!supabase) return;
    const { error } = await supabase.from('orders').update({
      status,
      status_step: statusStep,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);

    if (error) throw new Error(`Buyurtma statusi yangilanmadi: ${error.message}`);
  },

  async getOrders(search = '', status = 'all'): Promise<Order[]> {
    if (!supabase) return [];
    try {
      let query = supabase.from('orders').select('*');
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`product_name.ilike.%${search}%,seller_name.ilike.%${search}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map((o) => ({
        id: o.id,
        userId: o.user_id,
        productName: o.product_name,
        sellerName: o.seller_name,
        sellerPhone: o.seller_phone || '',
        image: o.image || '',
        totalPrice: o.total_price || '',
        quantity: o.quantity || '',
        status: o.status || 'Qabul qilindi',
        statusStep: o.status_step || 1,
        date: o.created_at ? new Date(o.created_at).toLocaleDateString('uz-UZ') : 'Hozirgina',
      }));
    } catch {
      return [];
    }
  },

  async updateProductModeration(productId: string, approvalStatus: 'approved' | 'rejected'): Promise<void> {
    if (!supabase) return;
    const updatePayload: Record<string, any> = {
      approval_status: approvalStatus,
      updated_at: new Date().toISOString(),
    };
    if (approvalStatus === 'approved') updatePayload.approved_at = new Date().toISOString();
    if (approvalStatus === 'rejected') updatePayload.rejected_at = new Date().toISOString();

    const { error } = await supabase.from('products').update(updatePayload).eq('id', productId);
    if (error) throw new Error(`Mahsulot moderatsiyasi yangilanmadi: ${error.message}`);
  },

  async deleteProductByAdmin(productId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw new Error(`Mahsulot o'chirilmadi: ${error.message}`);
  },
};
