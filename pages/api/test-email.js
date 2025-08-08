// pages/api/test-email.js（メールテスト用API）
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Email configuration check:')
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST)
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT)
    console.log('EMAIL_USER:', process.env.EMAIL_USER)
    console.log('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD)

    // メール設定のテスト
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false, // PORT 587の場合
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true, // デバッグモード
      logger: true // ログ出力
    })

    // 接続テスト
    console.log('Testing SMTP connection...')
    await transporter.verify()
    console.log('SMTP connection successful')

    // テストメール送信
    const { testEmail } = req.body
    if (!testEmail) {
      return res.status(400).json({ error: 'testEmail is required' })
    }

    const mailOptions = {
      from: {
        name: '空の森クリニック テスト',
        address: process.env.EMAIL_USER
      },
      to: testEmail,
      subject: 'メール送信テスト',
      text: 'これはメール送信のテストです。',
      html: `
        <h2>メール送信テスト</h2>
        <p>これはメール送信のテストです。</p>
        <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
      `
    }

    console.log('Sending test email to:', testEmail)
    const info = await transporter.sendMail(mailOptions)
    console.log('Test email sent successfully:', info.messageId)

    res.status(200).json({
      success: true,
      message: 'テストメールを送信しました',
      messageId: info.messageId,
      response: info.response
    })

  } catch (error) {
    console.error('Email test error:', error)
    res.status(500).json({
      error: 'メール送信テストに失敗しました',
      details: error.message,
      code: error.code
    })
  }
}