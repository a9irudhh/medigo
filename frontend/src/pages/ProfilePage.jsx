import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getProfile, logout as logoutUser } from '../services/api';
import Spinner from '../components/Spinner';

const ProfilePage = () => {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getProfile();
        setUser(data.data.user);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };
    if (!user) {
      fetchProfile();
    }
  }, [user, setUser]);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">My Profile</h1>
        <div className="space-y-4">
          <p><strong>Full Name:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> {user.email} <span className={`ml-2 text-sm px-2 py-1 rounded-full ${user.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{user.isEmailVerified ? 'Verified' : 'Not Verified'}</span></p>
          <p><strong>Phone:</strong> {user.phone} <span className={`ml-2 text-sm px-2 py-1 rounded-full ${user.isPhoneVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{user.isPhoneVerified ? 'Verified' : 'Not Verified'}</span></p>
          <p><strong>Date of Birth:</strong> {new Date(user.dateOfBirth).toLocaleDateString()}</p>
          <p><strong>Gender:</strong> {user.gender}</p>
          <p><strong>Blood Group:</strong> {user.bloodGroup || 'Not set'}</p>
          <div className="pt-4 mt-4 border-t">
            <h2 className="text-xl font-semibold mb-2">Address</h2>
            <p>{user.address.street}</p>
            <p>{user.address.city}, {user.address.state} {user.address.zipCode}</p>
            <p>{user.address.country}</p>
          </div>
        </div>
        <div className="mt-8 flex space-x-4">
          <Link to="/update-profile" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600">Update Profile</Link>
          <button onClick={handleLogout} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;