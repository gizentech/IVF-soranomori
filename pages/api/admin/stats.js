// pages/api/admin/stats.js
export default async function handler(req, res) {
  console.log('=== Stats API Called ===')

  // 基本的なレスポンス設定
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Firebase接続を試行
    let stats = {}

    try {
      const { db } = require('../../../lib/firebase')
      const { collection, getDocs, query, where } = require('firebase/firestore')

      const eventTypes = ['nursing', 'ivf', 'golf']
      const MAX_ENTRIES = { nursing: 30, ivf: 100, golf: 16 }

      for (const eventType of eventTypes) {
        let activeCount = 0
        let cancelledCount = 0
        let overCapacityCount = 0

        try {
          // アクティブ数
          const activeQuery = query(
            collection(db, 'registrations'),
            where('eventType', '==', eventType),
            where('status', '==', 'active')
          )
          const activeSnapshot = await getDocs(activeQuery)
          activeCount = activeSnapshot.size
        } catch (e) {
          console.log(`Active query failed for ${eventType}:`, e.message)
        }

        try {
          // キャンセル数
          const cancelledQuery = query(
            collection(db, 'cancelled'),
            where('eventType', '==', eventType)
          )
          const cancelledSnapshot = await getDocs(cancelledQuery)
          cancelledCount = cancelledSnapshot.size
        } catch (e) {
          console.log(`Cancelled query failed for ${eventType}:`, e.message)
        }

        try {
          // 定員超過数
          const overCapacityQuery = query(
            collection(db, 'over_capacity'),
            where('eventType', '==', eventType)
          )
          const overCapacitySnapshot = await getDocs(overCapacityQuery)
          overCapacityCount = overCapacitySnapshot.size
        } catch (e) {
          console.log(`Over capacity query failed for ${eventType}:`, e.message)
        }

        stats[eventType] = {
          active: activeCount,
          cancelled: cancelledCount,
          overCapacity: overCapacityCount,
          capacity: MAX_ENTRIES[eventType],
          total: activeCount + cancelledCount + overCapacityCount
        }
      }
    } catch (firebaseError) {
      console.error('Firebase error, using mock data:', firebaseError.message)
      // Firebase接続失敗時はモックデータを返す
      stats = {
        nursing: { active: 1, cancelled: 0, overCapacity: 0, capacity: 30, total: 1 },
        ivf: { active: 0, cancelled: 1, overCapacity: 0, capacity: 100, total: 1 },
        golf: { active: 0, cancelled: 3, overCapacity: 0, capacity: 16, total: 3 }
      }
    }

    return res.status(200).json(stats)

  } catch (error) {
    console.error('Stats API critical error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}