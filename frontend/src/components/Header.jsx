import UserIcon from '../icons/UserIcon';
import BotIcon from '../icons/BotIcon';
import { useNavigate, Link } from 'react-router-dom';
// --- Icon Components (included for a self-contained example) ---




// --- Refactored Header Component ---

const Header = () => {
    const navigate = useNavigate();
    /**
     * A demo function that gets triggered when the user icon is clicked.
     * In a real application, this could navigate to a profile page,
     * open a user menu, or trigger a logout flow.
     */
    const handleUserIconClick = () => {
        console.log('User icon clicked!');
        navigate('/profile');
    };

    return (
        <header className="bg-white border-b border-gray-200 p-4">
            {/* Main container using flexbox */}
            <div className="max-w-[95%] mx-auto flex items-center">
                {/* 1. Left Spacer: Takes up 1/3 of the space, pushing the title to the center. */}
                <div className="flex-1">
                    {/* Future navigation links can be placed here */}
                </div>

                {/* 2. Centered Title: Will not shrink and stays in the middle. */}
                <Link to="/home" >
                <div className="flex-shrink-0">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center">
                        <BotIcon className="w-6 h-6 mr-2 text-teal-600" />
                        MediGo Assistant
                    </h1>
                </div>
                </Link>

                {/* 3. Right Icon Container: Takes up 1/3 of the space and pushes its content to the end. */}
                <div className="flex-1 flex justify-end">
                    <button
                        onClick={handleUserIconClick}
                        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-200"
                        aria-label="View User Profile"
                    >
                        <UserIcon className="w-6 h-6 text-gray-700" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
// --- Original Header Component (commented out) ---
// import BotIcon from "../icons/BotIcon";
// import UserIcon from "../icons/UserIcon";

// const Header = () => {
//     return (
//         <header className="bg-white border-b border-gray-200 p-4">
//         <div className="max-w-[95%] mx-auto">
//           <h1 className="text-xl font-bold text-gray-800 flex items-center">
//             <BotIcon className="w-6 h-6 mr-2 text-teal-600" />
//             Medigo Assistant
//           </h1>
//         </div>
//       </header>
//     )
// }

// export default Header;
