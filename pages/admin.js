// pages/admin.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../styles/Admin.module.css'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // ページ読み込み時に自動でデータを取得
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (password === 'soraadmin2025') { // 管理者パスワード
      setIsAuthenticated(true)
      setError('')
      // ログイン後は自動でfetchStatsが呼ばれる
    } else {
      setError('パスワードが正しくありません')
      setPassword('')
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('Fetching stats...')
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      console.log('Stats response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Stats data received:', data)
      setStats(data)
    } catch (error) {
      console.error('Stats fetch error:', error)
      setError('データの取得に失敗しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = async (eventType) => {
    setLoading(true)
    setError('')
    try {
      console.log(`Downloading CSV for ${eventType}...`)
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
        console.log(`CSV downloaded successfully for ${eventType}`)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'CSV出力に失敗しました')
      }
    } catch (error) {
      console.error('CSV download error:', error)
      setError('CSV出力でエラーが発生しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadAllData = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('Downloading all data CSV...')
      const response = await fetch('/api/admin/export-all')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `all_registrations_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        console.log('All data CSV downloaded successfully')
      } else {
        const error = await response.json()
        throw new Error(error.error || '全データCSV出力に失敗しました')
      }
    } catch (error) {
      console.error('All data CSV download error:', error)
      setError('全データCSV出力でエラーが発生しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (eventType) => {
    if (!stats || !stats[eventType]) return '#ccc'
    
    const { active, capacity } = stats[eventType]
    const ratio = active / capacity
    
    if (ratio >= 1) return '#dc3545' // 満員 - 赤
    if (ratio >= 0.8) return '#ffc107' // 80%以上 - 黄
    return '#28a745' // 余裕あり - 緑
  }

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
                <div className={styles.statRow}>
                  <span><strong>📊 合計:</strong></span>
                  <span><strong>{stats.nursing?.total || 0}件</strong></span>
                </div>
              </div>
              <button 
                onClick={() => downloadCSV('nursing')} 
                className={styles.downloadButton}
                disabled={loading}
              >
                📥 CSV出力
              </button>
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
                <div className={styles.statRow}>
                  <span><strong>📊 合計:</strong></span>
                  <span><strong>{stats.ivf?.total || 0}件</strong></span>
                </div>
              </div>
              <button 
                onClick={() => downloadCSV('ivf')} 
                className={styles.downloadButton}
                disabled={loading}
              >
                📥 CSV出力
              </button>
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
                <div className={styles.statRow}>
                  <span><strong>📊 合計:</strong></span>
                  <span><strong>{stats.golf?.total || 0}件</strong></span>
                </div>
              </div>
              <button 
                onClick={() => downloadCSV('golf')} 
                className={styles.downloadButton}
                disabled={loading}
              >
                📥 CSV出力
              </button>
            </div>
          </div>

          {/* 全データ出力セクション */}
          <div className={styles.allDataSection}>
            <h3>📋 全データ出力</h3>
            <p>全イベントの申し込みデータを統合したCSVファイルをダウンロードします</p>
            <button 
              onClick={downloadAllData} 
              className={styles.downloadAllButton}
              disabled={loading}
            >
              📊 全イベント統合CSV出力
            </button>
          </div>

          {/* 最終更新時刻 */}
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
    </div>
  )
}