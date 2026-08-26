import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, Phone, Loader2, Package } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BProduct, SupplierProfile } from '../../api/types';
import { B2BProductCard } from './B2BProductCard';

const SUPPLIER_TYPE_LABEL: Record<string, string> = {
  manufacturer: 'Ishlab chiqaruvchi',
  importer: 'Importyor',
  distributor: 'Distributor',
  supplier: 'Yetkazib beruvchi',
};

const TYPE_COLORS: Record<string, string> = {
  manufacturer: 'text-blue-700 bg-blue-50 border-blue-200',
  importer: 'text-violet-700 bg-violet-50 border-violet-200',
  distributor: 'text-amber-700 bg-amber-50 border-amber-200',
  supplier: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

interface Props {
  supplierId: string;
}

export const B2BSupplierDetailView: React.FC<Props> = ({ supplierId }) => {
  const { setB2BRoute } = useAgroStore();
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([b2bRepository.getSupplier(supplierId), b2bRepository.listOwnB2BProducts(supplierId)]).then(([sup, prods]) => {
      if (cancelled) return;
      setSupplier(sup);
      setProducts(prods.filter((p) => p.status === 'approved'));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [supplierId]);

  if (isLoading) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Yuklanmoqda...</span>
      </div>
    );
  }
  if (!supplier) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-500">Supplier topilmadi</p>
        <button onClick={() => setB2BRoute({ view: 'suppliers' })} className="text-xs font-bold text-blue-500 hover:text-blue-600">Orqaga</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-20">
      {/* Back */}
      <button
        onClick={() => setB2BRoute({ view: 'suppliers' })}
        className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
      >
        <ArrowLeft className="w-4.5 h-4.5" />
      </button>

      {/* Supplier profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="relative flex items-center gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black text-2xl shrink-0">
            {supplier.logoUrl
              ? <img src={supplier.logoUrl} alt={supplier.companyName} className="w-full h-full object-cover" />
              : supplier.companyName.charAt(0)
            }
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-lg text-slate-900 truncate">{supplier.companyName}</h1>
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-500 shrink-0" />
            </div>
            <span className={`inline-flex text-[10px] font-black px-2 py-0.5 rounded-full border mt-1 ${TYPE_COLORS[supplier.supplierType] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
              {SUPPLIER_TYPE_LABEL[supplier.supplierType]}
            </span>
          </div>
        </div>

        {supplier.description && (
          <p className="text-xs text-slate-500 leading-relaxed relative">{supplier.description}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 relative">
          {supplier.region && (
            <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <MapPin className="w-3.5 h-3.5 text-blue-500" /> {supplier.region}
            </span>
          )}
          {supplier.phone && (
            <a
              href={`tel:${supplier.phone}`}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> {supplier.phone}
            </a>
          )}
        </div>

        {/* Category tags */}
        {supplier.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 relative">
            {supplier.categories.map((c) => (
              <span key={c} className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="space-y-2.5">
        <h2 className="font-black text-sm text-slate-900 px-1 flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          Mahsulotlar
          <span className="text-xs font-bold text-slate-500">({products.length})</span>
        </h2>
        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Hozircha mahsulotlar mavjud emas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {products.map((p) => <B2BProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
};
