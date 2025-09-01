// components/IVFApplicationForm.js
import { useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import styles from '../styles/ApplicationForm.module.css'

export default function IVFApplicationForm({ onSubmit, onBack, initialData = {} }) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})

  const timeSlots = [
    { id: 'slot1', label: '2025年10月10日（金）14:00' },
    { id: 'slot2', label: '2025年10月11日（土）09:00' },
    { id: 'slot3', label: '2025年10月12日（日）09:00' },
    { id: 'slot4', label: '2025年10月12日（日）13:00' },
    { id: 'slot5', label: '2025年10月13日（月）14:00' }
  ]

  const ivfQuestions = {
    personalInfo: {
      title: "見学ツアー申込フォーム",
      fields: [
        {
          name: "selectedTimeSlot",
          label: "希望見学日時",
          type: "select",
          required: true,
          options: timeSlots.map(slot => ({
            value: slot.label,
            label: slot.label
          }))
        },
        {
          name: "lastName",
          label: "氏名（姓）",
          type: "text",
          required: true,
          placeholder: "空ノ森"
        },
        {
          name: "firstName",
          label: "氏名（名）",
          type: "text",
          required: true,
          placeholder: "太郎"
        },
        {
          name: "lastNameKana",
          label: "氏名カナ（姓）",
          type: "text",
          required: true,
          placeholder: "ソラノモリ"
        },
        {
          name: "firstNameKana",
          label: "氏名カナ（名）",
          type: "text",
          required: true,
          placeholder: "タロウ"
        },
        {
          name: "email",
          label: "メールアドレス",
          type: "email",
          required: true,
          placeholder: "example@example.com"
        },
        {
          name: "phone",
          label: "電話番号",
          type: "tel",
          required: true,
          placeholder: "090-1234-5678"
        },
        {
          name: "organization",
          label: "所属機関",
          type: "text",
          required: true,
          placeholder: "○○大学病院、○○レディースクリニック等"
        },
        {
          name: "position",
          label: "職種・役職",
          type: "text",
          required: true,
          placeholder: "看護師、助産師、医師等"
        },
        {
          name: "specialRequests",
          label: "特別な配慮事項・質問",
          type: "textarea",
          required: false,
          placeholder: "車椅子での参加、アレルギー、特に質問したい内容等"
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

  const validateForm = () => {
    const newErrors = {}
    
    Object.values(ivfQuestions).forEach(section => {
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

  const handleSubmit = (e) => {
    console.log('🔍 IVFApplicationForm - handleSubmit called')
    console.log('🔍 Form data before validation:', formData)
    
    e.preventDefault()
    if (validateForm()) {
      console.log('🔍 IVFApplicationForm - Form validation passed')
      console.log('🔍 Calling onSubmit with data:', formData)
      onSubmit(formData)
    } else {
      console.log('🔍 IVFApplicationForm - Form validation failed')
      console.log('🔍 Validation errors:', errors)
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
        <h1>第28回日本IVF学会学術集会</h1>
        <p>見学ツアー申し込みフォーム</p>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {Object.entries(ivfQuestions).map(([sectionKey, section]) => (
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