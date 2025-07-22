// lib/pdfGenerator.js
import PDFDocument from 'pdfkit'

export async function generateTicketPDFWithoutQR(uniqueId, formData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      })

      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })

      // PDFの内容を作成
      doc.fontSize(20).text('第23回日本生殖看護学会学術集会', { align: 'center' })
      doc.moveDown()
      doc.fontSize(16).text('空の森クリニック見学ツアー', { align: 'center' })
      doc.moveDown()
      doc.fontSize(14).text('電子チケット', { align: 'center' })
      doc.moveDown(2)

      // チケット情報
      doc.fontSize(12)
      doc.text(`予約ID: ${uniqueId}`, { align: 'left' })
      doc.moveDown()
      doc.text(`お名前: ${formData.lastName} ${formData.firstName}`, { align: 'left' })
      doc.moveDown()
      doc.text('見学日: 2025年10月13日（月）14:00〜', { align: 'left' })
      doc.moveDown()
      doc.text(`所属機関: ${formData.organization}`, { align: 'left' })
      doc.moveDown(2)

      // 注意事項
      doc.fontSize(10)
      doc.text('※当日は本チケットまたは予約IDをご提示ください', { align: 'center' })
      doc.text('※感染対策にご協力ください（マスク着用必須）', { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}