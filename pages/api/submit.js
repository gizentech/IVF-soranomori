// pages/api/submit.js
import { db } from '../../lib/firebase'
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { sendSlackNotification } from '../../lib/slack'
import { sendConfirmationEmail } from '../../lib/email'

const MAX_ENTRIES = {
  nursing: 30,
  ivf: 100, // 20人×5回
  golf: 16  // 16人
}

async function checkCapacity(eventType, selectedTimeSlot = null, requestedParticipants = 1) {
  try {
    console.log(`Checking capacity for ${eventType}, timeSlot: ${selectedTimeSlot}, requested: ${requestedParticipants}`)
    
    let queryConstraint
    
    if (eventType === 'ivf' && selectedTimeSlot) {
      // IVFは各時間帯20人まで
      queryConstraint = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('selectedTimeSlot', '==', selectedTimeSlot),
        where('status', '==', 'active')
      )
      const snapshot = await getDocs(queryConstraint)
      const currentCount = snapshot.size
      const maxPerSlot = 20

      console.log(`${eventType} (${selectedTimeSlot}) current count: ${currentCount}/${maxPerSlot}`)

      return {
        currentCount,
        isAvailable: currentCount + requestedParticipants <= maxPerSlot,
        remainingSlots: Math.max(0, maxPerSlot - currentCount)
      }
    } else if (eventType === 'golf') {
      // ゴルフは合計16人まで（個別ドキュメント数をカウント）
      queryConstraint = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('status', '==', 'active')
      )
      const snapshot = await getDocs(queryConstraint)
      const currentCount = snapshot.size // 各参加者が個別ドキュメントなのでsizeが実際の人数
      const maxEntries = MAX_ENTRIES[eventType]

      console.log(`${eventType} current participants: ${currentCount}/${maxEntries}`)

      return {
        currentCount,
        isAvailable: currentCount + requestedParticipants <= maxEntries,
        remainingSlots: Math.max(0, maxEntries - currentCount)
      }
    } else {
      queryConstraint = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('status', '==', 'active')
      )
      const snapshot = await getDocs(queryConstraint)
      const currentCount = snapshot.size
      const maxEntries = MAX_ENTRIES[eventType] || 30

      console.log(`${eventType} current count: ${currentCount}/${maxEntries}`)

      return {
        currentCount,
        isAvailable: currentCount + requestedParticipants <= maxEntries,
        remainingSlots: Math.max(0, maxEntries - currentCount)
      }
    }
  } catch (error) {
    console.error('Capacity check error:', error)
    throw new Error(`定員チェックでエラーが発生しました: ${error.message}`)
  }
}

