import axios from 'axios';

const baseURL = 'https://api-pos-medico.onrender.com/api';

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- INICIO CAMBIO: sesión expirada ---
// Si el token ya no es válido (expiró o el backend lo rechaza), antes la app se
// quedaba con las pantallas en blanco sin avisar nada (parecía que se habían
// borrado los datos). Ahora se cierra sesión y se manda al login con un aviso.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error;
    const isAuthError = status === 401 || (status === 400 && message === 'Token inválido o expirado');

    if (isAuthError) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      alert('Tu sesión expiró. Por favor, inicia sesión de nuevo.');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);
// --- FIN CAMBIO: sesión expirada ---

export default api;