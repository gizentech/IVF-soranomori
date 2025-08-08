// pages/nursing.js (看護学会用)
import { useState, useEffect } from 'react'
import GuidePage from '../components/GuidePage'
import ApplicationForm from '../components/ApplicationForm'
import ConfirmationForm from '../components/ConfirmationForm'
import CompletionPage from '../components/CompletionPage'
import CancelForm from '../components/CancelForm'

export default function NursingTour() {
  const [currentPage, setCurrentPage] = useState('guide')
  const [formData, setFormData] = useState({})
  const [uniqueId, setUniqueId] = useState('')

  const eventConfig = {
    type: 'nursing',
    title: '第23回日本生殖看護学会学術集会',
    subtitle: '空の森クリニック見学ツアー',
    date: '2025年10月13日（月）',
    time: '14:00～（所要時間：60分）',
    capacity: 30,
    location: '空の森クリニック',
    organizer: '徳永 季子'
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleFormSubmit = (data) => {
    setFormData(data)
    setCurrentPage('confirmation')
  }

  const handleConfirmation = async (data) => {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          eventType: eventConfig.type
        }),
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setUniqueId(result.uniqueId)
        setCurrentPage('completion')
      } else if (!response.ok && result.status === 'full_capacity') {
        alert('ご予約満員御礼につき、ご予約がお取りできませんでした。')
        handleHome()
      } else {
        alert(`エラーが発生しました: ${result.message || result.error || 'もう一度お試しください。'}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('ネットワークエラーが発生しました。')
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
        return (
          <GuidePage 
            eventConfig={eventConfig}
            onNext={() => handlePageChange('application')} 
          />
        )
      case 'application':
        return (
          <ApplicationForm 
            eventConfig={eventConfig}
            onSubmit={handleFormSubmit} 
            onBack={() => handlePageChange('guide')}
            initialData={formData}
          />
        )
      case 'confirmation':
        return (
          <ConfirmationForm 
            eventConfig={eventConfig}
            data={formData} 
            onConfirm={handleConfirmation} 
            onBack={() => handlePageChange('application')} 
          />
        )
      case 'completion':
        return (
          <CompletionPage 
            eventConfig={eventConfig}
            uniqueId={uniqueId} 
            data={formData} 
            onHome={handleHome} 
          />
        )
      case 'cancel':
        return (
          <CancelForm 
            eventConfig={eventConfig}
            onBack={() => handlePageChange('guide')} 
          />
        )
      default:
        return (
          <GuidePage 
            eventConfig={eventConfig}
            onNext={() => handlePageChange('application')} 
          />
        )
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