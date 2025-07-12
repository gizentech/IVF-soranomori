import { google } from 'googleapis'

const SPREADSHEET_ID = '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, email, reason } = req.body

    console.log('Cancel request received:', { uniqueId, email, reason })

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
    console.log('Fetching entries from sheet...')
    const entryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:M',
    })

    const entries = entryResponse.data.values || []
    console.log('Total entries found:', entries.length)

    if (entries.length <= 1) {
      console.log('No data entries found (only header or empty)')
      return res.status(404).json({ error: '登録されている予約が見つかりません' })
    }

    const headerRow = entries[0]
    const dataRows = entries.slice(1)

    console.log('Header row:', headerRow)
    console.log('Data rows count:', dataRows.length)

    // Find the matching entry
    console.log('Searching for matching entry...')
    console.log('Looking for uniqueId:', uniqueId)
    console.log('Looking for email:', email)

    let matchingRowIndex = -1
    let matchingRow = null

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      console.log(`Row ${i}:`, row)
      console.log(`  - UniqueId in row: "${row[0]}" (comparing with "${uniqueId}")`)
      console.log(`  - Email in row: "${row[6]}" (comparing with "${email}")`)
      
      if (row[0] === uniqueId && row[6] === email) {
        matchingRowIndex = i
        matchingRow = row
        console.log('MATCH FOUND at index:', i)
        break
      }
    }

    if (matchingRowIndex === -1) {
      console.log('No matching entry found')
      console.log('Available uniqueIds:', dataRows.map(row => row[0]))
      console.log('Available emails:', dataRows.map(row => row[6]))
      return res.status(404).json({ error: '該当する予約が見つかりません。予約IDとメールアドレスをご確認ください。' })
    }

    console.log('Matching row found:', matchingRow)

    // Add cancel reason and timestamp to the row
    const cancelRow = [
      ...matchingRow,
      reason || '',
      new Date().toISOString(),
      'cancelled'
    ]

    console.log('Adding to cancel sheet:', cancelRow)

    // Add to cancel sheet first
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'cancel!A:P',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [cancelRow]
      }
    })

    console.log('Added to cancel sheet successfully')

    // Instead of deleting the row, we'll clear it and then remove empty rows
    // This prevents the row shifting issue
    
    const actualRowIndex = matchingRowIndex + 2 // +2 for header row and 0-based indexing
    console.log('Clearing row at position:', actualRowIndex)

    // Clear the specific row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `entry!A${actualRowIndex}:M${actualRowIndex}`
    })

    console.log('Row cleared successfully')

    // Get updated data to remove empty rows
    const updatedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:M',
    })

    const updatedEntries = updatedResponse.data.values || []
    
    // Filter out empty rows and rebuild the sheet
    const filteredEntries = updatedEntries.filter(row => {
      // Keep header row and rows with data in first column (uniqueId)
      return row && row.length > 0 && row[0] && row[0].trim() !== ''
    })

    console.log('Filtered entries count:', filteredEntries.length)

    // Clear the entire sheet and rebuild it
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'entry!A:M'
    })

    // Write back the filtered data
    if (filteredEntries.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'entry!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: filteredEntries
        }
      })
    }

    console.log('Sheet rebuilt successfully without empty rows')

    res.status(200).json({ message: 'キャンセル手続きが完了しました' })
  } catch (error) {
    console.error('Cancel error:', error)
    res.status(500).json({ error: 'キャンセル手続きに失敗しました: ' + error.message })
  }
}