import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const getProfile = () =>
  Promise.resolve({
    data: {
      data: {
        user: {
          firstName: "John",
          lastName: "Doe",
          phone: "1234567890",
          dateOfBirth: "1990-01-01",
          gender: "male",
          bloodGroup: "O+",
          address: {
            street: "123 Main St",
            city: "Anytown",
            state: "Anystate",
            zipCode: "12345",
          },
        },
      },
    },
  });
const updateProfile = (data) => {
  console.log("Updating profile with:", data);
  return Promise.resolve();
};
const useAuthStore = () => ({ user: null });

const UpdateProfilePage = () => {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // Show a loading state while fetching initial data
    if (!formData) {
      setLoading(true);
      if (user) {
        setFormData({
          ...user,
          dateOfBirth: new Date(user.dateOfBirth).toISOString().split("T")[0],
        });
        setLoading(false);
      } else {
        getProfile()
          .then((res) => {
            const userData = res.data.data.user;
            setFormData({
              ...userData,
              dateOfBirth: new Date(userData.dateOfBirth)
                .toISOString()
                .split("T")[0],
            });
          })
          .catch((err) => {
            setError("Failed to load profile data.");
            console.error(err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [user, formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await updateProfile(formData);
      // In a real app, you might show a success message before navigating
      // navigate('/profile');
      alert("Profile updated successfully!"); // Using alert for demo purposes
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!formData)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner /> <span className="ml-2">Loading Profile...</span>
      </div>
    );

  return (
    <>
      <Header />
      <div className="bg-gray-100 min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl p-8 space-y-8 bg-white rounded-2xl shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Update Your Profile
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Keep your personal and medical information up to date.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
          >
            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="123-456-7890"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Blood Group */}
            <div>
              <label
                htmlFor="bloodGroup"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Blood Group
              </label>
              <input
                id="bloodGroup"
                name="bloodGroup"
                type="text"
                placeholder="e.g., O+"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Street Address */}
            <div className="md:col-span-2">
              <label
                htmlFor="street"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Street Address
              </label>
              <input
                id="street"
                name="address.street"
                type="text"
                placeholder="123 Main Street"
                value={formData.address.street}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* City */}
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                City
              </label>
              <input
                id="city"
                name="address.city"
                type="text"
                placeholder="Anytown"
                value={formData.address.city}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* State */}
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                State
              </label>
              <input
                id="state"
                name="address.state"
                type="text"
                placeholder="Anystate"
                value={formData.address.state}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* ZIP Code */}
            <div className="md:col-span-2">
              <label
                htmlFor="zipCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ZIP Code
              </label>
              <input
                id="zipCode"
                name="address.zipCode"
                type="text"
                placeholder="12345"
                value={formData.address.zipCode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Submit Button and Error Message */}
            <div className="md:col-span-2 mt-4">
              {error && (
                <p className="text-sm text-red-600 text-center mb-4">{error}</p>
              )}
              <button
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? <Spinner /> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UpdateProfilePage;

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// // import Input from '../components/Input';
// // import Button from '../components/Button';
// import Spinner from '../components/Spinner';
// import { getProfile, updateProfile } from '../services/api';
// import useAuthStore from '../store/authStore';
// import Header from '../components/Header';

// const UpdateProfilePage = () => {
//   const [formData, setFormData] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const navigate = useNavigate();
//   const { user } = useAuthStore();

//   useEffect(() => {
//     if (user) {
//       setFormData({
//         ...user,
//         dateOfBirth: new Date(user.dateOfBirth).toISOString().split('T')[0],
//       });
//     } else {
//       getProfile().then(res => {
//         const userData = res.data.data.user;
//         setFormData({
//           ...userData,
//           dateOfBirth: new Date(userData.dateOfBirth).toISOString().split('T')[0],
//         });
//       });
//     }
//   }, [user]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name.includes('.')) {
//       const [parent, child] = name.split('.');
//       setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
//     } else {
//       setFormData(prev => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     try {
//       await updateProfile(formData);
//       navigate('/profile');
//     } catch (err) {
//       setError(err.response?.data?.message || 'Update failed.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!formData) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;

//   return (
//     <>
//     <Header />
//     <div className="flex items-center justify-center min-h-screen py-12">
//       <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-xl">
//         <h2 className="text-3xl font-bold text-center text-gray-800">Update Your Profile</h2>
//         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <input name="firstName" type="text" placeholder="First Name" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required />
//           <input name="lastName" type="text" placeholder="Last Name" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required />
//           <input name="phone" type="text" placeholder="Phone Number" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required />
//           <input name="dateOfBirth" type="date" placeholder="Date of Birth" value={formData.dateOfBirth} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required />
//           <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
//             <option value="male">Male</option>
//             <option value="female">Female</option>
//             <option value="other">Other</option>
//           </select>
//           <input name="bloodGroup" type="text" placeholder="Blood Group (e.g., O+)" value={formData.bloodGroup} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
//           <input name="address.street" type="text" placeholder="Street Address" value={formData.address.street} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
//           <input name="address.city" type="text" placeholder="City" value={formData.address.city} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
//           <input name="address.state" type="text" placeholder="State" value={formData.address.state} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
//           <input name="address.zipCode" type="text" placeholder="ZIP Code" value={formData.address.zipCode} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />

//           <div className="md:col-span-2">
//             {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
//             <button
//             className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium border-2 text-blue-500 hover:text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
//             type="submit" disabled={loading}>
//               {loading ? <Spinner /> : 'Save Changes'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//     </>
//   );
// };

// export default UpdateProfilePage;
