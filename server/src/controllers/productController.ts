import { Request, Response } from 'express';
import { prisma } from '../lib/prisma'; // Importamos la conexión que acabamos de crear

// --- INICIO CAMBIO: venta por pieza ---
// Valida y normaliza los campos de venta por pieza que vienen del formulario.
// Si soldByPiece es true:
//   - piecesPerBox: cuántas piezas trae cada caja (entero > 0)
//   - piecePrice:   precio de venta de UNA pieza (> 0)
//   - looseStock:   piezas sueltas de cajas ya abiertas (entero >= 0, opcional)
// Si soldByPiece es false, piecesPerBox y piecePrice se limpian y looseStock se deja como está.
const parsePieceFields = (body: any) => {
  const soldByPiece = !!body.soldByPiece;

  if (!soldByPiece) {
    return { data: { soldByPiece: false, piecesPerBox: null, piecePrice: null } };
  }

  const piecesPerBox = Number(body.piecesPerBox);
  const piecePrice = Number(body.piecePrice);

  if (!Number.isInteger(piecesPerBox) || piecesPerBox <= 0) {
    return { error: 'Las piezas por caja deben ser un número entero mayor a 0' };
  }
  if (!Number.isFinite(piecePrice) || piecePrice <= 0) {
    return { error: 'El precio por pieza debe ser mayor a 0' };
  }

  const data: { soldByPiece: boolean; piecesPerBox: number; piecePrice: number; looseStock?: number } = {
    soldByPiece: true,
    piecesPerBox,
    piecePrice
  };

  if (body.looseStock !== undefined && body.looseStock !== null && body.looseStock !== '') {
    const looseStock = Number(body.looseStock);
    if (!Number.isInteger(looseStock) || looseStock < 0) {
      return { error: 'Las piezas sueltas deben ser un número entero mayor o igual a 0' };
    }
    // Las sueltas son el sobrante de cajas abiertas, así que siempre son menos que una caja completa.
    // Si son más, en realidad son cajas y se contarían doble (ej. 2 cajas de 12 + 22 sueltas = 46 piezas).
    if (looseStock >= piecesPerBox) {
      return { error: `Las piezas sueltas deben ser menos que las piezas por caja (${piecesPerBox}). Si tienes más, agrégalas como cajas en "Stock".` };
    }
    data.looseStock = looseStock;
  }

  return { data };
};
// --- FIN CAMBIO: venta por pieza ---

// 1. OBTENER TODOS LOS PRODUCTOS
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true }, // Traer también el nombre de la categoría
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// 2. CREAR UN PRODUCTO
export const createProduct = async (req: Request, res: Response) => {
  // Recibimos los datos del "cuerpo" de la petición
  const { code, name, price, cost, stock, categoryId } = req.body;

  // --- CAMBIO: venta por pieza ---
  const piece = parsePieceFields(req.body);
  if (piece.error) return res.status(400).json({ error: piece.error });

  try {
    // Guardamos en Base de Datos
    const newProduct = await prisma.product.create({
      data: {
        code,
        name,
        price: Number(price),
        cost: Number(cost),
        stock: Number(stock),
        categoryId: Number(categoryId),
        ...piece.data
      }
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error); // Para ver el error en la terminal
    res.status(500).json({ error: 'Error al crear producto. ¿Quizás el código ya existe o falta la categoría?' });
  }
};

// ACTUALIZAR PRODUCTO
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, name, price, cost, stock, categoryId } = req.body;

  // --- CAMBIO: venta por pieza ---
  const piece = parsePieceFields(req.body);
  if (piece.error) return res.status(400).json({ error: piece.error });

  try {
    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        code, name,
        price: Number(price),
        cost: Number(cost),
        stock: Number(stock),
        categoryId: Number(categoryId),
        ...piece.data
      }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
};

// ELIMINAR PRODUCTO
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    // Si el producto ya se vendió, la BD no dejará borrarlo por seguridad
    res.status(400).json({ error: 'No se puede eliminar: tiene ventas asociadas' });
  }
};
