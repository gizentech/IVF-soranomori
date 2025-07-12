import { useState, useEffect } from 'react'
import GuidePage from '../components/GuidePage'
import ApplicationForm from '../components/ApplicationForm'
import ConfirmationForm from '../components/ConfirmationForm'
import CompletionPage from '../components/CompletionPage'
import CancelForm from '../components/CancelForm'

export default function Home() {
  const [currentPage, setCurrentPage] = useState('guide')
  const [formData, setFormData] = useState({})
  const [uniqueId, setUniqueId] = useState('')

  // ページ切り替え時にスクロールトップに戻る
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
        body: JSON.stringify(data),
      })

      const result = await response.json()
      
      if (response.ok) {
        setUniqueId(result.uniqueId)
        setCurrentPage('completion')
      } else {
        if (result.error === 'CAPACITY_EXCEEDED') {
          alert('申し訳ございません。定員に達したため、ご予約をお取りできませんでした。')
        } else {
          alert('エラーが発生しました。もう一度お試しください。')
        }
      }
    } catch (error) {
      console.error('Submission error:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    }
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'guide':
        return <GuidePage onNext={() => handlePageChange('application')} />
      case 'application':
        return <ApplicationForm onSubmit={handleFormSubmit} onBack={() => handlePageChange('guide')} />
      case 'confirmation':
        return <ConfirmationForm data={formData} onConfirm={handleConfirmation} onBack={() => handlePageChange('application')} />
      case 'completion':
        return <CompletionPage uniqueId={uniqueId} data={formData} onHome={() => handlePageChange('guide')} />
      case 'cancel':
        return <CancelForm onBack={() => handlePageChange('guide')} />
      default:
        return <GuidePage onNext={() => handlePageChange('application')} />
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
        >
          キャンセルについて
        </button>
      )}
    </div>
  )
}