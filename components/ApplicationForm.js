import { useState } from 'react'
import questions from '../data/question.json'
import { Analytics } from '@vercel/analytics/next'
import styles from '../styles/ApplicationForm.module.css'

export default function ApplicationForm({ onSubmit, onBack, initialData = {} }) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})

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
    
    Object.values(questions).forEach(section => {
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
    console.log('🔍 ApplicationForm (Nursing) - handleSubmit called')
    console.log('🔍 Form data before validation:', formData)
    
    e.preventDefault()
    if (validateForm()) {
      console.log('🔍 ApplicationForm (Nursing) - Form validation passed')
      console.log('🔍 Calling onSubmit with data:', formData)
      onSubmit(formData)
    } else {
      console.log('🔍 ApplicationForm (Nursing) - Form validation failed')
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
      case 'checkbox':
        return (
          <div>
            {field.options.map(option => (
              <label key={option.value} style={{ display: 'block', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  value={option.value}
                  checked={formData[field.name]?.includes(option.value) || false}
                  onChange={(e) => {
                    const currentValues = formData[field.name] || []
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value)
                    handleInputChange(field.name, newValues)
                  }}
                  style={{ marginRight: '8px' }}
                />
                {option.label}
              </label>
            ))}
          </div>
        )
      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            min={field.min}
            max={field.max}
            className={inputClass}
          />
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
        <h1>第23回日本生殖看護学会学術集会</h1>
        <p>申し込みフォーム</p>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {Object.entries(questions).map(([sectionKey, section]) => (
            <div key={sectionKey} className={styles.section}>
              <h2>
                <img 
                  src={sectionKey === 'personalInfo' ? '/img/landscape.webp' : '/img/月と星.webp'} 
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