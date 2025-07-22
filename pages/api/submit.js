import { google } from 'googleapis'
import nodemailer from 'nodemailer'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'
const MAX_ENTRIES = 30 // 予約上限数

// メール送信設定
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

async function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return auth
}

async function checkEntryCapacity() {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    // Entryシートの現在のレコード数を取得
    const entryData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Entry!A:A', // A列のみを取得してレコード数をカウント
    })

    const rows = entryData.data.values || []
    const currentEntries = rows.length > 0 ? rows.length - 1 : 0 // ヘッダー行を除く

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

async function saveToDesignSheet(data) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    // designシートの指定セルに値を設定
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

async function saveToEntrySheet(data) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    // Entryシートに申し込みデータを追加（A列から順番に）
    const values = [[
      new Date().toISOString(), // A列: 送信日時
      data.uniqueId, // B列: 予約ID
      data.lastName, // C列: 姓
      data.firstName, // D列: 名
      data.lastNameKana, // E列: 姓（カナ）
      data.firstNameKana, // F列: 名（カナ）
      data.email, // G列: メールアドレス
      data.phone, // H列: 電話番号
      data.organization, // I列: 所属機関
      data.position, // J列: 職種・役職
      data.specialRequests || '', // K列: 特別な配慮事項
      'active' // L列: ステータス
    ]]

    console.log('Entryシートに保存するデータ:', values[0])

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Entry!A:L', // A列からL列まで
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    })

    console.log('Entryシートへの保存が成功しました')
  } catch (error) {
    console.error('Entryシート保存エラー:', error)
    console.error('保存しようとしたデータ:', data)
    throw error
  }
}

async function saveToOverSheet(data) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    // overシートに申し込みデータを追加（A列から順番に）
    const values = [[
      new Date().toISOString(), // A列: 送信日時
      data.uniqueId, // B列: 予約ID
      data.lastName, // C列: 姓
      data.firstName, // D列: 名
      data.lastNameKana, // E列: 姓（カナ）
      data.firstNameKana, // F列: 名（カナ）
      data.email, // G列: メールアドレス
      data.phone, // H列: 電話番号
      data.organization, // I列: 所属機関
      data.position, // J列: 職種・役職
      data.specialRequests || '', // K列: 特別な配慮事項
      'over_capacity' // L列: ステータス（定員超過）
    ]]

    console.log('overシートに保存するデータ:', values[0])

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'over!A:L', // A列からL列まで
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    })

    console.log('overシートへの保存が成功しました')
  } catch (error) {
    console.error('overシート保存エラー:', error)
    console.error('保存しようとしたデータ:', data)
    throw error
  }
}

async function sendConfirmationEmail(data) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: data.email,
    subject: '【空の森クリニック】見学ツアーお申し込み完了のご案内',
    html: `
      <h2>見学ツアーお申し込み完了</h2>
      <p>${data.lastName} ${data.firstName} 様</p>
      <p>この度は、第23回日本生殖看護学会学術集会「空の森クリニック見学ツアー」にお申し込みいただき、ありがとうございます。</p>
      
      <h3>お申し込み内容</h3>
      <ul>
        <li><strong>予約ID:</strong> ${data.uniqueId}</li>
        <li><strong>お名前:</strong> ${data.lastName} ${data.firstName}</li>
        <li><strong>見学日:</strong> 2025年10月13日（月）14:00〜</li>
        <li><strong>所属機関:</strong> ${data.organization}</li>
      </ul>
      
      <h3>当日のご案内</h3>
      <p>・集合時間：14:00（受付開始 13:45）</p>
      <p>・集合場所：空の森クリニック 1階受付</p>
      <p>・予約IDまたは電子チケットをご提示ください</p>
      <p>・感染対策にご協力ください（マスク着用必須）</p>
      
      <p>ご不明な点がございましたら、下記までお問い合わせください。</p>
      <p>空の森クリニック 看護局<br>
      TEL: 098-998-0011</p>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('確認メールの送信が成功しました')
  } catch (error) {
    console.error('メール送信エラー:', error)
    throw error
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const formData = req.body
    const uniqueId = generateUniqueId()
    
    const submissionData = {
      ...formData,
      uniqueId
    }

    console.log('フォームデータを処理中:', submissionData)

    // 1. 予約可能数を確認
    const capacityCheck = await checkEntryCapacity()
    console.log('予約状況:', capacityCheck)

    if (capacityCheck.isAvailable) {
      // 予約可能な場合
      console.log(`予約受付可能 (残り${capacityCheck.remainingSlots}件)`)

      // 2. Entryシートに申し込みデータを保存
      await saveToEntrySheet(submissionData)
      console.log('Entryシートへの保存完了')

      // 3. designシートにチケット用データを保存
      await saveToDesignSheet(submissionData)
      console.log('designシートへの保存完了')

      // 4. 確認メールを送信
      await sendConfirmationEmail(submissionData)
      console.log('確認メール送信完了')

      res.status(200).json({
        success: true,
        uniqueId,
        status: 'confirmed',
        message: 'お申し込みが完了しました',
        remainingSlots: capacityCheck.remainingSlots - 1
      })

    } else {
      // 定員超過の場合：overシートに保存してエラーレスポンスを返す
      console.log('定員超過のため、overシートに保存')

      // 2. overシートに申し込みデータを保存
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

  } catch (error) {
    console.error('Submit API error:', error)
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: error.message
    })
  }
}