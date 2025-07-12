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
        Title: '第23回日本生殖看護学会学術集会 - 空の森クリニック見学ツアー',
        Author: '第23回日本生殖看護学会学術集会',
        Subject: '見学ツアー 電子チケット'
      }
    })
    
    const buffers = []
    doc.on('data', buffers.push.bind(buffers))

    // ヘッダー部分（空の森クリニック仕様の緑系）
    doc.rect(0, 0, doc.page.width, 140)
       .fill('#2d5016')

    // タイトル
    doc.fillColor('white')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('第23回日本生殖看護学会学術集会', 50, 30, { align: 'center' })
       .fontSize(18)
       .text('空の森クリニック見学ツアー', 50, 55, { align: 'center' })
       .fontSize(16)
       .text('電子チケット (Electronic Ticket)', 50, 80, { align: 'center' })
       .fontSize(14)
       .text('2025年10月13日（月）14:00〜', 50, 105, { align: 'center' })

    // 本文
    doc.fillColor('black')

    // チケット枠
    doc.rect(50, 170, 495, 400)
       .stroke('#2d5016', 3)

    // チケット背景
    doc.rect(53, 173, 489, 394)
       .fill('#f8fffe')

    // QRコード
    doc.image(qrCodeBuffer, 420, 190, { width: 100 })

    // チケット情報
    let yPosition = 200

    // 予約ID
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('予約ID (Reservation ID):', 70, yPosition)
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#4a7c59')
       .text(uniqueId, 70, yPosition + 25)

    yPosition += 65

    // 名前
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('お名前 (Name):', 70, yPosition)
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#333')
       .text(`${formData.lastName || ''} ${formData.firstName || ''}`, 70, yPosition + 25)

    yPosition += 65

    // 見学日
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('見学日 (Tour Date):', 70, yPosition)
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#333')
       .text('2025年10月13日（月）14:00〜', 70, yPosition + 25)
       .text('October 13, 2025 (Monday) 14:00-15:00', 70, yPosition + 45)

    yPosition += 85

    // 所属機関
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('所属機関 (Organization):', 70, yPosition)
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#333')
       .text(formData.organization || '', 70, yPosition + 25, { 
         width: 300, 
         height: 60,
         ellipsis: true 
       })

    // 注意事項
    yPosition += 100
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#856404')
       .text('当日のご案内 (Instructions for the Day):', 70, yPosition)
    
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#856404')
       .text('• 受付にてこちらのチケットをご提示ください', 70, yPosition + 20)
       .text('  (Please present this ticket at reception)', 75, yPosition + 35)
       .text('• マスク着用をお願いいたします', 70, yPosition + 55)
       .text('  (Please wear a mask)', 75, yPosition + 70)
       .text('• 動きやすい服装でお越しください', 70, yPosition + 90)
       .text('  (Please wear comfortable clothing)', 75, yPosition + 105)

    // フッター
    doc.rect(50, 480, 495, 80)
       .fill('#e8f5e8')
       .stroke('#4a7c59', 1)

    doc.fontSize(12)
       .fillColor('#2d5016')
       .font('Helvetica-Bold')
       .text('第23回日本生殖看護学会学術集会', 60, 500)
       .text('空の森クリニック見学ツアー 事務局', 60, 520)
       .font('Helvetica')
       .fontSize(10)
       .text('Email: ivf-sora-tour@azukikai.or.jp / TEL: 098-998-0011', 60, 540)

    // デザイン要素（自然をモチーフにした装飾）
    doc.circle(520, 180, 12).fill('#4a7c59')
    doc.circle(60, 460, 8).fill('#6b9b73')

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

// QRコードなしのPDF生成関数
export async function generateTicketPDFWithoutQR(uniqueId, formData) {
  try {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: '第23回日本生殖看護学会学術集会 - 空の森クリニック見学ツアー',
        Author: '第23回日本生殖看護学会学術集会',
        Subject: '見学ツアー 電子チケット'
      }
    })
    
    const buffers = []
    doc.on('data', buffers.push.bind(buffers))

    // ヘッダー部分（空の森クリニック仕様の緑系）
    doc.rect(0, 0, doc.page.width, 140)
       .fill('#2d5016')

    // タイトル
    doc.fillColor('white')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('第23回日本生殖看護学会学術集会', 50, 30, { align: 'center' })
       .fontSize(18)
       .text('空の森クリニック見学ツアー', 50, 55, { align: 'center' })
       .fontSize(16)
       .text('電子チケット (Electronic Ticket)', 50, 80, { align: 'center' })
       .fontSize(14)
       .text('2025年10月13日（月）14:00〜', 50, 105, { align: 'center' })

    // 本文
    doc.fillColor('black')

    // チケット枠
    doc.rect(50, 170, 495, 400)
       .stroke('#2d5016', 3)

    // チケット背景
    doc.rect(53, 173, 489, 394)
       .fill('#f8fffe')

    // チケット情報（QRコードエリアを削除して中央配置）
    let yPosition = 220

    // 予約ID
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('予約ID (Reservation ID):', 70, yPosition, { align: 'center', width: 450 })
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#4a7c59')
       .text(uniqueId, 70, yPosition + 30, { align: 'center', width: 450 })

    yPosition += 80

    // 名前
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('お名前 (Name):', 70, yPosition, { align: 'center', width: 450 })
    doc.fontSize(18)
       .font('Helvetica')
       .fillColor('#333')
       .text(`${formData.lastName || ''} ${formData.firstName || ''}`, 70, yPosition + 30, { align: 'center', width: 450 })

    yPosition += 80

    // 見学日
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('見学日 (Tour Date):', 70, yPosition, { align: 'center', width: 450 })
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#333')
       .text('2025年10月13日（月）14:00〜', 70, yPosition + 30, { align: 'center', width: 450 })
       .text('October 13, 2025 (Monday) 14:00-15:00', 70, yPosition + 50, { align: 'center', width: 450 })

    yPosition += 90

    // 所属機関
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2d5016')
       .text('所属機関 (Organization):', 70, yPosition, { align: 'center', width: 450 })
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#333')
       .text(formData.organization || '', 70, yPosition + 30, { 
         align: 'center',
         width: 450,
         height: 60,
         ellipsis: true 
       })

    // フッター
    doc.rect(50, 480, 495, 80)
       .fill('#e8f5e8')
       .stroke('#4a7c59', 1)

    doc.fontSize(12)
       .fillColor('#2d5016')
       .font('Helvetica-Bold')
       .text('第23回日本生殖看護学会学術集会', 60, 500)
       .text('空の森クリニック見学ツアー 事務局', 60, 520)
       .font('Helvetica')
       .fontSize(10)
       .text('Email: ivf-sora-tour@azukikai.or.jp / TEL: 098-998-0011', 60, 540)

    // デザイン要素（自然をモチーフにした装飾）
    doc.circle(520, 180, 12).fill('#4a7c59')
    doc.circle(60, 460, 8).fill('#6b9b73')

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