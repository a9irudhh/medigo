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
export const verifyEmail = (otp) => api.post('/users/verify-email', { otp });
export const startConversationReq = () => api.post('/chat/message');  // Use proper start endpoint
export const sendUserChat = (message, conversationId) => api.post('/chat/message', { message, conversationId });
export const sendEmailVerificationOTP = () => api.post('/users/resend-email-otp');
export const forgotPassword = (email) => api.post('/users/forgot-password', { email });
export const resetPassword = (email, otp, newPassword) => api.post('/users/reset-password', {email, otp, newPassword});

export default api;

