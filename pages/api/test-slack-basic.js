// pages/api/test-slack-basic.js
export default async function handler(req, res) {
  console.log('=== Slack Basic Test ===')
  
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  console.log('Webhook URL exists:', !!webhookUrl)
  console.log('Webhook URL length:', webhookUrl?.length || 0)
  console.log('Webhook URL (first 50 chars):', webhookUrl?.substring(0, 50))

  if (!webhookUrl) {
    return res.status(500).json({ 
      error: 'SLACK_WEBHOOK_URL not found',
      env: process.env.NODE_ENV
    })
  }

  try {
    const testMessage = {
      text: "🧪 テスト通知 - 基本接続確認",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*テスト通知*\n時刻: ${new Date().toLocaleString('ja-JP')}\n環境: ${process.env.NODE_ENV}`
          }
        }
      ]
    }

    console.log('Sending test message...')
    console.log('Message:', JSON.stringify(testMessage, null, 2))

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    
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
      error: error.message,
      stack: error.stack
    })
  }
}