import { google } from 'googleapis'

const SPREADSHEET_ID = '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'

async function getGoogleAuth() {
  try {
    // 環境変数の存在確認
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
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
    })

    // 認証クライアントを事前に取得してテスト
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

// 以下は既存のコードをそのまま使用
export async function updateDesignSheetAndGeneratePDF(uniqueId, formData) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  console.log('デザインシートにフォームデータを設定中...')

  try {
    // まずデザインシートをクリア
    await clearDesignSheet()
    
    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000))

    // デザインシートに値を設定
    const updates = [
      {
        range: 'design!G11',
        values: [[uniqueId]]
      },
      {
        range: 'design!G14',
        values: [[`${formData.lastName} ${formData.firstName}`]]
      },
      {
        range: 'design!G20',
        values: [[formData.organization]]
      }
    ]

    console.log('デザインシートの値を更新中...', updates)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    })

    console.log('デザインシートの更新に成功しました')
    
    // 更新完了を確認するため少し待機
    await new Promise(resolve => setTimeout(resolve, 2000))
    
  } catch (error) {
    console.error('デザインシートの更新に失敗:', error)
    throw error
  }
}

export async function clearDesignSheet() {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const clearRanges = ['design!G11', 'design!G14', 'design!G20']
  
  console.log('デザインシートをクリア中:', clearRanges)
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      ranges: clearRanges
    }
  })
  console.log('デザインシートのクリアに成功しました')
}

// 残りの関数は既存のまま...
export async function exportSheetAsPDF(sheetName) {
  const auth = await getGoogleAuth()
  
  try {
    console.log('アクセストークンを取得中...')
    const authClient = await auth.getClient()
    const accessToken = await authClient.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('アクセストークンの取得に失敗しました')
    }
    
    console.log('アクセストークンの取得に成功しました')
    
    // シートGIDを取得
    const gid = await getSheetGid('design')
    console.log('デザインシートGID:', gid)
    
    // PDF出力用URLを構築
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export`)
    exportUrl.searchParams.set('format', 'pdf')
    exportUrl.searchParams.set('gid', gid.toString())
    exportUrl.searchParams.set('portrait', 'true')
    exportUrl.searchParams.set('size', 'A4')
    exportUrl.searchParams.set('fitw', 'true')
    exportUrl.searchParams.set('fith', 'false')
    exportUrl.searchParams.set('gridlines', 'false')
    exportUrl.searchParams.set('printtitle', 'false')
    exportUrl.searchParams.set('sheetnames', 'false')
    exportUrl.searchParams.set('pagenum', 'UNDEFINED')
    exportUrl.searchParams.set('attachment', 'true')
    exportUrl.searchParams.set('top_margin', '0.5')
    exportUrl.searchParams.set('bottom_margin', '0.5')
    exportUrl.searchParams.set('left_margin', '0.5')
    exportUrl.searchParams.set('right_margin', '0.5')
    exportUrl.searchParams.set('horizontal_alignment', 'CENTER')
    exportUrl.searchParams.set('vertical_alignment', 'MIDDLE')
    
    console.log('PDF出力URL:', exportUrl.toString())
    
    console.log('PDF出力を試行中...')
    const response = await fetch(exportUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleSheetsExport/1.0)',
        'Accept': 'application/pdf'
      }
    })

    console.log('PDF出力レスポンスステータス:', response.status)
    console.log('PDF出力レスポンスコンテンツタイプ:', response.headers.get('content-type'))

    if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
      console.log('Google SheetsからPDFの出力に成功しました')
      return Buffer.from(await response.arrayBuffer())
    } else {
      const errorText = await response.text()
      console.log('PDF出力に失敗しました:', response.status, response.statusText)
      console.log('エラーレスポンス:', errorText.substring(0, 500))
      throw new Error(`PDF出力に失敗: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Google Sheets PDF出力に失敗:', error)
    throw new Error('PDF生成に失敗しました。しばらく時間をおいて再度お試しください。')
  }
}

// デザインシートのGIDを取得するヘルパー関数
export async function getSheetGid(sheetName) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  
  try {
    console.log('シートGIDを取得中:', sheetName)
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    })
    
    const sheet = response.data.sheets.find(s => s.properties.title === sheetName)
    const gid = sheet ? sheet.properties.sheetId : 0
    console.log('シートGIDを発見:', gid)
    return gid
  } catch (error) {
    console.error('シートGID取得エラー:', error)
    return 0 // デフォルト値
  }
}