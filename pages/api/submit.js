import { google } from 'googleapis'
import { generateUniqueId } from '../../utils/generateUniqueId'
import nodemailer from 'nodemailer'
import { updateDesignSheetAndGeneratePDF, clearDesignSheet, exportSheetAsPDF } from '../../lib/googleSheets'

const SPREADSHEET_ID = '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'
const CAPACITY_LIMIT = 30

// メール送信設定
const transporter = nodemailer.createTransporter({
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
    console.log('Received form data:', req.body)
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.error('Missing Google service account credentials')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const formData = req.body

    console.log('Checking existing entries...')

    // 既存データの確認
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:M',
    })

    const existingData = existingResponse.data.values || []
    const existingCount = existingData.length > 1 ? existingData.length - 1 : 0

    console.log('Existing count:', existingCount)

    // メールアドレスの重複チェック
    if (existingData.length > 1) {
      const existingEmails = existingData.slice(1).map(row => row[6]) // G列（メールアドレス）
      if (existingEmails.includes(formData.email)) {
        console.log('Duplicate email found:', formData.email)
        return res.status(400).json({ 
          error: 'DUPLICATE_EMAIL',
          message: 'このメールアドレスは既に登録されています。'
        })
      }
    }

    // 定員チェック
    if (existingCount >= CAPACITY_LIMIT) {
      console.log('Capacity exceeded')
      const uniqueId = generateUniqueId()
      
      // ウェイトリストに追加
      const waitlistRowData = [
        uniqueId,                          // A列: 予約ID
        new Date().toISOString(),          // B列: 登録日時
        formData.lastName,                 // C列: 姓
        formData.firstName,                // D列: 名
        formData.lastNameKana,             // E列: 姓（カナ）
        formData.firstNameKana,            // F列: 名（カナ）
        formData.email,                    // G列: メールアドレス
        formData.phone,                    // H列: 電話番号
        formData.organization,             // I列: 所属機関
        formData.position || '',           // J列: 職種・役職
        '2025-10-13',                      // K列: 見学日
        formData.specialRequests || '',    // L列: 特別な配慮事項
        'waitlist'                         // M列: ステータス
      ]

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'over!A:M',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [waitlistRowData]
        }
      })

      return res.status(400).json({ 
        error: 'CAPACITY_EXCEEDED',
        message: '申し訳ございません。定員に達したため、ご予約をお取りできませんでした。'
      })
    }

    console.log('Proceeding with registration...')

    const uniqueId = generateUniqueId()
    
    // entryシートに正しい形式でデータを追加（N列のQRは削除）
    const rowData = [
      uniqueId,                          // A列: 予約ID
      new Date().toISOString(),          // B列: 登録日時
      formData.lastName,                 // C列: 姓（漢字）
      formData.firstName,                // D列: 名（漢字）
      formData.lastNameKana,             // E列: 姓（カナ）
      formData.firstNameKana,            // F列: 名（カナ）
      formData.email,                    // G列: メールアドレス
      formData.phone,                    // H列: 電話番号
      formData.organization,             // I列: 所属機関
      formData.position || '',           // J列: 職種・役職
      '2025-10-13',                      // K列: 見学日
      formData.specialRequests || '',    // L列: 特別な配慮事項
      'confirmed'                        // M列: ステータス
    ]

    console.log('Adding to entry sheet with data:', rowData)

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:M',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowData]
      }
    })

    console.log('Entry added to sheet successfully')

    // PDF生成とメール送信（QR関連削除）
    try {
      console.log('Starting PDF generation from Google Sheets...')
      
      // Google Sheetsのdesignシートを使用してPDF生成
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

      console.log('PDF generated successfully from Google Sheets')

      // 空の森クリニック仕様のメールテンプレート
      const mailOptions = {
        from: {
          name: '第23回日本生殖看護学会学術集会 空の森クリニック見学ツアー 事務局',
          address: 'ivf-sora-tour@azukikai.or.jp'
        },
        to: formData.email,
        subject: '【第23回日本生殖看護学会学術集会】空の森クリニック見学ツアー お申し込み完了のお知らせ',
        html: generateEmailHTML(formData, uniqueId),
        attachments: [
          {
            filename: `ivf-sora-ticket-${uniqueId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }

      console.log('Sending email to:', formData.email)
      await transporter.sendMail(mailOptions)
      console.log('Email with PDF sent successfully to:', formData.email)

    } catch (emailError) {
      console.error('PDF generation or email failed:', emailError)
      console.error('Error stack:', emailError.stack)
      
      // エラーが発生した場合でもdesignシートをクリア
      try {
        await clearDesignSheet()
        console.log('Design sheet cleared after error')
      } catch (clearError) {
        console.error('Design sheet clear error after email failure:', clearError)
      }
      
      // PDFなしでメール送信を試行
      try {
        console.log('Attempting to send email without PDF...')
        const mailOptionsNoPDF = {
          from: {
            name: '第23回日本生殖看護学会学術集会 空の森クリニック見学ツアー 事務局',
            address: 'ivf-sora-tour@azukikai.or.jp'
          },
          to: formData.email,
          subject: '【第23回日本生殖看護学会学術集会】空の森クリニック見学ツアー お申し込み完了のお知らせ',
          html: generateEmailHTML(formData, uniqueId, true), // PDFなしフラグ
        }

        await transporter.sendMail(mailOptionsNoPDF)
        console.log('Email without PDF sent successfully to:', formData.email)
      } catch (fallbackError) {
        console.error('Fallback email also failed:', fallbackError)
      }
    }

    console.log('Registration completed successfully')
    res.status(200).json({ uniqueId, message: 'Registration successful' })
  } catch (error) {
    console.error('Registration error details:', error)
    res.status(500).json({ error: 'Registration failed: ' + error.message })
  }
}

function generateEmailHTML(formData, uniqueId, noPDF = false) {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>空の森クリニック見学ツアー お申し込み完了</title>
      <style>
        body {
          font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif;
          line-height: 1.6;
          color: #333;
          background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%);
          margin: 0;
          padding: 20px;
        }
        
        .container {
          max-width: 650px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 100, 0, 0.15);
        }
        
        .header {
          background: linear-gradient(135deg, #2d5016 0%, #4a7c59 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
          position: relative;
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
          font-size: 22px;
          margin-bottom: 10px;
          font-weight: bold;
          position: relative;
          z-index: 2;
        }
        
        .header h2 {
          font-size: 18px;
          margin-bottom: 15px;
          opacity: 0.95;
          position: relative;
          z-index: 2;
        }
        
        .clinic-name {
          background: rgba(255, 255, 255, 0.15);
          padding: 12px 20px;
          border-radius: 20px;
          display: inline-block;
          font-size: 16px;
          font-weight: 600;
          position: relative;
          z-index: 2;
        }
        
        .content {
          padding: 35px;
        }
        
        .greeting {
          background: linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%);
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 25px;
          border-left: 4px solid #4a7c59;
        }
        
        .user-name {
          color: #2d5016;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 15px;
        }
        
        .reservation-details {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 100, 0, 0.08);
          margin-bottom: 25px;
          border: 1px solid #e9ecef;
        }
        
        .section-title {
          color: #2d5016;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #4a7c59;
        }
        
        .detail-item {
          display: flex;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .detail-item:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-weight: 600;
          color: #2d5016;
          min-width: 100px;
          margin-right: 15px;
          font-size: 14px;
        }
        
        .detail-value {
          color: #333;
          font-size: 14px;
          flex: 1;
        }
        
        .reservation-id {
          background: #e8f5e8;
          padding: 4px 10px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: bold;
          color: #2d5016;
        }
        
        .info-section {
          background: linear-gradient(135deg, #fff3cd 0%, #fef8e7 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid #ffeaa7;
        }
        
        .info-title {
          color: #856404;
          font-size: 15px;
          font-weight: bold;
          margin-bottom: 12px;
        }
        
        .info-list {
          margin: 0;
          padding-left: 18px;
          color: #856404;
        }
        
        .info-list li {
          margin-bottom: 6px;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .warning-section {
          background: linear-gradient(135deg, #f8d7da 0%, #fce7e7 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid #f5c6cb;
        }
        
        .warning-title {
          color: #721c24;
          font-size: 15px;
          font-weight: bold;
          margin-bottom: 12px;
        }
        
        .warning-text {
          color: #721c24;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .closing-message {
          text-align: center;
          padding: 25px 20px;
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
          border-radius: 12px;
          margin-bottom: 25px;
        }
        
        .closing-text {
          color: #555;
          line-height: 1.6;
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .highlight-text {
          color: #2d5016;
          font-weight: 600;
          font-size: 15px;
        }
        
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        
        .footer-title {
          color: #2d5016;
          font-weight: bold;
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        .contact-info {
          color: #6c757d;
          font-size: 12px;
          line-height: 1.4;
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
            padding: 25px 20px;
          }
          
          .detail-item {
            flex-direction: column;
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
        <div class="header">
          <h1>第23回日本生殖看護学会学術集会</h1>
          <h2>見学ツアー お申し込み完了</h2>
          <div class="clinic-name">空の森クリニック</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            <div class="user-name">${formData.lastName} ${formData.firstName} 様</div>
            <p>この度は、空の森クリニック見学ツアーにお申し込みいただき、誠にありがとうございます。</p>
            <p>自然に包まれた医療環境での実践をご体験いただけることを楽しみにしております。</p>
            ${noPDF ? '<p><strong>※PDFチケットは別途お送りいたします。</strong></p>' : ''}
          </div>
          
          <div class="reservation-details">
            <h3 class="section-title">ご予約内容</h3>
            <div class="detail-item">
              <span class="detail-label">予約ID</span>
              <span class="detail-value">
                <span class="reservation-id">${uniqueId}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">お名前</span>
              <span class="detail-value">${formData.lastName} ${formData.firstName}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">見学日</span>
              <span class="detail-value">2025年10月13日（月）14:00〜</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">所属機関</span>
              <span class="detail-value">${formData.organization}</span>
            </div>
            ${formData.position ? `
            <div class="detail-item">
              <span class="detail-label">職種・役職</span>
              <span class="detail-value">${formData.position}</span>
            </div>
            ` : ''}
            ${formData.specialRequests ? `
            <div class="detail-item">
              <span class="detail-label">特別な配慮</span>
              <span class="detail-value">${formData.specialRequests}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="info-section">
            <h4 class="info-title">当日のご案内</h4>
            <ul class="info-list">
              <li>開始時間の10分前にはお越しください</li>
              <li>${noPDF ? '予約IDを受付にてお伝えください' : '添付の電子チケットまたは予約IDを受付にてご提示ください'}</li>
              <li>感染対策にご協力をお願いいたします（マスク着用）</li>
              <li>動きやすい服装でお越しください</li>
              <li>写真撮影は指定された場所のみ可能です</li>
              <li>患者様のプライバシー保護にご配慮ください</li>
            </ul>
          </div>
          
          <div class="warning-section">
            <h4 class="warning-title">キャンセルについて</h4>
            <p class="warning-text">
              やむを得ずキャンセルされる場合は、申し込みサイトのキャンセルフォームより予約IDとメールアドレスを入力してお手続きください。
            </p>
          </div>
          
          <div class="closing-message">
            <p class="closing-text">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
            <p class="highlight-text">
              当日お会いできますことを心よりお待ちしております。
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-title">第23回日本生殖看護学会学術集会</p>
          <p class="footer-title">空の森クリニック見学ツアー 事務局</p>
          <div class="contact-info">
            <p>徳永 季子</p>
            <p>Email: ivf-sora-tour@azukikai.or.jp</p>
            <p>TEL: 098-998-0011</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}