// pages/api/cancel.js
import { db } from '../../lib/firebase'
import { collection, doc, getDoc, addDoc, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'

export default async function handler(req, res) {
  console.log('=== Cancel API Called ===')
  console.log('Method:', req.method)
  console.log('Body:', req.body)
  
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

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

    // Firebase接続テスト
    if (!db) {
      throw new Error('Firebase database not initialized')
    }

    // registrationsコレクションから該当データを検索
    console.log('Searching for registration with uniqueId:', uniqueId)
    
    const registrationsQuery = query(
      collection(db, 'registrations'),
      where('uniqueId', '==', uniqueId)
    )
    
    const registrationsSnapshot = await getDocs(registrationsQuery)
    console.log('Found documents in registrations:', registrationsSnapshot.size)
    
    let foundDocs = []
    
    registrationsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log('Found document:', {
        id: doc.id,
        uniqueId: data.uniqueId,
        groupId: data.groupId,
        eventType: data.eventType
      })
      foundDocs.push({
        docRef: doc.ref,
        data: data
      })
    })

    // groupIdでも検索（ゴルフの場合）
    if (foundDocs.length === 0) {
      console.log('No documents found by uniqueId, trying groupId...')
      const groupQuery = query(
        collection(db, 'registrations'),
        where('groupId', '==', uniqueId)
      )
      
      const groupSnapshot = await getDocs(groupQuery)
      console.log('Found documents by groupId:', groupSnapshot.size)
      
      groupSnapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log('Found document by groupId:', {
          id: doc.id,
          uniqueId: data.uniqueId,
          groupId: data.groupId,
          eventType: data.eventType
        })
        foundDocs.push({
          docRef: doc.ref,
          data: data
        })
      })
    }

    if (foundDocs.length === 0) {
      return res.status(404).json({ 
        error: '該当する予約が見つかりません',
        searchedId: uniqueId 
      })
    }

    console.log(`Found ${foundDocs.length} documents to cancel`)

    // cancelledコレクションに移動
    const cancelPromises = foundDocs.map(async ({ docRef, data }) => {
      const cancelData = {
        ...data,
        cancelledAt: serverTimestamp(),
        cancelReason: reason || '理由なし',
        originalId: docRef.id,
        originalUniqueId: data.uniqueId
      }

      console.log('Moving document to cancelled collection:', {
        originalId: docRef.id,
        uniqueId: data.uniqueId
      })

      await addDoc(collection(db, 'cancelled'), cancelData)
      await deleteDoc(docRef)
    })

    await Promise.all(cancelPromises)

    console.log('Reservation cancelled successfully:', uniqueId)

    return res.status(200).json({
      success: true,
      message: 'キャンセルが完了しました',
      uniqueId,
      cancelledCount: foundDocs.length
    })

  } catch (error) {
    console.error('Cancel error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    })
    
    return res.status(500).json({
      error: 'キャンセル処理でエラーが発生しました',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}