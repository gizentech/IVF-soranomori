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

  const handleLogin = async (e) => {
    e.preventDefault()
    if (password === 'soraadmin2025') { // 管理者パスワード
      setIsAuthenticated(true)
      setError('')
      await fetchStats()
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
      const response = await fetch('/api/admin/stats')
      
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
      </header>

      {loading && (
        <div className={styles.loading}>
          <p>処理中...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {stats ? (
        <div className={styles.statsContainer}>
          <div className={styles.statsGrid}>
            {/* 看護学会見学ツアー */}
            <div className={styles.statCard}>
              <h3>看護学会見学ツアー</h3>
              <div className={styles.statNumber}>
                {stats.nursing?.active || 0} / {stats.nursing?.capacity || 30}
              </div>
              <div className={styles.statDetails}>
                <p>アクティブ: {stats.nursing?.active || 0}件</p>
                <p>キャンセル: {stats.nursing?.cancelled || 0}件</p>
                <p>定員超過: {stats.nursing?.overCapacity || 0}件</p>
                <p>合計: {stats.nursing?.total || 0}件</p>
              </div>
              <button 
                onClick={() => downloadCSV('nursing')} 
                className={styles.downloadButton}
                disabled={loading}
              >
                CSV出力
              </button>
            </div>

            {/* IVF学会見学ツアー */}
            <div className={styles.statCard}>
              <h3>IVF学会見学ツアー</h3>
              <div className={styles.statNumber}>
                {stats.ivf?.active || 0} / {stats.ivf?.capacity || 100}
              </div>
              <div className={styles.statDetails}>
                <p>アクティブ: {stats.ivf?.active || 0}件</p>
                <p>キャンセル: {stats.ivf?.cancelled || 0}件</p>
                <p>定員超過: {stats.ivf?.overCapacity || 0}件</p>
                <p>合計: {stats.ivf?.total || 0}件</p>
              </div>
              <button 
                onClick={() => downloadCSV('ivf')} 
                className={styles.downloadButton}
                disabled={loading}
              >
                CSV出力
              </button>
            </div>

            {/* ゴルフコンペ */}
            <div className={styles.statCard}>
              <h3>ゴルフコンペ</h3>
              <div className={styles.statNumber}>
                {stats.golf?.active || 0} / {stats.golf?.capacity || 16}
              </div>
              <div className={styles.statDetails}>
                <p>アクティブ: {stats.golf?.active || 0}件</p>
                <p>キャンセル: {stats.golf?.cancelled || 0}件</p>
                <p>定員超過: {stats.golf?.overCapacity || 0}件</p>
                <p>合計: {stats.golf?.total || 0}件</p>
              </div>
              <button 
                onClick={() => downloadCSV('golf')} 
                className={styles.downloadButton}
                disabled={loading}
              >
                CSV出力
              </button>
            </div>
          </div>

          <div className={styles.allDataSection}>
            <h3>全データ出力</h3>
            <p>全イベントの申し込みデータを統合したCSVファイルをダウンロードします</p>
            <button 
              onClick={downloadAllData} 
              className={styles.downloadAllButton}
              disabled={loading}
            >
              全イベント統合CSV出力
            </button>
          </div>

          <div className={styles.refreshSection}>
            <button 
              onClick={fetchStats} 
              className={styles.refreshButton}
              disabled={loading}
            >
              データ更新
            </button>
          </div>
        </div>
      ) : !loading && (
        <div className={styles.noDataMessage}>
          <p>データを読み込み中です...</p>
          <button 
            onClick={fetchStats} 
            className={styles.refreshButton}
            disabled={loading}
          >
            データ読み込み
          </button>
        </div>
      )}
    </div>
  )
}