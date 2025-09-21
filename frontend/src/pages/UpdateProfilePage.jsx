import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { getProfile, updateProfile } from '../services/api';
import useAuthStore from '../store/authStore';

const UpdateProfilePage = () => {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        dateOfBirth: new Date(user.dateOfBirth).toISOString().split('T')[0],
      });
    } else {
      getProfile().then(res => {
        const userData = res.data.data.user;
        setFormData({
          ...userData,
          dateOfBirth: new Date(userData.dateOfBirth).toISOString().split('T')[0],
        });
      });
    }
  }, [user]);

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
      await updateProfile(formData);
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!formData) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;

  return (
    <div className="flex items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-800">Update Your Profile</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input name="firstName" type="text" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
          <Input name="lastName" type="text" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
          <Input name="phone" type="text" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required />
          <Input name="dateOfBirth" type="date" placeholder="Date of Birth" value={formData.dateOfBirth} onChange={handleChange} required />
          <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <Input name="bloodGroup" type="text" placeholder="Blood Group (e.g., O+)" value={formData.bloodGroup} onChange={handleChange} />
          <Input name="address.street" type="text" placeholder="Street Address" value={formData.address.street} onChange={handleChange} />
          <Input name="address.city" type="text" placeholder="City" value={formData.address.city} onChange={handleChange} required />
          <Input name="address.state" type="text" placeholder="State" value={formData.address.state} onChange={handleChange} required />
          <Input name="address.zipCode" type="text" placeholder="ZIP Code" value={formData.address.zipCode} onChange={handleChange} required />

          <div className="md:col-span-2">
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfilePage;