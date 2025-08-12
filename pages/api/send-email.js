// pages/api/send-email.js
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Send Email API Called ===')

    const { to, subject, html, text } = req.body

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' })
    }

    // 環境変数チェック
    console.log('Environment check:')
    console.log('EMAIL_HOST exists:', !!process.env.EMAIL_HOST)
    console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER)
    console.log('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD)
    console.log('EMAIL_USER value:', process.env.EMAIL_USER)

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return res.status(500).json({ 
        error: 'メール設定が不完全です',
        missing: {
          host: !process.env.EMAIL_HOST,
          user: !process.env.EMAIL_USER,
          password: !process.env.EMAIL_PASSWORD
        }
      })
    }

    // Gmail SMTP設定
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    console.log('Transporter created successfully')

    // SMTP接続テスト
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified')
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError.message)
      
      return res.status(500).json({
        success: false,
        error: 'SMTP接続に失敗しました',
        details: verifyError.message
      })
    }

    const mailOptions = {
      from: {
        name: '空の森クリニック イベント事務局',
        address: process.env.EMAIL_USER
      },
      to: to,
      subject: subject,
      text: text || 'メール本文がありません',
      html: html || '<p>メール本文がありません</p>'
    }

    console.log('Sending email to:', to)
    console.log('Email subject:', subject)
    
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email sent successfully')
    console.log('Message ID:', info.messageId)

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      response: info.response
    })

  } catch (error) {
    console.error('❌ Email sending failed:', error)

    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    })
  }
}