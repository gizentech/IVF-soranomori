import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        <title>第28回日本IVF学会学術集会 - 空の森クリニック見学ツアー</title>
        <meta name="description" content="第28回日本IVF学会学術集会in沖縄 空の森クリニック見学ツアーの申し込みサイトです。" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}