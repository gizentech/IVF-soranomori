// pages/api/cancel.js
import { db } from '../../lib/firebase'
import { collection, doc, getDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

export default async function handler(req, res) {
  console.log('=== Cancel API Called ===')
  
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { uniqueId, reason } = req.body

    if (!uniqueId) {
      return res.status(400).json({ error: '予約IDが必要です' })
    }

    console.log('Cancelling reservation:', uniqueId)

    // registrationsコレクションから該当データを検索
    const registrationsQuery = collection(db, 'registrations')
    const registrationsSnapshot = await getDocs(registrationsQuery)
    
    let foundDoc = null
    let docRef = null

    registrationsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.uniqueId === uniqueId || data.groupId === uniqueId) {
        foundDoc = data
        docRef = doc.ref
      }
    })

    if (!foundDoc) {
      return res.status(404).json({ error: '該当する予約が見つかりません' })
    }

    // cancelledコレクションに移動
    const cancelData = {
      ...foundDoc,
      cancelledAt: serverTimestamp(),
      cancelReason: reason || '理由なし',
      originalId: docRef.id
    }

    await addDoc(collection(db, 'cancelled'), cancelData)
    await deleteDoc(docRef)

    console.log('Reservation cancelled successfully:', uniqueId)

    return res.status(200).json({
      success: true,
      message: 'キャンセルが完了しました',
      uniqueId
    })

  } catch (error) {
    console.error('Cancel error:', error)
    return res.status(500).json({
      error: 'キャンセル処理でエラーが発生しました',
      details: error.message
    })
  }
}