// pages/api/test-email.js
export default function handler(req, res) {
  console.log('=== Test Email API Called ===')
  console.log('Method:', req.method)
  console.log('Query:', req.query)
  console.log('Body:', req.body)

  // すべてのHTTPメソッドを許可
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // 環境変数チェック
    const envStatus = {
      EMAIL_HOST_EXISTS: !!process.env.EMAIL_HOST,
      EMAIL_USER_EXISTS: !!process.env.EMAIL_USER,
      EMAIL_PASSWORD_EXISTS: !!process.env.EMAIL_PASSWORD,
      EMAIL_HOST_VALUE: process.env.EMAIL_HOST,
      EMAIL_USER_VALUE: process.env.EMAIL_USER,
      PASSWORD_LENGTH: process.env.EMAIL_PASSWORD?.length || 0
    }
    
    console.log('Environment status:', envStatus)
    
    const testEmail = req.query?.email || req.body?.email || 'default@example.com'
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

    return res.status(200).json({
      success: true,
      message: 'テストAPI動作確認',
      method: req.method,
      testEmail: testEmail,
      timestamp: timestamp,
      env: envStatus
    })

  } catch (error) {
    console.error('Test API error:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}