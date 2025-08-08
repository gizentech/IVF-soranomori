// pages/api/capacity.js
export default async function handler(req, res) {
  // CORSとキャッシュヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
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
    const { eventType } = req.query

    if (!eventType) {
      return res.status(400).json({ error: 'eventType parameter is required' })
    }

    const MAX_ENTRIES = {
      nursing: 30,
      ivf: 100,
      golf: 16
    }

    if (!MAX_ENTRIES[eventType]) {
      return res.status(400).json({ error: 'Invalid eventType' })
    }

    let currentCount = 0
    let hasError = false
    let errorMessage = ''

    try {
      // Firebase設定の確認
      const requiredEnvVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID'
      ]

      const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

      if (missingEnvVars.length > 0) {
        throw new Error(`Firebase設定が不完全です: ${missingEnvVars.join(', ')}`)
      }

      // Firebase初期化
      const { db } = await import('../../lib/firebase')
      const { collection, getDocs, query, where } = await import('firebase/firestore')

      if (!db) {
        throw new Error('Firestore database not initialized')
      }

      // アクティブな参加者を取得
      const activeQuery = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('status', '==', 'active')
      )
      const activeSnapshot = await getDocs(activeQuery)

      // 参加者数を確定（ドキュメント数 = 参加者数）
      currentCount = activeSnapshot.size

    } catch (firebaseError) {
      console.error('Firebase operation failed:', firebaseError)
      hasError = true
      errorMessage = firebaseError.message || 'Firebase connection failed'
    }

    const maxEntries = MAX_ENTRIES[eventType]
    const remainingSlots = Math.max(0, maxEntries - currentCount)
    const isAvailable = remainingSlots > 0

    const result = {
      eventType,
      currentCount,
      maxEntries,
      remainingSlots,
      isAvailable,
      timestamp: new Date().toISOString(),
      hasError,
      errorMessage: hasError ? errorMessage : null
    }

    return res.status(200).json(result)

  } catch (error) {
    console.error('Critical error in capacity API:', error)
    
    const maxEntries = MAX_ENTRIES[req.query.eventType] || 16
    const currentCount = 0
    const remainingSlots = Math.max(0, maxEntries - currentCount)
    
    return res.status(500).json({
      eventType: req.query.eventType,
      currentCount,
      maxEntries,
      remainingSlots,
      isAvailable: remainingSlots > 0,
      timestamp: new Date().toISOString(),
      hasError: true,
      errorMessage: `Critical error: ${error.message}`
    })
  }
}