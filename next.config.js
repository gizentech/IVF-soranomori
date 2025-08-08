/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'qrcode']
  },
  
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    
    // 開発環境でのFirebase環境変数確認
    if (dev && isServer) {
      console.log('=== Environment Variables Check ===')
      
      const requiredFirebaseVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID'
      ]

      const missingVars = requiredFirebaseVars.filter(varName => !process.env[varName])
      
      if (missingVars.length > 0) {
        console.error('❌ Missing Firebase environment variables:')
        missingVars.forEach(varName => {
          console.error(`   - ${varName}`)
        })
        console.error('\nPlease check your .env.local file')
      } else {
        console.log('✅ All Firebase environment variables are set')
      }

      // Basic Auth 設定確認
      const hasBasicAuth = process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD
      console.log(`Basic Auth: ${hasBasicAuth ? '✅ Configured' : '❌ Not configured'}`)
      
      if (hasBasicAuth) {
        console.log(`   - User: ${process.env.BASIC_AUTH_USER}`)
        console.log(`   - Password: [REDACTED]`)
      }
    }
    
    return config
  },

  // 検索エンジン対策
  async headers() {
    return [
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
        ],
      },
    ]
  },

  // 静的エクスポート設定
  trailingSlash: true,
  
  // 画像最適化設定
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig