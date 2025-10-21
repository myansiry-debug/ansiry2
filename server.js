import express from 'express';
import cors from 'cors';
import { Redis } from '@upstash/redis';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'MyAnsiry Chat API OK',
    status: 'online',
    timestamp: Date.now(),
    endpoints: [
      'GET  /',
      'POST /join',
      'POST /message',
      'GET  /messages?roomId=ROOM_ID'
    ]
  });
});

// Join room
app.post('/join', async (req, res) => {
  try {
    const { roomId, userName, userId } = req.body;
    
    if (!roomId || !userName) {
      return res.status(400).json({ error: 'Missing required fields: roomId and userName' });
    }
    
    const usersKey = `room:${roomId}:users`;
    const userKey = `user:${userId || userName}`;
    
    const user = {
      id: userId || `user-${Date.now()}`,
      name: userName,
      joinedAt: Date.now(),
      isOnline: true
    };
    
    await redis.hset(usersKey, { [userKey]: JSON.stringify(user) });
    await redis.expire(usersKey, 86400);
    
    const messagesKey = `room:${roomId}:messages`;
    const systemMessage = {
      id: `system-${Date.now()}`,
      userId: 'system',
      userName: 'Sistema',
      text: `${userName} entrou na sala`,
      timestamp: Date.now(),
      type: 'system',
      roomId,
    };
    
    await redis.lpush(messagesKey, JSON.stringify(systemMessage));
    await redis.ltrim(messagesKey, 0, 99);
    
    console.log(` ${userName} entrou na sala ${roomId}`);
    
    res.json({ 
      success: true, 
      message: 'Entrou na sala',
      user
    });
  } catch (error) {
    console.error(' Erro ao entrar na sala:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Send message
app.post('/message', async (req, res) => {
  try {
    const { roomId, text, userName, userId, timestamp, type } = req.body;
    
    if (!roomId || !text || !userName) {
      return res.status(400).json({ error: 'Missing required fields: roomId, text, userName' });
    }
    
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: userId || 'http-user',
      userName,
      text,
      timestamp: timestamp || Date.now(),
      type: type || 'text',
      roomId,
    };
    
    const messagesKey = `room:${roomId}:messages`;
    
    await redis.lpush(messagesKey, JSON.stringify(message));
    await redis.ltrim(messagesKey, 0, 99);
    await redis.expire(messagesKey, 86400);
    
    console.log(` Mensagem salva: ${text} de ${userName} na sala ${roomId}`);
    
    res.json({ 
      success: true, 
      message: 'Mensagem enviada',
      data: message
    });
  } catch (error) {
    console.error(' Erro ao enviar mensagem:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get messages
app.get('/messages', async (req, res) => {
  try {
    const { roomId, limit = '50' } = req.query;
    
    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }
    
    const messagesKey = `room:${roomId}:messages`;
    const limitNum = parseInt(limit, 10);
    
    const messagesData = await redis.lrange(messagesKey, 0, limitNum - 1);
    
    const messages = messagesData
      .map((msg) => {
        try {
          return typeof msg === 'string' ? JSON.parse(msg) : msg;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
    
    console.log(` ${messages.length} mensagens recuperadas da sala ${roomId}`);
    
    res.json({ 
      success: true, 
      messages,
      count: messages.length,
      roomId
    });
  } catch (error) {
    console.error(' Erro ao buscar mensagens:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(` MyAnsiry Chat API rodando na porta ${port}`);
});
