import { google } from 'googleapis'

const SPREADSHEET_ID = '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'

async function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ],
  })
}

export async function updateDesignSheetAndGeneratePDF(uniqueId, formData) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  console.log('Updating design sheet with form data...')

  // designシートに値を設定（QRコード関連を削除）
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

  console.log('Updating design sheet with values...')
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  })

  console.log('Design sheet updated successfully')
}

export async function clearDesignSheet() {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const clearRanges = ['design!G11', 'design!G14', 'design!G20']
  
  console.log('Clearing design sheet ranges:', clearRanges)
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      ranges: clearRanges
    }
  })
  console.log('Design sheet cleared successfully')
}

export async function exportSheetAsPDF(sheetName) {
  const auth = await getGoogleAuth()
  
  // designシートのGIDを取得
  const gid = await getSheetGid('design')
  
  console.log('Attempting to export PDF for sheet GID:', gid)
  
  try {
    // Google SheetsからPDF生成
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=pdf&gid=${gid}&portrait=true&fitw=true&fith=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&attachment=false`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`
      }
    })

    if (response.ok) {
      console.log('PDF exported successfully from Google Sheets')
      return Buffer.from(await response.arrayBuffer())
    } else {
      throw new Error(`PDF export failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Google Sheets PDF export failed:', error)
    console.log('Falling back to custom PDF generation with design sheet data')
    
    // フォールバック: designシートからデータを取得してカスタムPDF生成
    const sheets = google.sheets({ version: 'v4', auth })
    
    try {
      const designData = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'design!G11:G20',
      })
      
      const values = designData.data.values || []
      console.log('Design sheet data retrieved:', values)
      
      // データを解析
      const uniqueId = values[0] ? values[0][0] : 'UNKNOWN'
      const fullName = values[3] ? values[3][0] : ''
      const nameParts = fullName.split(' ')
      const lastName = nameParts[0] || ''
      const firstName = nameParts[1] || ''
      const organization = values[9] ? values[9][0] : ''
      
      const formData = {
        lastName,
        firstName,
        organization
      }
      
      console.log('Extracted form data from design sheet:', formData)
      
      // カスタムPDF生成（QRなし）
      const { generateTicketPDFWithoutQR } = await import('./pdfGenerator')
      return await generateTicketPDFWithoutQR(uniqueId, formData)
      
    } catch (fallbackError) {
      console.error('Fallback PDF generation also failed:', fallbackError)
      throw new Error('Both Google Sheets PDF export and fallback generation failed')
    }
  }
}

// designシートのGIDを取得するヘルパー関数
export async function getSheetGid(sheetName) {
  const auth = await getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  
  try {
    console.log('Getting sheet GID for:', sheetName)
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    })
    
    const sheet = response.data.sheets.find(s => s.properties.title === sheetName)
    const gid = sheet ? sheet.properties.sheetId : 0
    console.log('Sheet GID found:', gid)
    return gid
  } catch (error) {
    console.error('Error getting sheet GID:', error)
    return 0 // デフォルト値
  }
}