import { useState } from 'react';
import { useNavigate } from 'react-router-dom';;
import Spinner from '../components/Spinner';
import { verifyEmail } from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { sendEmailVerificationOTP } from '../services/api';

const VerifyEmailPage = ( {setReload} ) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    console.log('Submitting token:', otp);
    try {
      await verifyEmail(otp);
      setMessage('Your email has been successfully verified!');
      alert("Email verified successfully!");
      setReload(prev => !prev);
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
      // alert("Email verification Failed!");
      navigate('/profile');
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    await sendEmailVerificationOTP();
    setLoading(false);
  }

  return (
    <>
    <Header />
    <div className="flex items-center justify-center min-h-[70vh] bg-gradient-to-b from-teal-50 to-white">
      <div className="w-full max-w-md p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center">Verify Your Email</h2>
        <p className="text-center text-gray-600">Enter the 6-digit code sent to your email address.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="otp"
            type="text"
            placeholder="Verification Code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="text-center w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            required
            />
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}

          <p onClick={handleResend} disabled={loading}
          // className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium border-2 text-blue-500 hover:text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
          className="text-center justify-center  px-4 text-blue-500 pointer pt-16">
            {loading ? <Spinner /> : 'Resend OTP'}
          </p>

          <button type="submit" disabled={loading}
          className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium border-1 text-blue-500 hover:text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
            {loading ? <Spinner /> : 'Verify Email'}
          </button>
        </form>
      </div>
    </div>
    <Footer />
            </>
  );
};

export default VerifyEmailPage;