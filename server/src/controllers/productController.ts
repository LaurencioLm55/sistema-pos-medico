import { Request, Response } from 'express';
import { prisma } from '../lib/prisma'; // Importamos la conexión que acabamos de crear

// 1. OBTENER TODOS LOS PRODUCTOS
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true } // Traer también el nombre de la categoría
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// 2. CREAR UN PRODUCTO
export const createProduct = async (req: Request, res: Response) => {
  try {
    // Recibimos los datos del "cuerpo" de la petición
    const { code, name, price, cost, stock, categoryId } = req.body;

    // Guardamos en Base de Datos
    const newProduct = await prisma.product.create({
      data: {
        code,
        name,
        price,
        cost,
        stock,
        categoryId // Asume que la categoría ya existe (lo veremos luego)
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
  try {
    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: { 
        code, name, 
        price: Number(price), 
        cost: Number(cost), 
        stock: Number(stock), 
        categoryId: Number(categoryId) 
      }
    });
    res.json(updated);
  } catch (error) {
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