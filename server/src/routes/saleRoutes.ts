import { Router } from 'express';
import { createSale, getSales } from '../controllers/saleController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', verifyToken, createSale); 
router.get('/', verifyToken, getSales);
export default router;