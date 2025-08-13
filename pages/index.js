// pages/index.js
import { Analytics } from '@vercel/analytics/next'
import Link from 'next/link'
import Head from 'next/head'
import styles from '../styles/TopPage.module.css'

export default function TopPage() {
  const events = [
    {
      href: '/nursing',
      title: '第23回日本生殖看護学会学術集会',
      subtitle: '空の森クリニック見学ツアー',
      date: '2025年10月13日（月）14:00～',
      capacity: '定員30名',
      image: '/img/landscape.webp',
      color: '#00104d'
    },
    {
      href: '/ivf',
      title: '第28回日本IVF学会学術集会',
      subtitle: '空の森クリニック見学ツアー',
      date: '2025年10月10日～13日（複数回開催）',
      capacity: '各回20名',
      image: '/img/月と星.webp',
      color: '#1e3a8a'
    },
    {
      href: '/golf',
      title: '第28回日本IVF学会学術集会杯',
      subtitle: 'ゴルフコンペ',
      date: '2025年10月10日（金）7:28スタート',
      capacity: '定員16名',
      image: '/img/鳥の雲.webp',
      color: '#059669'
    }
  ]

  return (
    <>
      <Head>
        <title>学術集会・イベント申し込み | 空の森クリニック</title>
        <meta name="description" content="第23回日本生殖看護学会学術集会、第28回日本IVF学会学術集会の見学ツアーとゴルフコンペの申し込みサイトです。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
          </div>
          <h1>学術集会・イベント申し込み</h1>
          <p>参加されるイベントを選択してください</p>
        </div>

        <div className={styles.content}>
          <div className={styles.eventsGrid}>
            {events.map((event, index) => (
              <Link key={index} href={event.href} className={styles.eventLink}>
                <div className={styles.eventCard} style={{ '--event-color': event.color }}>
                  <div className={styles.eventImage}>
                    <img src={event.image} alt={event.title} />
                  </div>
                  <div className={styles.eventContent}>
                    <h3>{event.title}</h3>
                    <h4>{event.subtitle}</h4>
                    <div className={styles.eventDetails}>
                      <p><strong>開催日時：</strong> {event.date}</p>
                      <p><strong>参加定員：</strong> {event.capacity}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <p><strong>医療法人杏月会 空の森クリニック</strong></p>
            <p>〒901-0406 沖縄県島尻郡八重瀬町屋宜原229-1</p>
            <p>TEL: 098-998-0011</p>
          </div>
        </div>
      </div>
    </>
  )
}