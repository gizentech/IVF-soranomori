import PDFDocument from 'pdfkit'
import { google } from 'googleapis'

const SPREADSHEET_ID = '1bnvH6hW7v7xq99f12w3IzNmFSFbORYh0nLMW0DbwQEs'

export async function generateTicketPDF(uniqueId, formData) {
  try {
    // 動的インポートでQRCodeを読み込む
    const QRCode = await import('qrcode')
    
    // Get design data from Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const designResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'design!A:B',
    })

    const designData = designResponse.data.values || []
    const design = {}
    designData.forEach(row => {
      if (row[0] && row[1]) {
        design[row[0]] = row[1]
      }
    })

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(uniqueId, { width: 120 })
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64')

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const buffers = []

    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {})

    // Header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('IVF学会 空の森クリニック見学ツアー', { align: 'center' })
       .moveDown()

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('電子チケット', { align: 'center' })
       .moveDown(2)

    // Ticket border
    doc.rect(50, 150, 495, 400)
       .stroke()

    // Ticket content
    let yPosition = 180

    // QR Code
    doc.image(qrCodeBuffer, 400, yPosition, { width: 120 })

    // Ticket information
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('予約ID:', 70, yPosition)
       .font('Helvetica')
       .text(uniqueId, 140, yPosition)

    yPosition += 30
    doc.font('Helvetica-Bold')
       .text('お名前:', 70, yPosition)
       .font('Helvetica')
       .text(`${formData.lastName} ${formData.firstName}`, 140, yPosition)

    yPosition += 30
    doc.font('Helvetica-Bold')
       .text('見学日:', 70, yPosition)
       .font('Helvetica')
       .text(new Date(formData.tourDate).toLocaleDateString('ja-JP', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         weekday: 'long'
       }), 140, yPosition)

    yPosition += 30
    doc.font('Helvetica-Bold')
       .text('参加人数:', 70, yPosition)
       .font('Helvetica')
       .text(`${formData.participantCount}名`, 140, yPosition)

    yPosition += 30
    doc.font('Helvetica-Bold')
       .text('所属機関:', 70, yPosition)
       .font('Helvetica')
       .text(formData.organization, 140, yPosition)

    yPosition += 50
    doc.fontSize(10)
       .font('Helvetica')
       .text('※当日受付にてこちらのチケットをご提示ください', 70, yPosition)

    // Footer
    doc.fontSize(8)
       .text('IVF学会 空の森クリニック見学ツアー事務局', 50, 750)
       .text('Email: ivf-sora-tour@azukikai.or.jp', 50, 765)

    doc.end()

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    throw error
  }
}