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
        
        if (!productInDb || productInDb.stock < item.quantity) {
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
            subtotal: item.price * item.quantity
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