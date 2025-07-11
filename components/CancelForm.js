import { useState } from 'react'
import styles from '../styles/CancelForm.module.css'

export default function CancelForm({ onBack }) {
  const [uniqueId, setUniqueId] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uniqueId,
          email,
          reason
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('キャンセル手続きが完了しました。')
        setUniqueId('')
        setEmail('')
        setReason('')
      } else {
        setMessage(result.error || 'キャンセル手続きに失敗しました。')
      }
    } catch (error) {
      console.error('Cancel error:', error)
      setMessage('エラーが発生しました。もう一度お試しください。')
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
        <h1>第23回日本生殖看護学会学術集会</h1>
        <p>キャンセルフォーム</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            キャンセル手続き
          </h2>
          <div className={styles.description}>
            <p>見学ツアーをキャンセルされる場合は、以下の情報を入力してください。</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor="uniqueId" className={styles.label}>
                予約ID <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="uniqueId"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                placeholder="IVF-SORA******"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="email" className={styles.label}>
                メールアドレス <span className={styles.required}>*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reason" className={styles.label}>
                キャンセル理由
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="キャンセル理由をお聞かせください（任意）"
                rows={4}
                className={styles.textarea}
              />
            </div>

            {message && (
              <div className={message.includes('完了') ? styles.successMessage : styles.errorMessage}>
                {message}
              </div>
            )}

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
                type="submit" 
                className={styles.cancelButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? '処理中...' : 'キャンセル実行'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}