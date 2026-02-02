import axios from 'axios';

// Creamos una instancia configurada
const api = axios.create({
  baseURL: 'http://localhost:3000/api', // La dirección de tu backend
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;