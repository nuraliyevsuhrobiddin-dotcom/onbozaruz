/**
 * Utility for exporting data to CSV / Excel compatible formats with UTF-8 BOM.
 */

export function downloadCSV(filename: string, csvContent: string): void {
  // UTF-8 BOM for Excel to properly render non-ASCII (Uzbek Latin/Cyrillic) characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportOrdersToCSV(orders: any[], filename = 'onbozar-buyurtmalar'): void {
  const headers = [
    'Buyurtma raqami',
    'Sana',
    'Xaridor do\'kon',
    'Xaridor telefoni',
    'Ishlab chiqaruvchi',
    'Holati',
    'Mahsulotlar soni',
    'Jami summa (so\'m)',
    'Komissiya stavkasi (%)',
    'Komissiya summasi (so\'m)',
    'Yetkazish manzili',
  ];

  const rows = orders.map((o) => [
    escapeCSV(o.orderNumber),
    escapeCSV(new Date(o.createdAt).toLocaleDateString('uz-UZ')),
    escapeCSV(o.businessName || o.deliveryStoreName || '-'),
    escapeCSV(o.deliveryPhone || '-'),
    escapeCSV(o.supplierName || '-'),
    escapeCSV(o.status),
    escapeCSV((o.items || []).length),
    escapeCSV(o.total || 0),
    escapeCSV(o.commissionRate || 0),
    escapeCSV(o.commissionAmount || 0),
    escapeCSV([o.deliveryRegion, o.deliveryDistrict, o.deliveryAddress].filter(Boolean).join(', ') || '-'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCSV(`${filename}-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
}

export function exportUsersToCSV(users: any[], filename = 'onbozar-foydalanuvchilar'): void {
  const headers = [
    'ID',
    'Ism / Do\'kon',
    'Email',
    'Telefon',
    'Roli',
    'Holati',
    'Viloyat',
    'Ro\'yxatdan o\'tgan sana',
  ];

  const rows = users.map((u) => [
    escapeCSV(u.id),
    escapeCSV(u.name || u.businessName || '-'),
    escapeCSV(u.email || '-'),
    escapeCSV(u.phone || '-'),
    escapeCSV(u.role || 'user'),
    escapeCSV(u.status || 'active'),
    escapeCSV(u.location || '-'),
    escapeCSV(u.createdAt ? new Date(u.createdAt).toLocaleDateString('uz-UZ') : '-'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCSV(`${filename}-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
}
