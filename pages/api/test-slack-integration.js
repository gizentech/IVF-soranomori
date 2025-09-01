// pages/api/test-slack-integration.js
export default async function handler(req, res) {
  console.log('=== 🔄 Slack Integration Test Started ===')
  
  const testResults = {
    environment: {},
    basicConnection: {},
    functionTest: {},
    timestamp: new Date().toISOString()
  }
  
  try {
    // 1. 環境変数テスト
    console.log('\n=== Step 1: Environment Test ===')
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    
    testResults.environment = {
      webhookExists: !!webhookUrl,
      webhookLength: webhookUrl?.length || 0,
      webhookFormat: webhookUrl?.startsWith('https://hooks.slack.com/') || false,
      nodeEnv: process.env.NODE_ENV
    }
    
    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL not found')
    }
    
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('Invalid webhook URL format')
    }
    
    console.log('✅ Environment check passed')
    
    // 2. 基本接続テスト
    console.log('\n=== Step 2: Basic Connection Test ===')
    const basicTestMessage = {
      text: `🔧 統合テスト - 基本接続\n時刻: ${new Date().toLocaleString('ja-JP')}`
    }
    
    const basicResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(basicTestMessage)
    })
    
    const basicResponseText = await basicResponse.text()
    
    testResults.basicConnection = {
      status: basicResponse.status,
      ok: basicResponse.ok,
      response: basicResponseText,
      success: basicResponse.ok && basicResponseText === 'ok'
    }
    
    if (!testResults.basicConnection.success) {
      throw new Error(`Basic connection failed: ${basicResponse.status} - ${basicResponseText}`)
    }
    
    console.log('✅ Basic connection test passed')
    
    // 3. Slack関数テスト
    console.log('\n=== Step 3: Slack Function Test ===')
    const { sendSlackNotification } = await import('../../lib/slack')
    
    const functionTestData = {
      eventType: 'nursing',
      uniqueId: 'INTEGRATION-TEST-' + Date.now(),
      lastName: '統合テスト',
      firstName: 'ユーザー',
      email: 'integration-test@example.com',
      organization: '統合テスト病院'
    }
    
    const functionResult = await sendSlackNotification(functionTestData, 'registration')
    
    testResults.functionTest = {
      testData: functionTestData,
      result: functionResult,
      success: functionResult.success
    }
    
    if (!functionResult.success) {
      throw new Error(`Function test failed: ${functionResult.error}`)
    }
    
    console.log('✅ Function test passed')
    
    // 全テスト成功
    console.log('\n=== 🎉 All Tests Passed! ===')
    
    return res.status(200).json({
      success: true,
      message: '全ての統合テストが成功しました！Slackチャンネルを確認してください。',
      results: testResults
    })
    
  } catch (error) {
    console.error('Integration test failed:', error)
    
    return res.status(500).json({
      success: false,
      error: error.message,
      results: testResults,
      failedAt: Object.keys(testResults).find(key => 
        testResults[key].success === false
      ) || 'unknown'
    })
  }
}