import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import UpdateProfilePage from './pages/UpdateProfilePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyEmailPage2 from './pages/VerifyEmailPage copy';
import useAuthStore from './store/authStore';
import ChatPage from './pages/ChatPage';
import OtpVerificationPage from './pages/OtpVerificationPage';
import NotFoundPage from './pages/NotFoundPage';
import Footer from './components/Footer';
import EnterEmailPage from './pages/EnterEmailPage';

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
          <Route path="/email" element={<EnterEmailPage />} />
          <Route path="/home" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/update-profile" element={<PrivateRoute><UpdateProfilePage /></PrivateRoute>} />
          <Route path="/verify-email" element={<PrivateRoute><VerifyEmailPage2 /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/reset-password" element={<OtpVerificationPage />} />
          <Route path="/*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;