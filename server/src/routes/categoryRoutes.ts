import { Router } from 'express';
import { createCategory, getCategories } from '../controllers/categoryController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, getCategories);
router.post('/', verifyToken, createCategory);

export default router;