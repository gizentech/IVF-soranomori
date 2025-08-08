// pages/api/cancel.js
import { db } from '../../lib/firebase'
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import nodemailer from 'nodemailer'

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

  console.log('Email transporter config:', {
    host: transporterConfig.host,
    port: transporterConfig.port,
    user: transporterConfig.auth.user,
    hasPassword: !!transporterConfig.auth.pass
  })

  // createTransporter → createTransport に修正
  return nodemailer.createTransport(transporterConfig)
}

async function findAndMoveRecord(uniqueId, email, reason) {
  try {
    console.log('キャンセル対象を検索中:', { uniqueId, email })

    const q = query(
      collection(db, 'registrations'),
      where('uniqueId', '==', uniqueId),
      where('email', '==', email),
      where('status', '==', 'active')
    )

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error('該当する予約が見つかりません。予約IDとメールアドレスを確認してください。')
    }

    if (querySnapshot.size > 1) {
      console.warn('複数の該当レコードが見つかりました')
    }

    const targetDoc = querySnapshot.docs[0]
    const targetData = targetDoc.data()
    
    console.log('該当レコードを発見:', targetData)

    const cancelData = {
      ...targetData,
      cancelledAt: serverTimestamp(),
      cancelReason: reason || '',
      status: 'cancelled'
    }

    console.log('cancelledコレクションに保存するデータ:', cancelData)

    await addDoc(collection(db, 'cancelled'), cancelData)
    console.log('cancelledコレクションへの追加完了')

    await deleteDoc(doc(db, 'registrations', targetDoc.id))
    console.log('registrationsコレクションからの削除完了')

    return {
      success: true,
      data: targetData
    }

  } catch (error) {
    console.error('レコード移動エラー:', error)
    throw error
  }
}

async function sendCancelConfirmationEmail(email, uniqueId, lastName, firstName, eventType) {
  try {
    console.log('キャンセルメール送信開始:', email)
    
    const transporter = await createMailTransporter()
    
    console.log('SMTP接続をテスト中...')
    await transporter.verify()
    console.log('SMTP接続成功')
    
    const eventTitles = {
      nursing: '第23回日本生殖看護学会学術集会 見学ツアー',
      ivf: '第28回日本IVF学会学術集会 見学ツアー',
      golf: '第28回日本IVF学会学術集会杯 ゴルフコンペ'
    }

    const eventTitle = eventTitles[eventType] || 'イベント'
    
    const mailOptions = {
      from: {
        name: '空の森クリニック イベント事務局',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `【${eventTitle}】キャンセル完了のご案内`,
      text: `
${lastName} ${firstName} 様

${eventTitle}のキャンセル手続きが完了いたしました。

■キャンセル内容
予約ID: ${uniqueId}
お名前: ${lastName} ${firstName}
キャンセル日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

またの機会がございましたら、ぜひご参加ください。

空の森クリニック イベント事務局
TEL: 098-998-0011
Email: ${process.env.EMAIL_USER}
      `,
      html: `
        <div style="font-family: 'Yu Gothic', sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 16, 77, 0.15);">
            <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 20px;">${eventTitle}</h1>
              <p style="margin: 10px 0 0; font-size: 16px;">キャンセル完了のご案内</p>
            </div>
            
            <div style="padding: 30px;">
              <p><strong>${lastName} ${firstName}</strong> 様</p>
              
              <p>この度は、${eventTitle}のキャンセルお手続きをいただき、ありがとうございました。</p>
              <p>キャンセル手続きが完了いたしました。</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">キャンセル内容</h3>
                <ul style="list-style: none; padding: 0;">
                  <li style="margin-bottom: 8px;"><strong>予約ID:</strong> ${uniqueId}</li>
                  <li style="margin-bottom: 8px;"><strong>お名前:</strong> ${lastName} ${firstName}</li>
                  <li style="margin-bottom: 8px;"><strong>キャンセル日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
                </ul>
              </div>
              
              <p>またの機会がございましたら、ぜひご参加ください。</p>
              
              <p>ご不明な点がございましたら、下記までお問い合わせください。</p>
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

    console.log('キャンセルメール送信中...')
    const info = await transporter.sendMail(mailOptions)
    console.log('キャンセルメール送信成功:', info.messageId)
    
    return { success: true, messageId: info.messageId }
    
  } catch (error) {
    console.error('メール送信エラー:', error)
    console.log('メール送信に失敗しましたが、キャンセル処理は完了しています')
    return { success: false, error: error.message }
  }
}

export default async function handler(req, res) {
  console.log('=== Cancel API Called ===')
  console.log('Method:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, email, reason } = req.body

    console.log('キャンセル処理開始:', { uniqueId, email, reason })

    // 基本バリデーション
    if (!uniqueId || !email) {
      return res.status(400).json({ 
        error: '予約IDとメールアドレスは必須です' 
      })
    }

    // 予約IDの形式チェック（簡易版）
    if (!uniqueId.startsWith('IVF-')) {
      return res.status(400).json({ 
        error: '予約IDの形式が正しくありません' 
      })
    }

    // 1. registrationsからcancelledにレコードを移動
    const result = await findAndMoveRecord(uniqueId, email, reason)
    
    if (result.success) {
      const userData = result.data
      const lastName = userData.lastName
      const firstName = userData.firstName
      const eventType = userData.eventType

      // 2. キャンセル確認メールを送信
      const emailResult = await sendCancelConfirmationEmail(email, uniqueId, lastName, firstName, eventType)
      
      console.log('キャンセル処理完了')
      
      res.status(200).json({
        success: true,
        message: 'キャンセル手続きが完了しました',
        emailSent: emailResult.success
      })
    }

  } catch (error) {
    console.error('Cancel API error:', error)
    console.error('Error stack:', error.stack)
    
    let errorMessage = 'キャンセル処理でエラーが発生しました'
    
    if (error.message.includes('該当する予約が見つかりません')) {
      errorMessage = error.message
    } else if (error.message.includes('Firebase')) {
      errorMessage = 'データベース接続エラーが発生しました'
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message
    })
  }
}