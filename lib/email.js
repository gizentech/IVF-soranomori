export function generateConfirmationEmailContent(data) {
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

  const recipientName = data.eventType === 'golf' 
    ? data.representativeName 
    : `${data.lastName} ${data.firstName}`

  // ゴルフの場合の参加者リスト生成
  let participantsList = ''
  let participantsListHtml = ''
  
  if (data.eventType === 'golf') {
    const participants = []
    
    // 代表者
    participants.push({
      number: 1,
      name: data.representativeName,
      kana: data.representativeKana,
      isRepresentative: true
    })
    
    // 追加参加者
    if (data.participants && Array.isArray(data.participants)) {
      data.participants.forEach((participant, index) => {
        if (participant.name && participant.name.trim()) {
          participants.push({
            number: index + 2,
            name: participant.name,
            kana: participant.kana,
            isRepresentative: false
          })
        }
      })
    }
    
    // テキスト版参加者リスト
    participantsList = `
■参加者一覧（合計${participants.length}名）
${participants.map(p => 
  `${p.number}. ${p.name}${p.kana ? ` (${p.kana})` : ''}${p.isRepresentative ? ' [代表者]' : ''}`
).join('\n')}
`

    // HTML版参加者リスト
    participantsListHtml = `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
        <h3 style="margin-top: 0; color: #495057; font-size: 16px;">👥 参加者一覧（合計${participants.length}名）</h3>
        <div style="margin-top: 15px;">
          ${participants.map(p => `
            <div style="padding: 8px 0; border-bottom: 1px solid #dee2e6; display: flex; align-items: center;">
              <span style="background: #007bff; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px;">${p.number}</span>
              <span style="flex: 1; font-weight: 500;">
                ${p.name}${p.kana ? ` <span style="color: #6c757d; font-size: 14px;">(${p.kana})</span>` : ''}
                ${p.isRepresentative ? ' <span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">代表者</span>' : ''}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  const subject = `【${eventTitles[data.eventType]}】お申し込み完了のお知らせ`

  const text = `
${recipientName} 様

この度は、${eventTitles[data.eventType]}にお申し込みいただき、誠にありがとうございます。

■ご予約内容
予約ID: ${data.uniqueId}
お名前: ${recipientName}
開催日時: ${dateTimeInfo}
所属機関: ${data.organization || data.companyName}
${data.eventType === 'golf' ? `参加人数: ${data.totalParticipants}名` : ''}

${participantsList}

当日は予約ID「${data.uniqueId}」を受付でお伝えください。

ご不明な点がございましたら、お気軽にお問い合わせください。

空の森クリニック イベント事務局
TEL: 098-998-0011
  `

  const html = `
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
         
         ${participantsListHtml}
         
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
           <p style="margin: 5px 0; font-size: 14px;">🏥 医療法人杏月会 空の森クリニック</p>
         </div>
       </div>
     </div>
   </div>
 `

  return { subject, text, html }
}