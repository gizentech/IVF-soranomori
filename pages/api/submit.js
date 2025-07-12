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
    // 環境変数の確認
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.error('Missing Google service account credentials')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // プライベートキーの形式を確認・修正
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

    // 既存の登録データを取得して重複チェック
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:M',
    })

    const existingData = existingResponse.data.values || []
    const existingCount = existingData.length > 1 ? existingData.length - 1 : 0

    // メールアドレスの重複チェック（ヘッダー行を除く）
    if (existingData.length > 1) {
      const existingEmails = existingData.slice(1).map(row => row[6]) // Email is column G (index 6)
      if (existingEmails.includes(formData.email)) {
        return res.status(400).json({ error: 'DUPLICATE_EMAIL' })
      }
    }

    // 定員チェック
    if (existingCount >= CAPACITY_LIMIT) {
      const uniqueId = generateUniqueId()
      const rowData = [
        uniqueId,
        new Date().toISOString(),
        formData.lastName,
        formData.firstName,
        formData.lastNameKana,
        formData.firstNameKana,
        formData.email,
        formData.phone,
        formData.organization,
        formData.position || '',
        '2025-10-13', // 固定値
        formData.specialRequests || '',
        'waitlist'
      ]

      // Add to over sheet (waitlist)
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'over!A:M',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData]
        }
      })

      return res.status(400).json({ error: 'CAPACITY_EXCEEDED' })
    }

    const uniqueId = generateUniqueId()
    const rowData = [
      uniqueId,
      new Date().toISOString(),
      formData.lastName,
      formData.firstName,
      formData.lastNameKana,
      formData.firstNameKana,
      formData.email,
      formData.phone,
      formData.organization,
      formData.position || '',
      '2025-10-13', // 固定値
      formData.specialRequests || '',
      'confirmed'
    ]

    // Add to entry sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:M',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowData]
      }
    })

    // PDF生成とメール送信を直接実行
    try {
      console.log('Starting PDF generation from Google Sheets...')
      
      // Google Sheetsのdesignシートを使用してPDF生成
      await updateDesignSheetAndGeneratePDF(uniqueId, formData)
      
      // Google Sheetsの更新を待つ
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // PDFをエクスポート
      const pdfBuffer = await exportSheetAsPDF('design')
      
      // designシートをクリア
      await clearDesignSheet()

      console.log('PDF generated successfully from Google Sheets')

      const mailOptions = {
        from: {
          name: '第23回日本生殖看護学会学術集会 空の森クリニック見学ツアー 事務局',
          address: 'ivf-sora-tour@azukikai.or.jp'
        },
        to: formData.email,
        subject: '【第23回日本生殖看護学会学術集会】空の森クリニック見学ツアー お申し込み完了のお知らせ',
        html: `
          <div style="font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif; max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #f0f4f8 0%, #e8f2f7 100%); border-radius: 12px; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #00104d 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                第23回日本生殖看護学会学術集会
              </h1>
              <h2 style="margin: 10px 0 0 0; font-size: 18px; font-weight: 500; opacity: 0.95;">
                空の森クリニック見学ツアー
              </h2>
              <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.15); border-radius: 8px; backdrop-filter: blur(10px);">
                <p style="margin: 0; font-size: 16px; font-weight: 600;">お申し込み完了のお知らせ</p>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,16,77,0.1); margin-bottom: 30px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                  ${formData.lastName} ${formData.firstName} 様
                </p>
                
                <p style="margin: 0 0 15px 0; font-size: 15px; color: #555; line-height: 1.7;">
                  この度は、空の森クリニック見学ツアーにお申し込みいただき、誠にありがとうございます。
                </p>
                <p style="margin: 0; font-size: 15px; color: #555; line-height: 1.7;">
                  自然に包まれた医療環境での実践をご体験いただけることを楽しみにしております。
                </p>
              </div>
              
              <!-- 予約内容 -->
              <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,16,77,0.1); margin-bottom: 30px;">
                <h3 style="margin: 0 0 20px 0; color: #00104d; font-size: 18px; font-weight: bold; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                  ご予約内容
                </h3>
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="font-weight: 600; color: #00104d; min-width: 100px;">予約ID：</span>
                    <span style="color: #333; font-family: monospace; background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${uniqueId}</span>
                  </div>
                  <div style="display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="font-weight: 600; color: #00104d; min-width: 100px;">お名前：</span>
                    <span style="color: #333;">${formData.lastName} ${formData.firstName}</span>
                  </div>
                  <div style="display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="font-weight: 600; color: #00104d; min-width: 100px;">見学日：</span>
                    <span style="color: #333;">2025年10月13日（月）14:00〜</span>
                  </div>
                  <div style="display: flex; padding: 8px 0;">
                    <span style="font-weight: 600; color: #00104d; min-width: 100px;">所属機関：</span>
                    <span style="color: #333;">${formData.organization}</span>
                  </div>
                </div>
              </div>
              
              <!-- 当日のご案内 -->
              <div style="background: linear-gradient(135deg, #fff3cd 0%, #fef8e7 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #ffeaa7;">
                <h4 style="margin: 0 0 15px 0; color: #856404; font-size: 16px; font-weight: bold;">
                  🌿 当日のご案内
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #856404;">
                  <li style="margin-bottom: 8px;">開始時間の10分前にはお越しください</li>
                  <li style="margin-bottom: 8px;">添付の電子チケットを受付にてご提示ください</li>
                  <li style="margin-bottom: 8px;">感染対策にご協力をお願いいたします（マスク着用）</li>
                  <li style="margin-bottom: 8px;">動きやすい服装でお越しください</li>
                  <li>写真撮影は指定された場所のみ可能です</li>
                </ul>
              </div>
              
              <!-- キャンセルについて -->
              <div style="background: linear-gradient(135deg, #f8d7da 0%, #fce7e7 100%); padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #f5c6cb;">
                <h4 style="margin: 0 0 15px 0; color: #721c24; font-size: 16px; font-weight: bold;">
                  ⚠️ キャンセルについて
                </h4>
                <p style="margin: 0; color: #721c24; line-height: 1.6;">
                  やむを得ずキャンセルされる場合は、申し込みサイトのキャンセルフォームよりお手続きください。
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #555; line-height: 1.6;">
                  ご不明な点がございましたら、お気軽にお問い合わせください。
                </p>
                <p style="margin: 0; color: #00104d; font-weight: 600; line-height: 1.6;">
                  当日お会いできますことを心よりお待ちしております。
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
              <div style="text-align: center; color: #6c757d; font-size: 14px; line-height: 1.5;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #00104d;">
                  第23回日本生殖看護学会学術集会
                </p>
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #00104d;">
                  空の森クリニック見学ツアー 事務局
                </p>
                <p style="margin: 0 0 5px 0;">徳永 季子</p>
                <p style="margin: 0;">Email: ivf-sora-tour@azukikai.or.jp</p>
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `ivf-sora-ticket-${uniqueId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }

      await transporter.sendMail(mailOptions)
      console.log('Email sent successfully to:', formData.email)
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      
      // エラーが発生した場合でもdesignシートをクリア
      try {
        await clearDesignSheet()
      } catch (clearError) {
        console.error('Design sheet clear error after email failure:', clearError)
      }
      
      // メール送信に失敗してもレスポンスは成功として返す
      // ただし、ログにエラーを記録
    }

    res.status(200).json({ uniqueId, message: 'Registration successful' })
  } catch (error) {
    console.error('Registration error:', error)
    
    // エラーが発生した場合でもdesignシートをクリア
    try {
      await clearDesignSheet()
    } catch (clearError) {
      console.error('Design sheet clear error after registration failure:', clearError)
    }
    
    res.status(500).json({ error: 'Registration failed' })
  }
}