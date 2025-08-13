// pages/api/send-email.js
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
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

    console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER)
    console.log('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD)

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return res.status(500).json({ 
        error: 'メール設定が不完全です',
        missing: {
          user: !process.env.EMAIL_USER,
          password: !process.env.EMAIL_PASSWORD
        }
      })
    }

    // 正しい関数名を使用
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    await transporter.verify()
    console.log('✅ SMTP connection verified')

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

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully:', info.messageId)

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