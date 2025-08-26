// pages/api/submit.js
import { db } from '../../lib/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { sendSlackNotification, sendCapacityAlert } from '../../lib/slack'

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

async function getCurrentCapacity(eventType, selectedTimeSlot = null) {
  try {
    console.log(`\n=== Getting current capacity for ${eventType} ===`)
    
    const { collection: firestoreCollection, getDocs, query, where } = await import('firebase/firestore')
    
    if (eventType === 'ivf' && selectedTimeSlot) {
      // IVFの場合は指定された時間帯のみカウント
      console.log(`Checking capacity for time slot: ${selectedTimeSlot}`)
      
      const timeSlotQuery = query(
        firestoreCollection(db, 'registrations'),
        where('eventType', '==', 'ivf'),
        where('selectedTimeSlot', '==', selectedTimeSlot),
        where('status', '==', 'active')
      )
      
      const snapshot = await getDocs(timeSlotQuery)
      console.log(`Found ${snapshot.size} active documents for time slot: ${selectedTimeSlot}`)
      
      return snapshot.size
    } else {
      // 他のイベントまたはIVF全体のカウント
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
    }
  } catch (error) {
    console.error('Error getting current capacity:', error)
    return 0
  }
}

async function sendEmail(emailData) {
  try {
    console.log('=== 直接メール送信開始 ===')
    console.log('メール送信データ:', emailData)

    const nodemailer = await import('nodemailer')
    const { generateConfirmationEmailContent } = await import('../../lib/email')
    
    const emailContent = generateConfirmationEmailContent(emailData)

    console.log('メール内容生成完了')

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('メール設定が不完全です')
    }

    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    await transporter.verify()
    console.log('✅ SMTP connection verified')

    const mailOptions = {
      from: {
        name: '空の森クリニック イベント事務局',
        address: process.env.EMAIL_USER
      },
      to: emailData.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    }

    console.log('Sending email...')
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ メール送信成功:', info.messageId)
    return { success: true, messageId: info.messageId }

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

    // 時間帯別定員設定
    const TIME_SLOT_CAPACITY = {
      '2025年10月10日（金）14:00': 20,
      '2025年10月11日（土）09:00': 20,
      '2025年10月12日（日）09:00': 20,
      '2025年10月12日（日）13:00': 20,
      '2025年10月13日（月）14:00': 20
    }

    const MAX_ENTRIES = { nursing: 30, ivf: 100, golf: 16 }

    // IVFの場合は時間帯別の定員チェック
    if (eventType === 'ivf') {
      const selectedTimeSlot = data.selectedTimeSlot
      
      if (!selectedTimeSlot || !TIME_SLOT_CAPACITY[selectedTimeSlot]) {
        return res.status(400).json({ 
          error: '無効な時間帯が選択されています',
          selectedTimeSlot 
        })
      }

      const currentCount = await getCurrentCapacity(eventType, selectedTimeSlot)
      const maxEntries = TIME_SLOT_CAPACITY[selectedTimeSlot]
      const remainingSlots = Math.max(0, maxEntries - currentCount)

      console.log(`\n=== IVF Time Slot Capacity Check ===`)
      console.log(`Time Slot: ${selectedTimeSlot}`)
      console.log(`Current count: ${currentCount}`)
      console.log(`Max entries: ${maxEntries}`)
      console.log(`Remaining slots: ${remainingSlots}`)

      if (currentCount >= maxEntries) {
        console.log('Time slot is full, saving to over_capacity')
        
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
          message: `選択された時間帯「${selectedTimeSlot}」は定員に達しました。他の時間帯をお選びください。`,
          uniqueId: overCapacityData.uniqueId,
          remainingSlots: remainingSlots,
          timeSlot: selectedTimeSlot
        })
      }

      // IVF登録処理
      const uniqueId = generateUniqueId(eventType)
      const registrationData = sanitizeDataForFirestore({
        ...data,
        uniqueId,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      console.log('IVF registration data to save:', registrationData)
      await addDoc(collection(db, 'registrations'), registrationData)

      // メール送信
      const emailResult = await sendEmail({
        ...data,
        uniqueId,
        eventType
      })

      // Slack通知
      try {
        await sendSlackNotification({
          eventType,
          uniqueId,
          lastName: data.lastName,
          firstName: data.firstName,
          email: data.email,
          organization: data.organization,
          selectedTimeSlot: data.selectedTimeSlot
        }, 'registration')
      } catch (slackError) {
        console.error('Slack notification failed:', slackError)
      }

      return res.status(200).json({
        success: true,
        uniqueId,
        status: 'confirmed',
        message: 'お申し込みが完了しました',
        remainingSlots: maxEntries - currentCount - 1,
        timeSlot: selectedTimeSlot,
        emailSent: emailResult.success,
        timestamp: new Date().toISOString()
      })

    } else {
      // nursing と golf の処理
      const currentCount = await getCurrentCapacity(eventType)
      const maxEntries = MAX_ENTRIES[eventType]
      const remainingSlots = Math.max(0, maxEntries - currentCount)

      console.log(`\n=== Capacity Check ===`)
      console.log(`Event: ${eventType}`)
      console.log(`Current count: ${currentCount}`)
      console.log(`Max entries: ${maxEntries}`)
      console.log(`Remaining slots: ${remainingSlots}`)

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
          remainingSlots: remainingSlots
        })
      }

      let savedDocuments = 0
      let emailSent = false
      let emailError = null
      let uniqueId

      if (eventType === 'golf') {
        // ゴルフの登録処理
        const groupId = generateGroupId('golf')
        const totalParticipants = data.totalParticipants || (data.participants ? data.participants.length + 1 : 1)

        console.log(`Processing golf registration for ${totalParticipants} participants`)

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

              console.log(`Participant ${i + 1} data to save:`, participantData)
              await addDoc(collection(db, 'registrations'), participantData)
              savedDocuments++
            }
          }
        }

      } else {
        // nursing の登録処理
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

      // Slack通知を送信
      try {
        const slackResult = await sendSlackNotification({
          eventType,
          uniqueId,
          lastName: data.lastName || data.representativeName,
          firstName: data.firstName || '',
          email: data.email,
          organization: data.organization || data.companyName,
          totalParticipants: data.totalParticipants,
          representativeName: data.representativeName
        }, 'registration')
        
        console.log('Slack notification result:', slackResult)
      } catch (slackException) {
        console.error('Slack notification exception:', slackException)
      }

      // 定員アラートチェック
      const finalCurrentCount = currentCount + requestedSlots
      const finalRemainingSlots = Math.max(0, maxEntries - finalCurrentCount)
      const capacityRatio = finalCurrentCount / maxEntries

      if (capacityRatio >= 0.8) {
        try {
          console.log('Sending capacity alert...')
          await sendCapacityAlert(eventType, finalCurrentCount, maxEntries)
          console.log('✅ Capacity alert sent')
        } catch (alertError) {
          console.error('Capacity alert failed:', alertError)
        }
      }

      const response = {
        success: true,
        uniqueId,
        status: 'confirmed',
        message: 'お申し込みが完了しました',
        remainingSlots: finalRemainingSlots,
        emailSent,
        emailError,
        savedDocuments,
        timestamp: new Date().toISOString()
      }

      console.log('Final response:', response)
      return res.status(200).json(response)
    }

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