import axios from 'axios';

const api = axios.create({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    withCredentials: true, // Important for HttpOnly cookies
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Optional: Handle token expiration/refresh or redirect to login
            localStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

export default api;
