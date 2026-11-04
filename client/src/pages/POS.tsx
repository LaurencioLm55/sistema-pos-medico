import { useEffect, useState } from 'react';
import api from '../api/axios';
import type { Product } from '../types';
import { matchesSearch, maxQuantity, money } from '../utils/products';

// --- INICIO CAMBIO: venta por pieza ---
// Cada renglón del carrito es un producto + cómo se vende: por caja/unidad completa (UNIT)
// o por pieza suelta (PIECE). El mismo producto puede estar en ambos renglones a la vez.
// Los datos del producto (precio, stock) se toman siempre de la lista actual de productos,
// para que los topes de stock no se queden con valores viejos.
type UnitType = 'UNIT' | 'PIECE';

interface CartLine {
  productId: number;
  unitType: UnitType;
  quantity: number;
}

const unitPriceOf = (product: Product, unitType: UnitType) =>
  Number(unitType === 'PIECE' ? product.piecePrice : product.price);
// --- FIN CAMBIO: venta por pieza ---

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');

  // Estados para el Modal de Pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');

  const fetchProducts = () => {
    api.get('/products').then(res => setProducts(res.data)).catch(() => {});
  };

  useEffect(() => { fetchProducts(); }, []);

  // --- INICIO CAMBIO: venta por pieza ---
  const findProduct = (productId: number) => products.find(p => p.id === productId);

  const qtyInCart = (lines: CartLine[], productId: number, unitType: UnitType) =>
    lines.find(l => l.productId === productId && l.unitType === unitType)?.quantity ?? 0;

  // Tope de un renglón descontando lo que ya hay del mismo producto en el otro renglón
  // (ej. si hay 1 caja en el carrito, esas piezas ya no se pueden vender sueltas).
  const maxFor = (lines: CartLine[], product: Product, unitType: UnitType) =>
    maxQuantity(product, unitType, qtyInCart(lines, product.id, unitType === 'UNIT' ? 'PIECE' : 'UNIT'));

  const setLineQuantity = (productId: number, unitType: UnitType, quantity: number) => {
    const product = findProduct(productId);
    if (!product) return;

    const max = maxFor(cart, product, unitType);
    if (quantity > max) {
      alert(max === 0
        ? `¡No hay ${unitType === 'PIECE' ? 'piezas' : 'cajas completas'} disponibles de ${product.name}!`
        : `Stock insuficiente: máximo ${max} ${unitType === 'PIECE' ? 'piezas' : 'unidades'} de ${product.name}.`);
      quantity = max;
    }

    setCart(prev => {
      if (quantity < 1) return prev.filter(l => !(l.productId === productId && l.unitType === unitType));
      const exists = prev.some(l => l.productId === productId && l.unitType === unitType);
      return exists
        ? prev.map(l => l.productId === productId && l.unitType === unitType ? { ...l, quantity } : l)
        : [...prev, { productId, unitType, quantity }];
    });
  };

  const addToCart = (product: Product, unitType: UnitType = 'UNIT') =>
    setLineQuantity(product.id, unitType, qtyInCart(cart, product.id, unitType) + 1);

  const removeFromCart = (productId: number, unitType: UnitType) =>
    setCart(prev => prev.filter(l => !(l.productId === productId && l.unitType === unitType)));

  // Renglones del carrito con los datos actuales del producto
  const cartItems = cart.flatMap(line => {
    const product = findProduct(line.productId);
    if (!product) return [];
    const unitPrice = unitPriceOf(product, line.unitType);
    return [{ ...line, product, unitPrice, subtotal: unitPrice * line.quantity }];
  });

  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  // --- FIN CAMBIO: venta por pieza ---

  // --- CAMBIO: búsqueda de productos (sin acentos, por nombre, código o categoría) ---
  const filteredProducts = products.filter(p => matchesSearch(p, search));

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
        // Solo se manda qué y cuánto; el backend calcula precios y total con los datos de la BD.
        products: cart.map(line => ({
          id: line.productId,
          quantity: line.quantity,
          unitType: line.unitType
        })),
        // --- FIN CAMBIO: venta por pieza ---
        paymentMethod: paymentMethod // <--- Enviamos el método
      });
      alert('¡Venta registrada con éxito! 💰');
      setCart([]);
      setIsPaymentModalOpen(false); // Cerramos modal
      setPaymentMethod('EFECTIVO'); // Reset
      fetchProducts();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || 'Falló la venta'));
      fetchProducts(); // Por si el stock cambió, refrescar los topes
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
          {filteredProducts.length === 0 && (
            <div className="col-span-3 text-center text-gray-500 py-10">
              {search ? `No se encontraron productos para "${search}"` : 'No hay productos registrados'}
            </div>
          )}
          {filteredProducts.map(product => {
            // --- CAMBIO: venta por pieza (sin cajas completas puede seguir vendiéndose por pieza) ---
            const noStock = product.stock === 0 && maxQuantity(product, 'PIECE', 0) === 0;
            return (
            <div key={product.id} onClick={() => addToCart(product, 'UNIT')}
              className={`p-4 rounded-lg shadow cursor-pointer transition border-l-4 ${noStock ? 'bg-gray-200 opacity-60' : 'bg-white hover:bg-blue-50 border-blue-500'}`}>
              <div className="font-bold text-lg truncate">{product.name}</div>
              <div className="text-gray-500 text-sm mb-2">{product.code}</div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-xl text-green-600">{money(product.price)}</span>
                <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                  {product.soldByPiece ? 'Cajas' : 'Stock'}: {product.stock}
                </span>
              </div>
              {/* --- INICIO CAMBIO: venta por pieza --- */}
              {product.soldByPiece && (
                <button
                  onClick={(e) => { e.stopPropagation(); addToCart(product, 'PIECE'); }}
                  className="mt-2 w-full text-xs font-bold bg-amber-100 text-amber-800 py-1.5 rounded hover:bg-amber-200">
                  + Pieza ({money(product.piecePrice)}) · sueltas: {product.looseStock || 0}
                </button>
              )}
              {/* --- FIN CAMBIO: venta por pieza --- */}
            </div>
            );
          })}
        </div>
      </div>

      {/* DERECHA: Carrito */}
      <div className="w-1/3 bg-white shadow-2xl flex flex-col border-l z-10">
        <div className="p-6 bg-gray-900 text-white flex justify-between items-center shadow-md">
          <h2 className="text-2xl font-bold">🛒 Carrito</h2>
          <span className="bg-blue-600 px-3 py-1 rounded-full text-sm font-bold">{cart.reduce((a, l) => a + l.quantity, 0)} arts.</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {cartItems.map(item => (
            <div key={`${item.productId}-${item.unitType}`} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between">
                <div className="font-bold">
                  {item.product.name}
                  {/* --- CAMBIO: venta por pieza (etiqueta de tipo de renglón) --- */}
                  {item.unitType === 'PIECE' && <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded">pieza</span>}
                </div>
                <div className="font-bold text-blue-900">{money(item.subtotal)}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => removeFromCart(item.productId, item.unitType)} className="w-8 h-8 text-red-500 bg-white rounded shadow-sm hover:bg-red-50">🗑️</button>
                  <button onClick={() => setLineQuantity(item.productId, item.unitType, item.quantity - 1)} className="w-8 h-8 bg-white text-gray-700 rounded shadow-sm" disabled={item.quantity <= 1}>-</button>
                  {/* --- CAMBIO: venta por pieza (cantidad editable, útil para vender p. ej. 30 piezas) --- */}
                  <input type="number" min="1" step="1"
                    className="w-14 text-center font-bold bg-white rounded border-0 py-1"
                    value={item.quantity}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const qty = Math.floor(Number(e.target.value));
                      if (qty >= 1) setLineQuantity(item.productId, item.unitType, qty);
                    }} />
                  <button onClick={() => setLineQuantity(item.productId, item.unitType, item.quantity + 1)} className="w-8 h-8 bg-white text-blue-600 rounded shadow-sm">+</button>
                </div>
                <span className="text-xs text-gray-500">{money(item.unitPrice)} c/u</span>
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