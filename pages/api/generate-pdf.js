import { updateDesignSheetAndGeneratePDF, clearDesignSheet, exportSheetAsPDF } from '../../lib/googleSheets'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, data } = req.body

    console.log('Starting PDF generation process for download...')
    console.log('Unique ID:', uniqueId)
    console.log('Form data:', data)

    if (!uniqueId || !data) {
      return res.status(400).json({ error: 'Missing required data' })
    }

    // 1. designシートに値を設定（QR関連削除）
    console.log('Updating design sheet...')
    await updateDesignSheetAndGeneratePDF(uniqueId, data)

    // 2. 少し待機してからPDF生成（Google Sheetsの更新を待つ）
    console.log('Waiting for sheet update...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 3. Google SheetsのdesignシートからPDFを生成
    console.log('Generating PDF from design sheet...')
    const pdfBuffer = await exportSheetAsPDF('design')

    // 4. designシートをクリア
    console.log('Clearing design sheet...')
    await clearDesignSheet()

    console.log('PDF generation completed successfully for download')

    // PDFファイルとしてレスポンス
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="ivf-sora-ticket-${uniqueId}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('PDF generation error:', error)
    console.error('Error stack:', error.stack)
    
    // エラーが発生してもdesignシートをクリア
    try {
      await clearDesignSheet()
      console.log('Design sheet cleared after error')
    } catch (clearError) {
      console.error('Design sheet clear error:', clearError)
    }
    
    res.status(500).json({ error: 'PDF generation failed: ' + error.message })
  }
}