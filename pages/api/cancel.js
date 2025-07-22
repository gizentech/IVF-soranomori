import { google } from 'googleapis'
import nodemailer from 'nodemailer'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'

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

async function findAndMoveRecord(uniqueId, email, reason) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    // 1. Entryシートからデータを取得
    const entryData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Entry!A:L',
    })

    const rows = entryData.data.values || []
    let targetRowIndex = -1
    let targetRowData = null

    // 2. 予約IDとメールアドレスで該当レコードを検索
    for (let i = 1; i < rows.length; i++) { // ヘッダー行をスキップ
      const row = rows[i]
      const rowUniqueId = row[1] // B列：予約ID
      const rowEmail = row[6] // G列：メールアドレス
      
      if (rowUniqueId === uniqueId && rowEmail === email) {
        targetRowIndex = i + 1 // Google Sheetsは1から始まる
        targetRowData = row
        break
      }
    }

    if (!targetRowData) {
      throw new Error('該当する予約が見つかりません。予約IDとメールアドレスを確認してください。')
    }

    // 3. Cancelシートに移動するデータを準備
    const cancelData = [
      ...targetRowData, // 元のデータをコピー
      new Date().toISOString(), // キャンセル日時を追加
      reason || '' // キャンセル理由を追加
    ]

    // 4. Cancelシートにデータを追加
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Cancel!A:N', // 元データ(A-L) + キャンセル日時(M) + キャンセル理由(N)
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [cancelData]
      }
    })

    console.log('Cancelシートへの追加完了')

    // 5. Entryシートから該当行を削除
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: await getSheetId('Entry'),
              dimension: 'ROWS',
              startIndex: targetRowIndex - 1, // 0から始まるインデックス
              endIndex: targetRowIndex
            }
          }
        }]
      }
    })

    console.log('Entryシートからの削除完了')

    return {
      success: true,
      data: targetRowData
    }

  } catch (error) {
    console.error('レコード移動エラー:', error)
    throw error
  }
}

async function getSheetId(sheetName) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    })
    
    const sheet = response.data.sheets.find(s => s.properties.title === sheetName)
    return sheet ? sheet.properties.sheetId : 0
  } catch (error) {
    console.error('シートID取得エラー:', error)
    return 0
  }
}

async function sendCancelConfirmationEmail(email, uniqueId, lastName, firstName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '【空の森クリニック】見学ツアーキャンセル完了のご案内',
    html: `
      <h2>見学ツアーキャンセル完了</h2>
      <p>${lastName} ${firstName} 様</p>
      <p>見学ツアーのキャンセル手続きが完了いたしました。</p>
      
      <h3>キャンセル内容</h3>
      <ul>
        <li><strong>予約ID:</strong> ${uniqueId}</li>
        <li><strong>お名前:</strong> ${lastName} ${firstName}</li>
        <li><strong>キャンセル日時:</strong> ${new Date().toLocaleString('ja-JP')}</li>
      </ul>
      
      <p>またの機会がございましたら、ぜひご参加ください。</p>
      
      <p>ご不明な点がございましたら、下記までお問い合わせください。</p>
      <p>空の森クリニック 看護局<br>
      TEL: 098-998-0011</p>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('キャンセル確認メールの送信が成功しました')
  } catch (error) {
    console.error('メール送信エラー:', error)
    throw error
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, email, reason } = req.body

    if (!uniqueId || !email) {
      return res.status(400).json({ 
        error: '予約IDとメールアドレスは必須です' 
      })
    }

    console.log('キャンセル処理開始:', { uniqueId, email, reason })

    // 1. EntryシートからCancelシートにレコードを移動
    const result = await findAndMoveRecord(uniqueId, email, reason)
    
    if (result.success) {
      const userData = result.data
      const lastName = userData[2] // C列：姓
      const firstName = userData[3] // D列：名

      // 2. キャンセル確認メールを送信
      await sendCancelConfirmationEmail(email, uniqueId, lastName, firstName)
      
      console.log('キャンセル処理完了')
      
      res.status(200).json({
        success: true,
        message: 'キャンセル手続きが完了しました'
      })
    }

  } catch (error) {
    console.error('Cancel API error:', error)
    res.status(500).json({ 
      error: error.message || 'キャンセル処理でエラーが発生しました'
    })
  }
}