// pages/api/test-gmail.js
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Gmail Test ===')
    
    // 環境変数確認
    const emailUser = process.env.EMAIL_USER
    const emailPassword = process.env.EMAIL_PASSWORD
    
    console.log('EMAIL_USER:', emailUser)
    console.log('EMAIL_PASSWORD exists:', !!emailPassword)
    console.log('EMAIL_PASSWORD length:', emailPassword?.length || 0)

    if (!emailUser || !emailPassword) {
      return res.status(500).json({
        error: '環境変数が設定されていません',
        hasUser: !!emailUser,
        hasPassword: !!emailPassword
      })
    }

    // Gmail設定（createTransport に修正）
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      debug: true,
      logger: true
    })

    // 接続テスト
    console.log('Testing SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection successful')

    // テストメール送信
    const testEmail = req.body.email || emailUser
    
    const mailOptions = {
      from: emailUser,
      to: testEmail,
      subject: 'Gmail接続テスト - 空の森クリニック',
      html: `
        <h2>Gmail接続テスト成功</h2>
        <p>メール送信機能が正常に動作しています。</p>
        <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
        <p>空の森クリニック イベント事務局</p>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Test email sent successfully:', info.messageId)

    return res.status(200).json({
      success: true,
      message: 'Gmail接続・送信テスト成功',
      messageId: info.messageId,
      to: testEmail,
      emailUser: emailUser
    })

  } catch (error) {
    console.error('❌ Gmail test failed:', error)
    
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command
    })
  }
}