async function saveToFirestore(data, status = 'active') {
  try {
    console.log('Saving to Firestore:', { ...data, status })
    
    const collectionName = status === 'active' ? 'registrations' : 'over_capacity'

    if (data.eventType === 'golf') {
      // ゴルフの場合：各参加者を個別のドキュメントとして保存
      const savedDocuments = []
      const groupId = data.uniqueId // グループIDとして予約IDを使用

      // 代表者を保存
      const representativeData = {
        uniqueId: data.uniqueId,
        groupId: groupId,
        eventType: data.eventType,
        isRepresentative: true,
        participantNumber: 1,
        lastName: data.representativeName?.split('　')[0] || data.representativeName?.split(' ')[0] || data.representativeName,
        firstName: data.representativeName?.split('　')[1] || data.representativeName?.split(' ')[1] || '',
        lastNameKana: data.representativeKana?.split('　')[0] || data.representativeKana?.split(' ')[0] || data.representativeKana,
        firstNameKana: data.representativeKana?.split('　')[1] || data.representativeKana?.split(' ')[1] || '',
        fullName: data.representativeName,
        fullNameKana: data.representativeKana,
        email: data.email,
        phone: data.phone,
        organization: data.companyName,
        participationType: data.participationType,
        remarks: data.remarks,
        totalGroupSize: data.totalParticipants,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const repDoc = await addDoc(collection(db, collectionName), representativeData)
      savedDocuments.push(repDoc.id)
      console.log(`Representative saved with ID: ${repDoc.id}`)

      // 追加参加者を保存
      if (data.participants && data.participants.length > 0) {
        for (let i = 0; i < data.participants.length; i++) {
          const participant = data.participants[i]
          if (participant.name && participant.name.trim()) {
            const participantData = {
              uniqueId: `${data.uniqueId}-P${i + 2}`, // 個別のユニークID
              groupId: groupId,
              eventType: data.eventType,
              isRepresentative: false,
              participantNumber: i + 2,
              lastName: participant.name?.split('　')[0] || participant.name?.split(' ')[0] || participant.name,
              firstName: participant.name?.split('　')[1] || participant.name?.split(' ')[1] || '',
              lastNameKana: participant.kana?.split('　')[0] || participant.kana?.split(' ')[0] || participant.kana,
              firstNameKana: participant.kana?.split('　')[1] || participant.kana?.split(' ')[1] || '',
              fullName: participant.name,
              fullNameKana: participant.kana,
              // 代表者の連絡先情報を継承
              email: data.email,
              phone: data.phone,
              organization: data.companyName,
              participationType: data.participationType,
              remarks: data.remarks,
              representativeName: data.representativeName,
              representativeEmail: data.email,
              totalGroupSize: data.totalParticipants,
              status,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }

            const memberDoc = await addDoc(collection(db, collectionName), participantData)
            savedDocuments.push(memberDoc.id)
            console.log(`Participant ${i + 2} saved with ID: ${memberDoc.id}`)
          }
        }
      }

      console.log(`Golf group saved: ${savedDocuments.length} documents created`)
      return savedDocuments
    } else {
      // 通常の場合（nursing, ivf）
      const docData = {
        ...data,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, collectionName), docData)
      console.log(`Document saved with ID: ${docRef.id} in collection: ${collectionName}`)
      return [docRef.id]
    }
  } catch (error) {
    console.error('Firestore save error:', error)
    throw new Error(`データ保存でエラーが発生しました: ${error.message}`)
  }
}

