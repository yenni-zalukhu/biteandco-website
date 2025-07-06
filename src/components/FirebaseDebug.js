'use client'

export default function FirebaseDebug() {
  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      background: 'black', 
      color: 'white', 
      padding: '10px', 
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999 
    }}>
      <h4>Firebase Config Debug:</h4>
      <p>API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING'}</p>
      <p>Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'MISSING'}</p>
      <p>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING'}</p>
      <p>Storage Bucket: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'MISSING'}</p>
      <p>Messaging Sender ID: {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'MISSING'}</p>
      <p>App ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'MISSING'}</p>
    </div>
  )
}
