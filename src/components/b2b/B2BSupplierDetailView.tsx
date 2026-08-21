import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, Phone, Loader2 } from 'lucide-react';
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
    return <div className="w-full max-w-170 mx-auto py-16 flex justify-center"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>;
  }
  if (!supplier) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-500">Supplier topilmadi</p>
        <button onClick={() => setB2BRoute({ view: 'suppliers' })} className="text-xs font-bold text-[#DB2777]">Orqaga</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-20">
      <button onClick={() => setB2BRoute({ view: 'suppliers' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 font-black text-xl shrink-0">
            {supplier.logoUrl ? <img src={supplier.logoUrl} alt={supplier.companyName} className="w-full h-full object-cover" /> : supplier.companyName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base text-[#111827] truncate">{supplier.companyName}</h1>
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <p className="text-xs text-slate-400 font-bold">{SUPPLIER_TYPE_LABEL[supplier.supplierType]}</p>
          </div>
        </div>
        {supplier.description && <p className="text-xs text-slate-600 leading-relaxed">{supplier.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-medium">
          {supplier.region && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {supplier.region}</span>}
          {supplier.phone && <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 text-[#DB2777] font-bold"><Phone className="w-3.5 h-3.5" /> {supplier.phone}</a>}
        </div>
        {supplier.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {supplier.categories.map((c) => (
              <span key={c} className="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{c}</span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-black text-sm text-[#111827] px-1">Mahsulotlar ({products.length})</h2>
        {products.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-[22px] border border-slate-200/80">
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
