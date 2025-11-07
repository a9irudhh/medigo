import Header from "../components/Header"
import { useNavigate } from "react-router-dom"
import PlusIcon from "../icons/PlusIcon";

const HomePage = () => {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate('/chat');
    }
    return (
        <>
            <Header />
            <div
            className="flex flex-col items-center justify-center h-[calc(100vh-300px)] pt-10
                 bg-gradient-to-b from-teal-50 to-white">
                <button 
                onClick={handleClick}
                className="flex flex-row items-center gap-3
                bg-teal-100 p-4 rounded-full px-6 pr-8 text-3xl
                text-teal-700 font-semibold hover:bg-teal-200
                "
                ><PlusIcon /> New Chat</button>
                <p className="pt-5 text-center text-gray-500">Click on the <strong>New Chat</strong> button to interact with the <br/> <strong>Medigo Agent</strong> and Book an appointment with the Doctor</p>
            </div>
        </>
    )
}

export default HomePage