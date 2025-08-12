// pages/api/test-firestore.js
export default async function handler(req, res) {
  console.log('=== Firestore Connection Test API ===')
  
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Importing Firebase modules...')
    
    // 動的インポートでFirebaseを読み込み
    const { db } = await import('../../lib/firebase')
    const { collection, getDocs, query, where } = await import('firebase/firestore')
    
    console.log('Firebase modules imported successfully')
    console.log('Database instance:', db ? 'exists' : 'null')

    if (!db) {
      throw new Error('Firebase database not initialized')
    }

    // 詳細なデータ構造調査
    console.log('=== Detailed Firestore Investigation ===')
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      collections: {}
    }

    // registrationsコレクションの詳細調査
    console.log('Investigating registrations collection...')
    const registrationsSnapshot = await getDocs(collection(db, 'registrations'))
    
    const registrationsAnalysis = {
      totalDocuments: registrationsSnapshot.size,
      byEventType: {},
      byStatus: {},
      sampleDocuments: []
    }

    registrationsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      
      // イベントタイプ別カウント
      if (!registrationsAnalysis.byEventType[data.eventType]) {
        registrationsAnalysis.byEventType[data.eventType] = 0
      }
      registrationsAnalysis.byEventType[data.eventType]++

      // ステータス別カウント
      const status = data.status || 'no_status_field'
      if (!registrationsAnalysis.byStatus[status]) {
        registrationsAnalysis.byStatus[status] = 0
      }
      registrationsAnalysis.byStatus[status]++

      // サンプルドキュメント（最初の10個）
      if (registrationsAnalysis.sampleDocuments.length < 10) {
        registrationsAnalysis.sampleDocuments.push({
          id: doc.id,
          eventType: data.eventType,
          status: data.status,
          uniqueId: data.uniqueId,
          hasStatusField: 'status' in data,
          statusValue: data.status,
          statusType: typeof data.status,
          allFields: Object.keys(data)
        })
      }
    })

    result.collections.registrations = registrationsAnalysis

    // cancelledコレクションの調査
    try {
      console.log('Investigating cancelled collection...')
      const cancelledSnapshot = await getDocs(collection(db, 'cancelled'))
      const cancelledAnalysis = {
        totalDocuments: cancelledSnapshot.size,
        byEventType: {}
      }

      cancelledSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (!cancelledAnalysis.byEventType[data.eventType]) {
          cancelledAnalysis.byEventType[data.eventType] = 0
        }
        cancelledAnalysis.byEventType[data.eventType]++
      })

      result.collections.cancelled = cancelledAnalysis
    } catch (error) {
      result.collections.cancelled = { error: error.message }
    }

    // over_capacityコレクションの調査
    try {
      console.log('Investigating over_capacity collection...')
      const overCapacitySnapshot = await getDocs(collection(db, 'over_capacity'))
      const overCapacityAnalysis = {
        totalDocuments: overCapacitySnapshot.size,
        byEventType: {}
      }

      overCapacitySnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (!overCapacityAnalysis.byEventType[data.eventType]) {
          overCapacityAnalysis.byEventType[data.eventType] = 0
        }
        overCapacityAnalysis.byEventType[data.eventType]++
      })

      result.collections.over_capacity = overCapacityAnalysis
    } catch (error) {
      result.collections.over_capacity = { error: error.message }
    }

    console.log('Investigation result:', result)
    return res.status(200).json(result)

  } catch (error) {
    console.error('Firestore test error:', error)
    return res.status(500).json({
      success: false,
      error: 'Firestore connection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}