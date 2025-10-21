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
    
    return res.status(200).json({ 
      success: true, 
      message: 'Mensagem enviada',
      data: message
    });
  } catch (error) {
    console.error(' Erro ao enviar mensagem:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
