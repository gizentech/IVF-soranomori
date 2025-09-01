// pages/api/test-slack-basic.js
export default async function handler(req, res) {
  console.log('=== 🔍 Slack Basic Test Started ===')
  console.log('Request method:', req.method)
  console.log('Timestamp:', new Date().toISOString())
  
  // 環境変数の詳細チェック
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  console.log('\n--- 環境変数チェック ---')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('Webhook URL exists:', !!webhookUrl)
  console.log('Webhook URL length:', webhookUrl?.length || 0)
  
  if (webhookUrl) {
    console.log('Webhook URL prefix:', webhookUrl.substring(0, 30) + '...')
    console.log('Format check (starts with https://hooks.slack.com/):', webhookUrl.startsWith('https://hooks.slack.com/'))
  } else {
    console.log('❌ SLACK_WEBHOOK_URL is undefined or null')
  }
  
  // 利用可能な環境変数をチェック
  const slackRelatedVars = Object.keys(process.env).filter(key => 
    key.toLowerCase().includes('slack') || key.toLowerCase().includes('webhook')
  )
  console.log('Slack related environment variables:', slackRelatedVars)
  
  // 基本的なレスポンスデータ
  const responseData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    webhookExists: !!webhookUrl,
    webhookLength: webhookUrl?.length || 0,
    webhookFormat: webhookUrl?.startsWith('https://hooks.slack.com/') || false,
    slackVars: slackRelatedVars
  }

  if (!webhookUrl) {
    console.log('❌ Test failed: No webhook URL')
    return res.status(500).json({ 
      success: false,
      error: 'SLACK_WEBHOOK_URL not found in environment variables',
      ...responseData,
      suggestion: 'Check if SLACK_WEBHOOK_URL is properly set in .env.local file'
    })
  }

  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    console.log('❌ Test failed: Invalid webhook format')
    return res.status(400).json({
      success: false,
      error: 'Invalid webhook URL format',
      webhookPrefix: webhookUrl.substring(0, 50),
      ...responseData,
      suggestion: 'Webhook URL should start with https://hooks.slack.com/'
    })
  }

  // Slack送信テスト
  try {
    console.log('\n--- Slack送信テスト開始 ---')
    
    const testMessage = {
      text: `🧪 Slack接続テスト\n時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n環境: ${process.env.NODE_ENV || 'unknown'}`
    }

    console.log('Sending message to Slack...')
    console.log('Message:', JSON.stringify(testMessage, null, 2))
    console.log('Webhook URL (masked):', webhookUrl.substring(0, 50) + '...')

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SoranomoriClinic-Test/1.0'
      },
      body: JSON.stringify(testMessage)
    }

    console.log('Fetch options:', JSON.stringify(fetchOptions, null, 2))

    const response = await fetch(webhookUrl, fetchOptions)

    console.log('\n--- Slack レスポンス ---')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('OK:', response.ok)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Response body:', responseText)
    console.log('Response body length:', responseText.length)
    console.log('Response type:', typeof responseText)

    const result = {
      success: response.ok && responseText === 'ok',
      slackResponse: {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        body: responseText,
        headers: Object.fromEntries(response.headers.entries())
      },
      ...responseData
    }

    if (response.ok && responseText === 'ok') {
      console.log('✅ Slack test SUCCESS!')
      return res.status(200).json({
        ...result,
        message: 'Slack通知テスト成功！チャンネルを確認してください。'
      })
    } else {
      console.log('❌ Slack test FAILED')
      console.log('Expected response: "ok"')
      console.log('Actual response:', responseText)
      
      return res.status(response.status || 500).json({
        ...result,
        error: `Slack API returned status ${response.status}: ${responseText}`,
        expected: 'ok',
        actual: responseText
      })
    }

  } catch (error) {
    console.error('\n--- Slack送信エラー ---')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return res.status(500).json({
      success: false,
      error: 'Network or processing error',
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      },
      ...responseData
    })
  }
}