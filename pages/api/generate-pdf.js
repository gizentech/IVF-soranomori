import { updateDesignSheetAndGeneratePDF, clearDesignSheet, exportSheetAsPDF } from '../../lib/googleSheets'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, data } = req.body

    console.log('ダウンロード用PDF生成プロセスを開始...')
    console.log('ユニークID:', uniqueId)
    console.log('フォームデータ:', data)

    if (!uniqueId || !data) {
      return res.status(400).json({ error: '必要なデータが不足しています' })
    }

    // デザインシートに値を設定
    console.log('デザインシートを更新中...')
    await updateDesignSheetAndGeneratePDF(uniqueId, data)

    // シート更新の待機時間を延長
    console.log('シート更新の完了を待機中...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Google SheetsのデザインシートからPDFを生成
    console.log('デザインシートからPDFを生成中...')
    const pdfBuffer = await exportSheetAsPDF('design')

    // デザインシートをクリア
    console.log('デザインシートをクリア中...')
    await clearDesignSheet()

    console.log('ダウンロード用PDF生成が正常に完了しました')

    // PDFファイルとしてレスポンス
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="ivf-sora-ticket-${uniqueId}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('PDF生成エラー:', error)
    console.error('エラースタック:', error.stack)
    
    // エラーが発生してもデザインシートをクリア
    try {
      await clearDesignSheet()
      console.log('エラー後にデザインシートをクリアしました')
    } catch (clearError) {
      console.error('デザインシートクリアエラー:', clearError)
    }
    
    res.status(500).json({ error: 'PDF生成に失敗しました: ' + error.message })
  }
}