import { useEffect, useState } from 'react';
import api from '../api/axios';
import type { Product } from '../types';
import CreateProductModal from '../components/CreateProductModal';
import { matchesSearch, money, totalPieces } from '../utils/products';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState(''); // --- CAMBIO: búsqueda de productos ---

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error("Error cargando productos");
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Función para eliminar
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`¿Seguro que quieres eliminar "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts(); // Recargar tabla
    } catch (error: any) {
      alert(error.response?.data?.error || 'No se pudo eliminar');
    }
  };

  // Función para abrir modal en modo Edición
  const handleEdit = (product: Product) => {
    setEditingProduct(product); // Guardamos el producto que se va a editar
    setIsModalOpen(true);
  };

  // Función para abrir modal en modo Nuevo
  const handleNew = () => {
    setEditingProduct(null); // Limpiamos para que sea uno nuevo
    setIsModalOpen(true);
  };

  // --- CAMBIO: búsqueda de productos ---
  const filteredProducts = products.filter(p => matchesSearch(p, search));

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📦 Inventario</h1>
        <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium shadow">
          + Nuevo Producto
        </button>
      </div>
      
      {/* --- INICIO CAMBIO: búsqueda de productos --- */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <input type="text" placeholder="🔍 Buscar por nombre, código o categoría..."
            className="w-full p-3 pr-10 rounded-lg shadow border outline-none focus:ring-2 focus:ring-blue-500"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setSearch(''); }} />
          {search && (
            <button onClick={() => setSearch('')} title="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">✕</button>
          )}
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {search ? `${filteredProducts.length} de ${products.length}` : `${products.length}`} productos
        </span>
      </div>
      {/* --- FIN CAMBIO: búsqueda de productos --- */}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-4">Código</th>
              <th className="p-4">Producto</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Precio de venta</th>
              <th className="p-4 text-center">Stock</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  {search ? `No se encontraron productos para "${search}"` : 'Todavía no hay productos registrados'}
                </td>
              </tr>
            )}
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-4 font-mono text-sm text-gray-600">{product.code}</td>
                <td className="p-4 font-medium">{product.name}</td>
                <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{product.category?.name || '---'}</span></td>
                <td className="p-4 text-green-700 font-bold">
                  {money(product.price)}
                  {/* --- CAMBIO: venta por pieza (precio por pieza) --- */}
                  {product.soldByPiece && (
                    <div className="text-xs font-normal text-amber-700">pieza: {money(product.piecePrice)}</div>
                  )}
                </td>
                <td className="p-4 text-center">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-800'}`}>
                    {product.stock}
                  </span>
                  {/* --- INICIO CAMBIO: venta por pieza --- */}
                  {product.soldByPiece && (
                    <div className="text-xs text-amber-700 mt-1">
                      {product.stock === 1 ? 'caja' : 'cajas'} + {product.looseStock || 0} sueltas
                      <div className="text-gray-500">({totalPieces(product)} piezas, {product.piecesPerBox} por caja)</div>
                    </div>
                  )}
                  {/* --- FIN CAMBIO: venta por pieza --- */}
                </td>
                <td className="p-4 text-center flex justify-center gap-2">
                  <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded" title="Editar">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(product.id, product.name)} className="text-red-600 hover:text-red-800 px-2 py-1 bg-red-50 rounded" title="Eliminar">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProducts}
        productToEdit={editingProduct} // Pasamos el producto a editar (o null)
      />
    </div>
  );
}