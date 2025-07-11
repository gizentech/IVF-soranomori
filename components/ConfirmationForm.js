import { useState } from 'react'
import styles from '../styles/ConfirmationForm.module.css'

export default function ConfirmationForm({ data, onConfirm, onBack }) {
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
        <h1>第23回日本生殖看護学会学術集会</h1>
        <p>お申し込み内容の確認</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            お申し込み内容
          </h2>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>お名前</span>
            <span className={styles.value}>{data.lastName} {data.firstName}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>お名前（カナ）</span>
            <span className={styles.value}>{data.lastNameKana} {data.firstNameKana}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>メールアドレス</span>
            <span className={styles.value}>{data.email}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>電話番号</span>
            <span className={styles.value}>{data.phone}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>所属機関</span>
            <span className={styles.value}>{data.organization}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>職種・役職</span>
            <span className={styles.value}>{data.position}</span>
          </div>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>見学日</span>
            <span className={styles.value}>2025年10月13日（月）14:00〜</span>
          </div>
          {data.specialRequests && (
            <div className={styles.confirmationItem}>
              <span className={styles.label}>特別な配慮事項</span>
              <span className={styles.value}>{data.specialRequests}</span>
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