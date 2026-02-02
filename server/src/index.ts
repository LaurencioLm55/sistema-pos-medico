import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes';
import saleRoutes from './routes/saleRoutes';
import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';

// 1. Configuración inicial
dotenv.config(); // Leer archivo .env
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares (Funciones intermedias)
app.use(cors());           // Permitir conexiones desde el Frontend
app.use(express.json());   // Permitir recibir datos JSON

// 3. Rutas
app.get('/', (req, res) => {
  res.send('API Funcionando 🚀');
  
});
// Aquí conectamos el módulo de productos
app.use('/api/products', productRoutes); 
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);

app.use(express.json());

app.use('/api/auth', authRoutes); 
app.use('/api/products', productRoutes);

// 4. Encender servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});