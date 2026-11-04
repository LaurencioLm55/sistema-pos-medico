import type { Product } from '../types';

// --- INICIO CAMBIO: búsqueda de productos ---
// Quita acentos y mayúsculas para que "ibuprofeno" encuentre "Ibuprofeno" y "acido" encuentre "Ácido".
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Busca por nombre, código de barras o categoría. Si se escriben varias palabras
// ("paracetamol 500"), el producto debe contener todas.
export const matchesSearch = (product: Product, search: string) => {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(`${product.name} ${product.code} ${product.category?.name ?? ''}`);
  return terms.every(term => haystack.includes(term));
};
// --- FIN CAMBIO: búsqueda de productos ---

// --- INICIO CAMBIO: venta por pieza ---
// La BD regresa los precios (Decimal) como texto; esto los muestra siempre como $0.00
export const money = (value: number | string | null | undefined) => `$${Number(value ?? 0).toFixed(2)}`;

// Piezas totales disponibles: piezas sueltas de cajas abiertas + piezas dentro de las cajas completas.
export const totalPieces = (product: Product) =>
  (product.looseStock || 0) + product.stock * (product.piecesPerBox || 0);

// Máximo que se puede poner en el carrito de un renglón (cajas o piezas), tomando en cuenta
// lo que ya hay del mismo producto en el otro tipo de renglón (otherQty).
// Es la misma regla que aplica el backend al cobrar: las cajas salen solo del stock de cajas
// completas y las piezas salen primero de las sueltas y luego abriendo las cajas que queden.
export const maxQuantity = (product: Product, unitType: 'UNIT' | 'PIECE', otherQty: number) => {
  const piecesPerBox = product.piecesPerBox || 0;
  if (unitType === 'UNIT') {
    if (otherQty === 0 || !piecesPerBox) return product.stock;
    return Math.max(0, Math.min(product.stock, Math.floor((totalPieces(product) - otherQty) / piecesPerBox)));
  }
  if (!product.soldByPiece || !piecesPerBox) return 0;
  return Math.max(0, totalPieces(product) - otherQty * piecesPerBox);
};
// --- FIN CAMBIO: venta por pieza ---
