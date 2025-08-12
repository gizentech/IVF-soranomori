// pages/api/submit.js
import { db } from '../../lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

function generateUniqueId(eventType) {
  const prefix = eventType === 'nursing' ? 'IVF-SORA' : 
                 eventType === 'ivf' ? 'IVF-TOUR' : 'IVF-GOLF'
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${randomString}`
}

function generateGroupId(eventType) {
  const prefix = eventType === 'golf' ? 'IVF-GOLF' : 'IVF-GROUP'
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${randomString}`
}

function sanitizeDataForFirestore(data) {
  const sanitized = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      sanitized[key] = ''
    } else if (typeof value === 'string') {
      sanitized[key] = value.trim()
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeDataForFirestore(item) : item
      )
    } else if (typeof value === 'object' && value.constructor === Object) {
      sanitized[key] = sanitizeDataForFirestore(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

async function getCurrentCapacity(eventType) {
  try {
    console.log(`\n=== Getting current capacity for ${eventType} ===`)
    
    const { collection: firestoreCollection, getDocs, query, where } = await import('firebase/firestore')
    
    // アクティブな登録のみをカウント
    const activeQuery = query(
      firestoreCollection(db, 'registrations'),
      where('eventType', '==', eventType),
      where('status', '==', 'active')
    )
    
    const snapshot = await getDocs(activeQuery)
    console.log(`Found ${snapshot.size} active documents`)
    
    // ゴルフの場合は実際の参加人数をカウント
    if (eventType === 'golf') {
      let totalParticipants = 0
      let groupCount = 0
      const groups = new Set()
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log(`Document ${doc.id}:`, {
          groupId: data.groupId,
          participantNumber: data.participantNumber,
          isRepresentative: data.isRepresentative,
          totalGroupSize: data.totalGroupSize
        })
        
        // グループIDでカウント（重複を避ける）
        if (data.groupId && !groups.has(data.groupId)) {
          groups.add(data.groupId)
          const groupSize = data.totalGroupSize || data.totalParticipants || 1
          totalParticipants += groupSize
          groupCount++
          console.log(`Group ${data.groupId}: ${groupSize} participants`)
        }
      })
      
      console.log(`Total: ${totalParticipants} participants in ${groupCount} groups`)
      return totalParticipants
    }
    
    console.log(`Total count for ${eventType}: ${snapshot.size}`)
    return snapshot.size
  } catch (error) {
    console.error('Error getting current capacity:', error)
    return 0
  }
}

