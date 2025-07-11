import { google } from 'googleapis'

const SPREADSHEET_ID = '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, email, reason } = req.body

    if (!uniqueId || !email) {
      return res.status(400).json({ error: '予約IDとメールアドレスは必須です' })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Get all entries from entry sheet
    const entryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:N',
    })

    const entries = entryResponse.data.values || []
    const headerRow = entries[0]
    const dataRows = entries.slice(1)

    // Find the matching entry
    const matchingRowIndex = dataRows.findIndex(row => 
      row[0] === uniqueId && row[6] === email
    )

    if (matchingRowIndex === -1) {
      return res.status(404).json({ error: '該当する予約が見つかりません' })
    }

    const matchingRow = dataRows[matchingRowIndex]
    const actualRowIndex = matchingRowIndex + 2 // +2 because we need to account for header row and 0-based indexing

    // Add cancel reason and timestamp to the row
    const cancelRow = [
      ...matchingRow,
      reason || '',
      new Date().toISOString(),
      'cancelled'
    ]

    // Add to cancel sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'cancel!A:P',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [cancelRow]
      }
    })

    // Delete from entry sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0, // Assuming entry sheet is the first sheet
              dimension: 'ROWS',
              startIndex: actualRowIndex - 1,
              endIndex: actualRowIndex
            }
          }
        }]
      }
    })

    res.status(200).json({ message: 'キャンセル手続きが完了しました' })
  } catch (error) {
    console.error('Cancel error:', error)
    res.status(500).json({ error: 'キャンセル手続きに失敗しました' })
  }
}