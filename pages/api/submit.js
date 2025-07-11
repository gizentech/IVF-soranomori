import { google } from 'googleapis'
import { generateUniqueId } from '../../utils/generateUniqueId'
import nodemailer from 'nodemailer'
import { generateTicketPDF } from '../../lib/pdfGenerator'

const SPREADSHEET_ID = '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'
const CAPACITY_LIMIT = 20

// メール送信設定
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

    // Check current capacity
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:A',
    })

    const existingCount = existingResponse.data.values ? existingResponse.data.values.length - 1 : 0
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
      formData.tourDate,
      formData.participantCount,
      formData.specialRequests || '',
      'confirmed'
    ]

    if (existingCount >= CAPACITY_LIMIT) {
      // Add to over sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'over!A:N',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData]
        }
      })

      return res.status(400).json({ error: 'CAPACITY_EXCEEDED' })
    }

    // Add to entry sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:N',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowData]
      }
    })

    // PDF生成とメール送信を直接実行
    try {
      const pdfBuffer = await generateTicketPDF(uniqueId, formData)

      const mailOptions = {
        from: 'ivf-sora-tour@azukikai.or.jp',
        to: formData.email,
        subject: '【IVF学会】空の森クリニック見学ツアー 申し込み完了のお知らせ',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">IVF学会 空の森クリニック見学ツアー</h2>
            <h3 style="color: #27ae60;">お申し込み完了のお知らせ</h3>
            
            <p>${formData.lastName} ${formData.firstName} 様</p>
            
            <p>この度は、IVF学会 空の森クリニック見学ツアーにお申し込みいただき、誠にありがとうございます。</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #2c3e50;">予約内容</h4>
              <p><strong>予約ID:</strong> ${uniqueId}</p>
              <p><strong>お名前:</strong> ${formData.lastName} ${formData.firstName}</p>
              <p><strong>見学日:</strong> ${new Date(formData.tourDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}</p>
              <p><strong>参加人数:</strong> ${formData.participantCount}名</p>
              <p><strong>所属機関:</strong> ${formData.organization}</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #856404;">当日のご案内</h4>
              <ul style="padding-left: 20px;">
                <li>開始時間の10分前にはお越しください</li>
                <li>添付の電子チケットを受付にてご提示ください</li>
                <li>感染対策にご協力をお願いいたします</li>
                <li>動きやすい服装でお越しください</li>
              </ul>
            </div>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #721c24;">キャンセルについて</h4>
              <p>やむを得ずキャンセルされる場合は、申し込みサイトのキャンセルフォームよりお手続きください。</p>
            </div>
            
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <p>当日お会いできますことを楽しみにしております。</p>
            
            <hr style="margin: 30px 0;">
            
            <div style="color: #6c757d; font-size: 14px;">
              <p><strong>IVF学会 空の森クリニック見学ツアー事務局</strong></p>
              <p>Email: soranomori@azukikai.or.jp</p>
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
      // メール送信に失敗してもレスポンスは成功として返す
      // ただし、ログにエラーを記録
    }

    res.status(200).json({ uniqueId, message: 'Registration successful' })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
}