// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// 環境変数の確認
console.log('=== Firebase Configuration Check ===')
console.log('Environment:', process.env.NODE_ENV)
console.log('API Key exists:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
console.log('Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
console.log('Messaging Sender ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)
console.log('App ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID)

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// 設定値の検証
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
const missingFields = requiredFields.filter(field => !firebaseConfig[field])

if (missingFields.length > 0) {
  console.error('❌ Missing Firebase configuration fields:', missingFields)
  console.error('Firebase config object:', firebaseConfig)
  throw new Error(`Firebase設定が不完全です: ${missingFields.join(', ')}`)
}

console.log('✅ All Firebase configuration fields are present')

// Firebase初期化
let app
let db

try {
  if (!getApps().length) {
    console.log('Initializing Firebase app...')
    app = initializeApp(firebaseConfig)
    console.log('✅ Firebase app initialized successfully')
  } else {
    console.log('Using existing Firebase app')
    app = getApps()[0]
  }

  console.log('Initializing Firestore...')
  db = getFirestore(app)
  console.log('✅ Firestore initialized successfully')

} catch (error) {
  console.error('❌ Firebase initialization failed:', error)
  throw new Error(`Firebase初期化に失敗しました: ${error.message}`)
}

export { db }
export default app