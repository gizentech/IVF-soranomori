import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { updateDesignSheetAndGeneratePDF, clearDesignSheet, exportSheetAsPDF } from '../../lib/googleSheets'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'
const MAX_ENTRIES = 30

async function createMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'soranomori-o.sakura.ne.jp',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'ivf-sora-tour@azukikai.or.jp',
      pass: process.env.EMAIL_PASSWORD || 'sora2025dx',
    },
  })
}

async function getGoogleAuth() {
  try {
    console.log('Environment variables check:')
    console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'Not set')
    console.log('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set' : 'Not set')
    console.log('SPREADSHEET_ID:', process.env.SPREADSHEET_ID ? 'Set' : 'Not set')

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable is not set')
    }
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variable is not set')
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    
    const authClient = await auth.getClient()
    const accessToken = await authClient.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('有効なアクセストークンを取得できませんでした')
    }

    console.log('Google認証が正常に設定されました')
    return auth
  } catch (error) {
    console.error('Google認証の設定に失敗:', error)
    throw new Error(`Google認証エラー: ${error.message}`)
  }
}

async function checkEntryCapacity() {
  try {
    const auth = await getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    const entryData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Entry!A:A',
    })

    const rows = entryData.data.values || []
    const currentEntries = rows.length > 0 ? rows.length - 1 : 0

    console.log(`現在の予約数: ${currentEntries}/${MAX_ENTRIES}`)

    return {
      currentCount: currentEntries,
      isAvailable: currentEntries < MAX_ENTRIES,
      remainingSlots: Math.max(0, MAX_ENTRIES - currentEntries)
    }
  } catch (error) {
    console.error('予約数確認エラー:', error)
    throw error
  }
}

async function saveToEntrySheet(data) {
  try {
    const auth = await getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // 正確な列順序でデータを配置
    const values = [[
      new Date().toISOString(), // A列: 送信日時
      data.uniqueId, // B列: 予約ID
      data.lastName || '', // C列: 姓
      data.firstName || '', // D列: 名
      data.lastNameKana || '', // E列: 姓（カナ）
      data.firstNameKana || '', // F列: 名（カナ）
      data.email || '', // G列: メールアドレス
      data.phone || '', // H列: 電話番号
      data.organization || '', // I列: 所属機関
      data.position || '', // J列: 職種・役職
      data.specialRequests || '', // K列: 特別な配慮事項
      'active' // L列: ステータス
    ]]

    console.log('保存するデータの詳細:')
    console.log('A列-送信日時:', new Date().toISOString())
    console.log('B列-予約ID:', data.uniqueId)
    console.log('C列-姓:', data.lastName)
    console.log('D列-名:', data.firstName)
    console.log('E列-姓（カナ）:', data.lastNameKana)
    console.log('F列-名（カナ）:', data.firstNameKana)
    console.log('G列-メールアドレス:', data.email)
    console.log('H列-電話番号:', data.phone)
    console.log('I列-所属機関:', data.organization)
    console.log('J列-職種:', data.position)
    console.log('K列-特別な配慮:', data.specialRequests)
    console.log('L列-ステータス: active')

    console.log('Entryシートに保存するデータ配列:', values[0])

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Entry!A:L',
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    })

    console.log('Entryシートへの保存が成功しました')
  } catch (error) {
    console.error('Entryシート保存エラー:', error)
    throw error
  }
}

async function saveToOverSheet(data) {
  try {
    const auth = await getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // 定員超過用のシートに保存（同じ列構成）
    const values = [[
      new Date().toISOString(), // A列: 送信日時
      data.uniqueId, // B列: 予約ID
      data.lastName || '', // C列: 姓
      data.firstName || '', // D列: 名
      data.lastNameKana || '', // E列: 姓（カナ）
      data.firstNameKana || '', // F列: 名（カナ）
      data.email || '', // G列: メールアドレス
      data.phone || '', // H列: 電話番号
      data.organization || '', // I列: 所属機関
      data.position || '', // J列: 職種・役職
      data.specialRequests || '', // K列: 特別な配慮事項
      'over_capacity' // L列: ステータス（定員超過）
    ]]

    console.log('overシートに保存するデータ:', values[0])

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'over!A:L',
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    })

    console.log('overシートへの保存が成功しました')
  } catch (error) {
    console.error('overシート保存エラー:', error)
    throw error
  }
}

async function saveToDesignSheet(data) {
  try {
    const auth = await getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    const updates = [
      {
        range: 'design!G11',
        values: [[data.uniqueId]]
      },
      {
        range: 'design!G14',
        values: [[`${data.lastName} ${data.firstName}`]]
      },
      {
        range: 'design!G20',
        values: [[data.organization]]
      }
    ]

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    })

    console.log('designシートへの保存が成功しました')
  } catch (error) {
    console.error('designシート保存エラー:', error)
    throw error
  }
}

