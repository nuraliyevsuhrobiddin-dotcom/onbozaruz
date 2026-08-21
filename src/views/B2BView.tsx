import React from 'react';
import { useAgroStore } from '../store/useAgroStore';
import { B2BHomeView } from '../components/b2b/B2BHomeView';
import { B2BProductsListView } from '../components/b2b/B2BProductsListView';
import { B2BProductDetailView } from '../components/b2b/B2BProductDetailView';
import { B2BSuppliersListView } from '../components/b2b/B2BSuppliersListView';
import { B2BSupplierDetailView } from '../components/b2b/B2BSupplierDetailView';
import { B2BCartView } from '../components/b2b/B2BCartView';
import { B2BCheckoutView } from '../components/b2b/B2BCheckoutView';
import { B2BOrdersListView } from '../components/b2b/B2BOrdersListView';
import { B2BOrderDetailView } from '../components/b2b/B2BOrderDetailView';
import { B2BSupplierDashboardView } from '../components/b2b/B2BSupplierDashboardView';
import { B2BBusinessRegisterForm } from '../components/b2b/B2BBusinessRegisterForm';
import { B2BContractView } from '../components/b2b/B2BContractView';
import { B2BFinanceView } from '../components/b2b/B2BFinanceView';
import { B2BStoresMapView } from '../components/b2b/B2BStoresMapView';
import { B2BOffersView } from '../components/b2b/B2BOffersView';

/**
 * B2B (ulgurji savdo) bo'limining ichki router qatlami. Ilova React
 * Router ishlatmagani uchun bu yerda AdminView'ning renderTab() naqshi
 * takrorlanadi, faqat mahalliy holat o'rniga global `b2bRoute`dan
 * (useAgroStore) foydalaniladi — shu orqali #market/product/abc123 kabi
 * ichki sahifalar orqaga tugmasi bilan ham to'g'ri ishlaydi.
 */
export const B2BView: React.FC = () => {
  const { b2bRoute } = useAgroStore();

  switch (b2bRoute.view) {
    case 'product':
      return <B2BProductDetailView productId={b2bRoute.id} />;
    case 'supplier':
      return <B2BSupplierDetailView supplierId={b2bRoute.id} />;
    case 'order':
      return <B2BOrderDetailView orderId={b2bRoute.id} />;
    case 'products':
      return <B2BProductsListView />;
    case 'suppliers':
      return <B2BSuppliersListView />;
    case 'cart':
      return <B2BCartView />;
    case 'checkout':
      return <B2BCheckoutView />;
    case 'orders':
      return <B2BOrdersListView />;
    case 'dashboard':
      return <B2BSupplierDashboardView />;
    case 'business':
      return <B2BBusinessRegisterForm />;
    case 'contracts':
      return <B2BContractView />;
    case 'finance':
      return <B2BFinanceView />;
    case 'map':
      return <B2BStoresMapView />;
    case 'offers':
      return <B2BOffersView />;
    case 'home':
    default:
      return <B2BHomeView />;
  }
};
