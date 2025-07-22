import styles from '../styles/FullCapacityPage.module.css'

export default function FullCapacityPage({ data, onHome }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/img/logo.webp" alt="空の森クリニック" className={styles.logo} />
        </div>
        <h1>第23回日本生殖看護学会学術集会</h1>
        <p>お申し込みについて</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>
            <img src="/img/月と星.webp" alt="" className={styles.sectionIcon} />
            ご予約について
          </h2>
          <div className={styles.messageContainer}>
            <div className={styles.fullCapacityMessage}>
              <h3>ご予約満員御礼につき、ご予約がお取りできませんでした。</h3>
              <p>定員30名に達したため、現在ご予約を受け付けておりません。</p>
              <p>多数のお申し込みをいただき、誠にありがとうございました。</p>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/landscape.webp" alt="" className={styles.sectionIcon} />
            お申し込み内容
          </h2>
          <div className={styles.applicationInfo}>
            <p><strong>お名前:</strong> {data.lastName} {data.firstName}</p>
            <p><strong>メールアドレス:</strong> {data.email}</p>
            <p><strong>所属機関:</strong> {data.organization}</p>
            <p><strong>見学日:</strong> 2025年10月13日（月）14:00〜</p>
            <p><strong>ステータス:</strong> <span className={styles.fullStatus}>定員満了</span></p>
          </div>
        </div>

        <div className={styles.section}>
          <h2>
            <img src="/img/ガーベラ.webp" alt="" className={styles.sectionIcon} />
            お問い合わせ
          </h2>
          <div className={styles.message}>
            <p>ご不明な点やご質問がございましたら、下記までお問い合わせください。</p>
            <p><strong>空の森クリニック 看護局</strong>
            TEL: <a href="tel:098-998-0011">098-998-0011</a></p>
            <p>またの機会がございましたら、ぜひご参加ください。</p>
          </div>
        </div>

        <div className={styles.buttons}>
          <button onClick={onHome} className={styles.homeButton}>
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}