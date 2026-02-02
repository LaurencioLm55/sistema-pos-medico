import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_secreto_super_seguro';

// Extendemos la definición de Request para que acepte "userId"
export interface AuthRequest extends Request {
  userId?: number;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Quitamos la palabra "Bearer"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No hay token.' });
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY) as { userId: number };
    req.userId = verified.userId; // ¡Aquí guardamos el ID real del usuario!
    next(); // Deja pasar a la siguiente función (el controlador)
  } catch (error) {
    res.status(400).json({ error: 'Token inválido o expirado' });
  }
};