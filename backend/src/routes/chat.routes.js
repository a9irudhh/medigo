import express from 'express';
import {
    chatWithAgent,
    getConversationHistory,
    getUserConversations,
    startNewConversation,
    endConversation
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

// Chat routes
router.post('/message', chatWithAgent);
router.post('/start', startNewConversation);
router.get('/conversations', getUserConversations);
router.get('/conversations/:conversationId', getConversationHistory);
router.delete('/conversations/:conversationId', endConversation);

export default router;
