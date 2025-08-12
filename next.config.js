/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'qrcode', 'nodemailer']
  },
  
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    
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
      } else {
        console.log('✅ All Firebase environment variables are set')
      }

      // Email設定確認
      const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
      console.log(`Email Config: ${hasEmailConfig ? '✅ Configured' : '❌ Not configured'}`)
      
      if (hasEmailConfig) {
        console.log(`   - User: ${process.env.EMAIL_USER}`)
        console.log(`   - Password: [REDACTED]`)
      }
    }
    
    return config
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
    ]
  },

  trailingSlash: true,
  
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig