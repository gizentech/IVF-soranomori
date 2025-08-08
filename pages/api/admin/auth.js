// pages/api/admin/auth.js
export default function handler(req, res) {
  // Basic認証の設定を環境変数から取得
  const basicAuthUser = process.env.BASIC_AUTH_USER
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD

  console.log('Auth API called')
  console.log('User from env:', basicAuthUser)
  console.log('Password configured:', !!basicAuthPassword)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 認証情報が設定されているかチェック
  if (!basicAuthUser || !basicAuthPassword) {
    return res.status(500).json({ 
      error: 'Authentication not configured',
      hasUser: !!basicAuthUser,
      hasPassword: !!basicAuthPassword
    })
  }

  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')

    console.log('Received username:', username)
    console.log('Expected username:', basicAuthUser)
    console.log('Password match:', password === basicAuthPassword)

    if (username === basicAuthUser && password === basicAuthPassword) {
      return res.status(200).json({ 
        success: true, 
        message: 'Authentication successful',
        user: username
      })
    } else {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        providedUser: username,
        expectedUser: basicAuthUser
      })
    }
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(400).json({ error: 'Invalid authorization format' })
  }
}