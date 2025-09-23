import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import UpdateProfilePage from './pages/UpdateProfilePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyPhonePage from './pages/VerifyPhonePage';
import useAuthStore from './store/authStore';
import ChatPage from './pages/ChatPage';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/update-profile" element={<PrivateRoute><UpdateProfilePage /></PrivateRoute>} />
          <Route path="/verify-email" element={<PrivateRoute><VerifyEmailPage /></PrivateRoute>} />
          <Route path="/verify-phone" element={<PrivateRoute><VerifyPhonePage /></PrivateRoute>} /> */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/update-profile" element={<UpdateProfilePage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify-phone" element={<VerifyPhonePage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;