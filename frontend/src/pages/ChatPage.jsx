import React, { useState, useRef, useEffect } from 'react';
import BotIcon from '../icons/BotIcon';
import UserIcon from '../icons/UserIcon';
import SendIcon from '../icons/SendIcon';
import Header from '../components/Header';

const ChatPage = () => {
  // --- State Management ---
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am Medigo, your personal health assistant. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);


  // --- Effects ---
  // Effect to scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Effect to focus the input field on initial load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);


  // --- Event Handlers ---
  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate bot response with a delay
    setTimeout(() => {
      // A mock response that seems more contextual
      const botResponse = `Thank you for your message about: "${userMsg.text}". Please remember, I am an AI assistant and not a medical professional. For any health concerns, it is crucial to consult with a qualified doctor.`;
      
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: botResponse,
        },
      ]);
      setLoading(false);
      // Re-focus the input after the bot responds
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 1500);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent new line on enter
      handleSend();
    }
  };


  // --- Render ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <Header />

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-[60%] mx-auto space-y-8">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar */}
              {msg.sender === 'bot' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white">
                  <BotIcon className="w-5 h-5" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[60%] p-4 rounded-2xl shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* User Avatar */}
              {msg.sender === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-4 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white">
                  <BotIcon className="w-5 h-5" />
              </div>
              <div className="max-w-lg p-4 rounded-2xl shadow-sm bg-white text-gray-800 rounded-bl-none border border-gray-100">
                <div className="flex items-center justify-center space-x-1">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white/80 backdrop-blur-md p-4 border-t border-gray-200">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Send a message..."
            className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none transition-shadow duration-200 shadow-sm"
            rows="1"
            disabled={loading}
            style={{paddingTop: '0.75rem', paddingBottom: '0.75rem'}}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;


// import React, { useState, useRef, useEffect } from 'react';
// import {
//   Box,
//   Paper,
//   Typography,
//   TextField,
//   IconButton,
//   Avatar,
//   AppBar,
//   Toolbar,
//   CircularProgress
// } from '@mui/material';
// import SendIcon from '@mui/icons-material/Send';
// import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
// import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
// import PersonIcon from '@mui/icons-material/Person';
// import { Link } from 'react-router-dom';

// const BOT_AVATAR = <Avatar sx={{ bgcolor: '#10a37f' }}><MedicalServicesIcon /></Avatar>;
// const USER_AVATAR = <Avatar sx={{ bgcolor: '#1976d2' }}><PersonIcon /></Avatar>;

// const ChatPage = () => {
//   const [messages, setMessages] = useState([
//     {
//       sender: 'bot',
//       text: 'Hello! How can I help you today?'
//     }
//   ]);
//   const [input, setInput] = useState('');
//   const [loading, setLoading] = useState(false);
//   const chatEndRef = useRef(null);

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const handleSend = () => {
//     if (!input.trim()) return;
//     const userMsg = { sender: 'user', text: input };
//     setMessages(prev => [...prev, userMsg]);
//     setInput('');
//     setLoading(true);
//     // Simulate bot response
//     setTimeout(() => {
//       setMessages(prev => [
//         ...prev,
//         {
//           sender: 'bot',
//           text: `You said: "${userMsg.text}"`
//         }
//       ]);
//       setLoading(false);
//     }, 1200);
//   };

//   const handleInputKeyDown = (e) => {
//     if (e.key === 'Enter') {
//       handleSend();
//     }
//   };

//   return (
//     <Box sx={{ bgcolor: '#f7f7f8', minHeight: '100vh' }}>
//       <AppBar position="static" sx={{ bgcolor: '#10a37f' }} elevation={0}>
//         <Toolbar>
//           <LocalHospitalIcon sx={{ mr: 1 }} />
//           <Typography
//             variant="h6"
//             sx={{ fontWeight: 700, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
//             component={Link}
//             to="/profile"
//           >
//             Medigo
//           </Typography>
//         </Toolbar>
//       </AppBar>
//       <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2, pb: 10 }}>
//         <Paper
//           elevation={3}
//           sx={{
//             width: '100%',
//             maxWidth: 700,
//             minHeight: 500,
//             maxHeight: '70vh',
//             overflowY: 'auto',
//             p: 2,
//             mb: 2,
//             borderRadius: 3,
//             bgcolor: '#fff',
//             boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
//           }}
//         >
//           {messages.map((msg, idx) => (
//             <Box
//               key={idx}
//               sx={{
//                 display: 'flex',
//                 flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
//                 alignItems: 'flex-start',
//                 mb: 2
//               }}
//             >
//               {msg.sender === 'user' ? USER_AVATAR : BOT_AVATAR}
//               <Box
//                 sx={{
//                   ml: msg.sender === 'user' ? 0 : 2,
//                   mr: msg.sender === 'user' ? 2 : 0,
//                   maxWidth: '80%',
//                 }}
//               >
//                 <Paper
//                   sx={{
//                     p: 1.5,
//                     bgcolor: msg.sender === 'user' ? '#e6f0ff' : '#f3f3f3',
//                     borderRadius: 2,
//                     boxShadow: 'none',
//                   }}
//                 >
//                   <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
//                     {msg.text}
//                   </Typography>
//                 </Paper>
//               </Box>
//             </Box>
//           ))}
//           {loading && (
//             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
//               {BOT_AVATAR}
//               <Box sx={{ ml: 2 }}>
//                 <Paper sx={{ p: 1.5, bgcolor: '#f3f3f3', borderRadius: 2, boxShadow: 'none' }}>
//                   <CircularProgress size={20} sx={{ color: '#10a37f' }} />
//                 </Paper>
//               </Box>
//             </Box>
//           )}
//           <div ref={chatEndRef} />
//         </Paper>
//         <Paper
//           elevation={3}
//           sx={{
//             position: 'fixed',
//             bottom: 0,
//             left: '50%',
//             transform: 'translateX(-50%)',
//             maxWidth: 700,
//             width: '100%',
//             p: 2,
//             borderRadius: 0,
//             bgcolor: '#fff',
//             boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
//             display: 'flex',
//             alignItems: 'center',
//             zIndex: 10
//           }}
//         >
//           <TextField
//             fullWidth
//             variant="outlined"
//             placeholder="Send a message..."
//             value={input}
//             onChange={e => setInput(e.target.value)}
//             onKeyDown={handleInputKeyDown}
//             sx={{ mr: 2 }}
//             disabled={loading}
//           />
//           <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
//             <SendIcon />
//           </IconButton>
//         </Paper>
//       </Box>
//     </Box>
//   );
// };

// export default ChatPage;
