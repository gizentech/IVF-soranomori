// components/IVFConfirmationForm.js
import { useState } from 'react'
import styles from '../styles/ConfirmationForm.module.css'

export default function IVFConfirmationForm({ data, onConfirm, onBack }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPositionLabel = (position) => {
    const labels = {
      'doctor': '医師',
      'nurse': '看護師',
      'embryologist': '胚培養士',
      'coordinator': '不妊カウンセラー',
      'technician': '臨床検査技師',
      'pharmacist': '薬剤師',
      'administrator': '事務・管理職',
      'student': '学生',
      'other': 'その他'
    }
    return labels[position] || position
  }

  const getExperienceLabel = (exp) => {
    const labels = {
      'under1': '1年未満',
      '1-3': '1-3年',
      '3-5': '3-5年',
      '5-10': '5-10年',
      'over10': '10年以上'
    }
    return labels[exp] || exp
  }

  const getInterestsLabels = (interests) => {
    const labels = {
      'ivf_laboratory': 'IVF胚培養室',
      'operating_room': '手術室・採卵室',
      'counseling': 'カウンセリング・心理的ケア',
      'patient_flow': '患者動線・施設設計',
      'equipment': '最新設備・機器',
      'quality_management': '品質管理システム'
    }
    return interests?.map(interest => labels[interest] || interest).join('、') || ''
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
        </div>
        <h1>第28回日本IVF学会学術集会</h1>
        <p>見学ツアー お申し込み内容の確認</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            お申し込み内容
          </h2>
          <div className={styles.confirmationItem}>
            <span className={styles.label}>希望見学日時</span>
            <span className={styles.value}>{data.selectedTimeSlot}</span>
          </div>
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
            <span className={styles.value}>{getPositionLabel(data.position)}</span>
          </div>
          {data.experience && (
            <div className={styles.confirmationItem}>
              <span className={styles.label}>生殖医療経験年数</span>
              <span className={styles.value}>{getExperienceLabel(data.experience)}</span>
            </div>
          )}
          {data.interests && data.interests.length > 0 && (
            <div className={styles.confirmationItem}>
              <span className={styles.label}>特に関心のある分野</span>
              <span className={styles.value}>{getInterestsLabels(data.interests)}</span>
            </div>
          )}
          {data.specialRequests && (
            <div className={styles.confirmationItem}>
              <span className={styles.label}>特別な配慮事項・質問</span>
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