// pages/api/send-email.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Send Email API Called ===')
    console.log('Request body:', req.body)

    const { to, subject, html, text, data } = req.body

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' })
    }

    // 環境変数チェック
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      return res.status(500).json({ 
        error: 'メール設定が不完全です',
        missingVars 
      })
    }

    console.log('Environment variables OK')
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST)
    console.log('EMAIL_USER:', process.env.EMAIL_USER)

    // nodemailerをrequireで読み込み（Vercel対応）
    const nodemailer = require('nodemailer')
    console.log('nodemailer loaded:', typeof nodemailer)
    console.log('createTransporter:', typeof nodemailer.createTransporter)

    const transporterConfig = {
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true,
      logger: false // ログを簡潔にする
    }

    console.log('Creating transporter...')
    const transporter = nodemailer.createTransporter(transporterConfig)

    console.log('Verifying SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection verified')

    const mailOptions = {
      from: {
        name: '空の森クリニック イベント事務局',
        address: process.env.EMAIL_USER
      },
      to: to,
      subject: subject,
      text: text,
      html: html
    }

    console.log('Sending email...')
    console.log('To:', to)
    console.log('Subject:', subject)

    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email sent successfully')
    console.log('Message ID:', info.messageId)
    console.log('Response:', info.response)

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      response: info.response
    })

  } catch (error) {
    console.error('❌ Email sending failed:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    })

    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    })
  }
}