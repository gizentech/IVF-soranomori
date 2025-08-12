// pages/api/test-email.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { generateConfirmationEmailContent } = await import('../../lib/email')
    
    const testData = {
      uniqueId: 'TEST-' + Date.now(),
      eventType: 'golf',
      representativeName: 'テスト 太郎',
      email: req.body.email || 'shiraishi.healthcare@gmail.com',
      organization: 'テスト組織',
      companyName: 'テスト会社',
      totalParticipants: 2
    }

    const emailContent = generateConfirmationEmailContent(testData)

    const emailResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: testData.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      })
    })

    const emailResult = await emailResponse.json()

    return res.status(200).json({
      success: emailResult.success,
      message: emailResult.success ? 'テストメール送信成功' : 'テストメール送信失敗',
      testData,
      emailResult
    })

  } catch (error) {
    console.error('Test email error:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}