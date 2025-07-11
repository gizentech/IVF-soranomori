import nodemailer from 'nodemailer'
import { generateTicketPDF } from '../../lib/pdfGenerator'

const transporter = nodemailer.createTransporter({
  host: 'soranomori-o.sakura.ne.jp',
  port: 587,
  secure: false,
  auth: {
    user: 'ivf-sora-tour@azukikai.or.jp',
    pass: 'sora2025dx'
  }
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, uniqueId, formData } = req.body

    // Generate PDF ticket
    const pdfBuffer = await generateTicketPDF(uniqueId, formData)

    const mailOptions = {
      from: 'ivf-sora-tour@azukikai.or.jp',
      to: email,
      subject: '【IVF学会】空の森クリニック見学ツアー 申し込み完了のお知らせ',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">IVF学会 空の森クリニック見学ツアー</h2>
          <h3 style="color: #27ae60;">お申し込み完了のお知らせ</h3>
          
          <p>${formData.lastName} ${formData.firstName} 様</p>
          
          <p>この度は、IVF学会 空の森クリニック見学ツアーにお申し込みいただき、誠にありがとうございます。</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #2c3e50;">予約内容</h4>
            <p><strong>予約ID:</strong> ${uniqueId}</p>
            <p><strong>お名前:</strong> ${formData.lastName} ${formData.firstName}</p>
            <p><strong>見学日:</strong> ${new Date(formData.tourDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}</p>
            <p><strong>参加人数:</strong> ${formData.participantCount}名</p>
            <p><strong>所属機関:</strong> ${formData.organization}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">当日のご案内</h4>
            <ul style="padding-left: 20px;">
              <li>開始時間の10分前にはお越しください</li>
              <li>添付の電子チケットを受付にてご提示ください</li>
              <li>感染対策にご協力をお願いいたします</li>
              <li>動きやすい服装でお越しください</li>
            </ul>
          </div>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #721c24;">キャンセルについて</h4>
            <p>やむを得ずキャンセルされる場合は、申し込みサイトのキャンセルフォームよりお手続きください。</p>
          </div>
          
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          <p>当日お会いできますことを楽しみにしております。</p>
          
          <hr style="margin: 30px 0;">
          
          <div style="color: #6c757d; font-size: 14px;">
            <p><strong>IVF学会 空の森クリニック見学ツアー事務局</strong></p>
            <p>Email: ivf-sora-tour@azukikai.or.jp</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `ivf-sora-ticket-${uniqueId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }

    await transporter.sendMail(mailOptions)

    res.status(200).json({ message: 'Email sent successfully' })
  } catch (error) {
    console.error('Email sending error:', error)
    res.status(500).json({ error: 'Failed to send email' })
  }
}