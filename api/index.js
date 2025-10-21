export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({ 
    message: 'MyAnsiry Chat API OK',
    status: 'online',
    timestamp: Date.now(),
    endpoints: [
      'GET  /api',
      'POST /api/join',
      'POST /api/message',
      'GET  /api/messages?roomId=ROOM_ID'
    ]
  });
}
