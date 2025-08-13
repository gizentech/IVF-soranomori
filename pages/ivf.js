// pages/ivf.js（修正版）
import { useState, useEffect } from 'react'
import IVFGuidePage from '../components/IVFGuidePage'
import IVFApplicationForm from '../components/IVFApplicationForm'
import IVFConfirmationForm from '../components/IVFConfirmationForm'
import CompletionPage from '../components/CompletionPage'
import CancelForm from '../components/CancelForm'
import { Analytics } from "@vercel/analytics/next"

export default function IVFTour() {
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
          eventType: 'ivf'
        }),
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setUniqueId(result.uniqueId)
        setCurrentPage('completion')
      } else if (!response.ok && result.status === 'full_capacity') {
        alert('選択された時間帯は満員です。他の時間帯をお選びください。')
        setCurrentPage('application')
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
        return <IVFGuidePage onNext={() => handlePageChange('application')} />
      case 'application':
        return (
          <IVFApplicationForm 
            onSubmit={handleFormSubmit} 
            onBack={() => handlePageChange('guide')}
            initialData={formData}
          />
        )
      case 'confirmation':
        return (
          <IVFConfirmationForm 
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
            eventType="ivf"
          />
        )
      case 'cancel':
        return <CancelForm onBack={() => handlePageChange('guide')} />
      default:
        return <IVFGuidePage onNext={() => handlePageChange('application')} />
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