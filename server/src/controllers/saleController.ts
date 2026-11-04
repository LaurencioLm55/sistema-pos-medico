import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

// Redondeo a 2 decimales para importes en pesos
const round2 = (n: number) => Math.round(n * 100) / 100;

export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const { products, paymentMethod } = req.body;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'La venta no tiene productos' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // --- INICIO CAMBIO: venta por pieza ---
      // Los precios y el total se calculan aquí con los datos de la BD; no se confía
      // en el price/total que manda el cliente.
      const details: { productId: number; quantity: number; price: number; subtotal: number; unitType: 'UNIT' | 'PIECE' }[] = [];

      for (const item of products) {
        const productId = Number(item.id);
        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error('La cantidad de cada producto debe ser un número entero mayor a 0');
        }

        // Se vuelve a leer en cada renglón: si el mismo producto viene por caja y por
        // pieza, el segundo renglón ya ve el inventario descontado por el primero.
        const productInDb = await tx.product.findUnique({ where: { id: productId } });
        if (!productInDb) {
          throw new Error(`Producto no encontrado: ${item.id}`);
        }

        // 'UNIT' = caja/unidad completa (comportamiento de siempre), 'PIECE' = pieza suelta.
        const unitType: 'UNIT' | 'PIECE' = item.unitType === 'PIECE' ? 'PIECE' : 'UNIT';

        if (unitType === 'PIECE') {
          if (!productInDb.soldByPiece || !productInDb.piecesPerBox || !productInDb.piecePrice) {
            throw new Error(`El producto "${productInDb.name}" no está configurado para venta por pieza`);
          }

          const piecesPerBox = productInDb.piecesPerBox;

          // Primero se consumen las piezas sueltas de cajas ya abiertas. Si no alcanzan,
          // se abren solo las cajas completas necesarias y el sobrante queda como piezas sueltas.
          // Ej.: caja de 10, stock 3, sueltas 2, se venden 5 → se abre 1 caja → stock 2, sueltas 7.
          const missing = quantity - productInDb.looseStock;
          const boxesToOpen = missing > 0 ? Math.ceil(missing / piecesPerBox) : 0;

          if (boxesToOpen > productInDb.stock) {
            const available = productInDb.looseStock + productInDb.stock * piecesPerBox;
            throw new Error(`Stock insuficiente de "${productInDb.name}": se pidieron ${quantity} piezas y solo hay ${available}`);
          }

          const newLooseStock = productInDb.looseStock + boxesToOpen * piecesPerBox - quantity;

          // El where con los valores leídos evita que dos ventas simultáneas descuenten
          // sobre el mismo inventario (si otra venta lo cambió, no se actualiza nada).
          const updated = await tx.product.updateMany({
            where: { id: productId, stock: productInDb.stock, looseStock: productInDb.looseStock },
            data: { stock: { decrement: boxesToOpen }, looseStock: newLooseStock }
          });
          if (updated.count === 0) {
            throw new Error(`El inventario de "${productInDb.name}" cambió mientras se cobraba. Intenta de nuevo.`);
          }

          const piecePrice = Number(productInDb.piecePrice);
          details.push({ productId, quantity, price: piecePrice, subtotal: round2(piecePrice * quantity), unitType: 'PIECE' });
          continue;
        }

        // Venta por caja/unidad completa: solo se descuenta del stock de cajas completas
        // (las piezas sueltas no se pueden vender como caja).
        const updated = await tx.product.updateMany({
          where: { id: productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } }
        });
        if (updated.count === 0) {
          throw new Error(`Stock insuficiente de "${productInDb.name}": se pidieron ${quantity} y solo hay ${productInDb.stock}`);
        }

        const unitPrice = Number(productInDb.price);
        details.push({ productId, quantity, price: unitPrice, subtotal: round2(unitPrice * quantity), unitType: 'UNIT' });
      }

      const total = round2(details.reduce((sum, d) => sum + d.subtotal, 0));

      return tx.sale.create({
        data: {
          total,
          paymentMethod: paymentMethod || 'EFECTIVO', // Si no envían nada, asume Efectivo
          userId: userId,
          details: { create: details }
        }
      });
      // --- FIN CAMBIO: venta por pieza ---
    }, { timeout: 15000 });

    res.json({ success: true, saleId: result.id, total: result.total });

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Error al procesar la venta' });
  }
};



// OBTENER HISTORIAL DE VENTAS
export const getSales = async (req: AuthRequest, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' }, // Las más nuevas primero
      include: {
        details: { // Incluir los detalles (qué productos se vendieron)
          include: { product: true }
        }
      }
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};
