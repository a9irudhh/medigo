import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { resetPassword } from "../services/api";

const OtpVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { identifier } = location.state || {};
  const email = identifier;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const inputRefs = useRef([]);

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

  const handleVerify = async () => {
    const finalOtp = otp.join("");

    if (finalOtp.length !== 6) {
      alert("Please enter all 6 digits of the OTP.");
      return;
    }

    if (!password || !confirmPassword) {
      alert("Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    console.log("OTP:", finalOtp);
    console.log("Password:", password);

    // call reset-password API here
    try {
      await resetPassword(email, finalOtp, password);
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || 'Password reset failed. Please try again.');
      navigate('/login');
    }

  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-teal-100 to-white px-6">

      <div className="flex flex-grow justify-center items-center">

      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center ">
        <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
        <p className="text-gray-600 mt-2">
          Enter the 6-digit OTP and set your new password.
        </p>

        {/* OTP Section */}
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

        {/* Password Fields */}
        <div className="mt-8 text-left">
          <label className="block mb-1 text-gray-700 font-medium">
            New Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

          <label className="block mt-4 mb-1 text-gray-700 font-medium">
            Confirm Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
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

export default OtpVerificationPage;
