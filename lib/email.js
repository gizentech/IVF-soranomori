// lib/email.js
import nodemailer from 'nodemailer'

export async function createMailTransporter() {
  const transporterConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
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

  return nodemailer.createTransporter(transporterConfig)
}

export async function sendConfirmationEmail(data) {
  try {
    console.log('=== メール送信開始 ===')
    console.log('送信先:', data.email)
    
    // メール設定の確認
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ メール設定が不完全です')
      return { success: false, error: 'メール設定が不完全です' }
    }

    const transporter = await createMailTransporter()
    
    console.log('SMTP接続をテスト中...')
    await transporter.verify()
    console.log('✅ SMTP接続成功')
    
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
   console.log('✅ メール送信成功:', info.messageId)

   return { success: true, messageId: info.messageId }

 } catch (error) {
   console.error('❌ メール送信エラー:', error)
   return { success: false, error: error.message }
 }
}

export async function sendCancellationEmail(data) {
 try {
   console.log('=== キャンセルメール送信開始 ===')
   console.log('送信先:', data.email)
   
   if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
     console.warn('⚠️ メール設定が不完全です')
     return { success: false, error: 'メール設定が不完全です' }
   }

   const transporter = await createMailTransporter()
   await transporter.verify()
   
   const eventTitles = {
     nursing: '第23回日本生殖看護学会学術集会 見学ツアー',
     ivf: '第28回日本IVF学会学術集会 見学ツアー',
     golf: '第28回日本IVF学会学術集会杯 ゴルフコンペ'
   }

   const recipientName = data.eventType === 'golf' 
     ? data.representativeName 
     : `${data.lastName} ${data.firstName}`

   const mailOptions = {
     from: {
       name: '空の森クリニック イベント事務局',
       address: process.env.EMAIL_USER
     },
     to: data.email,
     subject: `【${eventTitles[data.eventType]}】キャンセル完了のお知らせ`,
     text: `
${recipientName} 様

${eventTitles[data.eventType]}のキャンセルが完了いたしました。

■キャンセル内容
予約ID: ${data.uniqueId}
お名前: ${recipientName}
キャンセル理由: ${data.cancelReason || '記載なし'}

またの機会がございましたら、お気軽にお申し込みください。

空の森クリニック イベント事務局
TEL: 098-998-0011
Email: ${process.env.EMAIL_USER}
     `,
     html: `
       <div style="font-family: 'Yu Gothic', sans-serif; line-height: 1.6; color: #333;">
         <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 16, 77, 0.15);">
           <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; color: white;">
             <h1 style="margin: 0; font-size: 20px;">${eventTitles[data.eventType]}</h1>
             <p style="margin: 10px 0 0; font-size: 16px;">キャンセル完了のお知らせ</p>
           </div>
           
           <div style="padding: 30px;">
             <p><strong>${recipientName}</strong> 様</p>
             
             <p>${eventTitles[data.eventType]}のキャンセルが完了いたしました。</p>
             
             <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
               <h3 style="margin-top: 0;">キャンセル内容</h3>
               <ul style="list-style: none; padding: 0;">
                 <li style="margin-bottom: 8px;"><strong>予約ID:</strong> ${data.uniqueId}</li>
                 <li style="margin-bottom: 8px;"><strong>お名前:</strong> ${recipientName}</li>
                 <li style="margin-bottom: 8px;"><strong>キャンセル理由:</strong> ${data.cancelReason || '記載なし'}</li>
               </ul>
             </div>
             
             <p>またの機会がございましたら、お気軽にお申し込みください。</p>
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
   console.log('✅ キャンセルメール送信成功:', info.messageId)

   return { success: true, messageId: info.messageId }

 } catch (error) {
   console.error('❌ キャンセルメール送信エラー:', error)
   return { success: false, error: error.message }
 }
}