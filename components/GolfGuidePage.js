// components/GolfGuidePage.js
import { useState, useEffect } from 'react'
import styles from '../styles/GuidePage.module.css'

export default function GolfGuidePage({ onNext }) {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-animate', 'visible')
        }
      })
    }, observerOptions)

    const sections = document.querySelectorAll(`.${styles.section}`)
    sections.forEach((section) => {
      section.classList.add('scroll-animate')
      observer.observe(section)
    })

    return () => {
      sections.forEach((section) => {
        observer.unobserve(section)
      })
    }
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
        </div>
        <h1>第28回日本IVF学会学術集会杯</h1>
        <p>ゴルフコンペ</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/ガーベラ.webp" alt="" className={styles.sectionIcon} />
            ご挨拶
          </h2>
          <p>拝啓　残暑厳しいおりから、皆様ますますご清栄のこととお喜び申し上げます。</p>
          <p>さてこの度、平素よりお世話になっている皆様との交流を深めたく、第28回日本IVF学会学術集会杯ゴルフコンペを開催する運びとなりました。</p>
          <p>コンペの後には表彰式を兼ねた懇親会も予定しており、特別な賞品を多数ご用意致しております。</p>
          <p>ご多忙のところ誠に恐縮ではございますが、皆様奮ってご参加をお願い申し上げます。</p>
          <div className={styles.organizer}>
            <p><strong>2025年8月10日</strong></p>
            <p><strong>第28回日本IVF学会学術集会大会長</strong></p>
            <p><strong>医療法人杏月会　空の森クリニック理事長</strong></p>
            <p><strong>幹事　德永義光</strong></p>
          </div>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            開催概要
          </h2>
          <p><strong>開催日時:</strong> 2025年10月10日（金曜日）午前7時28分スタート</p>
          <p><strong>開催場所:</strong> 那覇ゴルフ倶楽部</p>
          <p><strong>住所:</strong> 沖縄県島尻郡八重瀬町字富盛2270</p>
          <p><strong>集合時間:</strong> 午前7時</p>
          <p><strong>集合場所:</strong> 那覇ゴルフ倶楽部コース出入り口前</p>
          <p><strong>定員:</strong> 16名</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/月と星.webp" alt="" className={styles.sectionIcon} />
            参加費用・競技方式
          </h2>
          <p><strong>プレーフィー:</strong> 12,000円</p>
          <p><strong>会費（景品代・懇親会）:</strong> 8,000円</p>
          <p><strong>合計:</strong> 20,000円</p>
          <p><strong>競技方式:</strong> ペリア方式</p>
          <p>（ゴルフ初心者の方もお楽しみいただける競技方式です）</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/鳥の雲.webp" alt="" className={styles.sectionIcon} />
            懇親会について
          </h2>
          <p><strong>開催時間:</strong> 午後1時より</p>
          <p><strong>会場:</strong> 那覇ゴルフ倶楽部レストラン</p>
          <p>表彰式を兼ねた懇親会を開催いたします。特別な賞品を多数ご用意しております。</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/卵と手の家.webp" alt="" className={styles.sectionIcon} />
            キャンセルについて
          </h2>
          <p><strong>キャンセル期限:</strong> 2025年9月10日</p>
          <p>申込後にキャンセルされる場合も9月10日までに申し込みサイトのキャンセルフォームよりお手続きください。</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/家路.webp" alt="" className={styles.sectionIcon} />
            お問い合わせ
          </h2>
          <p><strong>お問い合わせ先:</strong> 098-998-0011</p>
          <p><strong>医療法人杏月会　空の森クリニック</strong></p>
          <p>経営管理部　湧川（わくがわ）・狩俣（かりまた）</p>
        </div>

        <button className={styles.nextButton} onClick={onNext}>
          申し込みフォームへ進む
        </button>
      </div>
    </div>
  )
}