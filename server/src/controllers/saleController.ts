import { Response } from 'express'; 
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware'; 

export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const { products, total, paymentMethod} = req.body; 
    const userId = req.userId; 

    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          total: total,
          paymentMethod: paymentMethod || 'EFECTIVO', // Si no envían nada, asume Efectivo
          userId: userId, 
        }
      });

      // 2. Procesar cada producto
      for (const item of products) {
        // A. Verificar stock actual
        const productInDb = await tx.product.findUnique({ where: { id: item.id } });
        if (!productInDb) {
          throw new Error(`Producto no encontrado: ${item.id}`);
        }

        // --- INICIO CAMBIO: venta por pieza ---
        // El frontend indica cómo se vendió cada renglón: 'UNIT' (caja/unidad completa,
        // comportamiento de siempre) o 'PIECE' (pieza suelta, ej. una gasa de la caja).
        const unitType: 'UNIT' | 'PIECE' = item.unitType === 'PIECE' ? 'PIECE' : 'UNIT';

        if (unitType === 'PIECE') {
          if (!productInDb.soldByPiece || !productInDb.piecesPerBox || !productInDb.piecePrice) {
            throw new Error(`El producto "${productInDb.name}" no está configurado para venta por pieza`);
          }

          const piecesNeeded = item.quantity;
          const piecesPerBox = productInDb.piecesPerBox;

          // Primero se consumen las piezas sueltas de cajas ya abiertas.
          // Si no alcanzan, se abren cajas completas del stock (una por una, solo las necesarias)
          // y el sobrante de piezas de esas cajas queda como nuevo looseStock.
          const boxesToOpen = piecesNeeded > productInDb.looseStock
            ? Math.ceil((piecesNeeded - productInDb.looseStock) / piecesPerBox)
            : 0;

          if (boxesToOpen > productInDb.stock) {
            throw new Error(`Stock insuficiente para vender por pieza el producto: ${productInDb.name}`);
          }

          const newLooseStock = (productInDb.looseStock + boxesToOpen * piecesPerBox) - piecesNeeded;

          await tx.product.update({
            where: { id: item.id },
            data: {
              stock: { decrement: boxesToOpen },
              looseStock: newLooseStock
            }
          });

          // El precio se toma del producto en BD (piecePrice), no del body, para que
          // el cliente no pueda manipular el precio de venta por pieza.
          const piecePrice = Number(productInDb.piecePrice);

          await tx.saleDetail.create({
            data: {
              saleId: sale.id,
              productId: item.id,
              quantity: item.quantity,
              price: piecePrice,
              subtotal: piecePrice * item.quantity,
              unitType: 'PIECE'
            }
          });

          continue;
        }
        // --- FIN CAMBIO: venta por pieza ---

        if (productInDb.stock < item.quantity) {
          throw new Error(`Stock insuficiente para el producto: ${productInDb?.name}`);
        }

        // B. Restar stock
        await tx.product.update({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } }
        });

        // C. Crear detalle de venta
        await tx.saleDetail.create({
          data: {
            saleId: sale.id,
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
            unitType: 'UNIT' // --- CAMBIO: venta por pieza (registro explícito del tipo) ---
          }
        });
      }

      return sale;
    });

    res.json({ success: true, saleId: result.id });

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