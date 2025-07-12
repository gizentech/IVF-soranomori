import { useState } from 'react'
import styles from '../styles/CompletionPage.module.css'

export default function CompletionPage({ uniqueId, data, onHome }) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uniqueId, data })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ivf-sora-ticket-${uniqueId}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        console.error('PDF download failed')
        alert('PDFのダウンロードに失敗しました。')
      }
    } catch (error) {
      console.error('PDF download error:', error)
      alert('PDFのダウンロードでエラーが発生しました。')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
        </div>
        <h1>第23回日本生殖看護学会学術集会</h1>
        <p>お申し込み完了</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/鳥の雲.webp" alt="" className={styles.sectionIcon} />
            電子チケット
          </h2>
          <div className={styles.ticketContainer}>
            <div className={styles.ticket}>
              <div className={styles.ticketInfo}>
                <p><strong>予約ID:</strong> {uniqueId}</p>
                <p><strong>お名前:</strong> {data.lastName} {data.firstName}</p>
                <p><strong>見学日:</strong> 2025年10月13日（月）14:00〜</p>
                <p><strong>所属機関:</strong> {data.organization}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.messageSection}>
          <h2>
            <img src="/img/ガーベラ.webp" alt="" className={styles.sectionIcon} />
            ご案内
          </h2>
          <div className={styles.message}>
            <p>お申し込みありがとうございます。</p>
            <p>確認メールを送信いたしました。</p>
            <p>当日は予約IDまたは電子チケットをご提示ください。</p>
            <p>PDFチケットをダウンロードして印刷してお持ちいただくか、予約IDをメモしてご来場ください。</p>
          </div>
        </div>

        <div className={styles.buttons}>
          <button 
            onClick={handleDownloadPDF} 
            className={styles.downloadButton}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <span className={styles.spinner}></span>
                PDF作成中...
              </>
            ) : (
              'PDFチケットをダウンロード'
            )}
          </button>
          <button onClick={onHome} className={styles.homeButton}>
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}