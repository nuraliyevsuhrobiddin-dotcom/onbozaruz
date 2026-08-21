import React, { useMemo } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

export const B2BCartView: React.FC = () => {
  const { b2bCart, updateB2BCartQuantity, setB2BRoute, businessProfile } = useAgroStore();

  const groups = useMemo(() => {
    const map = new Map<string, { supplierName: string; supplierVerified?: boolean; lines: typeof lines }>();
    const lines = Object.values(b2bCart);
    for (const line of lines) {
      const key = line.product.supplierId;
      const g = map.get(key) || { supplierName: line.product.supplierName || '', supplierVerified: line.product.supplierVerified, lines: [] };
      g.lines.push(line);
      map.set(key, g);
    }
    return Array.from(map.entries());
  }, [b2bCart]);

  const total = Object.values(b2bCart).reduce((s, l) => s + l.product.wholesalePrice * l.quantity, 0);

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3 select-none pb-32">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'products' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-lg text-[#111827]">Savat</h1>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[22px] border border-slate-200/80">
          <p className="text-xs font-bold text-slate-500">Savat bo'sh</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([supplierId, group]) => {
            const groupTotal = group.lines.reduce((s, l) => s + l.product.wholesalePrice * l.quantity, 0);
            return (
              <div key={supplierId} className="bg-white rounded-[20px] border border-slate-200/80 p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-[#111827]">{group.supplierName}</span>
                  {group.supplierVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                </div>
                <div className="space-y-2">
                  {group.lines.map((line) => (
                    <div key={line.product.id} className="flex items-center gap-2.5">
                      <img src={line.product.images[0]} alt={line.product.name} className="w-12 h-12 rounded-[10px] object-cover bg-slate-100 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#111827] truncate">{line.product.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{formatMoney(line.product.wholesalePrice)} / {line.product.unit}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
                        <button
                          onClick={() => updateB2BCartQuantity(line.product.id, line.quantity === line.product.moq ? 0 : line.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-700"
                        >{line.quantity === line.product.moq ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3.5 h-3.5" />}</button>
                        <span className="text-xs font-black w-8 text-center">{line.quantity}</span>
                        <button
                          onClick={() => updateB2BCartQuantity(line.product.id, line.quantity + 1)}
                          disabled={line.quantity >= line.product.availableQty}
                          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-700 disabled:opacity-40"
                        ><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500">Jami ({group.supplierName})</span>
                  <span className="text-sm font-black text-[#DB2777]">{formatMoney(groupTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {groups.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 lg:pl-24">
          <div className="max-w-170 mx-auto space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">Umumiy jami</span>
              <span className="font-black text-lg text-[#111827]">{formatMoney(total)}</span>
            </div>
            <button
              onClick={() => setB2BRoute({ view: 'checkout' })}
              className="w-full py-3.5 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-sm shadow-lg transition-colors"
            >
              {businessProfile ? "Rasmiylashtirish" : "Biznes profilingizni to'ldiring"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
