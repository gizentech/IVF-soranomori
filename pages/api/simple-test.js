// pages/api/simple-test.js
export default function handler(req, res) {
  console.log('Simple test API called')
  console.log('Method:', req.method)
  console.log('Query:', req.query)
  
  res.status(200).json({
    success: true,
    message: 'Simple API test successful',
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString()
  })
}