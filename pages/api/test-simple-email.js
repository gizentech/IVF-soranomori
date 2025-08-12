// pages/api/test-simple-email.js (新規作成)
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Simple Email Test ===')
    
    const { email } = req.body
    const testEmail = email || 'dx.soranomori@gmail.com'

    // Gmail SMTP設定
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    // 接続テスト
    await transporter.verify()
    console.log('SMTP connection verified')

    // シンプルなテストメール送信
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: 'テストメール - 空の森クリニック',
      text: 'これはテストメールです。メール送信機能が正常に動作しています。',
      html: `
        <h2>テストメール送信成功</h2>
        <p>これはテストメールです。</p>
        <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
        <p>空の森クリニック イベント事務局</p>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    
    console.log('Test email sent successfully:', info.messageId)

    return res.status(200).json({
      success: true,
      message: 'テストメール送信成功',
      messageId: info.messageId,
      to: testEmail
    })

  } catch (error) {
    console.error('Test email failed:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    })
  }
}