import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { useAgroStore } from '../store/useAgroStore';
import { CATEGORIES, REGIONS } from '../data/mockAgroData';
import { Edit3, Save, Trash2, Tag, MapPin, DollarSign, Package } from 'lucide-react';

export const EditListingModal: React.FC = () => {
  const { editModalItem, setEditModalItem, updatePost, updateProduct, deletePost, deleteProduct, showToast } = useAgroStore();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [numericPrice, setNumericPrice] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (editModalItem) {
      setTitle(editModalItem.title || '');
      setPrice(editModalItem.price || '');
      setNumericPrice(String(editModalItem.numericPrice || ''));
      setCategory(editModalItem.category || CATEGORIES[1]?.id || 'fruits');
      setLocation(editModalItem.location || REGIONS[1] || 'Farg\'ona');
      setMinOrder(editModalItem.minOrder || '1 dona');
      setPhone('phone' in editModalItem ? editModalItem.phone || '' : '');
    }
  }, [editModalItem]);

  if (!editModalItem) return null;

  const isPost = 'sellerName' in editModalItem || 'mediaUrl' in editModalItem;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Mahsulot sarlavhasini kiriting");
      return;
    }

    const selectedCategoryObj = CATEGORIES.find((c) => c.id === category);

    if (isPost) {
      updatePost(editModalItem.id, {
        title,
        price,
        numericPrice: Number(numericPrice) || 0,
        category,
        categoryName: selectedCategoryObj?.name || 'Meva-Sabzavot',
        location,
        minOrder,
        ...(phone ? { phone } : {}),
      });
    } else {
      updateProduct(editModalItem.id, {
        title,
        price,
        numericPrice: Number(numericPrice) || 0,
        category,
        location,
        minOrder,
      });
    }
    setEditModalItem(null);
  };

  const handleDelete = () => {
    if (window.confirm("Rostdan ham ushbu e'lonni o'chirmoqchimisiz?")) {
      if (isPost) {
        deletePost(editModalItem.id);
      } else {
        deleteProduct(editModalItem.id);
      }
      setEditModalItem(null);
    }
  };

  return (
    <Modal
      isOpen={Boolean(editModalItem)}
      onClose={() => setEditModalItem(null)}
      title="E'lonni tahrirlash"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Sarlavha / Nomi */}
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-[#E53935]" />
            E'lon sarlavhasi
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mahsulot nomi"
            className="w-full bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
          />
        </label>

        {/* Narxlar */}
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#E53935]" />
              Matnli narx
            </span>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="8,500 so'm / kg"
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#E53935]" />
              Raqamli narx (so'm)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={numericPrice}
              onChange={(e) => setNumericPrice(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="8500"
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
            />
          </label>
        </div>

        {/* Kategoriya & Hudud */}
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#E53935]" />
              Kategoriya
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-100 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
            >
              {CATEGORIES.filter((cat) => cat.id !== 'all').map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E53935]" />
              Hudud
            </span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-100 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
            >
              {REGIONS.filter((region) => region !== 'Barchasi').map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Min Buyurtma */}
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#E53935]" />
            Minimal buyurtma hajmi
          </span>
          <input
            type="text"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            placeholder="1 dona / 10 kg / 1 tonna"
            className="w-full bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
          />
        </label>

        {/* Tugmalar */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-3 rounded-[16px] bg-red-50 text-[#E53935] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            O'chirish
          </button>
          <button
            type="submit"
            className="flex-1 py-3 rounded-[16px] bg-[#111827] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-black transition-colors"
          >
            <Save className="w-4 h-4" />
            Saqlash
          </button>
        </div>
      </form>
    </Modal>
  );
};
