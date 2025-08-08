// lib/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// 設定の検証
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
const missingFields = requiredFields.filter(field => !firebaseConfig[field])

if (missingFields.length > 0) {
  console.error('Missing Firebase configuration fields:', missingFields)
  throw new Error(`Firebase設定が不完全です: ${missingFields.join(', ')}`)
}

let app, db

try {
  // 既存のアプリがあるかチェック
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  
  // Initialize Firestore
  db = getFirestore(app)
  
  console.log('Firebase initialized successfully with project:', firebaseConfig.projectId)
} catch (error) {
  console.error('Firebase initialization failed:', error)
  throw error
}

export { db }
export default app