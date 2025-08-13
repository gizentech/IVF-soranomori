// pages/api/test-slack-basic.js
export default async function handler(req, res) {
  console.log('=== Slack Basic Test ===')
  
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  if (!webhookUrl) {
    return res.status(500).json({ 
      error: 'SLACK_WEBHOOK_URL not found'
    })
  }

  try {
    // 最もシンプルなメッセージ形式
    const testMessage = {
      text: "🧪 テスト通知です - " + new Date().toLocaleString('ja-JP')
    }

    console.log('Sending simple test message...')
    console.log('Message:', JSON.stringify(testMessage))

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })

    console.log('Response status:', response.status)
    const responseText = await response.text()
    console.log('Response text:', responseText)

    if (response.ok) {
      return res.status(200).json({
        success: true,
        message: 'Slack通知送信成功',
        status: response.status,
        response: responseText
      })
    } else {
      return res.status(response.status).json({
        success: false,
        error: 'Slack API error',
        status: response.status,
        response: responseText
      })
    }

  } catch (error) {
    console.error('Slack test error:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}