import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div className='min-h-screen flex flex-col'>

        <div className="flex flex-grow flex-col items-center justify-center bg-gradient-to-b from-gray-300 to-white text-center px-6">
      <h1 className="text-9xl font-extrabold text-teal-500">404</h1>

      <h2 className="text-3xl font-bold text-gray-800 mt-4">
        Page Not Found
      </h2>

      <p className="text-gray-600 mt-2">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <button
        onClick={() => navigate("/")}
        className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-all"
        >
        Go to Home
      </button>
          </div>
          <Footer />
    </div>
    )
}

export default NotFoundPage;