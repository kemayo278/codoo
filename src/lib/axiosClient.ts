import axios from 'axios';

const AxiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept' : 'application/json'
  },
  timeout: 9000,
});

// Intercepteur de requête : ajout du token
AxiosClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      // console.log('Token:', token);
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
    const { response } = error;

    if (response?.status === 401) {
      // Ne redirige pas ici. Laisse React gérer la déconnexion
      console.warn('Unauthorized - 401 reçu, à gérer dans React');
    }

    return Promise.reject(error);
  }
);


export default AxiosClient;
