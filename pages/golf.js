// pages/golf.js
import { useState, useEffect } from 'react'
import GolfGuidePage from '../components/GolfGuidePage'
import GolfApplicationForm from '../components/GolfApplicationForm'
import GolfConfirmationForm from '../components/GolfConfirmationForm'
import CompletionPage from '../components/CompletionPage'
import CancelForm from '../components/CancelForm'

export default function GolfCompetition() {
  const [currentPage, setCurrentPage] = useState('guide')
  const [formData, setFormData] = useState({})
  const [uniqueId, setUniqueId] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleFormSubmit = (data) => {
    console.log('Form submitted with data:', data)
    setFormData(data)
    setCurrentPage('confirmation')
  }

  const handleConfirmation = async (data) => {
    console.log('=== handleConfirmation called ===')
    console.log('Data to submit:', data)
    
    try {
      const requestData = {
        ...data,
        eventType: 'golf'
      }
      
      console.log('Request data:', requestData)
      console.log('Making POST request to /api/submit')
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      console.log('Response ok:', response.ok)

      // レスポンスのテキストを最初に取得
      const responseText = await response.text()
      console.log('Response text:', responseText)

      let result
      try {
        // JSONとして解析を試行
        result = JSON.parse(responseText)
        console.log('Parsed JSON result:', result)
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError)
        console.error('Response was not valid JSON:', responseText)
        
        if (response.ok) {
          throw new Error('サーバーから無効なレスポンスが返されました')
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }
      
      if (response.ok && result.success) {
        console.log('Submission successful')
        setUniqueId(result.uniqueId)
        setCurrentPage('completion')
      } else if (!response.ok && result.status === 'full_capacity') {
        console.log('Capacity full')
        alert(`定員に達したため、ご予約をお取りできませんでした。残り${result.remainingSlots || 0}名まで申し込み可能です。`)
        setCurrentPage('application')
      } else {
        console.log('Submission failed:', result)
        const errorMessage = result.message || result.error || 'エラーが発生しました'
        alert(`エラーが発生しました: ${errorMessage}`)
        
        // エラーの種類によって戻るページを決定
        if (result.status === 'full_capacity') {
          setCurrentPage('application')
        }
      }
    } catch (error) {
      console.error('Network or parsing error:', error)
      alert(`ネットワークエラーまたはサーバーエラーが発生しました: ${error.message}`)
    }
  }

  const handleHome = () => {
    setFormData({})
    setUniqueId('')
    setCurrentPage('guide')
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'guide':
        return <GolfGuidePage onNext={() => handlePageChange('application')} />
      case 'application':
        return (
          <GolfApplicationForm 
            onSubmit={handleFormSubmit} 
            onBack={() => handlePageChange('guide')}
            initialData={formData}
          />
        )
      case 'confirmation':
        return (
          <GolfConfirmationForm 
            data={formData} 
            onConfirm={handleConfirmation} 
            onBack={() => handlePageChange('application')} 
          />
        )
      case 'completion':
        return (
          <CompletionPage 
            uniqueId={uniqueId} 
            data={formData} 
            onHome={handleHome}
            eventType="golf"
          />
        )
      case 'cancel':
        return <CancelForm onBack={() => handlePageChange('guide')} />
      default:
        return <GolfGuidePage onNext={() => handlePageChange('application')} />
    }
  }

  return (
    <div className="app-container">
      {currentPage === 'guide' && (
        <div className="background-images">
          <div className="bg-image bg-image-left-1"></div>
          <div className="bg-image bg-image-left-2"></div>
          <div className="bg-image bg-image-left-3"></div>
          <div className="bg-image bg-image-left-4"></div>
          
          <div className="bg-image bg-image-right-1"></div>
          <div className="bg-image bg-image-right-2"></div>
          <div className="bg-image bg-image-right-3"></div>
          <div className="bg-image bg-image-right-4"></div>
          <div className="bg-image bg-image-right-5"></div>
        </div>
      )}

      {renderCurrentPage()}
      
      {currentPage === 'guide' && (
        <button 
          className="cancel-button"
          onClick={() => handlePageChange('cancel')}
          aria-label="キャンセル手続きについて"
        >
          キャンセルについて
        </button>
      )}
    </div>
  )
}