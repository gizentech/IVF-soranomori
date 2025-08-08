// components/IVFGuidePage.js
import { useState, useEffect } from 'react'
import styles from '../styles/GuidePage.module.css'

export default function IVFGuidePage({ onNext }) {
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
        <h1>第28回日本IVF学会学術集会</h1>
        <p>空の森クリニック院内見学ツアー</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/ガーベラ.webp" alt="" className={styles.sectionIcon} />
            ご案内
          </h2>
          <p>第28回日本IVF学会学術集会の開催に伴い、空の森クリニック見学ツアーを複数回開催いたします。</p>
          <p>自然に包まれた医療環境での実践を直接ご覧いただき、生殖医療の新たな可能性を感じていただける機会となれば幸いです。</p>
          <p>皆様のご参加を心よりお待ちしております。</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            開催概要
          </h2>
          <p>第28回日本IVF学会学術集会期間中に、「空の森クリニック院内見学ツアー」を複数回開催いたします。</p>
          <p>自然に包まれた空間での医療を実際にご体感いただく良い機会となりますので、皆様のご参加をお待ちしております。</p>
          <p><strong>所要時間:</strong> 約60分</p>
          <p><strong>定員:</strong> 各回20名（先着順）</p>
          <p><strong>参加費:</strong> 無料</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/月と星.webp" alt="" className={styles.sectionIcon} />
            開催日程・会場
          </h2>
          <div className={styles.scheduleList}>
            <div className={styles.scheduleItem}>
              <strong>① 2025年10月10日（金）13:00〜</strong>
            </div>
            <div className={styles.scheduleItem}>
              <strong>② 2025年10月11日（土）09:00〜</strong>
            </div>
            <div className={styles.scheduleItem}>
              <strong>③ 2025年10月12日（日）09:00〜</strong>
            </div>
            <div className={styles.scheduleItem}>
              <strong>④ 2025年10月12日（日）13:00〜</strong>
            </div>
            <div className={styles.scheduleItem}>
              <strong>⑤ 2025年10月13日（月）14:00〜</strong>
            </div>
          </div>
          <p><strong>場所:</strong> 空の森クリニック（受付にお越しください）</p>
          <p><strong>定員:</strong> 各回先着20名様限定（要予約）</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/鳥の雲.webp" alt="" className={styles.sectionIcon} />
            見学内容
          </h2>
          <ul>
            <li>自然に包まれた医療空間の体験</li>
            <li>最新のIVF設備・機器のご紹介</li>
            <li>胚培養室の見学</li>
            <li>手術室・採卵室の見学</li>
            <li>カウンセリング室の見学</li>
            <li>質疑応答・意見交換</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/卵と手の家.webp" alt="" className={styles.sectionIcon} />
            対象者
          </h2>
          <p>生殖医療に従事する医師、看護師、胚培養士、その他関連職種の方々を対象としております。</p>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/家路.webp" alt="" className={styles.sectionIcon} />
            参加費・注意事項
          </h2>
          <p><strong>参加費:</strong> 無料</p>
          <ul>
            <li>感染対策にご協力ください（マスク着用必須）</li>
            <li>写真撮影は指定された場所のみ可能です</li>
            <li>動きやすい服装でお越しください</li>
            <li>患者様のプライバシー保護にご配慮ください</li>
            <li>先着順での受付となります</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            アクセス・お問い合わせ
          </h2>
          <p><strong>医療法人杏月会 空の森クリニック</strong></p>
          <p>〒901-0406 沖縄県島尻郡八重瀬町屋宜原229-1</p>
          <p><strong>お問い合わせ:</strong></p>
          <p>空の森クリニック</p>
          <p>TEL: <a href="tel:098-998-0011">098-998-0011</a></p>
        </div>

        <button className={styles.nextButton} onClick={onNext}>
          申し込みフォームへ進む
        </button>
      </div>
    </div>
  )
}