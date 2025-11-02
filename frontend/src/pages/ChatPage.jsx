import React, { useState, useRef, useEffect } from 'react';
import BotIcon from '../icons/BotIcon';
import UserIcon from '../icons/UserIcon';
import SendIcon from '../icons/SendIcon';
import Header from '../components/Header';
import { sendUserChat, startConversationReq } from '../services/api';

const ChatPage = () => {
  // --- State Management ---
  const [messages, setMessages] = useState([]);
  // const [messages, setMessages] = useState([
  //   {
  //     sender: 'bot',
  //     text: 'Hello! I am Medigo, your personal health assistant. How can I help you today?',
  //   },
  // ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);


  const startConversation = async () => {
    try {
      const chatstartData = await startConversationReq()
      const chatData = chatstartData.data.data;
      setConversationId(chatData.conversationId);
      const intialChat = {
        sender: 'bot',
        text: chatData.message,
      }
      setMessages(prev => [...prev,intialChat]);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }
  // --- Effects ---
  // Effect to scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const startConversation = async () => {
    try {
      const chatstartData = await startConversationReq()
      const chatData = chatstartData.data.data;
      setConversationId(chatData.conversationId);
      const intialChat = {
        sender: 'bot',
        text: chatData.message,
      }
      setMessages((prev) => {
        if (prev.find((msg) => msg.text === intialChat.text)) {
          return prev;
        } else {
          return [...prev,intialChat]
        }
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }
    startConversation();
  }, []);

  // Effect to focus the input field on initial load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);


  // --- Event Handlers ---
  // const handleSend = () => {
  //   if (!input.trim() || loading) return;

  //   // sendUserChat
  //   const userMsg = { sender: 'user', text: input };
  //   setMessages(prev => [...prev, userMsg]);
  //   setInput('');
  //   setLoading(true);

  //   // Simulate bot response with a delay
  //   setTimeout(() => {
  //     // A mock response that seems more contextual

  //     const botResponse = 
  //     `Thank you for your message about: "${userMsg.text}". Please remember, I am an AI assistant and not a medical professional. For any health concerns, it is crucial to consult with a qualified doctor.`;
      
  //     setMessages(prev => [
  //       ...prev,
  //       {
  //         sender: 'bot',
  //         text: botResponse,
  //       },
  //     ]);
  //     setLoading(false);
  //     // Re-focus the input after the bot responds
  //     setTimeout(() => inputRef.current?.focus(), 100);
  //   }, 1500);

  // };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    console.log("Conversation id in the frontend ",conversationId);
    const serverResponse = await sendUserChat(input,conversationId);
    setMessages(prev => [...prev, { sender: 'bot', text: serverResponse.data.data.message }]);
    setConversationId(serverResponse.data.data.conversationId);
    console.log("Server response:", serverResponse.data.data.conversationId);
    // const botReply = serverResponse.data.data.reply;
  }



  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent new line on enter
      handleSend();
    }
  };


  // --- Render ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
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

