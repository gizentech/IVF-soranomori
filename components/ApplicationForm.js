// components/IVFApplicationForm.js
import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'
import styles from '../styles/ApplicationForm.module.css'

export default function IVFApplicationForm({ onSubmit, onBack, initialData = {} }) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [timeSlotCapacity, setTimeSlotCapacity] = useState({})
  const [loading, setLoading] = useState(false)

  const timeSlots = [
    { id: 'slot1', label: '2025年10月10日（金）14:00', capacity: 20 },
    { id: 'slot2', label: '2025年10月11日（土）09:00', capacity: 20 },
    { id: 'slot3', label: '2025年10月12日（日）09:00', capacity: 20 },
    { id: 'slot4', label: '2025年10月12日（日）13:00', capacity: 20 },
    { id: 'slot5', label: '2025年10月13日（月）14:00', capacity: 20 }
  ]

  const ivfQuestions = {
    personalInfo: {
      title: "見学ツアー申込フォーム",
      fields: [
        {
          name: "selectedTimeSlot",
          label: "希望見学日時",
          type: "timeSlot",
          required: true
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

  // 時間帯別の定員情報を取得
  useEffect(() => {
    const fetchTimeSlotCapacity = async () => {
      console.log('Fetching time slot capacity...')
      const capacityData = {}
      
      for (const slot of timeSlots) {
        try {
          const timestamp = Date.now()
          const response = await fetch(`/api/capacity?eventType=ivf&timeSlot=${encodeURIComponent(slot.label)}&t=${timestamp}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            capacityData[slot.label] = {
              current: data.currentCount,
              max: data.maxEntries,
              remaining: data.remainingSlots,
              available: data.isAvailable
            }
            console.log(`Time slot ${slot.label}: ${data.currentCount}/${data.maxEntries} (remaining: ${data.remainingSlots})`)
          } else {
            console.error(`Failed to fetch capacity for ${slot.label}:`, response.status)
            capacityData[slot.label] = {
              current: 0,
              max: 20,
              remaining: 20,
              available: true
            }
          }
        } catch (error) {
          console.error(`Network error fetching capacity for ${slot.label}:`, error)
          capacityData[slot.label] = {
            current: 0,
            max: 20,
            remaining: 20,
            available: true
          }
        }
      }
      
      setTimeSlotCapacity(capacityData)
      console.log('Time slot capacity data updated:', capacityData)
    }

    fetchTimeSlotCapacity()
    
    // 30秒ごとに更新
    const interval = setInterval(fetchTimeSlotCapacity, 30000)
    return () => clearInterval(interval)
  }, [])

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

    // 選択された時間帯の定員チェック
    if (formData.selectedTimeSlot) {
      const capacity = timeSlotCapacity[formData.selectedTimeSlot]
      if (capacity && !capacity.available) {
        newErrors.selectedTimeSlot = '選択された時間帯は満員です。他の時間帯をお選びください。'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    
    setTimeout(() => {
      if (validateForm()) {
        onSubmit(formData)
      }
      setLoading(false)
    }, 1000)
  }

  const renderTimeSlotField = () => {
    return (
      <div>
        <div className={styles.timeSlotGrid}>
          {timeSlots.map(slot => {
            const capacity = timeSlotCapacity[slot.label]
            const isFull = capacity && !capacity.available
            const isLowCapacity = capacity && capacity.remaining <= 5 && capacity.remaining > 0
            
            return (
              <label 
                key={slot.id} 
                className={`${styles.timeSlotOption} ${
                  isFull ? styles.fullSlot : ''
                } ${
                  isLowCapacity ? styles.lowCapacitySlot : ''
                } ${
                  formData.selectedTimeSlot === slot.label ? styles.selectedSlot : ''
                }`}
              >
                <input
                  type="radio"
                  name="selectedTimeSlot"
                  value={slot.label}
                  checked={formData.selectedTimeSlot === slot.label}
                  onChange={(e) => handleInputChange('selectedTimeSlot', e.target.value)}
                  disabled={isFull}
                />
                <div className={styles.timeSlotInfo}>
                  <div className={styles.timeSlotLabel}>{slot.label}</div>
                  <div className={styles.timeSlotCapacity}>
                    {capacity ? (
                      <>
                        <span className={
                          isFull ? styles.fullText : 
                          isLowCapacity ? styles.lowText : 
                          styles.availableText
                        }>
                          残り {capacity.remaining}名
                        </span>
                        <span className={styles.capacityDetail}>
                          ({capacity.current}/{capacity.max}名)
                        </span>
                      </>
                    ) : (
                      <span className={styles.loadingText}>読み込み中...</span>
                    )}
                  </div>
                  {isFull && <div className={styles.fullBadge}>満員</div>}
                  {isLowCapacity && <div className={styles.lowBadge}>残りわずか</div>}
                </div>
              </label>
            )
          })}
        </div>
      </div>
    )
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
      case 'timeSlot':
        return renderTimeSlotField()
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
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? '処理中...' : '確認画面へ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}