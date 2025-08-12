// lib/email.js
export async function sendConfirmationEmail(data) {
  try {
    console.log('=== Gmail メール送信開始 ===')
    console.log('送信先:', data.email)
    console.log('イベントタイプ:', data.eventType)
    
    // 環境変数の確認
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.warn('⚠️ メール設定が不完全です:', missingVars)
      return { success: false, error: `メール設定が不完全です: ${missingVars.join(', ')}` }
    }

    console.log('環境変数チェック完了')
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST)
    console.log('EMAIL_USER:', process.env.EMAIL_USER)
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT)

    // 動的インポートでnodemailerを読み込み
    const nodemailer = await import('nodemailer')
    console.log('nodemailer imported successfully')

    // Gmail用の設定
    const transporterConfig = {
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS使用
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // アプリパスワード
      },
      debug: true,
      logger: true
    }

    console.log('Creating Gmail transporter with config:', {
      service: transporterConfig.service,
      host: transporterConfig.host,
      port: transporterConfig.port,
      user: transporterConfig.auth.user,
      hasPassword: !!transporterConfig.auth.pass
    })

    const transporter = nodemailer.default.createTransporter(transporterConfig)
    
    console.log('Gmail SMTP接続をテスト中...')
    await transporter.verify()
    console.log('✅ Gmail SMTP接続成功')
    
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

    console.log('受信者名:', recipientName)
    console.log('イベントタイトル:', eventTitles[data.eventType])

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
${data.eventType === 'golf' ? `参加人数: ${data.totalParticipants}名` : ''}

当日は予約ID「${data.uniqueId}」を受付でお伝えください。

ご不明な点がございましたら、お気軽にお問い合わせください。

