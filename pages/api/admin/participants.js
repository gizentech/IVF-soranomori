// pages/api/admin/participants.js
import { db } from '../../../lib/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'

export default async function handler(req, res) {
  console.log('=== Participants API Called ===')

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { eventType, timeSlot, status = 'active' } = req.query

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' })
    }

    let participants = []

    // メインの registrations コレクションから取得
    let mainQuery = query(
      collection(db, 'registrations'),
      where('eventType', '==', eventType)
    )

    if (status === 'active') {
      mainQuery = query(mainQuery, where('status', '==', 'active'))
    }

    if (eventType === 'ivf' && timeSlot) {
      mainQuery = query(mainQuery, where('selectedTimeSlot', '==', timeSlot))
    }

    const snapshot = await getDocs(mainQuery)
    
    snapshot.docs.forEach(docRef => {
      const data = docRef.data()
      participants.push({
        id: docRef.id,
        ...data,
        source: 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      })
    })

    // キャンセルされた参加者も含める場合
    if (status === 'all' || status === 'cancelled') {
      try {
        const cancelledQuery = query(
          collection(db, 'cancelled'),
          where('eventType', '==', eventType)
        )
        const cancelledSnapshot = await getDocs(cancelledQuery)
        
        cancelledSnapshot.docs.forEach(docRef => {
          const data = docRef.data()
          participants.push({
            id: docRef.id,
            ...data,
            source: 'cancelled',
            status: 'cancelled',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || data.cancelledAt
          })
        })
      } catch (error) {
        console.error('Error fetching cancelled participants:', error)
      }
    }

    // 定員超過も含める場合
    if (status === 'all' || status === 'over_capacity') {
      try {
        const overCapacityQuery = query(
          collection(db, 'over_capacity'),
          where('eventType', '==', eventType)
        )
        const overCapacitySnapshot = await getDocs(overCapacityQuery)
        
        overCapacitySnapshot.docs.forEach(docRef => {
          const data = docRef.data()
          participants.push({
            id: docRef.id,
            ...data,
            source: 'over_capacity',
            status: 'over_capacity',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
          })
        })
      } catch (error) {
        console.error('Error fetching over capacity participants:', error)
      }
    }

    // 参加者をソート（作成日時順）
    participants.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      return dateA - dateB
    })

    // ゴルフの場合はグループごとに整理
    if (eventType === 'golf') {
      const groups = {}
      participants.forEach(participant => {
        const groupId = participant.groupId || participant.uniqueId
        if (!groups[groupId]) {
          groups[groupId] = []
        }
        groups[groupId].push(participant)
      })

      // グループ内でparticipantNumberでソート
      Object.keys(groups).forEach(groupId => {
        groups[groupId].sort((a, b) => (a.participantNumber || 1) - (b.participantNumber || 1))
      })

      const sortedParticipants = []
      Object.keys(groups).forEach(groupId => {
        sortedParticipants.push(...groups[groupId])
      })

      participants = sortedParticipants
    }

    return res.status(200).json({
      success: true,
      eventType,
      timeSlot: timeSlot || null,
      totalCount: participants.length,
      participants: participants,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Participants API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch participants',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}