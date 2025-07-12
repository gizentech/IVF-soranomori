import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>第23回日本生殖看護学会学術集会 - 空の森クリニック見学ツアー</title>
        <meta name="description" content="第23回日本生殖看護学会学術集会 空の森クリニック見学ツアーの申し込みサイトです。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}