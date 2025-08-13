// lib/slack.js
export async function sendSlackNotification(data, type = 'registration') {
  console.log('=== Slack Notification Start ===')
  console.log('Type:', type)
  console.log('Data received:', data)
  
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  console.log('Webhook URL exists:', !!webhookUrl)
  console.log('Webhook URL length:', webhookUrl?.length)
  
  if (!webhookUrl) {
    console.error('❌ SLACK_WEBHOOK_URL not configured')
    return { success: false, error: 'Webhook URL not configured' }
  }

  const eventTitles = {
    nursing: '🏥 第23回日本生殖看護学会学術集会 施設見学',
    ivf: '🔬 第28回日本IVF学会学術集会 施設見学',  
    golf: '⛳ 第28回日本IVF学会学術集会杯 ゴルフコンペ'
  }

  let message

  try {
    if (type === 'registration') {
      const eventTitle = eventTitles[data.eventType] || data.eventType
      const name = `${data.lastName || ''} ${data.firstName || ''}`.trim() || data.representativeName || '名前不明'
      const org = data.organization || data.companyName || '所属不明'
      
      message = {
        text: `🎯 新しい予約が入りました！\n` +
              `${eventTitle}\n` +
              `予約ID: ${data.uniqueId}\n` +
              `お名前: ${name}\n` +
              `メール: ${data.email}\n` +
              `所属: ${org}\n` +
              `時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
      }
      
      // イベント固有の情報を追加
      if (data.eventType === 'ivf' && data.selectedTimeSlot) {
        message.text += `\n希望時間: ${data.selectedTimeSlot}`
      }
      
      if (data.eventType === 'golf' && data.totalParticipants) {
        message.text += `\n参加人数: ${data.totalParticipants}名`
      }
      
    } else if (type === 'cancellation') {
      message = {
        text: `❌ 予約がキャンセルされました\n` +
              `予約ID: ${data.uniqueId}\n` +
              `理由: ${data.reason || '理由なし'}\n` +
              `件数: ${data.cancelledCount || 1}件\n` +
              `時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
      }
    }

    console.log('Sending message to Slack...')
    console.log('Message content:', message)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    console.log('Slack response status:', response.status)
    console.log('Slack response ok:', response.ok)

    const responseText = await response.text()
    console.log('Slack response text:', responseText)

    if (response.ok && responseText === 'ok') {
      console.log(`✅ Slack ${type} notification sent successfully`)
      return { success: true, status: response.status }
    } else {
      console.error(`❌ Slack notification failed: ${response.status} - ${responseText}`)
      return { success: false, error: `HTTP ${response.status}: ${responseText}` }
    }

  } catch (error) {
    console.error(`❌ Slack ${type} notification error:`, error)
    return { success: false, error: error.message }
  }
}

export async function sendCapacityAlert(eventType, currentCount, maxCount) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  if (!webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' }
  }

  const eventTitles = {
    nursing: '🏥 第23回日本生殖看護学会学術集会 施設見学',
    ivf: '🔬 第28回日本IVF学会学術集会 施設見学',
    golf: '⛳ 第28回日本IVF学会学術集会杯 ゴルフコンペ'
  }

  const ratio = currentCount / maxCount
  let alertIcon = '⚠️'
  
  if (ratio >= 1) {
    alertIcon = '🚫'
  } else if (ratio >= 0.9) {
    alertIcon = '🔥'
  }

  const message = {
    text: `${alertIcon} 定員アラート\n` +
          `${eventTitles[eventType]}\n` +
          `現在: ${currentCount}名 / ${maxCount}名 (${Math.round(ratio * 100)}%)\n` +
          `残り: ${Math.max(0, maxCount - currentCount)}名\n` +
          `時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    if (response.ok) {
      console.log('✅ Slack capacity alert sent successfully')
      return { success: true }
    } else {
      const responseText = await response.text()
      console.error('❌ Slack capacity alert failed:', responseText)
      return { success: false, error: responseText }
    }
  } catch (error) {
    console.error('❌ Slack capacity alert error:', error)
    return { success: false, error: error.message }
  }
}