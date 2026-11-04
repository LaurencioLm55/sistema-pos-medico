// Los precios son Decimal en la BD y llegan del backend como texto ("120.50"),
// por eso se tipan como number | string y se convierten con Number() antes de operar.
export interface Product {
  id: number;
  code: string;
  name: string;
  price: number | string;
  cost: number | string;
  stock: number; // Cajas/unidades completas
  category: {
    id: number;
    name: string;
  };
  // --- INICIO CAMBIO: venta por pieza ---
  soldByPiece?: boolean;
  piecesPerBox?: number | null;
  piecePrice?: number | string | null;
  looseStock?: number; // Piezas sueltas de cajas ya abiertas
  // --- FIN CAMBIO: venta por pieza ---
}
