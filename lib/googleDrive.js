import { google } from 'googleapis'

export async function uploadToGoogleDrive(fileName, buffer, mimeType) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    const drive = google.drive({ version: 'v3', auth })
    const folderId = '1avMG3iuZky9nIu2clWynbJKbuhib4Zs4'

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    }

    const media = {
      mimeType: mimeType,
      body: buffer,
    }

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    })

    return response.data.id
  } catch (error) {
    console.error('Google Drive upload error:', error)
    throw error
  }
}