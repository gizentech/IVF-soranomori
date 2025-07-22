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
      console.log('Submitting confirmation data:', data)
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      console.log('API response:', result)
      
      if (response.ok && result.success) {
        // 予約成功
        setUniqueId(result.uniqueId)
        setCurrentPage('completion')
      } else if (!response.ok && result.status === 'full_capacity') {
        // 定員満了
        alert('ご予約満員御礼につき、ご予約がお取りできませんでした。')
        handleHome() // ホームに戻る
      } else {
        // その他のエラー
        console.error('Submission error:', result.error)
        alert(`エラーが発生しました: ${result.message || result.error || 'もう一度お試しください。'}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('ネットワークエラーが発生しました。インターネット接続をご確認の上、もう一度お試しください。')
    }
  }

  const handleHome = () => {
    // 完全にリセットして最初のページに戻る
    setFormData({})
    setUniqueId('')
    setCurrentPage('guide')
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'guide':
        return (
          <GuidePage 
            onNext={() => handlePageChange('application')} 
          />
        )
      case 'application':
        return (
          <ApplicationForm 
            onSubmit={handleFormSubmit} 
            onBack={() => handlePageChange('guide')}
            initialData={formData} // フォームデータを保持
          />
        )
      case 'confirmation':
        return (
          <ConfirmationForm 
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
          />
        )
      case 'cancel':
        return (
          <CancelForm 
            onBack={() => handlePageChange('guide')} 
          />
        )
      default:
        return (
          <GuidePage 
            onNext={() => handlePageChange('application')} 
          />
        )
    }
  }

  return (
    <div className="app-container">
      {/* 背景画像はガイドページでのみ表示 */}
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
      
      {/* キャンセルボタンはガイドページでのみ表示 */}
      {currentPage === 'guide' && (
        <button 
          className="cancel-button"
          onClick={() => handlePageChange('cancel')}
          aria-label="キャンセル手続きについて"
        >
          キャンセルについて
        </button>
      )}

      {/* デバッグ情報（本番環境では削除） */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          <div>Current Page: {currentPage}</div>
          <div>Unique ID: {uniqueId}</div>
          <div>Form Data: {Object.keys(formData).length} fields</div>
        </div>
      )}
    </div>
  )
}