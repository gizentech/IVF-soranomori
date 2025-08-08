// pages/api/admin/export.js
import { db } from '../../../lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

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

function getParticipationTypeLabel(participationType) {
  const labels = {
    'golf_and_party': 'ゴルフ＋懇親会（20,000円）',
    'golf_only': 'ゴルフのみ（12,000円）',
    'party_only': '懇親会のみ（8,000円）'
  }
  return labels[participationType] || participationType || ''
}

function getPositionLabel(position) {
  const labels = {
    'doctor': '医師',
    'nurse': '看護師',
    'embryologist': '胚培養士',
    'coordinator': '不妊カウンセラー',
    'technician': '臨床検査技師',
    'pharmacist': '薬剤師',
    'administrator': '事務・管理職',
    'student': '学生',
    'other': 'その他'
  }
  return labels[position] || position || ''
}

function getGolfExperienceLabel(exp) {
  const labels = {
    'beginner': '初心者（1年未満）',
    'intermediate': '中級者（1-5年）',
    'advanced': '上級者（5年以上）',
    'professional': 'プロ・セミプロ'
  }
  return labels[exp] || exp || ''
}

function getExperienceLabel(exp) {
  const labels = {
    'under1': '1年未満',
    '1-3': '1-3年',
    '3-5': '3-5年',
    '5-10': '5-10年',
    'over10': '10年以上'
  }
  return labels[exp] || exp || ''
}

function getAverageScoreLabel(score) {
  const labels = {
    'under80': '80台以下',
    '80s': '80台',
    '90s': '90台',
    '100s': '100台',
    'over110': '110以上',
    'unknown': 'わからない'
  }
  return labels[score] || score || ''
}

