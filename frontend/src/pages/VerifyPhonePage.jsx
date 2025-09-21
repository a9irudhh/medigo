import React, { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { verifyPhone } from '../services/api';

const VerifyPhonePage = () => {
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
      await verifyPhone(token);
      setMessage('Your phone number has been successfully verified!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center">Verify Your Phone</h2>
        <p className="text-center text-gray-600">Enter the 6-digit code sent to your phone.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            name="token"
            type="text"
            placeholder="Verification Code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Verify Phone'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VerifyPhonePage;