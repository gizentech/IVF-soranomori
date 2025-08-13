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

    let foundDocs = []

    // 1. uniqueIdで直接検索（代表者など）
    console.log('Searching for registration with uniqueId:', uniqueId)
    const uniqueIdQuery = query(
      collection(db, 'registrations'),
      where('uniqueId', '==', uniqueId)
    )
    const uniqueIdSnapshot = await getDocs(uniqueIdQuery)
    console.log('Found documents by uniqueId:', uniqueIdSnapshot.size)
    
    uniqueIdSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log('Found document by uniqueId:', {
        id: doc.id,
        uniqueId: data.uniqueId,
        groupId: data.groupId,
        eventType: data.eventType,
        isRepresentative: data.isRepresentative
      })
      foundDocs.push({
        docRef: doc.ref,
        data: data
      })
    })

    // 2. groupIdで検索（ゴルフの場合、同じグループの全参加者）
    console.log('Searching for registration with groupId:', uniqueId)
    const groupIdQuery = query(
      collection(db, 'registrations'),
      where('groupId', '==', uniqueId)
    )
    const groupIdSnapshot = await getDocs(groupIdQuery)
    console.log('Found documents by groupId:', groupIdSnapshot.size)
    
    groupIdSnapshot.docs.forEach(doc => {
      const data = doc.data()
      // 重複チェック：既に追加されていないかチェック
      const alreadyExists = foundDocs.some(existing => existing.docRef.id === doc.id)
      if (!alreadyExists) {
        console.log('Found additional document by groupId:', {
          id: doc.id,
          uniqueId: data.uniqueId,
          groupId: data.groupId,
          eventType: data.eventType,
          isRepresentative: data.isRepresentative,
          participantNumber: data.participantNumber
        })
        foundDocs.push({
          docRef: doc.ref,
          data: data
        })
      }
    })

    // 3. 部分的なuniqueIdで検索（例：IVF-GOLF123456-P2 など）
    const baseId = uniqueId.replace(/-P\d+$/, '') // -P2, -P3などを除去
    if (baseId !== uniqueId) {
      console.log('Searching for related documents with baseId:', baseId)
      const baseIdQuery = query(
        collection(db, 'registrations'),
        where('groupId', '==', baseId)
      )
      const baseIdSnapshot = await getDocs(baseIdQuery)
      console.log('Found documents by baseId:', baseIdSnapshot.size)
      
      baseIdSnapshot.docs.forEach(doc => {
        const data = doc.data()
        const alreadyExists = foundDocs.some(existing => existing.docRef.id === doc.id)
        if (!alreadyExists) {
          console.log('Found additional document by baseId:', {
            id: doc.id,
            uniqueId: data.uniqueId,
            groupId: data.groupId,
            participantNumber: data.participantNumber
          })
          foundDocs.push({
            docRef: doc.ref,
            data: data
          })
        }
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
        uniqueId: data.uniqueId,
        groupId: data.groupId,
        participantNumber: data.participantNumber,
        isRepresentative: data.isRepresentative
      })

      await addDoc(collection(db, 'cancelled'), cancelData)
      await deleteDoc(docRef)
    })

    await Promise.all(cancelPromises)

    console.log('Reservation cancelled successfully:', uniqueId)
    console.log('Total cancelled documents:', foundDocs.length)

    return res.status(200).json({
      success: true,
      message: 'キャンセルが完了しました',
      uniqueId,
      cancelledCount: foundDocs.length,
      details: foundDocs.map(doc => ({
        uniqueId: doc.data.uniqueId,
        groupId: doc.data.groupId,
        participantNumber: doc.data.participantNumber,
        isRepresentative: doc.data.isRepresentative
      }))
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