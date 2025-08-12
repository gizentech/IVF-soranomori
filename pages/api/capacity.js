// pages/api/capacity.js
export default async function handler(req, res) {
  console.log('=== Capacity API Called ===')
  console.log('Query params:', req.query)

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { eventType } = req.query
    const MAX_ENTRIES = { nursing: 30, ivf: 100, golf: 16 }

    if (!eventType || !MAX_ENTRIES[eventType]) {
      return res.status(400).json({ error: 'Invalid eventType' })
    }

    let currentCount = 0
    let hasError = false
    let errorMessage = ''

    try {
      const { db } = await import('../../lib/firebase')
      const { collection, getDocs, query, where } = await import('firebase/firestore')

      if (!db) {
        throw new Error('Firestore database not initialized')
      }

      console.log(`Querying active registrations for ${eventType}...`)

      // 複数の方法でカウントを試行
      const allDocsQuery = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType)
      )
      const allDocsSnapshot = await getDocs(allDocsQuery)
      
      console.log(`Found ${allDocsSnapshot.size} total documents for ${eventType}`)
      
      // statusフィールドがないか、'active'のドキュメントをカウント
      let activeCount = 0
      allDocsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (!data.status || data.status === 'active') {
          activeCount++
        }
      })

      currentCount = activeCount
      console.log(`Active count for ${eventType}: ${currentCount}`)

    } catch (firebaseError) {
      console.error('Firebase operation failed:', firebaseError)
      hasError = true
      errorMessage = firebaseError.message
      currentCount = 0
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

    console.log('Capacity result:', result)
    return res.status(200).json(result)

  } catch (error) {
    console.error('Critical error in capacity API:', error)
    return res.status(500).json({
      eventType: req.query.eventType,
      currentCount: 0,
      maxEntries: MAX_ENTRIES[req.query.eventType] || 16,
      remainingSlots: MAX_ENTRIES[req.query.eventType] || 16,
      isAvailable: true,
      timestamp: new Date().toISOString(),
      hasError: true,
      errorMessage: error.message
    })
  }
}