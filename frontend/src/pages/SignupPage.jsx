import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../services/api';
import useAuthStore from '../store/authStore';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
    gender: 'male',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const authLogin = useAuthStore((state) => state.login);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await signup(formData);
      authLogin(data.data.user, data.data.token);
      navigate('/verify-email');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formInputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary";
  const formLabelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="flex items-center justify-center min-h-screen py-12 bg-gradient-to-b from-teal-100 to teal-50">
      <div className="w-full max-w-3xl p-8 space-y-8 bg-white rounded-lg shadow-xl">
        <div>
            <h2 className="text-3xl font-extrabold text-center text-gray-900">
                Create Your MediGo Account
            </h2>
             <p className="mt-2 text-center text-sm text-gray-600">
                Join us to manage your health appointments seamlessly.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label htmlFor="firstName" className={formLabelClass}>First Name</label>
                    <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} required className={formInputClass} />
                </div>
                <div>
                    <label htmlFor="lastName" className={formLabelClass}>Last Name</label>
                    <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} required className={formInputClass} />
                </div>
                <div>
                    <label htmlFor="email" className={formLabelClass}>Email Address</label>
                    <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className={formInputClass} />
                </div>
                 <div>
                    <label htmlFor="phone" className={formLabelClass}>Phone Number</label>
                    <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required className={formInputClass} />
                </div>
                <div>
                    <label htmlFor="password" className={formLabelClass}>Password</label>
                    <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required className={formInputClass} />
                </div>
                <div>
                    <label htmlFor="dateOfBirth" className={formLabelClass}>Date of Birth</label>
                    <input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required className={formInputClass} />
                </div>
                 <div>
                    <label htmlFor="gender" className={formLabelClass}>Gender</label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={formInputClass}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="street" className={formLabelClass}>Street</label>
                    <input id="street" name="address.street" type="text" value={formData.address.street} onChange={handleChange} className={formInputClass} />
                </div>
                <div>
                    <label htmlFor="city" className={formLabelClass}>City</label>
                    <input id="city" name="address.city" type="text" value={formData.address.city} onChange={handleChange} required className={formInputClass} />
                </div>
                <div>
                    <label htmlFor="state" className={formLabelClass}>State</label>
                    <input id="state" name="address.state" type="text" value={formData.address.state} onChange={handleChange} required className={formInputClass} />
                </div>
                 <div>
                    <label htmlFor="zipCode" className={formLabelClass}>ZIP Code</label>
                    <input id="zipCode" name="address.zipCode" type="text" value={formData.address.zipCode} onChange={handleChange} required className={formInputClass} />
                </div>
                 <div>
                    <label htmlFor="country" className={formLabelClass}>Country</label>
                    <input id="country" name="address.country" type="text" value={formData.address.country} onChange={handleChange} required className={formInputClass} />
                </div>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            
            <div>
                 <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-500 hover:text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
                    >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </div>
        </form>

         <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;

