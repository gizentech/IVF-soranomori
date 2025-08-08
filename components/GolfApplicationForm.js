// components/GolfApplicationForm.js
import { useState } from 'react'
import styles from '../styles/ApplicationForm.module.css'

export default function GolfApplicationForm({ onSubmit, onBack, initialData = {} }) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [participants, setParticipants] = useState([
    { name: '', kana: '' }, // 参加者2
    { name: '', kana: '' }, // 参加者3
    { name: '', kana: '' }, // 参加者4
  ])

  const golfQuestions = {
    personalInfo: {
      title: "ゴルフコンペ申込フォーム",
      fields: [
        {
          name: "representativeName",
          label: "申込代表者",
          type: "text",
          required: true,
          placeholder: "山田　太郎"
        },
        {
          name: "representativeKana",
          label: "ふりがな",
          type: "text",
          required: true,
          placeholder: "やまだ　たろう"
        },
        {
          name: "companyName",
          label: "申込代表者/会社名",
          type: "text",
          required: true,
          placeholder: "○○大学病院、○○クリニック等"
        },
        {
          name: "phone",
          label: "申込代表者/電話番号",
          type: "tel",
          required: true,
          placeholder: "090-1234-5678"
        },
        {
          name: "email",
          label: "申込代表者/メールアドレス",
          type: "email",
          required: true,
          placeholder: "example@example.com"
        },
        {
          name: "participationType",
          label: "参加項目",
          type: "select",
          required: true,
          options: [
            { value: "golf_only", label: "ゴルフコンペのみ参加" },
            { value: "party_only", label: "表彰式のみ参加" },
            { value: "both", label: "どちらも両方参加" }
          ]
        },
        {
          name: "remarks",
          label: "備考欄",
          type: "textarea",
          required: false,
          placeholder: "その他ご要望やご質問があればご記入ください"
        }
      ]
    }
  }

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...participants]
    updatedParticipants[index][field] = value
    setParticipants(updatedParticipants)
  }

  const validateForm = () => {
    const newErrors = {}
    
    Object.values(golfQuestions).forEach(section => {
      section.fields.forEach(field => {
        if (field.required && !formData[field.name]) {
          newErrors[field.name] = `${field.label}は必須項目です`
        }
        
        if (field.type === 'email' && formData[field.name]) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(formData[field.name])) {
            newErrors[field.name] = '有効なメールアドレスを入力してください'
          }
        }
      })
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateTotalParticipants = () => {
    let total = 1 // 代表者
    participants.forEach(participant => {
      if (participant.name.trim()) {
        total++
      }
    })
    return total
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      // 有効な参加者のみを抽出
      const validParticipants = participants.filter(p => p.name.trim())
      
      const submissionData = {
        ...formData,
        participants: validParticipants,
        totalParticipants: calculateTotalParticipants(),
        // 下位互換のために既存フィールドも設定
        lastName: formData.representativeName?.split('　')[0] || formData.representativeName,
        firstName: formData.representativeName?.split('　')[1] || '',
        lastNameKana: formData.representativeKana?.split('　')[0] || formData.representativeKana,
        firstNameKana: formData.representativeKana?.split('　')[1] || '',
        organization: formData.companyName,
        specialRequests: formData.remarks
      }
      
      onSubmit(submissionData)
    }
  }

  const renderField = (field) => {
    const commonProps = {
      id: field.name,
      value: formData[field.name] || '',
      onChange: (e) => handleInputChange(field.name, e.target.value),
      placeholder: field.placeholder
    }

    const inputClass = errors[field.name] ? styles.inputError : styles.input

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            className={errors[field.name] ? styles.inputError : styles.textarea}
          />
        )
      case 'select':
        return (
          <select
            {...commonProps}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={errors[field.name] ? styles.inputError : styles.select}
          >
            <option value="">選択してください</option>
            {field.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      default:
        return (
          <input
            {...commonProps}
            type={field.type}
            className={inputClass}
          />
        )
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
        </div>
        <h1>第28回日本IVF学会学術集会杯</h1>
        <p>ゴルフコンペ申し込みフォーム</p>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 代表者情報 */}
          {Object.entries(golfQuestions).map(([sectionKey, section]) => (
            <div key={sectionKey} className={styles.section}>
              <h2>
                <img 
                  src={'/img/landscape.webp'} 
                  alt="" 
                  className={styles.sectionIcon} 
                />
                {section.title}
              </h2>
              {section.fields.map(field => (
                <div key={field.name} className={styles.fieldGroup}>
                  <label htmlFor={field.name} className={styles.label}>
                    {field.label}
                    {field.required && <span className="required">*</span>}
                  </label>
                  {renderField(field)}
                  {field.note && (
                    <small className={styles.note}>
                      {field.note}
                    </small>
                  )}
                  {errors[field.name] && (
                    <span className={styles.error}>{errors[field.name]}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* 追加参加者 */}
          <div className={styles.section}>
            <h2>
              <img 
                src={'/img/月と星.webp'} 
                alt="" 
                className={styles.sectionIcon} 
              />
              追加参加者（任意）
            </h2>
            
            {participants.map((participant, index) => (
              <div key={index} className={styles.participantGroup}>
                <h4>参加者{index + 2}</h4>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    参加者{index + 2} 氏名
                  </label>
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                    placeholder="山田　花子"
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    参加者{index + 2} ふりがな
                  </label>
                  <input
                    type="text"
                    value={participant.kana}
                    onChange={(e) => handleParticipantChange(index, 'kana', e.target.value)}
                    placeholder="やまだ　はなこ"
                    className={styles.input}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 合計人数表示 */}
          <div className={styles.section}>
            <div className={styles.totalParticipants}>
              <h3>合計申し込み人数: {calculateTotalParticipants()}名</h3>
              <p>代表者 + 追加参加者{participants.filter(p => p.name.trim()).length}名</p>
            </div>
          </div>

          <div className={styles.buttons}>
            <button type="button" onClick={onBack} className={styles.backButton}>
              戻る
            </button>
            <button type="submit" className={styles.submitButton}>
              確認画面へ
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}