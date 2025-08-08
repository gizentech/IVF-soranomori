// lib/slack.js
export async function sendSlackNotification(data) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  
  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured')
    return
  }

  const eventTitles = {
    nursing: '第23回日本生殖看護学会学術集会 見学ツアー',
    ivf: '第28回日本IVF学会学術集会 見学ツアー',
    golf: '第28回日本IVF学会学術集会杯 ゴルフコンペ'
  }

  const message = {
    text: `新しい予約が入りました！`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎯 新規予約通知"
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*イベント:* ${eventTitles[data.eventType] || data.eventType}`
          },
          {
            type: "mrkdwn",
            text: `*予約ID:* ${data.uniqueId}`
          },
          {
            type: "mrkdwn",
            text: `*お名前:* ${data.lastName} ${data.firstName}`
          },
          {
            type: "mrkdwn",
            text: `*メール:* ${data.email}`
          }
        ]
      }
    ]
  }

  if (data.eventType === 'ivf' && data.selectedTimeSlot) {
    message.blocks[1].fields.push({
      type: "mrkdwn",
      text: `*選択時間:* ${data.selectedTimeSlot}`
    })
  }

  if (data.eventType === 'golf') {
    message.blocks[1].fields.push({
      type: "mrkdwn",
      text: `*参加費:* プレーフィー + 懇親会費`
    })
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`)
    }

    console.log('Slack notification sent successfully')
  } catch (error) {
    console.error('Failed to send Slack notification:', error)
  }
}