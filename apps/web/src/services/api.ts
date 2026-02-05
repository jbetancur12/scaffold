import axios from 'axios';

const api = axios.create({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    withCredentials: true, // Important for HttpOnly cookies
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Handle 401, refresh token logic could go here
        return Promise.reject(error);
    }
);

export default api;
