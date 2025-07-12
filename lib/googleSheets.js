import { updateDesignSheetAndGeneratePDF, clearDesignSheet, exportSheetAsPDF } from '../../lib/googleSheets'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, data } = req.body

    console.log('Starting PDF generation process...')

    // 1. designシートに値を設定
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

    console.log('PDF generation completed successfully')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="ivf-sora-ticket-${uniqueId}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('PDF generation error:', error)
    
    // エラーが発生してもdesignシートをクリア
    try {
      await clearDesignSheet()
    } catch (clearError) {
      console.error('Design sheet clear error:', clearError)
    }
    
    res.status(500).json({ error: 'PDF generation failed: ' + error.message })
  }
}