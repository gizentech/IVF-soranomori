// pages/api/submit.js
import { db } from '../../lib/firebase'
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { sendSlackNotification } from '../../lib/slack'
import nodemailer from 'nodemailer'

const MAX_ENTRIES = {
  nursing: 30,
  ivf: 20,
  golf: 16 // 16組（最大64人）
}

async function createMailTransporter() {
  const transporterConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: true,
    logger: true,
    tls: {
      rejectUnauthorized: false
    }
  }

  return nodemailer.createTransport(transporterConfig)
}

async function checkCapacity(eventType, selectedTimeSlot = null) {
  try {
    console.log(`Checking capacity for ${eventType}, timeSlot: ${selectedTimeSlot}`)
    
    let queryConstraint
    
    if (eventType === 'ivf' && selectedTimeSlot) {
      queryConstraint = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('selectedTimeSlot', '==', selectedTimeSlot),
        where('status', '==', 'active')
      )
    } else if (eventType === 'golf') {
      // ゴルフの場合は組数で管理
      queryConstraint = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('status', '==', 'active'),
        where('isGroupRepresentative', '==', true) // 代表者のみカウント
      )
    } else {
      queryConstraint = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('status', '==', 'active')
      )
    }

    const snapshot = await getDocs(queryConstraint)
    const currentCount = snapshot.size
    const maxEntries = MAX_ENTRIES[eventType] || 30

    console.log(`${eventType} current count: ${currentCount}/${maxEntries}`)

    return {
      currentCount,
      isAvailable: currentCount < maxEntries,
      remainingSlots: Math.max(0, maxEntries - currentCount)
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
    const savedDocuments = []

    if (data.eventType === 'golf' && data.participants) {
      // ゴルフの場合：代表者＋参加者を個別に保存
      const groupId = data.uniqueId
      
      // 代表者を保存
      const representativeData = {
        ...data,
        isGroupRepresentative: true,
        groupId: groupId,
        participantType: 'representative',
        participantNumber: 1,
        name: data.representativeName,
        kana: data.representativeKana,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const repDoc = await addDoc(collection(db, collectionName), representativeData)
      savedDocuments.push(repDoc.id)
      console.log(`Representative saved with ID: ${repDoc.id}`)

      // 参加者を保存
      for (let i = 0; i < data.participants.length; i++) {
        const participant = data.participants[i]
        if (participant.name.trim()) {
          const participantData = {
            ...data,
            isGroupRepresentative: false,
            groupId: groupId,
            participantType: 'member',
            participantNumber: i + 2,
            name: participant.name,
            kana: participant.kana,
            // 代表者の連絡先情報を継承
            representativeName: data.representativeName,
            representativeEmail: data.email,
            representativePhone: data.phone,
            representativeCompany: data.companyName,
            status,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
          
          const memberDoc = await addDoc(collection(db, collectionName), participantData)
          savedDocuments.push(memberDoc.id)
          console.log(`Participant ${i + 2} saved with ID: ${memberDoc.id}`)
        }
      }
    } else {
      // 通常の場合（nursing, ivf）
      const docData = {
        ...data,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, collectionName), docData)
      savedDocuments.push(docRef.id)
      console.log(`Document saved with ID: ${docRef.id} in collection: ${collectionName}`)
    }
    
    return savedDocuments
  } catch (error) {
    console.error('Firestore save error:', error)
    throw new Error(`データ保存でエラーが発生しました: ${error.message}`)
  }
}