async function sendConfirmationEmailWithPDF(data) {
  try {
    // 1. PDFを生成
    console.log('PDFチケットを生成中...')
    await updateDesignSheetAndGeneratePDF(data.uniqueId, data)
    
    // シート更新の完了を待つ
    console.log('シート更新の完了を待機中...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // 2. PDFを取得
    console.log('PDFを出力中...')
    const pdfBuffer = await exportSheetAsPDF('design')
    console.log('PDFの生成が完了しました')
    
    // 3. デザインシートをクリア
    console.log('デザインシートをクリア中...')
    await clearDesignSheet()
    
    // 4. メール送信
    console.log('PDFチケット付きメールを送信中...')
    const transporter = await createMailTransporter()
    
    const mailOptions = {
      from: {
        name: '第23回日本生殖看護学会学術集会 空の森クリニック見学ツアー 事務局',
        address: 'ivf-sora-tour@azukikai.or.jp'
      },
      to: data.email,
      subject: '【第23回日本生殖看護学会学術集会】空の森クリニック見学ツアー お申し込み完了のお知らせ',
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #00104d 0%, #1e3a8a 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .reservation-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
            .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>第23回日本生殖看護学会学術集会</h1>
              <h2>空の森クリニック見学ツアー</h2>
              <p>お申し込み完了のお知らせ</p>
            </div>
            
            <div class="content">
              <p><strong>${data.lastName} ${data.firstName}</strong> 様</p>
              
              <p>この度は、空の森クリニック見学ツアーにお申し込みいただき、誠にありがとうございます。</p>
              <p>自然に包まれた医療環境での実践をご体験いただけることを楽しみにしております。</p>
              
              <div class="reservation-info">
                <h3>ご予約内容</h3>
                <ul>
                  <li><strong>予約ID:</strong> ${data.uniqueId}</li>
                  <li><strong>お名前:</strong> ${data.lastName} ${data.firstName}</li>
                  <li><strong>見学日:</strong> 2025年10月13日（月）14:00〜</li>
                  <li><strong>所属機関:</strong> ${data.organization}</li>
                </ul>
              </div>
              
              <h3>当日のご案内</h3>
              <ul>
                <li>開始時間の10分前にはお越しください</li>
                <li><strong>添付のPDFチケットまたは予約IDを受付にてご提示ください</strong></li>
                <li>感染対策にご協力をお願いいたします（マスク着用必須）</li>
                <li>動きやすい服装でお越しください</li>
                <li>写真撮影は指定された場所のみ可能です</li>
              </ul>
              
              <div class="highlight">
                <strong>📎 電子チケットについて</strong><br>
                このメールには電子チケット（PDF）が添付されています。当日はこのPDFを印刷してお持ちいただくか、スマートフォンで表示してご提示ください。
              </div>
              
              <h3>キャンセルについて</h3>
              <p>やむを得ずキャンセルされる場合は、申し込みサイトのキャンセルフォームよりお手続きください。</p>
              
              <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
              <p><strong>当日お会いできますことを心よりお待ちしております。</strong></p>
            </div>
            
            <div class="footer">
              <p><strong>第23回日本生殖看護学会学術集会</strong></p>
              <p><strong>空の森クリニック見学ツアー 事務局</strong></p>
              <p>徳永 季子</p>
              <p>Email: ivf-sora-tour@azukikai.or.jp</p>
              <p>空の森クリニック 看護局 TEL: 098-998-0011</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `ivf-sora-ticket-${data.uniqueId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }

    await transporter.sendMail(mailOptions)
    console.log('PDFチケット付き確認メールの送信が成功しました:', data.email)
  } catch (error) {
    console.error('PDFメール送信エラー:', error)
    
    // PDFの生成に失敗した場合は、PDF無しでメールを送信
    console.log('PDF生成に失敗したため、PDF無しでメール送信を試行します')
    await sendConfirmationEmailWithoutPDF(data)
  }
}

// PDF無しのメール送信（フォールバック用）
async function sendConfirmationEmailWithoutPDF(data) {
  try {
    const transporter = await createMailTransporter()
    
    const mailOptions = {
      from: {
        name: '第23回日本生殖看護学会学術集会 空の森クリニック見学ツアー 事務局',
        address: 'ivf-sora-tour@azukikai.or.jp'
      },
      to: data.email,
      subject: '【第23回日本生殖看護学会学術集会】空の森クリニック見学ツアー お申し込み完了のお知らせ',
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #00104d 0%, #1e3a8a 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .reservation-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
            .warning { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>第23回日本生殖看護学会学術集会</h1>
              <h2>空の森クリニック見学ツアー</h2>
              <p>お申し込み完了のお知らせ</p>
            </div>
            
            <div class="content">
              <p><strong>${data.lastName} ${data.firstName}</strong> 様</p>
              
              <p>この度は、空の森クリニック見学ツアーにお申し込みいただき、誠にありがとうございます。</p>
              
              <div class="reservation-info">
                <h3>お申し込み内容</h3>
                <ul>
                  <li><strong>予約ID:</strong> ${data.uniqueId}</li>
                  <li><strong>お名前:</strong> ${data.lastName} ${data.firstName}</li>
                  <li><strong>見学日:</strong> 2025年10月13日（月）14:00〜</li>
                  <li><strong>所属機関:</strong> ${data.organization}</li>
                </ul>
              </div>
              
              <h3>当日のご案内</h3>
              <ul>
                <li>集合時間：14:00（受付開始 13:45）</li>
                <li>集合場所：空の森クリニック 1階受付</li>
                <li><strong>予約ID: ${data.uniqueId}</strong> を受付にてお伝えください</li>
                <li>感染対策にご協力ください（マスク着用必須）</li>
              </ul>
              
              <div class="warning">
                <strong>注意:</strong> 電子チケットの生成でエラーが発生しました。当日は上記の予約IDをお伝えください。
              </div>
              
              <p>ご不明な点がございましたら、下記までお問い合わせください。</p>
              <p><strong>当日お会いできますことを心よりお待ちしております。</strong></p>
            </div>
            
            <div class="footer">
              <p><strong>第23回日本生殖看護学会学術集会</strong></p>
              <p><strong>空の森クリニック見学ツアー 事務局</strong></p>
              <p>徳永 季子</p>
              <p>Email: ivf-sora-tour@azukikai.or.jp</p>
              <p>空の森クリニック 看護局 TEL: 098-998-0011</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log('フォールバック確認メールの送信が成功しました:', data.email)
  } catch (error) {
    console.error('フォールバックメール送信エラー:', error)
    console.log('メール送信に失敗しましたが、予約は正常に完了しています')
  }
}

function generateUniqueId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'IVF-SORA'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default async function handler(req, res) {
  console.log('API called with method:', req.method)
  console.log('Request body:', req.body)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const formData = req.body
    const uniqueId = generateUniqueId()
    
    // フォームデータの各フィールドを詳細にログ出力
    console.log('=== フォームデータの詳細 ===')
    console.log('lastName:', formData.lastName)
    console.log('firstName:', formData.firstName)
    console.log('lastNameKana:', formData.lastNameKana)
    console.log('firstNameKana:', formData.firstNameKana)
    console.log('email:', formData.email)
    console.log('phone:', formData.phone)
    console.log('organization:', formData.organization)
    console.log('position:', formData.position)
    console.log('specialRequests:', formData.specialRequests)
    console.log('========================')
    
    const submissionData = {
      uniqueId,
      lastName: formData.lastName || '',
      firstName: formData.firstName || '',
      lastNameKana: formData.lastNameKana || '',
      firstNameKana: formData.firstNameKana || '',
      email: formData.email || '',
      phone: formData.phone || '',
      organization: formData.organization || '',
      position: formData.position || '',
      specialRequests: formData.specialRequests || ''
    }

    console.log('処理用データ:', submissionData)

    // Google Sheetsの環境変数がある場合のみGoogle Sheets処理を実行
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.log('Google Sheets機能が有効です')
      
      const capacityCheck = await checkEntryCapacity()
      console.log('予約状況:', capacityCheck)

      if (capacityCheck.isAvailable) {
        console.log(`予約受付可能 (残り${capacityCheck.remainingSlots}件)`)
        
        await saveToEntrySheet(submissionData)
        console.log('Entryシートへの保存完了')

        await saveToDesignSheet(submissionData)
        console.log('designシートへの保存完了')

        // PDFチケット付きメールを送信
        await sendConfirmationEmailWithPDF(submissionData)
        console.log('PDFチケット付き確認メール送信完了')

        res.status(200).json({
          success: true,
          uniqueId,
          status: 'confirmed',
          message: 'お申し込みが完了しました',
          remainingSlots: capacityCheck.remainingSlots - 1
        })

      } else {
        console.log('定員超過のため、overシートに保存')
        
        await saveToOverSheet(submissionData)
        console.log('overシートへの保存完了')

        res.status(400).json({
          success: false,
          uniqueId,
          status: 'full_capacity',
          message: 'ご予約満員御礼につき、ご予約がお取りできませんでした。',
          currentEntries: capacityCheck.currentCount,
          maxEntries: MAX_ENTRIES
        })
      }
    } else {
      console.log('Google Sheets環境変数が未設定のため、ローカル処理のみ実行')
      
      await sendConfirmationEmailWithoutPDF(submissionData)
      console.log('確認メール送信完了')

      res.status(200).json({
        success: true,
        uniqueId,
        status: 'confirmed',
        message: 'お申し込みが完了しました（テストモード）',
        remainingSlots: 25
      })
    }

  } catch (error) {
    console.error('Submit API error:', error)
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: error.message
    })
  }
}