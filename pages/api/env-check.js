// pages/api/env-check.js
export default function handler(req, res) {
  console.log('Environment check API called')
  
  const envInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    vercel: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL
    },
    email: {
      EMAIL_HOST: process.env.EMAIL_HOST || 'NOT_SET',
      EMAIL_USER: process.env.EMAIL_USER || 'NOT_SET',
      EMAIL_PASSWORD_SET: !!process.env.EMAIL_PASSWORD,
      EMAIL_PASSWORD_LENGTH: process.env.EMAIL_PASSWORD?.length || 0
    }
  }

  console.log('Environment info:', envInfo)
  return res.status(200).json(envInfo)
}