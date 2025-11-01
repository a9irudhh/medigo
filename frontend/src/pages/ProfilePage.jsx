import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { getProfile, logout as logoutUser } from "../services/api";
import Spinner from "../components/Spinner";
import Header from "../components/Header";

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
    navigate("/login");
  };

  const verifyEmail = () => {
    navigate('/verify-email');
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-teal-50 to-white py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8 md:p-10 border border-gray-100">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-teal-100 flex items-center justify-center text-4xl font-semibold text-teal-700">
              {user.fullName?.charAt(0)}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mt-4">{user.fullName}</h1>
            <p className="text-gray-500">{user.email}</p>
          </div>

          {/* Profile Info */}
          <div className="grid md:grid-cols-2 gap-6 text-gray-700">
            <div>
              <p>
                <span className="font-semibold">Email:</span> {user.email}
              <span onClick={!user.isEmailVerified && verifyEmail}
                className={`text-sm px-2 py-1 rounded-full ml-2 ${
                  user.isEmailVerified
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {user.isEmailVerified ? "Verified" : "Not Verified"}
              </span>
              </p>
            </div>
            <div>
              <p><span className="font-semibold">Phone:</span> {user.phone}
              <span
                className={`text-sm px-2 py-1 rounded-full ml-2`}
              >
              </span>
              </p>
            </div>
            <p><span className="font-semibold">Date of Birth:</span> {new Date(user.dateOfBirth).toLocaleDateString()}</p>
            <p><span className="font-semibold">Gender:</span> {user.gender}</p>
            <p><span className="font-semibold">Blood Group:</span> {user.bloodGroup || "Not set"}</p>
          </div>

          {/* Address Section */}
          <div className="mt-8 border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Address</h2>
            {user.address ? (
              <div className="text-gray-700 leading-relaxed">
                <p>{user.address.street}</p>
                <p>
                  {user.address.city}, {user.address.state} {user.address.zipCode}
                </p>
                <p>{user.address.country}</p>
              </div>
            ) : (
              <p className="text-gray-500 italic">No address provided</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/update-profile"
              className="px-6 py-2 border border-blue-500 text-blue-500 rounded-lg font-medium hover:bg-blue-500 hover:text-white transition"
            >
              Update Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
