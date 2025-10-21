import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
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
    
    return res.status(200).json({ 
      success: true, 
      message: 'Entrou na sala',
      user
    });
  } catch (error) {
    console.error(' Erro ao entrar na sala:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
