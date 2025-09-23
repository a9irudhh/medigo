import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  AppBar,
  Toolbar,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PersonIcon from '@mui/icons-material/Person';
import { Link } from 'react-router-dom';

const BOT_AVATAR = <Avatar sx={{ bgcolor: '#10a37f' }}><MedicalServicesIcon /></Avatar>;
const USER_AVATAR = <Avatar sx={{ bgcolor: '#1976d2' }}><PersonIcon /></Avatar>;

const ChatPage = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `You said: "${userMsg.text}"`
        }
      ]);
      setLoading(false);
    }, 1200);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <Box sx={{ bgcolor: '#f7f7f8', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: '#10a37f' }} elevation={0}>
        <Toolbar>
          <LocalHospitalIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            component={Link}
            to="/profile"
          >
            Medigo
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2, pb: 10 }}>
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: 700,
            minHeight: 500,
            maxHeight: '70vh',
            overflowY: 'auto',
            p: 2,
            mb: 2,
            borderRadius: 3,
            bgcolor: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}
        >
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                mb: 2
              }}
            >
              {msg.sender === 'user' ? USER_AVATAR : BOT_AVATAR}
              <Box
                sx={{
                  ml: msg.sender === 'user' ? 0 : 2,
                  mr: msg.sender === 'user' ? 2 : 0,
                  maxWidth: '80%',
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    bgcolor: msg.sender === 'user' ? '#e6f0ff' : '#f3f3f3',
                    borderRadius: 2,
                    boxShadow: 'none',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {msg.text}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {BOT_AVATAR}
              <Box sx={{ ml: 2 }}>
                <Paper sx={{ p: 1.5, bgcolor: '#f3f3f3', borderRadius: 2, boxShadow: 'none' }}>
                  <CircularProgress size={20} sx={{ color: '#10a37f' }} />
                </Paper>
              </Box>
            </Box>
          )}
          <div ref={chatEndRef} />
        </Paper>
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 700,
            width: '100%',
            p: 2,
            borderRadius: 0,
            bgcolor: '#fff',
            boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Send a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            sx={{ mr: 2 }}
            disabled={loading}
          />
          <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
    </Box>
  );
};

export default ChatPage;
