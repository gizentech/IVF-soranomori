// pages/golf.js (ゴルフコンペ用)
import { useState, useEffect } from 'react'
import GuidePage from '../components/GuidePage'
import ApplicationForm from '../components/ApplicationForm'
import ConfirmationForm from '../components/ConfirmationForm'
import CompletionPage from '../components/CompletionPage'
import CancelForm from '../components/CancelForm'

export default function GolfCompetition() {
  const [currentPage, setCurrentPage] = useState('guide')
  const [formData, setFormData] = useState({})
  const [uniqueId, setUniqueId] = useState('')

  const eventConfig = {
    type: 'golf',
    title: '第28回日本IVF学会学術集会杯',
    subtitle: 'ゴルフコンペ',
    date: '2025年10月10日（金）',
    startTime: '7:28スタート',
    gatherTime: '7:00集合',
    location: '那覇ゴルフ倶楽部',
    address: '沖縄県島尻郡八重瀬町字富盛2270',
    capacity: 16,
    playFee: '12,000円',
    partyFee: '8,000円',
    competitionStyle: 'ペリア方式',
    organizer: '德永義光',
    contact: '098-998-0011（湧川・狩俣）',
    cancelDeadline: '2025年9月10日'
  }

  // 同様の実装...

  return (
    <div className="app-container">
      {/* 同様の構造 */}
    </div>
  )
}