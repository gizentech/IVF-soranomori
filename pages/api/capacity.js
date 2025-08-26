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
    const { eventType, timeSlot } = req.query
    const MAX_ENTRIES = { nursing: 30, ivf: 100, golf: 16 }
    
    // 時間帯ごとの定員設定
    const TIME_SLOT_CAPACITY = {
      '2025年10月10日（金）14:00': 20,
      '2025年10月11日（土）09:00': 20,
      '2025年10月12日（日）09:00': 20,
      '2025年10月12日（日）13:00': 20,
      '2025年10月13日（月）14:00': 20
    }

    if (!eventType || !MAX_ENTRIES[eventType]) {
      return res.status(400).json({ error: 'Invalid eventType' })
    }

    let currentCount = 0
    let maxEntries = MAX_ENTRIES[eventType]
    let hasError = false
    let errorMessage = ''

    try {
      const { db } = await import('../../lib/firebase')
      const { collection, getDocs, query, where } = await import('firebase/firestore')

      if (!db) {
        throw new Error('Firestore database not initialized')
      }

      console.log(`Querying active registrations for ${eventType}...`)

      if (eventType === 'ivf' && timeSlot) {
        // IVFで特定の時間帯が指定された場合
        console.log(`Checking capacity for IVF time slot: ${timeSlot}`)
        
        if (!TIME_SLOT_CAPACITY[timeSlot]) {
          throw new Error(`Invalid time slot: ${timeSlot}`)
        }

        const timeSlotQuery = query(
          collection(db, 'registrations'),
          where('eventType', '==', 'ivf'),
          where('selectedTimeSlot', '==', timeSlot),
          where('status', '==', 'active')
        )
        
        const timeSlotSnapshot = await getDocs(timeSlotQuery)
        currentCount = timeSlotSnapshot.size
        maxEntries = TIME_SLOT_CAPACITY[timeSlot]
        
        console.log(`Time slot ${timeSlot}: ${currentCount}/${maxEntries}`)
        
      } else {
        // 従来の全体カウント
        const allDocsQuery = query(
          collection(db, 'registrations'),
          where('eventType', '==', eventType)
        )
        const allDocsSnapshot = await getDocs(allDocsQuery)
        
        console.log(`Found ${allDocsSnapshot.size} total documents for ${eventType}`)
        
        let activeCount = 0
        allDocsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (!data.status || data.status === 'active') {
            activeCount++
          }
        })

        currentCount = activeCount
        console.log(`Active count for ${eventType}: ${currentCount}`)
      }

    } catch (firebaseError) {
      console.error('Firebase operation failed:', firebaseError)
      hasError = true
      errorMessage = firebaseError.message
      currentCount = 0
    }

    const remainingSlots = Math.max(0, maxEntries - currentCount)
    const isAvailable = remainingSlots > 0

    const result = {
      eventType,
      timeSlot: timeSlot || null,
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
      timeSlot: req.query.timeSlot || null,
      currentCount: 0,
      maxEntries: 20,
      remainingSlots: 20,
      isAvailable: true,
      timestamp: new Date().toISOString(),
      hasError: true,
      errorMessage: error.message
    })
  }
}