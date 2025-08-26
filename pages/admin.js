// pages/admin.js（削除機能を除去した版）
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../styles/Admin.module.css'
import { Analytics } from '@vercel/analytics/next'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState({})
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventDetails, setEventDetails] = useState(null)
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [editForm, setEditForm] = useState({})
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

const handleLogin = async (e) => {
  e.preventDefault()
  if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    setIsAuthenticated(true)
    setError('')
  } else {
    setError('パスワードが正しくありません')
    setPassword('')
  }
}


  const fetchStats = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Stats API Error - HTTP ${response.status}: ${errorText.substring(0, 200)}`)
      }
      
      const data = await response.json()
      setStats(data)
      
    } catch (error) {
      console.error('Stats fetch error:', error)
      setError('データの取得に失敗しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchEventDetails = async (eventType, timeSlot = null) => {
    setLoading(true)
    try {
      let url = `/api/admin/participants?eventType=${eventType}`
      if (timeSlot) {
        url += `&timeSlot=${encodeURIComponent(timeSlot)}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEventDetails(data)
        setSelectedEvent({ eventType, timeSlot })
      } else {
        const error = await response.json()
        setError('参加者データの取得に失敗しました: ' + error.message)
      }
    } catch (error) {
      setError('参加者データの取得でエラーが発生しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditParticipant = (participant) => {
    setEditingParticipant(participant.id)
    setEditForm({
      lastName: participant.lastName || '',
      firstName: participant.firstName || '',
      lastNameKana: participant.lastNameKana || '',
      firstNameKana: participant.firstNameKana || '',
      email: participant.email || '',
      phone: participant.phone || '',
      organization: participant.organization || '',
      selectedTimeSlot: participant.selectedTimeSlot || '',
      specialRequests: participant.specialRequests || ''
    })
  }

  const handleSaveEdit = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/update-participant', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: editingParticipant,
          updates: editForm,
          eventType: selectedEvent.eventType
        })
      })

      if (response.ok) {
        setEditingParticipant(null)
        setEditForm({})
        // データを再取得
        await fetchEventDetails(selectedEvent.eventType, selectedEvent.timeSlot)
      } else {
        const error = await response.json()
        setError('更新に失敗しました: ' + error.message)
      }
    } catch (error) {
      setError('更新でエラーが発生しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 削除機能を削除（この関数は使用しない）
  // const handleDeleteParticipant = async (participantId) => { ... }

  const downloadCSV = async (eventType) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/export?eventType=${eventType}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${eventType}_registrations_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        const error = await response.json()
        setError('CSV出力に失敗しました: ' + error.message)
      }
    } catch (error) {
      setError('CSV出力でエラーが発生しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (eventType) => {
    if (!stats || !stats[eventType]) return '#ccc'
    
    const { active, capacity } = stats[eventType]
    const ratio = active / capacity
    
    if (ratio >= 1) return '#dc3545'
    if (ratio >= 0.8) return '#ffc107'
    return '#28a745'
  }

  const renderEventDetails = () => {
    if (!eventDetails || !selectedEvent) return null

    return (
      <div className={styles.eventDetailsModal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2>
              {selectedEvent.eventType === 'nursing' && '看護学会見学ツアー'}
              {selectedEvent.eventType === 'ivf' && `IVF学会見学ツアー ${selectedEvent.timeSlot || ''}`}
              {selectedEvent.eventType === 'golf' && 'ゴルフコンペ'}
              参加者一覧
            </h2>
            <button 
              onClick={() => setSelectedEvent(null)}
              className={styles.closeButton}
            >
              ✕
            </button>
          </div>
          
          <div className={styles.participantsList}>
            <div className={styles.participantsHeader}>
              <span>合計 {eventDetails.participants.length}名</span>
              <button 
                onClick={() => downloadCSV(selectedEvent.eventType)}
                className={styles.downloadButton}
              >
                CSV出力
              </button>
            </div>

            <div className={styles.participantsTable}>
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>名前</th>
                    <th>カナ</th>
                    <th>メール</th>
                    <th>電話</th>
                    <th>所属</th>
                    {selectedEvent.eventType === 'ivf' && <th>希望時間</th>}
                    {selectedEvent.eventType === 'golf' && <th>グループ</th>}
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {eventDetails.participants.map((participant, index) => (
                    <tr key={participant.id}>
                      <td>{index + 1}</td>
                      <td>
                        {editingParticipant === participant.id ? (
                          <div className={styles.editField}>
                            <input
                              type="text"
                              value={editForm.lastName}
                              onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                              placeholder="姓"
                            />
                            <input
                              type="text"
                              value={editForm.firstName}
                              onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                              placeholder="名"
                            />
                          </div>
                        ) : (
                          <div>
                            {selectedEvent.eventType === 'golf' ? (
                              <div>
                                <div>{participant.fullName || `${participant.lastName || ''} ${participant.firstName || ''}`}</div>
                                {participant.isRepresentative && (
                                  <span className={styles.representativeBadge}>代表者</span>
                                )}
                              </div>
                            ) : (
                              `${participant.lastName || ''} ${participant.firstName || ''}`
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {editingParticipant === participant.id ? (
                          <div className={styles.editField}>
                            <input
                              type="text"
                              value={editForm.lastNameKana}
                              onChange={(e) => setEditForm({...editForm, lastNameKana: e.target.value})}
                              placeholder="姓カナ"
                            />
                            <input
                              type="text"
                              value={editForm.firstNameKana}
                              onChange={(e) => setEditForm({...editForm, firstNameKana: e.target.value})}
                              placeholder="名カナ"
                            />
                          </div>
                        ) : (
                          selectedEvent.eventType === 'golf' ? 
                            (participant.fullNameKana || `${participant.lastNameKana || ''} ${participant.firstNameKana || ''}`) :
                            `${participant.lastNameKana || ''} ${participant.firstNameKana || ''}`
                        )}
                      </td>
                      <td>
                        {editingParticipant === participant.id ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            className={styles.editInput}
                          />
                        ) : (
                          participant.email
                        )}
                      </td>
                      <td>
                        {editingParticipant === participant.id ? (
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                            className={styles.editInput}
                          />
                        ) : (
                          participant.phone
                        )}
                      </td>
                      <td>
                        {editingParticipant === participant.id ? (
                          <input
                            type="text"
                            value={editForm.organization}
                            onChange={(e) => setEditForm({...editForm, organization: e.target.value})}
                            className={styles.editInput}
                          />
                        ) : (
                          participant.organization || participant.companyName
                        )}
                      </td>
                      {selectedEvent.eventType === 'ivf' && (
                        <td>
                          {editingParticipant === participant.id ? (
                            <select
                              value={editForm.selectedTimeSlot}
                              onChange={(e) => setEditForm({...editForm, selectedTimeSlot: e.target.value})}
                              className={styles.editSelect}
                            >
                              <option value="2025年10月10日（金）14:00">2025年10月10日（金）14:00</option>
                              <option value="2025年10月11日（土）09:00">2025年10月11日（土）09:00</option>
                              <option value="2025年10月12日（日）09:00">2025年10月12日（日）09:00</option>
                              <option value="2025年10月12日（日）13:00">2025年10月12日（日）13:00</option>
                              <option value="2025年10月13日（月）14:00">2025年10月13日（月）14:00</option>
                            </select>
                          ) : (
                            <span className={styles.timeSlotDisplay}>
                              {participant.selectedTimeSlot?.replace('2025年10月', '') || '未選択'}
                            </span>
                          )}
                        </td>
                      )}
                      {selectedEvent.eventType === 'golf' && (
                        <td>
                          <div className={styles.golfGroupInfo}>
                            <div>ID: {participant.groupId}</div>
                            <div>参加者番号: {participant.participantNumber || 1}</div>
                            <div>グループ人数: {participant.totalGroupSize || 1}名</div>
                          </div>
                        </td>
                      )}
                      <td>
                        <span className={`${styles.statusBadge} ${styles[participant.status || 'active']}`}>
                          {participant.status === 'active' ? 'アクティブ' : 
                           participant.status === 'cancelled' ? 'キャンセル' : '定員超過'}
                        </span>
                      </td>
                      <td>
                        {editingParticipant === participant.id ? (
                          <div className={styles.editActions}>
                            <button 
                              onClick={handleSaveEdit}
                              className={styles.saveButton}
                              disabled={loading}
                            >
                              {loading ? '保存中...' : '保存'}
                            </button>
                            <button 
                              onClick={() => {
                                setEditingParticipant(null)
                                setEditForm({})
                              }}
                              className={styles.cancelButton}
                            >
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            <button 
                              onClick={() => handleEditParticipant(participant)}
                              className={styles.editButton}
                            >
                              ✏️ 編集
                            </button>
                            {/* 削除ボタンを削除 */}
                            <span className={styles.readOnlyNote}>
                              削除無効
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 以下は既存のコードと同じ（ログイン、統計表示など）
  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginForm}>
          <h2>管理者ログイン</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.passwordInput}
              required
            />
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            <button type="submit" className={styles.loginButton}>
              ログイン
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>申し込み状況管理</h1>
        <div className={styles.headerButtons}>
          <button 
            onClick={fetchStats} 
            className={styles.refreshButton}
            disabled={loading}
          >
            {loading ? '更新中...' : '🔄 データ更新'}
          </button>
          <button 
            onClick={() => {
              setIsAuthenticated(false)
              setStats(null)
              setSelectedEvent(null)
              setEventDetails(null)
              setPassword('')
              setError('')
            }} 
            className={styles.logoutButton}
          >
            ログアウト
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorMessage}>
          ❌ {error}
        </div>
      )}

      {stats ? (
        <div className={styles.statsContainer}>
          <div className={styles.statsGrid}>
            {/* 看護学会見学ツアー */}
            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <h3>看護学会見学ツアー</h3>
                <div 
                  className={styles.statusIndicator}
                  style={{ backgroundColor: getStatusColor('nursing') }}
                ></div>
              </div>
              <div className={styles.statNumber}>
                {stats.nursing?.active || 0} / {stats.nursing?.capacity || 30}
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ 
                    width: `${Math.min(100, (stats.nursing?.active || 0) / (stats.nursing?.capacity || 30) * 100)}%`,
                    backgroundColor: getStatusColor('nursing')
                  }}
                ></div>
              </div>
              <div className={styles.statDetails}>
                <div className={styles.statRow}>
                  <span>✅ アクティブ:</span>
                  <span>{stats.nursing?.active || 0}件</span>
                </div>
                <div className={styles.statRow}>
                  <span>❌ キャンセル:</span>
                  <span>{stats.nursing?.cancelled || 0}件</span>
                </div>
                <div className={styles.statRow}>
                  <span>⚠️ 定員超過:</span>
                  <span>{stats.nursing?.overCapacity || 0}件</span>
                </div>
              </div>
              <div className={styles.cardActions}>
                <button 
                  onClick={() => fetchEventDetails('nursing')}
                  className={styles.detailButton}
                >
                  📋 参加者一覧
                </button>
                <button 
                  onClick={() => downloadCSV('nursing')} 
                  className={styles.downloadButton}
                >
                  📥 CSV出力
                </button>
              </div>
            </div>

            {/* IVF学会見学ツアー */}
            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <h3>IVF学会見学ツアー</h3>
                <div 
                  className={styles.statusIndicator}
                  style={{ backgroundColor: getStatusColor('ivf') }}
                ></div>
              </div>
              <div className={styles.statNumber}>
                {stats.ivf?.active || 0} / {stats.ivf?.capacity || 100}
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ 
                    width: `${Math.min(100, (stats.ivf?.active || 0) / (stats.ivf?.capacity || 100) * 100)}%`,
                    backgroundColor: getStatusColor('ivf')
                  }}
                ></div>
              </div>
              
              {/* IVF時間帯別詳細 */}
              {stats.ivf?.timeSlots && (
                <div className={styles.timeSlotsBreakdown}>
                  <h4>時間帯別詳細</h4>
                  {Object.entries(stats.ivf.timeSlots).map(([timeSlot, data]) => (
                    <div key={timeSlot} className={styles.timeSlotRow}>
                      <span className={styles.timeSlotLabel}>
                        {timeSlot.replace('2025年10月', '')}
                      </span>
                      <span className={styles.timeSlotCount}>
                        {data.count}/{data.capacity}
                      </span>
                      <button 
                        onClick={() => fetchEventDetails('ivf', timeSlot)}
                        className={styles.timeSlotDetailButton}
                      >
                        詳細
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.statDetails}>
                <div className={styles.statRow}>
                  <span>✅ アクティブ:</span>
                  <span>{stats.ivf?.active || 0}件</span>
                </div>
                <div className={styles.statRow}>
                  <span>❌ キャンセル:</span>
                  <span>{stats.ivf?.cancelled || 0}件</span>
                </div>
                <div className={styles.statRow}>
                  <span>⚠️ 定員超過:</span>
                  <span>{stats.ivf?.overCapacity || 0}件</span>
                </div>
              </div>
              <div className={styles.cardActions}>
                <button 
                  onClick={() => fetchEventDetails('ivf')}
                  className={styles.detailButton}
                >
                  📋 全参加者一覧
                </button>
                <button 
                  onClick={() => downloadCSV('ivf')} 
                  className={styles.downloadButton}
                >
                  📥 CSV出力
                </button>
              </div>
            </div>

            {/* ゴルフコンペ */}
            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <h3>ゴルフコンペ</h3>
                <div 
                  className={styles.statusIndicator}
                  style={{ backgroundColor: getStatusColor('golf') }}
                ></div>
              </div>
              <div className={styles.statNumber}>
                {stats.golf?.active || 0} / {stats.golf?.capacity || 16}
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ 
                    width: `${Math.min(100, (stats.golf?.active || 0) / (stats.golf?.capacity || 16) * 100)}%`,
                    backgroundColor: getStatusColor('golf')
                  }}
                ></div>
              </div>
              <div className={styles.statDetails}>
                <div className={styles.statRow}>
                  <span>✅ アクティブ:</span>
                  <span>{stats.golf?.active || 0}件</span>
                </div>
                <div className={styles.statRow}>
                  <span>❌ キャンセル:</span>
                  <span>{stats.golf?.cancelled || 0}件</span>
                </div>
                <div className={styles.statRow}>
                  <span>⚠️ 定員超過:</span>
                  <span>{stats.golf?.overCapacity || 0}件</span>
                </div>
              </div>
              <div className={styles.cardActions}>
                <button 
                  onClick={() => fetchEventDetails('golf')}
                  className={styles.detailButton}
                >
                  📋 参加者一覧
                </button>
                <button 
                  onClick={() => downloadCSV('golf')} 
                  className={styles.downloadButton}
                >
                  📥 CSV出力
                </button>
              </div>
            </div>
          </div>

          <div className={styles.lastUpdated}>
            <small>最終更新: {new Date().toLocaleString('ja-JP')}</small>
          </div>
        </div>
      ) : !loading && (
        <div className={styles.noDataMessage}>
          <p>📊 データを読み込み中です...</p>
          <button 
            onClick={fetchStats} 
            className={styles.refreshButton}
            disabled={loading}
          >
            データ読み込み
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>処理中...</p>
        </div>
      )}

      {renderEventDetails()}
    </div>
  )
}