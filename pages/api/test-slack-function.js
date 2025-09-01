// pages/api/test-slack-function.js
export default async function handler(req, res) {
  console.log('=== 🔧 Slack Function Test Started ===')
  
  try {
    // Slack通知関数を動的にインポート
    console.log('Importing Slack notification function...')
    const { sendSlackNotification } = await import('../../lib/slack')
    console.log('✅ Slack function imported successfully')
    
    // テストデータを3つのイベントタイプで用意
    const testCases = [
      {
        name: 'Nursing Event Test',
        data: {
          eventType: 'nursing',
          uniqueId: 'TEST-NURSING-' + Date.now(),
          lastName: 'テスト',
          firstName: '太郎',
          email: 'test-nursing@example.com',
          organization: 'テスト看護大学'
        }
      },
      {
        name: 'IVF Event Test',
        data: {
          eventType: 'ivf',
          uniqueId: 'TEST-IVF-' + Date.now(),
          lastName: 'テスト',
          firstName: '花子',
          email: 'test-ivf@example.com',
          organization: 'テストIVFクリニック',
          selectedTimeSlot: '2025年10月10日（金）14:00'
        }
      },
      {
        name: 'Golf Event Test',
        data: {
          eventType: 'golf',
          uniqueId: 'TEST-GOLF-' + Date.now(),
          representativeName: 'テスト次郎',
          email: 'test-golf@example.com',
          organization: 'テストゴルフクリニック',
          totalParticipants: 3
        }
      }
    ]
    
    const results = []
    
    // 各テストケースを実行
    for (const testCase of testCases) {
      console.log(`\n--- ${testCase.name} ---`)
      console.log('Test data:', JSON.stringify(testCase.data, null, 2))
      
      try {
        const result = await sendSlackNotification(testCase.data, 'registration')
        console.log('Result:', JSON.stringify(result, null, 2))
        
        results.push({
          testName: testCase.name,
          success: result.success,
          result: result,
          testData: testCase.data
        })
        
        // テスト間の間隔を空ける
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`Error in ${testCase.name}:`, error)
        results.push({
          testName: testCase.name,
          success: false,
          error: error.message,
          testData: testCase.data
        })
      }
    }
    
    // キャンセル通知もテスト
    console.log('\n--- Cancellation Test ---')
    try {
      const cancelResult = await sendSlackNotification({
        uniqueId: 'TEST-CANCEL-' + Date.now(),
        reason: 'テストキャンセル',
        cancelledCount: 1
      }, 'cancellation')
      
      results.push({
        testName: 'Cancellation Test',
        success: cancelResult.success,
        result: cancelResult
      })
    } catch (error) {
      console.error('Error in cancellation test:', error)
      results.push({
        testName: 'Cancellation Test',
        success: false,
        error: error.message
      })
    }
    
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    
    console.log(`\n=== Test Summary: ${successCount}/${totalCount} passed ===`)
    
    return res.status(200).json({
      success: successCount === totalCount,
      summary: `${successCount}/${totalCount} tests passed`,
      results: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Function test error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to test Slack notification function',
      details: error.message,
      stack: error.stack
    })
  }
}