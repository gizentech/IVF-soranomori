// pages/api/admin/export-all.js
import { db } from '../../../lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  } catch (error) {
    console.error('Timestamp format error:', error)
    return ''
  }
}

function formatArrayField(field) {
  if (Array.isArray(field)) {
    return field.join('、')
  }
  return field || ''
}

export default async function handler(req, res) {
  console.log('=== Export All API Called ===')
  console.log('Method:', req.method)

  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Fetching all data from all collections...')
    const allData = []

    // 全コレクションからデータを取得
    const collections = [
      { name: 'registrations', status: 'アクティブ' },
      { name: 'cancelled', status: 'キャンセル' },
      { name: 'over_capacity', status: '定員超過' }
    ]
    
    for (const collectionInfo of collections) {
      try {
        console.log(`Fetching from ${collectionInfo.name} collection...`)
        const snapshot = await getDocs(collection(db, collectionInfo.name))
        console.log(`Found ${snapshot.size} documents in ${collectionInfo.name}`)
        
        snapshot.docs.forEach(doc => {
          const data = doc.data()
          allData.push({
            ...data,
            documentStatus: collectionInfo.status,
            cancelledAt: data.cancelledAt ? formatTimestamp(data.cancelledAt) : '',
            cancelReason: data.cancelReason || ''
          })
        })
      } catch (error) {
        console.error(`Error fetching from ${collectionInfo.name}:`, error)
      }
    }

    console.log(`Total documents fetched: ${allData.length}`)

    // CSVヘッダー（全フィールド）
    const headers = [
      '状態', 'イベント種別', '予約ID', '申込日時', '希望時間帯', '姓', '名', 
      '姓（カナ）', '名（カナ）', 'メールアドレス', '電話番号', '所属機関', 
      '職種・役職', '経験年数', '関心分野', 'ゴルフ経験', '平均スコア', 
      '参加形態', '食事制限・アレルギー', '特別な配慮事項', 
      'キャンセル日時', 'キャンセル理由'
    ]

    const rows = allData.map(data => [
      data.documentStatus || '',
      data.eventType || '',
      data.uniqueId || '',
      formatTimestamp(data.createdAt),
      data.selectedTimeSlot || '',
      data.lastName || '',
      data.firstName || '',
      data.lastNameKana || '',
      data.firstNameKana || '',
      data.email || '',
      data.phone || '',
      data.organization || '',
      data.position || '',
      data.experience || '',
      formatArrayField(data.interests),
      data.golfExperience || '',
      data.averageScore || '',
      data.participationType || '',
      data.dietaryRestrictions || '',
      data.specialRequests || '',
      data.cancelledAt || '',
      data.cancelReason || ''
    ])

    console.log(`CSV headers: ${headers.length} columns`)
    console.log(`CSV rows: ${rows.length} rows`)

    // CSV形式に変換
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => {
        const fieldStr = String(field || '').replace(/"/g, '""')
        return `"${fieldStr}"`
      }).join(','))
      .join('\n')

    // BOMを追加
    const csvWithBOM = '\uFEFF' + csvContent

    console.log('All data CSV generated successfully')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="all_registrations_${new Date().toISOString().split('T')[0]}.csv"`)
    res.setHeader('Content-Length', Buffer.byteLength(csvWithBOM, 'utf8'))
    
    res.status(200).send(csvWithBOM)

  } catch (error) {
    console.error('All data export error:', error)
    console.error('Error stack:', error.stack)
    
    res.status(500).json({ 
      error: 'CSV出力に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}