function generateUniqueId(eventType) {
  const prefixes = {
    nursing: 'IVF-SORA',
    ivf: 'IVF-TOUR',
    golf: 'IVF-GOLF'
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = prefixes[eventType] || 'IVF-SORA'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default async function handler(req, res) {
  console.log('=== Submit API Called ===')
  console.log('Method:', req.method)
  console.log('Headers:', req.headers)
  console.log('Body type:', typeof req.body)
  console.log('Body content:', req.body)
  
  // CORSヘッダーを先に設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return res.status(200).end()
  }
  
  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`)
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST'],
      receivedMethod: req.method,
      timestamp: new Date().toISOString()
    })
  }

  try {
    const formData = req.body
    console.log('Form data received and parsed:', formData)

    // 基本バリデーション
    if (!formData || typeof formData !== 'object') {
      console.log('Invalid form data format')
      return res.status(400).json({ 
        error: 'リクエストデータが無効です',
        details: 'Request body must be valid JSON object',
        timestamp: new Date().toISOString()
      })
    }

    if (!formData.eventType || !formData.email) {
      console.log('Missing required fields:', { eventType: formData.eventType, email: formData.email })
      return res.status(400).json({ 
        error: '必須項目が不足しています',
        required: ['eventType', 'email'],
        received: Object.keys(formData),
        timestamp: new Date().toISOString()
      })
    }

    const requestedParticipants = formData.totalParticipants || 1
    console.log('Requested participants:', requestedParticipants)

    // ゴルフの場合の参加人数制限チェック
    if (formData.eventType === 'golf') {
      console.log('Processing golf event submission')
      const capacityPreCheck = await checkCapacity(formData.eventType, null, requestedParticipants)
      console.log('Pre-check capacity result:', capacityPreCheck)
      
      if (!capacityPreCheck.isAvailable) {
        console.log('Capacity not available')
        return res.status(400).json({
          error: `申し込み可能人数を超えています。残り${capacityPreCheck.remainingSlots}名まで申し込み可能です。`,
          availableSlots: capacityPreCheck.remainingSlots,
          requestedParticipants,
          currentCount: capacityPreCheck.currentCount,
          status: 'full_capacity',
          timestamp: new Date().toISOString()
        })
      }
    }

    const uniqueId = generateUniqueId(formData.eventType)
    console.log('Generated unique ID:', uniqueId)
    
    const submissionData = {
      uniqueId,
      eventType: formData.eventType,
      lastName: formData.lastName || '',
      firstName: formData.firstName || '',
      lastNameKana: formData.lastNameKana || '',
      firstNameKana: formData.firstNameKana || '',
      email: formData.email || '',
      phone: formData.phone || '',
      organization: formData.organization || '',
      position: formData.position || '',
      specialRequests: formData.specialRequests || '',
      selectedTimeSlot: formData.selectedTimeSlot || null,
      // ゴルフ専用フィールド
      representativeName: formData.representativeName || '',
      representativeKana: formData.representativeKana || '',
      companyName: formData.companyName || '',
      participationType: formData.participationType || null,
      participants: formData.participants || [],
      totalParticipants: formData.totalParticipants || 1,
      remarks: formData.remarks || '',
      // IVF専用フィールド
      experience: formData.experience || null,
      interests: formData.interests || null,
    }

    console.log('Submission data prepared:', submissionData)

    // 最終的な定員チェック
    console.log('Performing final capacity check...')
    const capacityCheck = await checkCapacity(formData.eventType, formData.selectedTimeSlot, requestedParticipants)
    console.log('Final capacity check result:', capacityCheck)

    if (capacityCheck.isAvailable) {
      console.log(`Registration available (${capacityCheck.remainingSlots} slots remaining)`)
      
      console.log('Saving to Firestore...')
      const savedDocuments = await saveToFirestore(submissionData, 'active')
      console.log('Data saved to Firestore successfully. Document IDs:', savedDocuments)

      console.log('Sending confirmation email...')
      let emailResult = { success: false, error: 'メール設定が無効です' }
      
      try {
        // メール送信を試行
        emailResult = await sendConfirmationEmail(submissionData)
        console.log('Email result:', emailResult)
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        emailResult = { success: false, error: emailError.message }
      }

      // Slack通知（オプション）
      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          console.log('Sending Slack notification...')
          await sendSlackNotification(submissionData)
          console.log('Slack notification sent successfully')
        } catch (slackError) {
          console.error('Slack notification failed:', slackError)
          // Slackエラーは処理を止めない
        }
      }

      const newRemainingSlots = capacityCheck.remainingSlots - requestedParticipants

      const response = {
        success: true,
        uniqueId,
        status: 'confirmed',
        message: 'お申し込みが完了しました',
        remainingSlots: Math.max(0, newRemainingSlots),
        emailSent: emailResult.success,
        emailError: emailResult.success ? null : emailResult.error,
        savedDocuments: savedDocuments.length,
        timestamp: new Date().toISOString()
      }

      console.log('Sending success response:', response)
      return res.status(200).json(response)

    } else {
      console.log('Capacity not available, saving to over_capacity collection')
      await saveToFirestore(submissionData, 'over_capacity')
      
      const response = {
        success: false,
        uniqueId,
        status: 'full_capacity',
        message: formData.eventType === 'golf' 
          ? `申し込み可能人数を超えています。残り${capacityCheck.remainingSlots}名まで申し込み可能です。`
          : 'ご予約満員御礼につき、ご予約がお取りできませんでした。',
        currentEntries: capacityCheck.currentCount,
        maxEntries: MAX_ENTRIES[formData.eventType],
        remainingSlots: capacityCheck.remainingSlots,
        requestedParticipants,
        timestamp: new Date().toISOString()
      }

      console.log('Sending capacity full response:', response)
      return res.status(400).json(response)
    }

  } catch (error) {
    console.error('Submit API critical error:', error)
    console.error('Error stack:', error.stack)
    
    const errorResponse = {
      success: false,
      error: 'サーバーエラーが発生しました',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Sending error response:', errorResponse)
    return res.status(500).json(errorResponse)
  }
}