async function sendConfirmationEmail(data) {
  try {
    console.log('=== メール送信開始 ===')
    console.log('送信先:', data.email)
    
    const transporter = await createMailTransporter()
    
    console.log('SMTP接続をテスト中...')
    await transporter.verify()
    console.log('SMTP接続成功')
    
    const eventTitles = {
      nursing: '第23回日本生殖看護学会学術集会 見学ツアー',
      ivf: '第28回日本IVF学会学術集会 見学ツアー',
      golf: '第28回日本IVF学会学術集会杯 ゴルフコンペ'
    }

    let dateTimeInfo = ''
    if (data.eventType === 'nursing') {
      dateTimeInfo = '2025年10月13日（月）14:00〜'
    } else if (data.eventType === 'ivf') {
      dateTimeInfo = data.selectedTimeSlot || '未選択'
    } else if (data.eventType === 'golf') {
      dateTimeInfo = '2025年10月10日（金）7:28スタート'
    }

    let eventSpecificContent = ''
    if (data.eventType === 'golf') {
      let participantsList = ''
      if (data.participants && data.participants.filter(p => p.name.trim()).length > 0) {
        participantsList = `
          <h4>参加者一覧</h4>
          <ul>
            <li>代表者: ${data.representativeName} (${data.representativeKana})</li>
            ${data.participants
              .filter(p => p.name.trim())
              .map((p, i) => `<li>参加者${i + 2}: ${p.name} (${p.kana})</li>`)
              .join('')}
          </ul>
        `
      }
      
      eventSpecificContent = `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 15px 0;">
          <h4 style="margin-top: 0;">当日のスケジュール</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>7:00</strong> 集合（那覇ゴルフ倶楽部）</li>
            <li><strong>7:28</strong> スタート</li>
            <li><strong>13:00</strong> 懇親会・表彰式</li>
          </ul>
          <p style="margin: 10px 0 0;"><strong>参加形態:</strong> ${getParticipationTypeLabel(data.participationType)}</p>
          <p style="margin: 10px 0 0;"><strong>参加人数:</strong> ${data.totalParticipants}名</p>
          ${participantsList}
        </div>
      `
    } else if (data.eventType === 'ivf') {
      eventSpecificContent = `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196f3; margin: 15px 0;">
          <h4 style="margin-top: 0;">当日のご案内</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>開始時間の10分前にはお越しください</li>
            <li>感染対策にご協力ください（マスク着用必須）</li>
            <li>動きやすい服装でお越しください</li>
          </ul>
        </div>
      `
    } else if (data.eventType === 'nursing') {
      eventSpecificContent = `
        <div style="background: #f3e5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #9c27b0; margin: 15px 0;">
          <h4 style="margin-top: 0;">当日のご案内</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>開始時間の10分前にはお越しください</li>
            <li>感染対策にご協力ください（マスク着用必須）</li>
            <li>動きやすい服装でお越しください</li>
            <li>写真撮影は指定された場所のみ可能です</li>
          </ul>
        </div>
      `
    }

    // ゴルフの場合は代表者名を使用
    const recipientName = data.eventType === 'golf' 
      ? data.representativeName 
      : `${data.lastName} ${data.firstName}`

    const mailOptions = {
      from: {
        name: '空の森クリニック イベント事務局',
        address: process.env.EMAIL_USER
      },
      to: data.email,
      subject: `【${eventTitles[data.eventType]}】お申し込み完了のお知らせ`,
      text: `
${recipientName} 様

この度は、${eventTitles[data.eventType]}にお申し込みいただき、誠にありがとうございます。

■ご予約内容
予約ID: ${data.uniqueId}
お名前: ${recipientName}
開催日時: ${dateTimeInfo}
所属機関: ${data.organization || data.companyName}

当日は予約ID「${data.uniqueId}」を受付でお伝えください。

空の森クリニック イベント事務局
TEL: 098-998-0011
Email: ${process.env.EMAIL_USER}
      `,
      html: `
        <div style="font-family: 'Yu Gothic', sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 16, 77, 0.15);">
            <div style="background: linear-gradient(135deg, #00104d 0%, #1e3a8a 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 20px;">${eventTitles[data.eventType]}</h1>
              <p style="margin: 10px 0 0; font-size: 16px;">お申し込み完了のお知らせ</p>
            </div>
            
            <div style="padding: 30px;">
              <p><strong>${recipientName}</strong> 様</p>
              
              <p>この度は、${eventTitles[data.eventType]}にお申し込みいただき、誠にありがとうございます。</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">ご予約内容</h3>
                <ul style="list-style: none; padding: 0;">
                  <li style="margin-bottom: 8px;"><strong>予約ID:</strong> ${data.uniqueId}</li>
                  <li style="margin-bottom: 8px;"><strong>お名前:</strong> ${recipientName}</li>
                  <li style="margin-bottom: 8px;"><strong>開催日時:</strong> ${dateTimeInfo}</li>
                  <li style="margin-bottom: 8px;"><strong>所属機関:</strong> ${data.organization || data.companyName}</li>
                </ul>
              </div>
              
              ${eventSpecificContent}
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4caf50; margin: 15px 0;">
                <p style="margin: 0;"><strong>重要:</strong> 当日は予約ID「<strong>${data.uniqueId}</strong>」を受付でお伝えください。</p>
              </div>
              
              <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
              <p><strong>当日お会いできますことを心よりお待ちしております。</strong></p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
              <p><strong>空の森クリニック イベント事務局</strong></p>
              <p>TEL: 098-998-0011</p>
              <p>Email: ${process.env.EMAIL_USER}</p>
            </div>
          </div>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('メール送信成功:', info.messageId)

    return { success: true, messageId: info.messageId }

  } catch (error) {
    console.error('メール送信エラー:', error)
    return { success: false, error: error.message }
  }
}

function getParticipationTypeLabel(participationType) {
  const labels = {
    'golf_only': 'ゴルフコンペのみ参加',
    'party_only': '表彰式のみ参加',
    'both': 'どちらも両方参加'
  }
  return labels[participationType] || participationType
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
  
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const formData = req.body
    console.log('Form data received:', formData)

    // 基本バリデーション
    if (!formData.eventType || !formData.email) {
      return res.status(400).json({ 
        error: '必須項目が不足しています',
        required: ['eventType', 'email']
      })
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

    // 定員チェック
    const capacityCheck = await checkCapacity(formData.eventType, formData.selectedTimeSlot)
    console.log('Capacity check result:', capacityCheck)

    if (capacityCheck.isAvailable) {
      console.log(`Registration available (${capacityCheck.remainingSlots} slots remaining)`)
      
      await saveToFirestore(submissionData, 'active')
      console.log('Data saved to Firestore successfully')

      const emailResult = await sendConfirmationEmail(submissionData)
      console.log('Email result:', emailResult)

      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          await sendSlackNotification(submissionData)
          console.log('Slack notification sent successfully')
        } catch (slackError) {
          console.error('Slack notification failed:', slackError)
        }
      }

      const response = {
        success: true,
        uniqueId,
        status: 'confirmed',
        message: 'お申し込みが完了しました',
        remainingSlots: capacityCheck.remainingSlots - 1,
        emailSent: emailResult.success
      }

      res.status(200).json(response)

    } else {
      await saveToFirestore(submissionData, 'over_capacity')
      
      const response = {
        success: false,
        uniqueId,
        status: 'full_capacity',
        message: 'ご予約満員御礼につき、ご予約がお取りできませんでした。',
        currentEntries: capacityCheck.currentCount,
        maxEntries: MAX_ENTRIES[formData.eventType]
      }

      res.status(400).json(response)
    }

  } catch (error) {
    console.error('Submit API error:', error)
    
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}