export default async function handler(req, res) {
  console.log('=== Export API Called ===')
  console.log('Method:', req.method)
  console.log('Query:', req.query)

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
    const { eventType } = req.query
    console.log('Event type:', eventType)

    if (!eventType) {
      return res.status(400).json({ error: 'eventType parameter is required' })
    }

    if (!['nursing', 'ivf', 'golf'].includes(eventType)) {
      return res.status(400).json({ error: 'Invalid eventType. Must be nursing, ivf, or golf' })
    }

    console.log('Fetching data for event type:', eventType)
    const allData = []

    // アクティブな予約データを取得
    try {
      console.log('Fetching active registrations...')
      const activeQuery = query(
        collection(db, 'registrations'),
        where('eventType', '==', eventType),
        where('status', '==', 'active')
      )
      const activeSnapshot = await getDocs(activeQuery)
      console.log(`Found ${activeSnapshot.size} active registrations`)

      activeSnapshot.docs.forEach(doc => {
        const data = doc.data()
        allData.push({ ...data, documentStatus: 'アクティブ' })
      })
    } catch (error) {
      console.error('Error fetching active registrations:', error)
    }

    // キャンセルデータを取得
    try {
      console.log('Fetching cancelled registrations...')
      const cancelledQuery = query(
        collection(db, 'cancelled'),
        where('eventType', '==', eventType)
      )
      const cancelledSnapshot = await getDocs(cancelledQuery)
      console.log(`Found ${cancelledSnapshot.size} cancelled registrations`)

      cancelledSnapshot.docs.forEach(doc => {
        const data = doc.data()
        allData.push({ 
          ...data, 
          documentStatus: 'キャンセル',
          cancelledAt: formatTimestamp(data.cancelledAt),
          cancelReason: data.cancelReason || ''
        })
      })
    } catch (error) {
      console.error('Error fetching cancelled registrations:', error)
    }

    // 定員超過データを取得
    try {
      console.log('Fetching over capacity registrations...')
      const overCapacityQuery = query(
        collection(db, 'over_capacity'),
        where('eventType', '==', eventType)
      )
      const overCapacitySnapshot = await getDocs(overCapacityQuery)
      console.log(`Found ${overCapacitySnapshot.size} over capacity registrations`)

      overCapacitySnapshot.docs.forEach(doc => {
        const data = doc.data()
        allData.push({ ...data, documentStatus: '定員超過' })
      })
    } catch (error) {
      console.error('Error fetching over capacity registrations:', error)
    }

    console.log(`Total data count: ${allData.length}`)

    if (allData.length === 0) {
      // データが0件でもCSVは生成する
      console.log('No data found, generating empty CSV')
    }

    // CSVヘッダーとデータを作成
    let headers = []
    let rows = []

    if (eventType === 'nursing') {
      headers = [
        '状態', '予約ID', '申込日時', '姓', '名', '姓（カナ）', '名（カナ）',
        'メールアドレス', '電話番号', '所属機関', '職種・役職', '特別な配慮事項',
        'キャンセル日時', 'キャンセル理由'
      ]
      
      rows = allData.map(data => [
        data.documentStatus || '',
        data.uniqueId || '',
        formatTimestamp(data.createdAt),
        data.lastName || '',
        data.firstName || '',
        data.lastNameKana || '',
        data.firstNameKana || '',
        data.email || '',
        data.phone || '',
        data.organization || '',
        data.position || '',
        data.specialRequests || '',
        data.cancelledAt || '',
        data.cancelReason || ''
      ])
    } else if (eventType === 'ivf') {
      headers = [
        '状態', '予約ID', '申込日時', '希望時間帯', '姓', '名', '姓（カナ）', '名（カナ）',
        'メールアドレス', '電話番号', '所属機関', '職種・役職', '経験年数', '関心分野',
        '特別な配慮事項', 'キャンセル日時', 'キャンセル理由'
      ]
      
      rows = allData.map(data => [
        data.documentStatus || '',
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
        getPositionLabel(data.position),
        getExperienceLabel(data.experience),
        formatArrayField(data.interests),
        data.specialRequests || '',
        data.cancelledAt || '',
        data.cancelReason || ''
      ])
    } else if (eventType === 'golf') {
      headers = [
        '状態', '予約ID', '申込日時', '姓', '名', '姓（カナ）', '名（カナ）',
        'メールアドレス', '電話番号', '所属機関', '役職', 'ゴルフ経験', '平均スコア',
        '参加形態', '食事制限・アレルギー', 'その他要望', 'キャンセル日時', 'キャンセル理由'
      ]
      
      rows = allData.map(data => [
        data.documentStatus || '',
        data.uniqueId || '',
        formatTimestamp(data.createdAt),
        data.lastName || '',
        data.firstName || '',
        data.lastNameKana || '',
        data.firstNameKana || '',
        data.email || '',
        data.phone || '',
        data.organization || '',
        data.position || '',
        getGolfExperienceLabel(data.golfExperience),
        getAverageScoreLabel(data.averageScore),
        getParticipationTypeLabel(data.participationType),
        data.dietaryRestrictions || '',
        data.specialRequests || '',
        data.cancelledAt || '',
        data.cancelReason || ''
      ])
    }

    console.log(`CSV headers: ${headers.length} columns`)
    console.log(`CSV rows: ${rows.length} rows`)

    // CSV形式に変換
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => {
        // フィールドをエスケープ
        const fieldStr = String(field || '').replace(/"/g, '""')
        return `"${fieldStr}"`
      }).join(','))
      .join('\n')

    // BOMを追加（Excelで文字化けを防ぐ）
    const csvWithBOM = '\uFEFF' + csvContent

    console.log('CSV generated successfully, setting headers...')

    // レスポンスヘッダーを設定
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${eventType}_registrations_${new Date().toISOString().split('T')[0]}.csv"`)
    res.setHeader('Content-Length', Buffer.byteLength(csvWithBOM, 'utf8'))
    
    console.log('Sending CSV response...')
    res.status(200).send(csvWithBOM)

  } catch (error) {
    console.error('CSV export error:', error)
    console.error('Error stack:', error.stack)
    
    // エラー発生時はJSONで返す
    res.status(500).json({ 
      error: 'CSV出力に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}