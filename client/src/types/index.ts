export interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: {
    id: number;
    name: string;
  };
  // --- INICIO CAMBIO: venta por pieza ---
  soldByPiece?: boolean;
  piecesPerBox?: number | null;
  piecePrice?: number | null;
  looseStock?: number;
  // --- FIN CAMBIO: venta por pieza ---
}