import { useState, useEffect } from 'react';
import api from '../api/axios';
import type { Product } from '../types';

interface Category {
  id: number;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null; // Si viene esto, estamos editando
}

export default function CreateProductModal({ isOpen, onClose, onSuccess, productToEdit }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    code: '', name: '', price: '', cost: '', stock: '', categoryId: 1
  });
  const [newCategoryName, setNewCategoryName] = useState(''); // Para crear categoría rápida
  const [showCatInput, setShowCatInput] = useState(false);

  // Cargar categorías y datos si es edición
  useEffect(() => {
    if (isOpen) {
      api.get('/categories').then(res => setCategories(res.data));
      
      if (productToEdit) {
        setFormData({
          code: productToEdit.code,
          name: productToEdit.name,
          price: String(productToEdit.price),
          cost: String(productToEdit.cost || 0), // Asumiendo que cost puede no venir
          stock: String(productToEdit.stock),
          categoryId: productToEdit.category.id
        });
      } else {
        // Limpiar si es nuevo
        setFormData({ code: '', name: '', price: '', cost: '', stock: '', categoryId: 1 });
      }
    }
  }, [isOpen, productToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock),
        categoryId: Number(formData.categoryId)
      };

      if (productToEdit) {
        await api.put(`/products/${productToEdit.id}`, payload); // EDICIÓN
      } else {
        await api.post('/products', payload); // CREACIÓN
      }
      
      alert(`Producto ${productToEdit ? 'actualizado' : 'creado'} con éxito ✅`);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al guardar.');
    }
  };

  const handleCreateCategory = async () => {
    if(!newCategoryName) return;

    try {
      console.log("Intentando crear categoría:", newCategoryName);
      
      const res = await api.post('/categories', { name: newCategoryName });
      
      console.log("Respuesta del servidor:", res.data);

      setCategories([...categories, res.data]); 
      setFormData({...formData, categoryId: res.data.id}); 
      setShowCatInput(false);
      setNewCategoryName('');
      
    } catch (error: any) {
      console.error("Error al crear categoría:", error);
      // Esto te mostrará una alerta en pantalla con la razón real
      alert("Error: " + (error.response?.data?.error || "Falló la conexión con el servidor"));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {productToEdit ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código y Nombre */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700">Código</label>
              <input type="text" required className="w-full border p-2 rounded"
                value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">Nombre</label>
              <input type="text" required className="w-full border p-2 rounded"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-gray-700">Categoría</label>
            {!showCatInput ? (
              <div className="flex gap-2">
                <select className="w-full border p-2 rounded"
                  value={formData.categoryId} 
                  onChange={e => setFormData({...formData, categoryId: Number(e.target.value)})}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowCatInput(true)} className="bg-gray-200 px-3 rounded hover:bg-gray-300">+</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" placeholder="Nueva categoría..." className="w-full border p-2 rounded"
                  value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button type="button" onClick={handleCreateCategory} className="bg-green-600 text-white px-3 rounded">Ok</button>
                <button type="button" onClick={() => setShowCatInput(false)} className="text-red-500 px-2">X</button>
              </div>
            )}
          </div>

          {/* Precios y Stock */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700">Costo</label>
              <input type="number" step="0.01" required className="w-full border p-2 rounded"
                value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">Precio</label>
              <input type="number" step="0.01" required className="w-full border p-2 rounded"
                value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">Stock</label>
              <input type="number" required className="w-full border p-2 rounded"
                value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}