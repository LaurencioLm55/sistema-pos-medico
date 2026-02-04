import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_secreto_super_seguro';

// 1. REGISTRO (Para crear usuarios con contraseña encriptada)
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // ¡Guardamos el hash, no el texto plano!
        name,
        role: role || 'SELLER'
      }
    });

    res.status(201).json({ message: 'Usuario creado', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario. ¿El email ya existe?' });
  }
};

// 2. LOGIN (Verificar credenciales y dar Token)
export const login = async (req: Request, res: Response) => {
  console.log("📢 INTENTO DE LOGIN RECIBIDO");
  console.log("📧 Email:", req.body.email);
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña (comparar texto plano con el hash de la BD)
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar Token (El "Gafete" de acceso)
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // Datos guardados en el token
      SECRET_KEY,
      { expiresIn: '8h' } // Dura 8 horas
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("❌❌ ERROR FATAL EN LOGIN ❌❌");
    console.error(error); // Esto imprimirá el error exacto
    res.status(500).json({ message: "Error interno", error });
  }
};