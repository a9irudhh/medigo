import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { forgotPassword } from "../services/api";

const EnterEmailPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("")

  
  const handleReceiveOTP = async () => {
    try {
      await forgotPassword(email);
      navigate('/reset-password', {state: {identifier: email}});
    } catch (err) {
      alert(err.response?.data?.message || 'Password reset failed. Please try again.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-teal-100 to-white px-6">
      

      <div className="flex flex-grow items-center max-w-2xl justify-center">

      <div className=" bg-white shadow-lg rounded-lg p-8 w-md text-center ">

        <h2 className="text-2xl font-bold text-gray-800">Confirm Email</h2>
        <p className="text-gray-600 mt-2">
          Enter the email to receive OTP.
        </p>
          <div className="mt-8 text-left">
          <label className="block mb-1 text-gray-700 font-medium">
            Email
          </label>
          <input
            type="email"
            placeholder="abc@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
        </div>

        {/* Verify Button */}
        <button
          onClick={handleReceiveOTP}
          className="mt-6 w-full py-2 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition"
          >
          Reset Password
        </button>

              </div>
      </div>
            
      <Footer />
    </div>
  );
};

export default EnterEmailPage;
