import axios from 'axios';

const AxiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 9000,
});

// Intercepteur de requête : ajout du token
AxiosClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse : gestion des erreurs
AxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const { response } = error;
      if (response && response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
        }
        // Tu peux rediriger vers login ici si besoin avec `router.push('/login')`
      }
    } catch (err) {
      console.error(err);
    }

    throw error;
  }
);

export default AxiosClient;
