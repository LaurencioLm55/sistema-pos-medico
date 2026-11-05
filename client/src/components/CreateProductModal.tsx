import { useState, useEffect } from 'react';
import api from '../api/axios';
import type { Product } from '../types';
import { money } from '../utils/products';

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
    code: '', name: '', price: '', cost: '', stock: '', categoryId: 1,
    // --- INICIO CAMBIO: venta por pieza ---
    soldByPiece: false, piecesPerBox: '', piecePrice: '', looseStock: ''
    // --- FIN CAMBIO: venta por pieza ---
  });
  const [newCategoryName, setNewCategoryName] = useState(''); // Para crear categoría rápida
  const [showCatInput, setShowCatInput] = useState(false);

  // Cargar categorías y datos si es edición
  useEffect(() => {
    if (isOpen) {
      api.get('/categories').then(res => {
        setCategories(res.data);
        if (!productToEdit && res.data.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: res.data[0].id }));
        }
      });
      
      if (productToEdit) {
        setFormData({
          code: productToEdit.code,
          name: productToEdit.name,
          price: String(productToEdit.price),
          cost: String(productToEdit.cost || 0), // Asumiendo que cost puede no venir
          stock: String(productToEdit.stock),
          categoryId: productToEdit.category.id,
          // --- INICIO CAMBIO: venta por pieza ---
          soldByPiece: !!productToEdit.soldByPiece,
          piecesPerBox: productToEdit.piecesPerBox ? String(productToEdit.piecesPerBox) : '',
          piecePrice: productToEdit.piecePrice ? String(productToEdit.piecePrice) : '',
          looseStock: String(productToEdit.looseStock || 0)
          // --- FIN CAMBIO: venta por pieza ---
        });
      } else {
        // Limpiar si es nuevo
        setFormData({
          code: '', name: '', price: '', cost: '', stock: '', categoryId: 1,
          soldByPiece: false, piecesPerBox: '', piecePrice: '', looseStock: ''
        });
      }
    }
  }, [isOpen, productToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- INICIO CAMBIO: venta por pieza ---
    if (formData.soldByPiece) {
      if (!Number.isInteger(Number(formData.piecesPerBox)) || Number(formData.piecesPerBox) <= 0) {
        alert('Indica cuántas piezas trae cada caja (número entero mayor a 0).');
        return;
      }
      if (!(Number(formData.piecePrice) > 0)) {
        alert('Indica el precio de venta por pieza (mayor a 0).');
        return;
      }
      const loose = Number(formData.looseStock || 0);
      if (!Number.isInteger(loose) || loose < 0 || loose >= Number(formData.piecesPerBox)) {
        alert(`Las piezas sueltas deben ser menos que las piezas por caja (${formData.piecesPerBox}). Si tienes más, agrégalas como cajas en "Stock".`);
        return;
      }
    }
    // --- FIN CAMBIO: venta por pieza ---

    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock),
        categoryId: Number(formData.categoryId),
        // --- INICIO CAMBIO: venta por pieza ---
        soldByPiece: formData.soldByPiece,
        piecesPerBox: formData.soldByPiece ? Number(formData.piecesPerBox) : null,
        piecePrice: formData.soldByPiece ? Number(formData.piecePrice) : null,
        looseStock: formData.soldByPiece ? Number(formData.looseStock || 0) : undefined
        // --- FIN CAMBIO: venta por pieza ---
      };

      if (productToEdit) {
        await api.put(`/products/${productToEdit.id}`, payload); // EDICIÓN
      } else {
        await api.post('/products', payload); // CREACIÓN
      }
      
      alert(`Producto ${productToEdit ? 'actualizado' : 'creado'} con éxito ✅`);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error al guardar: ' + (error.response?.data?.error || 'Falló la conexión con el servidor'));
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
      <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-full overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {productToEdit ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700">Código</label>
              <input type="text" required className="w-full border p-2 rounded"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">Nombre</label>
              {/* Sin autocorrección: nombres de medicamentos como "Tabcin" o "Coriver" no están en el diccionario
                  y el teclado/navegador los "corregía" a "Tabcina" / "Correver". */}
              <input type="text" required className="w-full border p-2 rounded"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
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
                  autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                  value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button type="button" onClick={handleCreateCategory} className="bg-green-600 text-white px-3 rounded">Ok</button>
                <button type="button" onClick={() => setShowCatInput(false)} className="text-red-500 px-2">X</button>
              </div>
            )}
          </div>

          {/* Precios y Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700">Precio de proveedor</label>
              <input type="number" step="0.01" required className="w-full border p-2 rounded"
                value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">
                {formData.soldByPiece ? 'Precio de venta (caja)' : 'Precio de venta'}
              </label>
              <input type="number" step="0.01" required className="w-full border p-2 rounded"
                value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">
                {formData.soldByPiece ? 'Stock (cajas completas)' : 'Stock'}
              </label>
              <input type="number" required className="w-full border p-2 rounded"
                value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
          </div>

          {/* --- INICIO CAMBIO: venta por pieza --- */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input type="checkbox"
                checked={formData.soldByPiece}
                onChange={e => setFormData({...formData, soldByPiece: e.target.checked})} />
              ¿Se vende también por pieza? (ej. gasas sueltas de una caja)
            </label>

            {formData.soldByPiece && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Piezas por caja</label>
                    <input type="number" min="1" step="1" required className="w-full border p-2 rounded"
                      value={formData.piecesPerBox}
                      onChange={e => setFormData({...formData, piecesPerBox: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Precio de venta por pieza</label>
                    <input type="number" step="0.01" min="0.01" required className="w-full border p-2 rounded"
                      value={formData.piecePrice}
                      onChange={e => setFormData({...formData, piecePrice: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Piezas de caja incompleta</label>
                    <input type="number" min="0" step="1"
                      max={Number(formData.piecesPerBox) > 0 ? Number(formData.piecesPerBox) - 1 : undefined}
                      className="w-full border p-2 rounded" placeholder="0"
                      value={formData.looseStock}
                      onChange={e => setFormData({...formData, looseStock: e.target.value})} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Las piezas de las cajas completas se suman solas. Llena "Piezas de caja incompleta" solo si
                  alguna caja no viene completa (siempre menos que las piezas por caja). Al vender por pieza se
                  descuentan primero esas piezas y, si no alcanzan, se abre una caja del stock automáticamente.
                </p>
                {Number(formData.piecesPerBox) > 0 && (
                  <p className="text-sm font-semibold text-blue-700 mt-2">
                    Total: {Number(formData.stock || 0)} {Number(formData.stock) === 1 ? 'caja' : 'cajas'} × {Number(formData.piecesPerBox)} = {Number(formData.stock || 0) * Number(formData.piecesPerBox)} piezas
                    {Number(formData.looseStock) > 0 && <> + {Number(formData.looseStock)} de caja incompleta</>}
                    {' '}= {Number(formData.stock || 0) * Number(formData.piecesPerBox) + Number(formData.looseStock || 0)} piezas en total
                  </p>
                )}
                {Number(formData.piecesPerBox) > 0 && Number(formData.price) > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    Caja: {money(formData.price)} · Pieza a precio de caja: {money(Number(formData.price) / Number(formData.piecesPerBox))}
                    {Number(formData.piecePrice) > 0 && <> · Caja vendida por piezas: {money(Number(formData.piecePrice) * Number(formData.piecesPerBox))}</>}
                  </p>
                )}
              </>
            )}
          </div>
          {/* --- FIN CAMBIO: venta por pieza --- */}

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