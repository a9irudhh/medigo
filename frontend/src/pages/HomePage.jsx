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
            className="flex items-center justify-center h-[calc(100vh-300px)]">
                <button 
                onClick={handleClick}
                className="flex flex-row items-center gap-3
                bg-teal-100 p-4 rounded-full px-6 pr-8 text-3xl"
                ><PlusIcon /> New Chat</button>
            </div>
        </>
    )
}

export default HomePage