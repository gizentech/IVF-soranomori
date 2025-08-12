// pages/api/admin/stats.js
async function getStats() {
  console.log('=== Stats calculation started ===')

  let stats = {}

  try {
    console.log('Importing Firebase modules...')
    
    // 動的インポートでFirebaseモジュールを読み込み
    const { db } = await import('../../../lib/firebase')
    const { collection, getDocs, query, where } = await import('firebase/firestore')

    console.log('Firebase modules imported')
    console.log('Database object:', db ? 'exists' : 'null')

    if (!db) {
      throw new Error('Firebase database not initialized')
    }

    console.log('Firebase database initialized successfully')

    const eventTypes = ['nursing', 'ivf', 'golf']
    const MAX_ENTRIES = { nursing: 30, ivf: 100, golf: 16 }

    for (const eventType of eventTypes) {
      console.log(`\n=== Processing stats for ${eventType} ===`)
      
      let activeCount = 0
      let cancelledCount = 0
      let overCapacityCount = 0

      try {
        // アクティブ数を取得
        console.log(`Fetching active registrations for ${eventType}...`)
        const activeQuery = query(
          collection(db, 'registrations'),
          where('eventType', '==', eventType),
          where('status', '==', 'active')
        )
        const activeSnapshot = await getDocs(activeQuery)
        activeCount = activeSnapshot.size
        console.log(`${eventType} active count: ${activeCount}`)
        
        // 実際のドキュメントを確認
        if (activeSnapshot.size > 0) {
          console.log(`${eventType} active documents:`)
          activeSnapshot.docs.slice(0, 3).forEach(doc => {
            const data = doc.data()
            console.log(`  - ID: ${doc.id}, uniqueId: ${data.uniqueId}, status: ${data.status}`)
          })
        }
        
      } catch (e) {
        console.error(`Active query failed for ${eventType}:`, e)
        activeCount = 0
      }

      try {
        // キャンセル数を取得
        console.log(`Fetching cancelled registrations for ${eventType}...`)
        const cancelledQuery = query(
          collection(db, 'cancelled'),
          where('eventType', '==', eventType)
        )
        const cancelledSnapshot = await getDocs(cancelledQuery)
        cancelledCount = cancelledSnapshot.size
        console.log(`${eventType} cancelled count: ${cancelledCount}`)
      } catch (e) {
        console.error(`Cancelled query failed for ${eventType}:`, e)
        cancelledCount = 0
      }

      try {
        // 定員超過数を取得
        console.log(`Fetching over capacity registrations for ${eventType}...`)
        const overCapacityQuery = query(
          collection(db, 'over_capacity'),
          where('eventType', '==', eventType)
        )
        const overCapacitySnapshot = await getDocs(overCapacityQuery)
        overCapacityCount = overCapacitySnapshot.size
        console.log(`${eventType} over capacity count: ${overCapacityCount}`)
      } catch (e) {
        console.error(`Over capacity query failed for ${eventType}:`, e)
        overCapacityCount = 0
      }

      stats[eventType] = {
        active: activeCount,
        cancelled: cancelledCount,
        overCapacity: overCapacityCount,
        capacity: MAX_ENTRIES[eventType],
        total: activeCount + cancelledCount + overCapacityCount
      }

      console.log(`${eventType} final stats:`, stats[eventType])
    }

    console.log('\n=== Final aggregated stats ===')
    console.log('Stats object:', JSON.stringify(stats, null, 2))
    return stats

  } catch (firebaseError) {
    console.error('Firebase error details:', {
      message: firebaseError.message,
      code: firebaseError.code,
      stack: firebaseError.stack
    })
    
    // Firebase接続失敗時は空のデータを返す
    const fallbackStats = {
      nursing: { active: 0, cancelled: 0, overCapacity: 0, capacity: 30, total: 0, error: firebaseError.message },
      ivf: { active: 0, cancelled: 0, overCapacity: 0, capacity: 100, total: 0, error: firebaseError.message },
      golf: { active: 0, cancelled: 0, overCapacity: 0, capacity: 16, total: 0, error: firebaseError.message }
    }
    
    console.log('Using fallback stats due to Firebase error:', fallbackStats)
    return fallbackStats
  }
}

export default async function handler(req, res) {
  console.log('=== Stats API Called ===')
  console.log('Method:', req.method)
  console.log('Timestamp:', new Date().toISOString())
  console.log('Environment:', process.env.NODE_ENV)

  // 基本的なレスポンス設定
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 環境変数の確認
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID'
    ]

    const envStatus = {}
    requiredEnvVars.forEach(varName => {
      envStatus[varName] = !!process.env[varName]
    })

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`)
    }

    console.log('Environment variables check passed')
    console.log('Starting stats calculation...')
    
    const statsResult = await getStats()
    console.log('Stats calculation completed. Result:', statsResult)
    
    // レスポンスオブジェクトを構築
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      nursing: statsResult.nursing || { active: 0, cancelled: 0, overCapacity: 0, capacity: 30, total: 0 },
      ivf: statsResult.ivf || { active: 0, cancelled: 0, overCapacity: 0, capacity: 100, total: 0 },
      golf: statsResult.golf || { active: 0, cancelled: 0, overCapacity: 0, capacity: 16, total: 0 },
      debug: {
        processedEventTypes: Object.keys(statsResult),
        totalActiveAcrossAllEvents: Object.values(statsResult).reduce((sum, stat) => sum + (stat.active || 0), 0),
        apiCallTime: new Date().toISOString(),
        rawStatsResult: statsResult,
        envStatus: envStatus
      }
    }
    
    console.log('Sending response to client:')
    console.log(JSON.stringify(response, null, 2))
    
    return res.status(200).json(response)

  } catch (error) {
    console.error('Stats API critical error:', error)
    console.error('Error stack:', error.stack)
    
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
      nursing: { active: 0, cancelled: 0, overCapacity: 0, capacity: 30, total: 0 },
      ivf: { active: 0, cancelled: 0, overCapacity: 0, capacity: 100, total: 0 },
      golf: { active: 0, cancelled: 0, overCapacity: 0, capacity: 16, total: 0 }
    }
    
    console.log('Sending error response:', errorResponse)
    return res.status(500).json(errorResponse)
  }
}

// 内部使用のためのエクスポート
export { getStats }