空の森クリニック イベント事務局
TEL: 098-998-0011
Email: ${process.env.EMAIL_USER}
      `,
      html: `
        <div style="font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 16, 77, 0.15);">
            <div style="background: linear-gradient(135deg, #00104d 0%, #1e3a8a 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600;">${eventTitles[data.eventType]}</h1>
              <p style="margin: 10px 0 0; font-size: 16px;">お申し込み完了のお知らせ</p>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-bottom: 20px;"><strong>${recipientName}</strong> 様</p>
              
              <p style="font-size: 15px; line-height: 1.6;">この度は、${eventTitles[data.eventType]}にお申し込みいただき、誠にありがとうございます。</p>
             
             <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
               <h3 style="margin-top: 0; color: #495057; font-size: 16px;">📋 ご予約内容</h3>
               <table style="width: 100%; border-collapse: collapse;">
                 <tr>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 600; color: #495057;">予約ID:</td>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 700; color: #007bff;">${data.uniqueId}</td>
                 </tr>
                 <tr>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 600; color: #495057;">お名前:</td>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${recipientName}</td>
                 </tr>
                 <tr>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 600; color: #495057;">開催日時:</td>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${dateTimeInfo}</td>
                 </tr>
                 <tr>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 600; color: #495057;">所属機関:</td>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${data.organization || data.companyName}</td>
                 </tr>
                 ${data.eventType === 'golf' ? `
                 <tr>
                   <td style="padding: 8px 0; font-weight: 600; color: #495057;">参加人数:</td>
                   <td style="padding: 8px 0;">${data.totalParticipants}名</td>
                 </tr>` : ''}
               </table>
             </div>
             
             <div style="background: #d4edda; padding: 15px; border-radius: 8px; border: 1px solid #c3e6cb; margin: 20px 0;">
               <p style="margin: 0; color: #155724; font-weight: 600;">
                 🎫 <strong>重要なお知らせ</strong><br>
                 当日は予約ID「<span style="background: #fff; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 16px; font-weight: 700; color: #007bff;">${data.uniqueId}</span>」を受付でお伝えください。
               </p>
             </div>
             
             <p style="font-size: 15px; line-height: 1.6; margin: 20px 0;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
             <p style="font-size: 16px; font-weight: 600; color: #007bff; margin: 20px 0;">当日お会いできますことを心よりお待ちしております。</p>
           </div>
           
           <div style="background: #f8f9fa; padding: 25px; text-align: center; color: #666; border-top: 1px solid #e9ecef;">
             <div style="max-width: 400px; margin: 0 auto;">
               <p style="margin: 0 0 8px; font-weight: 600; color: #495057;">空の森クリニック イベント事務局</p>
               <p style="margin: 5px 0; font-size: 14px;">📞 TEL: 098-998-0011</p>
               <p style="margin: 5px 0; font-size: 14px;">📧 Email: ${process.env.EMAIL_USER}</p>
               <p style="margin: 5px 0; font-size: 14px;">🏥 医療法人杏月会 空の森クリニック</p>
             </div>
           </div>
         </div>
       </div>
     `
   }

   console.log('Gmailでメール送信中...')
   console.log('Mail options:', {
     from: mailOptions.from,
     to: mailOptions.to,
     subject: mailOptions.subject
   })

   const info = await transporter.sendMail(mailOptions)
   console.log('✅ Gmail メール送信成功:', info.messageId)
   console.log('Response:', info.response)

   return { success: true, messageId: info.messageId }

 } catch (error) {
   console.error('❌ Gmail メール送信エラー:', error)
   console.error('エラーの詳細:', {
     message: error.message,
     code: error.code,
     command: error.command,
     stack: error.stack
   })
   return { success: false, error: error.message }
 }
}

export async function sendCancellationEmail(data) {
 try {
   console.log('=== Gmail キャンセルメール送信開始 ===')
   console.log('送信先:', data.email)
   
   const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD']
   const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
   
   if (missingVars.length > 0) {
     console.warn('⚠️ メール設定が不完全です:', missingVars)
     return { success: false, error: `メール設定が不完全です: ${missingVars.join(', ')}` }
   }

   // 動的インポートでnodemailerを読み込み
   const nodemailer = await import('nodemailer')
   
   const transporterConfig = {
     service: 'gmail',
     host: 'smtp.gmail.com',
     port: 587,
     secure: false,
     auth: {
       user: process.env.EMAIL_USER,
       pass: process.env.EMAIL_PASSWORD,
     },
     debug: true,
     logger: true
   }

   const transporter = nodemailer.default.createTransporter(transporterConfig)
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
       <div style="font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif; line-height: 1.6; color: #333;">
         <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(220, 53, 69, 0.15);">
           <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; color: white;">
             <h1 style="margin: 0; font-size: 20px; font-weight: 600;">${eventTitles[data.eventType]}</h1>
             <p style="margin: 10px 0 0; font-size: 16px;">キャンセル完了のお知らせ</p>
           </div>
           
           <div style="padding: 30px;">
             <p style="font-size: 16px; margin-bottom: 20px;"><strong>${recipientName}</strong> 様</p>
             
             <p style="font-size: 15px; line-height: 1.6;">${eventTitles[data.eventType]}のキャンセルが完了いたしました。</p>
             
             <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
               <h3 style="margin-top: 0; color: #495057; font-size: 16px;">📋 キャンセル内容</h3>
               <table style="width: 100%; border-collapse: collapse;">
                 <tr>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 600; color: #495057;">予約ID:</td>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 700; color: #dc3545;">${data.uniqueId}</td>
                 </tr>
                 <tr>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: 600; color: #495057;">お名前:</td>
                   <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${recipientName}</td>
                 </tr>
                 <tr>
                   <td style="padding: 8px 0; font-weight: 600; color: #495057;">キャンセル理由:</td>
                   <td style="padding: 8px 0;">${data.cancelReason || '記載なし'}</td>
                 </tr>
               </table>
             </div>
             
             <p style="font-size: 15px; line-height: 1.6; margin: 20px 0;">またの機会がございましたら、お気軽にお申し込みください。</p>
           </div>
           
           <div style="background: #f8f9fa; padding: 25px; text-align: center; color: #666; border-top: 1px solid #e9ecef;">
             <div style="max-width: 400px; margin: 0 auto;">
               <p style="margin: 0 0 8px; font-weight: 600; color: #495057;">空の森クリニック イベント事務局</p>
               <p style="margin: 5px 0; font-size: 14px;">📞 TEL: 098-998-0011</p>
               <p style="margin: 5px 0; font-size: 14px;">📧 Email: ${process.env.EMAIL_USER}</p>
               <p style="margin: 5px 0; font-size: 14px;">🏥 医療法人杏月会 空の森クリニック</p>
             </div>
           </div>
         </div>
       </div>
     `
   }

   const info = await transporter.sendMail(mailOptions)
   console.log('✅ Gmail キャンセルメール送信成功:', info.messageId)

   return { success: true, messageId: info.messageId }

 } catch (error) {
   console.error('❌ Gmail キャンセルメール送信エラー:', error)
   return { success: false, error: error.message }
 }
}