import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';;
import Spinner from '../components/Spinner';
import { verifyEmail } from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProfile, sendEmailVerificationOTP } from '../services/api';
import useAuthStore from '../store/authStore';
// import { set } from 'mongoose';

const VerifyEmailPage = ( {setReload} ) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { user, setUser } = useAuthStore();

  const inputRefs = useRef([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    console.log('Submitting token:', otp);
    const finalOtp = otp.join("");

    if (finalOtp.length !== 6) {
      alert("Please enter all 6 digits of the OTP.");
      return;
    }

    console.log("OTP:", finalOtp);

    try {
      await verifyEmail(finalOtp);
      setMessage('Your email has been successfully verified!');
      
      
      const { data } = await getProfile();
      setUser(data.data.user);
      console.log("Updated user data after verification:", data.data.user); 
      setTimeout(() => {
        navigate('/profile', {state: {fromVerification: true}} );
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
      // alert("Email verification Failed!");
      navigate('/profile', { state: {fromVerification: false}});
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendEmailVerificationOTP();
      setMessage('A new OTP has been sent to your email address.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpBackspace = (e, index) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <>
    <Header />
    <div className="flex flex-col items-center justify-center min-h-[90vh] bg-gradient-to-b from-teal-50 to-white">
      <div className="flex flex-grow flex-col max-w-lg justify-center p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center">Verify Your Email</h2>
        <p className="text-center text-gray-600">Enter the 6-digit code sent to your email address.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-3 mt-6">
          {otp.map((digit, i) => (
            <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(e.target.value, i)}
            onKeyDown={(e) => handleOtpBackspace(e, i)}
              className="w-12 h-12 text-center border border-gray-300 rounded-md text-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          ))}
        </div>
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}

          <div 
          onClick={handleResend} 
          disabled={loading}
          className="text-center justify-center  px-4 text-blue-500 pointer pt-16">
          
          
            {loading ? <Spinner /> : 'Resend OTP'}
          </div>

          <button type="submit" disabled={loading}
          className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium border-1 text-blue-500 hover:text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
            {loading ? <Spinner /> : 'Verify Email'}
          </button>
        </form>
      </div>
    <Footer />
    </div>
            </>
  );
};

export default VerifyEmailPage;