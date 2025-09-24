import React, { useState } from 'react';
// import Input from '../components/Input';
// import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { verifyEmail } from '../services/api';
import Header from '../components/Header';

const VerifyEmailPage = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await verifyEmail(token);
      setMessage('Your email has been successfully verified!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Header />
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center">Verify Your Email</h2>
        <p className="text-center text-gray-600">Enter the 6-digit code sent to your email address.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            name="token"
            type="text"
            placeholder="Verification Code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            required
            />
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium border-2 text-blue-500 hover:text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
            {loading ? <Spinner /> : 'Verify Email'}
          </button>
        </form>
      </div>
    </div>
            </>
  );
};

export default VerifyEmailPage;