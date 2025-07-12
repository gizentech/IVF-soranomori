import PDFDocument from 'pdfkit'

export async function generateTicketPDF(uniqueId, formData) {
  try {
    const QRCode = await import('qrcode')
    const qrCodeDataUrl = await QRCode.toDataURL(uniqueId, { width: 120 })
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64')

    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: 'Dai 23 Kai Nihon Seishoku Kango Gakkai - Kengaku Tour Chiketto',
        Author: 'Dai 23 Kai Nihon Seishoku Kango Gakkai',
        Subject: 'Kengaku Tour Denshi Chiketto'
      }
    })
    
    const buffers = []
    doc.on('data', buffers.push.bind(buffers))

    // ヘッダー部分（背景色）
    doc.rect(0, 0, doc.page.width, 120)
       .fill('#00104d')

    // タイトル（標準フォントのみ使用）
    doc.fillColor('white')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Dai 23 Kai Nihon Seishoku Kango Gakkai', 50, 25, { align: 'center' })
       .fontSize(16)
       .text('Sora no Mori Clinic Kengaku Tour', 50, 50, { align: 'center' })
       .fontSize(14)
       .text('Denshi Chiketto (Electronic Ticket)', 50, 75, { align: 'center' })

    // 本文
    doc.fillColor('black')

    // チケット枠
    doc.rect(50, 150, 495, 380)
       .stroke('#00104d', 2)

    // チケット背景
    doc.rect(52, 152, 491, 376)
       .fill('#f8f9fa')

    // QRコード
    doc.image(qrCodeBuffer, 400, 170, { width: 120 })

    // チケット情報
    let yPosition = 180

    // 予約ID
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#00104d')
       .text('Yoyaku ID (Reservation ID):', 70, yPosition)
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#059669')
       .text(uniqueId, 70, yPosition + 20)

    yPosition += 50

    // 名前
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#00104d')
       .text('Onamae (Name):', 70, yPosition)
    doc.fontSize(15)
       .font('Helvetica')
       .fillColor('#374151')
       .text(`${formData.lastName || ''} ${formData.firstName || ''}`, 70, yPosition + 20)

    yPosition += 50

    // 見学日
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#00104d')
       .text('Kengaku-bi (Tour Date):', 70, yPosition)
    doc.fontSize(15)
       .font('Helvetica')
       .fillColor('#374151')
       .text('2025-nen 10-gatsu 13-nichi (Getsu)', 70, yPosition + 20)
       .text('October 13, 2025 (Monday) 14:00-15:00', 70, yPosition + 35)

    yPosition += 70

    // 所属機関
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#00104d')
       .text('Shozoku Kikan (Organization):', 70, yPosition)
    doc.fontSize(13)
       .font('Helvetica')
       .fillColor('#374151')
       .text(formData.organization || '', 70, yPosition + 20, { 
         width: 280, 
         height: 40,
         ellipsis: true 
       })

    // 注意事項
    yPosition += 80
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#dc2626')
       .text('Tojitsu no Goannai (Instructions for the Day):', 70, yPosition)
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('• Uketsuke nite kochira no chiketto wo goteiji kudasai', 70, yPosition + 18)
       .text('  (Please present this ticket at reception)', 70, yPosition + 30)
       .text('• Masuku chakuyo wo onegaishimasu', 70, yPosition + 45)
       .text('  (Please wear a mask)', 70, yPosition + 57)
       .text('• Ugokiyasui fukusou de okoshi kudasai', 70, yPosition + 72)
       .text('  (Please wear comfortable clothing)', 70, yPosition + 84)

    // フッター
    doc.rect(50, 450, 495, 70)
       .fill('#f1f5f9')
       .stroke('#e2e8f0', 1)

    doc.fontSize(10)
       .fillColor('#475569')
       .font('Helvetica-Bold')
       .text('Dai 23 Kai Nihon Seishoku Kango Gakkai', 60, 465)
       .text('Sora no Mori Clinic Kengaku Tour Jimukyoku', 60, 480)
       .font('Helvetica')
       .text('Email: ivf-sora-tour@azukikai.or.jp', 60, 495)

    // デザイン要素
    doc.circle(530, 160, 15).fill('#3b82f6')
    doc.circle(60, 440, 10).fill('#10b981')

    doc.end()

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers))
      })
      doc.on('error', reject)
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    throw error
  }
}