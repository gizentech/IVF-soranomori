import { useState, useEffect } from 'react'
import styles from '../styles/CompletionPage.module.css'

export default function CompletionPage({ uniqueId, data, onHome }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    if (uniqueId && typeof window !== 'undefined') {
      // 動的インポートでQRCodeを読み込む
      import('qrcode').then(QRCode => {
        QRCode.toDataURL(uniqueId, { width: 200 })
          .then(url => setQrCodeUrl(url))
          .catch(err => console.error('QR Code generation error:', err))
      })
    }
  }, [uniqueId])

  const handleDownloadPDF = async () => {
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
      }
    } catch (error) {
      console.error('PDF download error:', error)
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
              {qrCodeUrl && (
                <div className={styles.qrCode}>
                  <img src={qrCodeUrl} alt="QR Code" width="200" height="200" />
                </div>
              )}
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
            <p>当日はこちらの電子チケットをご提示ください。</p>
          </div>
        </div>

        <div className={styles.buttons}>
          <button onClick={handleDownloadPDF} className={styles.downloadButton}>
            PDFをダウンロード
          </button>
          <button onClick={onHome} className={styles.homeButton}>
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}