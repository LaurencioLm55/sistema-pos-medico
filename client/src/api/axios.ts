import axios from 'axios';

const baseURL = 'https://api-pos-medico.onrender.com/api'; 

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;