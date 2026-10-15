import { useEffect, useState } from 'react';
import api from '../api/axios';
import type { Product } from '../types';

// --- INICIO CAMBIO: venta por pieza ---
// unitType indica si este renglón del carrito es por caja completa (UNIT) o por pieza suelta (PIECE).
// unitPrice es el precio que corresponde según unitType (product.price o product.piecePrice).
interface CartItem extends Product {
  quantity: number;
  unitType: 'UNIT' | 'PIECE';
  unitPrice: number;
}
// --- FIN CAMBIO: venta por pieza ---

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  
  // Estados para el Modal de Pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');

  const fetchProducts = () => {
    api.get('/products').then(res => setProducts(res.data));
  };

  useEffect(() => { fetchProducts(); }, []);

  // --- INICIO CAMBIO: venta por pieza ---
  // Cada renglón del carrito se identifica por producto + unitType, porque el mismo
  // producto puede venderse a la vez por caja (UNIT) y por pieza suelta (PIECE).
  const addToCart = (product: Product, unitType: 'UNIT' | 'PIECE' = 'UNIT') => {
    if (unitType === 'PIECE') {
      // Tope aproximado para la UI: piezas sueltas disponibles + lo que darían las cajas completas.
      const maxPieces = (product.looseStock || 0) + product.stock * (product.piecesPerBox || 0);
      if (maxPieces <= 0) { alert("¡No hay piezas disponibles!"); return; }

      setCart(prev => {
        const existing = prev.find(item => item.id === product.id && item.unitType === 'PIECE');
        if (existing) {
          if (existing.quantity + 1 > maxPieces) { alert("¡Stock insuficiente para vender más piezas!"); return prev; }
          return prev.map(item => item.id === product.id && item.unitType === 'PIECE' ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { ...product, quantity: 1, unitType: 'PIECE', unitPrice: Number(product.piecePrice) }];
      });
      return;
    }

    if (product.stock === 0) { alert("¡No hay stock!"); return; }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.unitType === 'UNIT');
      if (existing) {
        if (existing.quantity + 1 > product.stock) { alert("¡Stock insuficiente!"); return prev; }
        return prev.map(item => item.id === product.id && item.unitType === 'UNIT' ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, unitType: 'UNIT', unitPrice: product.price }];
    });
  };

  const removeFromCart = (productId: number, unitType: 'UNIT' | 'PIECE') =>
    setCart(prev => prev.filter(item => !(item.id === productId && item.unitType === unitType)));

  const updateQuantity = (productId: number, unitType: 'UNIT' | 'PIECE', delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.id === productId && item.unitType === unitType) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item;
          const max = unitType === 'PIECE'
            ? (item.looseStock || 0) + item.stock * (item.piecesPerBox || 0)
            : item.stock;
          if (newQty > max) { alert("¡Tope de stock!"); return item; }
          return { ...item, quantity: newQty };
        }
        return item;
    }));
  };
  // --- FIN CAMBIO: venta por pieza ---

  const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  // Filtro
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || p.code.includes(search)
  );

  // --- NUEVA LÓGICA DE PAGO ---

  // 1. Al dar click en "Confirmar Venta", solo abrimos el modal
  const handlePreCheckout = () => {
    setIsPaymentModalOpen(true);
  };

  // 2. Al confirmar en el modal, enviamos todo al backend
  const handleFinalizeSale = async () => {
    try {
      await api.post('/sales', {
        // --- INICIO CAMBIO: venta por pieza ---
        // Mandamos quantity/price/unitType por renglón; el backend recalcula el precio
        // real de la pieza en servidor (no confía en el price que viene del cliente).
        products: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.unitPrice,
          unitType: item.unitType
        })),
        // --- FIN CAMBIO: venta por pieza ---
        total: total,
        paymentMethod: paymentMethod // <--- Enviamos el método
      });
      alert('¡Venta registrada con éxito! 💰');
      setCart([]);
      setIsPaymentModalOpen(false); // Cerramos modal
      setPaymentMethod('EFECTIVO'); // Reset
      fetchProducts();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || 'Falló la venta'));
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* IZQUIERDA: Catálogo (IGUAL) */}
      <div className="w-2/3 p-4 flex flex-col">
        <div className="mb-4">
          <input type="text" placeholder="🔍 Buscar..." className="w-full p-4 rounded-lg shadow border text-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-3 gap-4 overflow-y-auto pb-20 content-start">
          {filteredProducts.map(product => (
            <div key={product.id} onClick={() => addToCart(product, 'UNIT')}
              className={`p-4 rounded-lg shadow cursor-pointer transition border-l-4 ${product.stock === 0 ? 'bg-gray-200 opacity-60' : 'bg-white hover:bg-blue-50 border-blue-500'}`}>
              <div className="font-bold text-lg truncate">{product.name}</div>
              <div className="text-gray-500 text-sm mb-2">{product.code}</div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-xl text-green-600">${product.price}</span>
                <span className="text-xs px-2 py-1 bg-gray-200 rounded">Stock: {product.stock}</span>
              </div>
              {/* --- INICIO CAMBIO: venta por pieza --- */}
              {product.soldByPiece && (
                <button
                  onClick={(e) => { e.stopPropagation(); addToCart(product, 'PIECE'); }}
                  className="mt-2 w-full text-xs font-bold bg-amber-100 text-amber-800 py-1.5 rounded hover:bg-amber-200">
                  + Pieza (${product.piecePrice}) · sueltas: {product.looseStock || 0}
                </button>
              )}
              {/* --- FIN CAMBIO: venta por pieza --- */}
            </div>
          ))}
        </div>
      </div>

      {/* DERECHA: Carrito */}
      <div className="w-1/3 bg-white shadow-2xl flex flex-col border-l z-10">
        <div className="p-6 bg-gray-900 text-white flex justify-between items-center shadow-md">
          <h2 className="text-2xl font-bold">🛒 Carrito</h2>
          <span className="bg-blue-600 px-3 py-1 rounded-full text-sm font-bold">{cart.reduce((a, i) => a + i.quantity, 0)} arts.</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {cart.map(item => (
            <div key={`${item.id}-${item.unitType}`} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between">
                <div className="font-bold">
                  {item.name}
                  {/* --- CAMBIO: venta por pieza (etiqueta de tipo de renglón) --- */}
                  {item.unitType === 'PIECE' && <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded">pieza</span>}
                </div>
                <div className="font-bold text-blue-900">${(item.unitPrice * item.quantity).toFixed(2)}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => removeFromCart(item.id, item.unitType)} className="w-8 h-8 text-red-500 bg-white rounded shadow-sm hover:bg-red-50">🗑️</button>
                  <button onClick={() => updateQuantity(item.id, item.unitType, -1)} className="w-8 h-8 bg-white text-gray-700 rounded shadow-sm" disabled={item.quantity <= 1}>-</button>
                  <span className="font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.unitType, 1)} className="w-8 h-8 bg-white text-blue-600 rounded shadow-sm">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white border-t">
          <div className="flex justify-between items-end mb-4">
            <span className="text-gray-500 font-medium">Total:</span>
            <span className="text-4xl font-extrabold text-gray-800">${total.toFixed(2)}</span>
          </div>
          <button onClick={handlePreCheckout} disabled={cart.length === 0}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-xl font-bold shadow-lg hover:bg-green-700 disabled:bg-gray-300">
            COBRAR 💳
          </button>
        </div>
      </div>

      {/* --- MODAL DE SELECCIÓN DE PAGO --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Confirmar Pago</h2>
            
            <div className="text-center mb-8">
              <p className="text-gray-500 text-sm">Total a cobrar</p>
              <p className="text-5xl font-bold text-green-600">${total.toFixed(2)}</p>
            </div>

            <label className="block text-sm font-bold text-gray-700 mb-2">Método de Pago:</label>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-2 rounded-lg text-sm font-bold border transition ${
                    paymentMethod === method 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                Cancelar
              </button>
              <button onClick={handleFinalizeSale} className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg">
                ✅ Finalizar Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}