async function sendEmail(emailData) {
  try {
    console.log('=== フォームからのメール送信開始 ===')
    console.log('メール送信データ:', emailData)

    const { generateConfirmationEmailContent } = await import('../../lib/email')
    const emailContent = generateConfirmationEmailContent(emailData)

    console.log('メール内容生成完了')
    console.log('件名:', emailContent.subject)
    console.log('送信先:', emailData.email)

    const baseUrl = 'https://soranomori-event-mu.vercel.app'

    console.log('API呼び出しURL:', `${baseUrl}/api/send-email`)

    const response = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailData.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        data: emailData
      })
    })

    console.log('メール API レスポンス状況:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('メール API エラーレスポンス:', errorText)
      throw new Error(`メール送信API エラー: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('メール送信API結果:', result)

    if (result.success) {
      console.log('✅ メール送信成功:', result.messageId)
      return { success: true, messageId: result.messageId }
    } else {
      console.error('❌ メール送信失敗:', result.error)
      return { success: false, error: result.error }
    }

  } catch (error) {
    console.error('❌ メール送信処理エラー:', error)
    return { success: false, error: error.message }
  }
}

export default async function handler(req, res) {
  console.log('=== Submit API Called ===')
  console.log('Method:', req.method)
  console.log('Body keys:', Object.keys(req.body))

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawData = req.body
    console.log('Raw data received:', rawData)

    const data = sanitizeDataForFirestore(rawData)
    console.log('Sanitized data:', data)

    const eventType = data.eventType

    if (!eventType || !['nursing', 'ivf', 'golf'].includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' })
    }

    console.log(`Processing ${eventType} registration...`)

    const MAX_ENTRIES = { nursing: 30, ivf: 100, golf: 16 }
    const currentCount = await getCurrentCapacity(eventType)
    const maxEntries = MAX_ENTRIES[eventType]
    const remainingSlots = Math.max(0, maxEntries - currentCount)

    console.log(`\n=== Capacity Check ===`)
    console.log(`Event: ${eventType}`)
    console.log(`Current count: ${currentCount}`)
    console.log(`Max entries: ${maxEntries}`)
    console.log(`Remaining slots: ${remainingSlots}`)

    // ゴルフの場合は申し込み人数をチェック
    const requestedSlots = eventType === 'golf' ? (data.totalParticipants || 1) : 1
    console.log(`Requested slots: ${requestedSlots}`)
    console.log(`After registration would be: ${currentCount + requestedSlots}/${maxEntries}`)
    
    if (currentCount + requestedSlots > maxEntries) {
      console.log('Event is full, saving to over_capacity')
      
      const overCapacityData = sanitizeDataForFirestore({
        ...data,
        status: 'over_capacity',
        uniqueId: generateUniqueId(eventType),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      await addDoc(collection(db, 'over_capacity'), overCapacityData)

      return res.status(200).json({
        success: false,
        status: 'over_capacity',
        message: '申し訳ございませんが、定員に達しました。キャンセル待ちとして承りました。',
        uniqueId: overCapacityData.uniqueId,
        remainingSlots: remainingSlots,
        debug: {
          currentCount,
          maxEntries,
          requestedSlots,
          wouldBeTotal: currentCount + requestedSlots
        }
      })
    }

    let savedDocuments = 0
    let emailSent = false
    let emailError = null
    let uniqueId

    if (eventType === 'golf') {
      const groupId = generateGroupId('golf')
      const totalParticipants = data.totalParticipants || (data.participants ? data.participants.length + 1 : 1)

      console.log(`Processing golf registration for ${totalParticipants} participants`)
      console.log('Participants data:', data.participants)

      // 代表者のドキュメントを作成
      const representativeData = sanitizeDataForFirestore({
        eventType: 'golf',
        groupId,
        uniqueId: groupId,
        participantNumber: 1,
        isRepresentative: true,
        totalGroupSize: totalParticipants,
        representativeName: data.representativeName || '',
        representativeEmail: data.email || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        firstNameKana: data.firstNameKana || '',
        lastNameKana: data.lastNameKana || '',
        fullName: data.representativeName || `${data.lastName || ''} ${data.firstName || ''}`.trim(),
        fullNameKana: data.representativeKana || `${data.lastNameKana || ''} ${data.firstNameKana || ''}`.trim(),
        email: data.email || '',
        phone: data.phone || '',
        organization: data.organization || '',
        companyName: data.companyName || '',
        totalParticipants: totalParticipants,
        participationType: data.participationType || '',
        remarks: data.remarks || '',
        specialRequests: data.specialRequests || '',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('Representative data to save:', representativeData)
      await addDoc(collection(db, 'registrations'), representativeData)
      savedDocuments++
      uniqueId = groupId

      // 追加参加者のドキュメントを作成
      if (data.participants && Array.isArray(data.participants) && data.participants.length > 0) {
        console.log(`Processing ${data.participants.length} additional participants`)
        
        for (let i = 0; i < data.participants.length; i++) {
          const participant = data.participants[i]
          if (participant.name && participant.name.trim()) {
            const participantUniqueId = `${groupId}-P${i + 2}`

            const participantData = sanitizeDataForFirestore({
              eventType: 'golf',
              groupId,
              uniqueId: participantUniqueId,
              participantNumber: i + 2,
              isRepresentative: false,
              totalGroupSize: totalParticipants,
              representativeName: data.representativeName || '',
              representativeEmail: data.email || '',
              firstName: participant.name.split(' ')[1] || participant.name.split('　')[1] || '',
              lastName: participant.name.split(' ')[0] || participant.name.split('　')[0] || participant.name,
              firstNameKana: participant.kana ? (participant.kana.split(' ')[1] || participant.kana.split('　')[1] || '') : '',
              lastNameKana: participant.kana ? (participant.kana.split(' ')[0] || participant.kana.split('　')[0] || participant.kana) : '',
              fullName: participant.name,
              fullNameKana: participant.kana || '',
              email: data.email || '', // 代表者のメールアドレスを使用
              phone: data.phone || '',
              organization: data.organization || '',
              companyName: data.companyName || '',
              totalParticipants: totalParticipants,
              participationType: data.participationType || '',
              remarks: data.remarks || '',
              specialRequests: data.specialRequests || '',
              status: 'active',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })

            console.log(`Participant ${i + 1} data to save:`, participantData)
            await addDoc(collection(db, 'registrations'), participantData)
            savedDocuments++
          }
        }
      }

    } else {
      uniqueId = generateUniqueId(eventType)

      const registrationData = sanitizeDataForFirestore({
        ...data,
        uniqueId,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('Registration data to save:', registrationData)
      await addDoc(collection(db, 'registrations'), registrationData)
      savedDocuments++
    }

    console.log(`Saved ${savedDocuments} documents successfully`)

    // メール送信を試行
    console.log('Attempting to send confirmation email...')
    const emailResult = await sendEmail({
      ...data,
      uniqueId,
      eventType
    })

    emailSent = emailResult.success
    if (!emailResult.success) {
      emailError = emailResult.error
      console.error('Email sending failed:', emailResult.error)
    }

    const finalRemainingSlots = Math.max(0, maxEntries - currentCount - requestedSlots)

    const response = {
      success: true,
      uniqueId,
      status: 'confirmed',
      message: 'お申し込みが完了しました',
      remainingSlots: finalRemainingSlots,
      emailSent,
      emailError,
      savedDocuments,
      timestamp: new Date().toISOString(),
      debug: {
        eventType,
        currentCountBefore: currentCount,
        maxEntries,
        requestedSlots,
        finalRemainingSlots
      }
    }

    console.log('Final response:', response)
    return res.status(200).json(response)

  } catch (error) {
    console.error('Submit API error:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}