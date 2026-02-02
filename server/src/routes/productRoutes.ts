import { Router } from 'express';
import { createProduct, getProducts, updateProduct, deleteProduct } from '../controllers/productController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, createProduct);

router.put('/:id', verifyToken, updateProduct);    // PUT para editar
router.delete('/:id', verifyToken, deleteProduct); // DELETE para borrar

export default router;