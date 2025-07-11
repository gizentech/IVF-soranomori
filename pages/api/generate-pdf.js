import { generateTicketPDF } from '../../lib/pdfGenerator'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, data } = req.body

    const pdfBuffer = await generateTicketPDF(uniqueId, data)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="ivf-sora-ticket-${uniqueId}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('PDF generation error:', error)
    res.status(500).json({ error: 'PDF generation failed' })
  }
}