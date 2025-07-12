import nodemailer from 'nodemailer'
import { updateDesignSheetAndGeneratePDF, clearDesignSheet, exportSheetAsPDF } from '../../lib/googleSheets'

const transporter = nodemailer.createTransport({
  host: 'soranomori-o.sakura.ne.jp',
  port: 587,
  secure: false,
  auth: {
    user: 'ivf-sora-tour@azukikai.or.jp',
    pass: 'sora2025dx'
  }
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, uniqueId, formData } = req.body

    console.log('Starting ticket generation and email sending...')

    // Google Sheetsのdesignシートを使用してPDF生成
    console.log('Updating design sheet for ticket generation...')
    await updateDesignSheetAndGeneratePDF(uniqueId, formData)
    
    // Google Sheetsの更新を待つ
    console.log('Waiting for sheet update...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // PDFをエクスポート
    console.log('Exporting PDF from design sheet...')
    const pdfBuffer = await exportSheetAsPDF('design')
    
    // designシートをクリア
    console.log('Clearing design sheet...')
    await clearDesignSheet()

    console.log('PDF generated successfully, preparing email...')

    const mailOptions = {
      from: {
        name: '第23回日本生殖看護学会学術集会 空の森クリニック見学ツアー 事務局',
        address: 'ivf-sora-tour@azukikai.or.jp'
      },
      to: email,
      subject: '【第23回日本生殖看護学会学術集会】空の森クリニック見学ツアー お申し込み完了のお知らせ',
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>お申し込み完了のお知らせ</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif;
              line-height: 1.6;
              color: #333;
              background: linear-gradient(135deg, #f0f4f8 0%, #e8f2f7 100%);
              padding: 20px;
            }
            
            .container {
              max-width: 650px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 8px 32px rgba(0, 16, 77, 0.15);
            }
            
            .header {
              background: linear-gradient(135deg, #00104d 0%, #1e3a8a 100%);
              padding: 50px 30px;
              text-align: center;
              color: white;
              position: relative;
              overflow: hidden;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: -20px;
              right: -20px;
              width: 120px;
              height: 120px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              animation: pulse 4s ease-in-out infinite;
            }
            
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 12px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              position: relative;
              z-index: 2;
            }
            
            .header h2 {
              font-size: 18px;
              font-weight: 500;
              opacity: 0.95;
              margin-bottom: 20px;
              position: relative;
              z-index: 2;
            }
            
            .completion-badge {
              background: rgba(255, 255, 255, 0.15);
              padding: 15px 25px;
              border-radius: 25px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              display: inline-block;
              position: relative;
              z-index: 2;
            }
            
            .completion-badge p {
              margin: 0;
              font-size: 16px;
              font-weight: 600;
              color: #fff;
            }
            
            .content {
              padding: 40px 30px;
            }
            
            .greeting-section {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              border-left: 4px solid #3b82f6;
              position: relative;
            }
            
            .greeting-section::before {
              content: '🌿';
              position: absolute;
              top: 15px;
              right: 20px;
              font-size: 24px;
            }
            
            .greeting-text {
              color: #333;
              font-size: 16px;
              line-height: 1.7;
              margin-bottom: 15px;
            }
            
            .user-name {
              color: #00104d;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 20px;
            }
            
            .reservation-section {
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0, 16, 77, 0.08);
              margin-bottom: 30px;
              border: 1px solid #e9ecef;
            }
            
            .section-title {
              color: #00104d;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #3b82f6;
              position: relative;
            }
            
            .section-title::before {
              content: '📋';
              margin-right: 8px;
            }
            
            .reservation-details {
              display: grid;
              gap: 15px;
            }
            
            .detail-item {
              display: flex;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            
            .detail-item:last-child {
              border-bottom: none;
            }
            
            .detail-label {
              font-weight: 600;
              color: #00104d;
              min-width: 100px;
              margin-right: 16px;
              font-size: 14px;
            }
            
            .detail-value {
              color: #333;
              font-size: 15px;
              flex: 1;
            }
            
            .reservation-id {
              background: #f8f9fa;
              padding: 6px 12px;
              border-radius: 6px;
              font-family: monospace;
              font-weight: bold;
              color: #00104d;
            }
            
            .info-section {
              background: linear-gradient(135deg, #fff3cd 0%, #fef8e7 100%);
              padding: 25px;
              border-radius: 12px;
              margin-bottom: 25px;
              border: 1px solid #ffeaa7;
              position: relative;
            }
            
            .info-section::before {
              content: '🌿';
              position: absolute;
              top: 15px;
              right: 20px;
              font-size: 20px;
            }
            
            .info-title {
              color: #856404;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            
            .info-list {
              margin: 0;
              padding-left: 20px;
              color: #856404;
            }
            
            .info-list li {
              margin-bottom: 8px;
              line-height: 1.6;
            }
            
            .warning-section {
              background: linear-gradient(135deg, #f8d7da 0%, #fce7e7 100%);
              padding: 25px;
              border-radius: 12px;
              margin-bottom: 30px;
              border: 1px solid #f5c6cb;
              position: relative;
            }
            
            .warning-section::before {
              content: '⚠️';
              position: absolute;
              top: 15px;
              right: 20px;
              font-size: 20px;
            }
            
            .warning-title {
              color: #721c24;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            
            .warning-text {
              color: #721c24;
              line-height: 1.6;
              margin: 0;
            }
            
            .closing-message {
              text-align: center;
              padding: 30px 20px;
              background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
              border-radius: 12px;
              margin-bottom: 30px;
            }
            
            .closing-text {
              color: #555;
              line-height: 1.6;
              margin-bottom: 15px;
            }
            
            .highlight-text {
              color: #00104d;
              font-weight: 600;
              font-size: 16px;
            }
            
            .footer {
              background: #f8f9fa;
              padding: 25px 30px;
              border-top: 1px solid #e9ecef;
              text-align: center;
            }
            
            .footer-content {
              color: #6c757d;
              font-size: 14px;
              line-height: 1.5;
            }
            
            .footer-title {
              color: #00104d;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .contact-info {
              margin-top: 10px;
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 0.7; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
            
            @media (max-width: 600px) {
              .container {
                margin: 10px;
                border-radius: 12px;
              }
              
              .header {
                padding: 30px 20px;
              }
              
              .header h1 {
                font-size: 20px;
              }
              
              .header h2 {
                font-size: 16px;
              }
              
              .content {
                padding: 30px 20px;
              }
              
              .detail-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
              }
              
              .detail-label {
                min-width: auto;
                margin-right: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>第23回日本生殖看護学会学術集会</h1>
              <h2>空の森クリニック見学ツアー</h2>
              <div class="completion-badge">
                <p>お申し込み完了のお知らせ</p>
              </div>
            </div>
            
            <!-- Content -->
            <div class="content">
              <!-- Greeting Section -->
              <div class="greeting-section">
                <div class="user-name">${formData.lastName} ${formData.firstName} 様</div>
                
                <p class="greeting-text">
                  この度は、空の森クリニック見学ツアーにお申し込みいただき、誠にありがとうございます。
                </p>
                <p class="greeting-text">
                  自然に包まれた医療環境での実践をご体験いただけることを楽しみにしております。
                </p>
              </div>
              
              <!-- Reservation Details -->
              <div class="reservation-section">
                <h3 class="section-title">ご予約内容</h3>
                <div class="reservation-details">
                  <div class="detail-item">
                    <span class="detail-label">予約ID：</span>
                    <span class="detail-value">
                      <span class="reservation-id">${uniqueId}</span>
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">お名前：</span>
                    <span class="detail-value">${formData.lastName} ${formData.firstName}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">見学日：</span>
                    <span class="detail-value">2025年10月13日（月）14:00〜</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">所属機関：</span>
                    <span class="detail-value">${formData.organization}</span>
                  </div>
                </div>
              </div>
              
              <!-- Instructions -->
              <div class="info-section">
                <h4 class="info-title">当日のご案内</h4>
                <ul class="info-list">
                  <li>開始時間の10分前にはお越しください</li>
                  <li>添付の電子チケットを受付にてご提示ください</li>
                  <li>感染対策にご協力をお願いいたします（マスク着用）</li>
                  <li>動きやすい服装でお越しください</li>
                  <li>写真撮影は指定された場所のみ可能です</li>
                </ul>
              </div>
              
              <!-- Cancellation Info -->
              <div class="warning-section">
                <h4 class="warning-title">キャンセルについて</h4>
                <p class="warning-text">
                  やむを得ずキャンセルされる場合は、申し込みサイトのキャンセルフォームよりお手続きください。
                </p>
              </div>
              
              <!-- Closing Message -->
              <div class="closing-message">
                <p class="closing-text">
                  ご不明な点がございましたら、お気軽にお問い合わせください。
                </p>
                <p class="highlight-text">
                  当日お会いできますことを心よりお待ちしております。
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="footer-content">
                <p class="footer-title">第23回日本生殖看護学会学術集会</p>
                <p class="footer-title">空の森クリニック見学ツアー 事務局</p>
                <div class="contact-info">
                  <p>徳永 季子</p>
                  <p>Email: ivf-sora-tour@azukikai.or.jp</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `ivf-sora-ticket-${uniqueId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }

    console.log('Sending email...')
    await transporter.sendMail(mailOptions)
    console.log('Email sent successfully to:', email)

    res.status(200).json({ message: 'Email sent successfully' })
  } catch (error) {
    console.error('Email sending error:', error)
    
    // エラーが発生した場合でもdesignシートをクリア
    try {
      await clearDesignSheet()
      console.log('Design sheet cleared after error')
    } catch (clearError) {
      console.error('Design sheet clear error after email failure:', clearError)
    }
    
    res.status(500).json({ error: 'Failed to send email: ' + error.message })
  }
}