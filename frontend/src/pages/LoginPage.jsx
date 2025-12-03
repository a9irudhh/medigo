import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import useAuthStore from '../store/authStore';
import Footer from '../components/Footer';
import VisibilityIcon  from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {forgotPassword} from '../services/api';
import FloatingIcons from '../components/FloatingIcons';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const authLogin = useAuthStore((state) => state.login);

  const handleForgotPassword = async () => {
    if (!identifier) {
      alert("Please enter your email or phone number to reset your password.");
      return;
    } else {
      try {
        // await forgotPassword(identifier);
        // alert("If the provided email/phone is registered, a password reset link/OTP has been sent.");

        // navigate to a dedicated forgot password page to enter the OTP
        navigate('/email');
      } catch (err) {
        alert("Failed to initiate password reset. Please try again later.");
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await login({ identifier, password });
      console.log('Login response data:', data);
      authLogin(data.data.user, data.data.token);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-teal-100 to teal-50'>
      <FloatingIcons/>
    <div className="flex flex-grow items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-xl">
        <div>
            <h2 className="text-3xl font-extrabold text-center text-gray-900">
                Welcome Back to MediGo
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
                Your health, simplified.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
              Email or Phone
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="john.doe@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              />
          </div>

            <label htmlFor="password" a className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
          <div className='relative w-full'>
            <input
              id="password"
              name="password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            />
            <button type='button' onClick={() => (setShowPass(prev => !prev))}
             className='absolute inset-y-0 right-3 flex items-center text-gray-500 mb-8'
             >
              {
                showPass ?
                <VisibilityOffIcon className='' />:
                <VisibilityIcon className=''/>
              }
            </button>
            <button type='button' onClick={handleForgotPassword} className='w-full text-sm text-right mt-3 text-gray-400'>Forgot Password?</button>
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium border-1 text-blue-500 hover:text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
      <Footer />
              </div>
  );
};

export default LoginPage;
