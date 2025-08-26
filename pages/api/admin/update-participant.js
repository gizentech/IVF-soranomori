// pages/api/admin/update-participant.js
import { db } from '../../../lib/firebase'
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore'

export default async function handler(req, res) {
  console.log('=== Update Participant API Called ===')

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { participantId, updates, eventType } = req.body

    if (!participantId || !updates || !eventType) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // ドキュメントが存在するか確認
    const docRef = doc(db, 'registrations', participantId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Participant not found' })
   }

   // 更新データを準備
   const updateData = {
     ...updates,
     updatedAt: serverTimestamp(),
     lastModifiedBy: 'admin'
   }

   // ドキュメントを更新
   await updateDoc(docRef, updateData)

   console.log(`Participant ${participantId} updated successfully`)

   return res.status(200).json({
     success: true,
     message: 'Participant updated successfully',
     participantId: participantId,
     timestamp: new Date().toISOString()
   })

 } catch (error) {
   console.error('Update participant error:', error)
   return res.status(500).json({
     success: false,
     error: 'Failed to update participant',
     message: error.message,
     timestamp: new Date().toISOString()
   })
 }
}