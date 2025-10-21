import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
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
    
    return res.status(200).json({ 
      success: true, 
      messages,
      count: messages.length,
      roomId
    });
  } catch (error) {
    console.error(' Erro ao buscar mensagens:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
