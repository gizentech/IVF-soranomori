// components/GolfApplicationForm.js
import { useState, useEffect } from 'react'
import styles from '../styles/ApplicationForm.module.css'

export default function GolfApplicationForm({ onSubmit, onBack, initialData = {} }) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [participants, setParticipants] = useState([
    { name: '', kana: '' }, // 参加者2
    { name: '', kana: '' }, // 参加者3
    { name: '', kana: '' }, // 参加者4
  ])
  const [capacityInfo, setCapacityInfo] = useState({
    currentCount: 0,
    maxEntries: 16,
    remainingSlots: 16,
    isAvailable: true,
    hasError: false,
    errorMessage: null,
    timestamp: null
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  // 定員状況を取得
  useEffect(() => {
    fetchCapacity()
    const interval = setInterval(fetchCapacity, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchCapacity = async () => {
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/capacity?eventType=golf&t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // 計算の再検証
        const expectedRemaining = Math.max(0, data.maxEntries - data.currentCount)
        
        setCapacityInfo({
          currentCount: data.currentCount || 0,
          maxEntries: data.maxEntries || 16,
          remainingSlots: expectedRemaining, // 修正された値を使用
          isAvailable: expectedRemaining > 0, // 修正された値を使用
          hasError: data.hasError || false,
          errorMessage: data.errorMessage || null,
          timestamp: data.timestamp
        })
        setLastUpdate(new Date().toLocaleTimeString())
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to fetch capacity:', error)
      setCapacityInfo(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error.message
      }))
    }
  }

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
    
    // 一時的に新しい値で合計人数を計算
    const tempParticipants = [...updatedParticipants]
    let tempTotal = 1 // 代表者
    tempParticipants.forEach(participant => {
      if (participant.name.trim()) {
        tempTotal++
      }
    })
    
    // 残り定員を超える場合は入力を拒否
    if (tempTotal > capacityInfo.remainingSlots) {
      alert(`申し込み可能人数は残り${capacityInfo.remainingSlots}名です。`)
      return
    }
    
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
    
    // 参加人数チェック
    const totalParticipants = calculateTotalParticipants()
    if (totalParticipants > capacityInfo.remainingSlots) {
      newErrors.participants = `申し込み可能人数は残り${capacityInfo.remainingSlots}名です`
    }
    
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 提出前に最新の定員状況を確認
    setLoading(true)
    await fetchCapacity()
    
    // 少し待ってから再度チェック
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 最新の定員状況で再度チェック
    const totalParticipants = calculateTotalParticipants()
    
    if (totalParticipants > capacityInfo.remainingSlots) {
      alert(`申し込み可能人数は残り${capacityInfo.remainingSlots}名です。現在の申し込み人数: ${totalParticipants}名`)
      setLoading(false)
      return
    }
    
    if (validateForm()) {
      // 有効な参加者のみを抽出
      const validParticipants = participants.filter(p => p.name.trim())
      
      const submissionData = {
        ...formData,
        participants: validParticipants,
        totalParticipants: totalParticipants,
        // 下位互換のために既存フィールドも設定
        lastName: formData.representativeName?.split('　')[0] || formData.representativeName?.split(' ')[0] || formData.representativeName,
        firstName: formData.representativeName?.split('　')[1] || formData.representativeName?.split(' ')[1] || '',
        lastNameKana: formData.representativeKana?.split('　')[0] || formData.representativeKana?.split(' ')[0] || formData.representativeKana,
        firstNameKana: formData.representativeKana?.split('　')[1] || formData.representativeKana?.split(' ')[1] || '',
        organization: formData.companyName,
        specialRequests: formData.remarks
      }
      
      onSubmit(submissionData)
    }
    setLoading(false)
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

  const renderParticipantFields = (index) => {
    const participant = participants[index]
    const currentTotal = calculateTotalParticipants()
    const canAddParticipant = currentTotal < capacityInfo.remainingSlots
    
    return (
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
            placeholder={canAddParticipant ? "山田　花子" : `残り${capacityInfo.remainingSlots - currentTotal+1}名`}
            className={styles.input}
            disabled={!canAddParticipant && !participant.name.trim()}
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
            placeholder={canAddParticipant ? "やまだ　はなこ" : `残り${capacityInfo.remainingSlots - currentTotal+1}名`}
            className={styles.input}
            disabled={!canAddParticipant && !participant.name.trim()}
          />
        </div>
      </div>
    )
  }

  const getCapacityStatus = () => {
    if (capacityInfo.remainingSlots === 0) {
      return { text: '🚫 定員に達しました。現在申し込みを受け付けておりません。', className: styles.full }
    } else if (capacityInfo.remainingSlots <= 4) {
      return { text: '⚠️ 残りわずかです', className: styles.warning }
    }
    return null
  }

  const capacityStatus = getCapacityStatus()

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
          {/* 定員状況表示 */}
          <div className={styles.capacityInfo}>
            <h3>定員状況</h3>
            <p>
              現在の申し込み: <strong>{capacityInfo.currentCount}名</strong> / {capacityInfo.maxEntries}名<br/>
              残り <strong>{capacityInfo.remainingSlots}名</strong> 申し込み可能です
            </p>
            
            {/* 満員の場合の特別表示 */}
            {capacityInfo.remainingSlots === 0 && (
              <div className={styles.fullCapacityNotice}>
                <p className={styles.fullNotice}>🚫 定員に達しました。現在申し込みを受け付けておりません。</p>
              </div>
            )}
            
            {capacityInfo.hasError && capacityInfo.errorMessage && (
              <p className={styles.errorNotice}>
                ⚠️ データ取得エラー: {capacityInfo.errorMessage}
              </p>
            )}
            
            {capacityStatus && capacityInfo.remainingSlots !== 0 && (
              <p className={capacityStatus.className}>{capacityStatus.text}</p>
            )}
            
            <div className={styles.debugControls}>
            </div>
          </div>

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
            
            <div className={styles.participantNote}>
              <p>最大4名まで申し込み可能です（代表者含む）</p>
              <p>現在の残り定員: <strong>{capacityInfo.remainingSlots}名</strong></p>
              {capacityInfo.remainingSlots === 0 && (
                <p className={styles.fullNotice}>⚠️ 定員に達しているため、追加参加者の登録はできません</p>
              )}
            </div>
            
            {participants.map((participant, index) => renderParticipantFields(index))}
            
            {errors.participants && (
              <span className={styles.error}>{errors.participants}</span>
            )}
          </div>

          {/* 合計人数表示 */}
          <div className={styles.section}>
            <div className={styles.totalParticipants}>
              <h3>合計申し込み人数: {calculateTotalParticipants()}名</h3>
              <p>代表者1名 + 追加参加者{participants.filter(p => p.name.trim()).length}名</p>
              {calculateTotalParticipants() > capacityInfo.remainingSlots && (
                <p className={styles.error}>申し込み可能人数を超えています</p>
              )}
              {capacityInfo.remainingSlots === 0 && calculateTotalParticipants() > 0 && (
                <p className={styles.fullNotice}>⚠️ 定員に達しているため申し込みできません</p>
              )}
            </div>
          </div>

          <div className={styles.buttons}>
            <button type="button" onClick={onBack} className={styles.backButton}>
              戻る
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading || capacityInfo.remainingSlots === 0 || calculateTotalParticipants() > capacityInfo.remainingSlots}
            >
              {loading ? '処理中...' : capacityInfo.remainingSlots === 0 ? '定員に達しています' : '確認画面へ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}