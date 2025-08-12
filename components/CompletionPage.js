import { useState } from 'react'
import styles from '../styles/CompletionPage.module.css'

export default function CompletionPage({ uniqueId, data, onHome, eventType }) {
  const getEventTitle = () => {
    switch (eventType) {
      case 'nursing':
        return '第23回日本生殖看護学会学術集会'
      case 'ivf':
        return '第28回日本IVF学会学術集会'
      case 'golf':
        return '第28回日本IVF学会学術集会杯'
      default:
        return 'イベント'
    }
  }

  const getEventSubtitle = () => {
    switch (eventType) {
      case 'nursing':
      case 'ivf':
        return '空の森クリニック見学ツアー'
      case 'golf':
        return 'ゴルフコンペ'
      default:
        return ''
    }
  }

  const getEventDate = () => {
    switch (eventType) {
      case 'nursing':
        return '2025年10月13日（月）14:00〜'
      case 'ivf':
        return data.selectedTimeSlot || '未選択'
      case 'golf':
        return '2025年10月10日（金）7:28スタート'
      default:
        return ''
    }
  }

  const getConfirmedParticipants = () => {
    console.log('getConfirmedParticipants called with eventType:', eventType)
    console.log('data:', data)
    
    if (eventType === 'golf') {
      const participants = [
        {
          name: data.representativeName,
          isRepresentative: true
        }
      ]
      
      // participantsが配列として存在する場合
      if (data.participants && Array.isArray(data.participants)) {
        console.log('Processing participants array:', data.participants)
        data.participants.forEach((participant, index) => {
          if (participant.name && participant.name.trim()) {
            participants.push({
              name: participant.name,
              kana: participant.kana,
              participantNumber: participant.participantNumber || (index + 2),
              isRepresentative: false
            })
          }
        })
      }
      
      console.log('Final participants array:', participants)
      return participants
    }
    
    return [{
      name: `${data.lastName} ${data.firstName}`,
      isRepresentative: true
    }]
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
        </div>
        <h1>{getEventTitle()}</h1>
        <p>お申し込み完了</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/鳥の雲.webp" alt="" className={styles.sectionIcon} />
            予約完了
          </h2>
          <div className={styles.ticketContainer}>
            <div className={styles.ticket}>
              <div className={styles.ticketInfo}>
                <p><strong>予約ID:</strong> <span className={styles.reservationId}>{uniqueId}</span></p>
                <p><strong>代表者:</strong> {eventType === 'golf' ? data.representativeName : `${data.lastName} ${data.firstName}`}</p>
                <p><strong>開催日時:</strong> {getEventDate()}</p>
                <p><strong>所属機関:</strong> {data.organization || data.companyName}</p>
                {eventType === 'golf' && (
                  <p><strong>参加人数:</strong> {data.totalParticipants}名</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 参加者一覧 */}
        <div className={styles.participantsSection}>
          <h2>
            <img src="/img/ガーベラ.webp" alt="" className={styles.sectionIcon} />
            予約確定者
          </h2>
          <div className={styles.participantsList}>
            {getConfirmedParticipants().map((participant, index) => (
              <div key={index} className={styles.participantItem}>
                <span className={styles.participantNumber}>
                  {index + 1}
                </span>
                <span className={styles.participantName}>
                  {participant.name}
                  {participant.kana && ` (${participant.kana})`}
                  {participant.isRepresentative && ' （代表者）'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.messageSection}>
          <h2>
            <img src="/img/ガーベラ.webp" alt="" className={styles.sectionIcon} />
            ご案内
          </h2>
          <div className={styles.message}>
            <p>お申し込みありがとうございます。</p>
            <p>確認メールを送信いたしました。</p>
            <p><strong>当日は予約ID「{uniqueId}」を受付でお伝えください。</strong></p>
            <p>ご不明な点がございましたら、下記までお問い合わせください。</p>
            <div className={styles.contactInfo}>
              <p><strong>空の森クリニック</strong></p>
              <p>TEL: 098-998-0011</p>
            </div>
          </div>
        </div>

        <div className={styles.buttons}>
          <button onClick={onHome} className={styles.homeButton}>
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}