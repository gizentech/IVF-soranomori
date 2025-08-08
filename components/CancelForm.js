// components/CancelForm.js
import { useState } from 'react'
import styles from '../styles/CancelForm.module.css'

export default function CancelForm({ onBack }) {
  const [uniqueId, setUniqueId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleCancel = async (e) => {
    e.preventDefault()
    
    if (!uniqueId.trim()) {
      setError('予約IDを入力してください')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uniqueId: uniqueId.trim(),
          reason: reason.trim()
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setMessage(`予約ID「${result.uniqueId}」のキャンセルが完了しました。`)
        setUniqueId('')
        setReason('')
      } else {
        setError(result.error || 'キャンセル処理に失敗しました')
      }
    } catch (error) {
      console.error('Cancel error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>予約キャンセル</h1>
        <p>予約IDを入力してキャンセル手続きを行ってください</p>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleCancel} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="uniqueId" className={styles.label}>
              予約ID <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="uniqueId"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              placeholder="例: IVF-GOLF123456"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="reason" className={styles.label}>
              キャンセル理由（任意）
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="キャンセル理由があれば入力してください"
              className={styles.textarea}
              rows={4}
            />
          </div>

          {error && (
            <div className={styles.errorMessage}>
              ❌ {error}
            </div>
          )}

          {message && (
            <div className={styles.successMessage}>
              ✅ {message}
            </div>
          )}

          <div className={styles.buttons}>
            <button type="button" onClick={onBack} className={styles.backButton}>
              戻る
            </button>
            <button 
              type="submit" 
              className={styles.cancelButton}
              disabled={loading}
            >
              {loading ? 'キャンセル中...' : 'キャンセル実行'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}