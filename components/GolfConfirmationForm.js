// components/GolfConfirmationForm.js
import { useState } from 'react'
import styles from '../styles/ConfirmationForm.module.css'

export default function GolfConfirmationForm({ data, onConfirm, onBack }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
        </div>
        <h1>第28回日本IVF学会学術集会杯</h1>
        <p>ゴルフコンペ お申し込み内容の確認</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            お申し込み内容
          </h2>
          
          <div className={styles.confirmationItem}>
            <span className={styles.label}>申込代表者</span>
            <span className={styles.value}>{data.representativeName}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>ふりがな</span>
            <span className={styles.value}>{data.representativeKana}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>会社名</span>
            <span className={styles.value}>{data.companyName}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>電話番号</span>
            <span className={styles.value}>{data.phone}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>メールアドレス</span>
            <span className={styles.value}>{data.email}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>開催日</span>
            <span className={styles.value}>2025年10月10日（金）7:28スタート</span>
          </div>
          
          {/* 追加参加者 */}
          {data.participants && data.participants.filter(p => p.name.trim()).length > 0 && (
            <div className={styles.participantsSection}>
              <h3>追加参加者</h3>
              {data.participants
                .filter(p => p.name.trim())
                .map((participant, index) => (
                  <div key={index} className={styles.participantItem}>
                    <span className={styles.label}>参加者{index + 2}</span>
                    <span className={styles.value}>
                      {participant.name} ({participant.kana})
                    </span>
                  </div>
                ))}
            </div>
          )}
          
          <div className={styles.confirmationItem}>
            <span className={styles.label}>合計参加人数</span>
            <span className={styles.value}>{data.totalParticipants}名</span>
          </div>
          
          {data.remarks && (
            <div className={styles.confirmationItem}>
              <span className={styles.label}>備考</span>
              <span className={styles.value}>{data.remarks}</span>
            </div>
          )}
        </div>

        <div className={styles.notice}>
          <p>上記の内容でお申し込みを確定します。</p>
          <p>確定後、確認メールをお送りいたします。</p>
        </div>

        <div className={styles.buttons}>
          <button 
            type="button" 
            onClick={onBack} 
            className={styles.backButton}
            disabled={isSubmitting}
          >
            戻る
          </button>
          <button 
            type="button" 
            onClick={handleConfirm} 
            className={styles.confirmButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? '処理中...' : '申し込み確定'}
          </button>
        </div>
      </div>
    </div>
  )
}