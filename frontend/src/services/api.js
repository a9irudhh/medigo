import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const signup = (userData) => api.post('/users/signup', userData);
export const login = (credentials) => api.post('/users/login', credentials);
export const logout = () => api.post('/users/logout');
export const getProfile = () => api.get('/users/profile');
export const updateProfile = (profileData) => api.put('/users/profile', profileData);
export const verifyEmail = (token) => api.post('/users/verify-email', { token });
export const verifyPhone = (token) => api.post('/users/verify-phone', { token });
export const sendUserChat = (message) => api.post('/message', { message });

export default api;

