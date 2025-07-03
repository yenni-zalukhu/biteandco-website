// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration (using the same config as your React Native app)
const firebaseConfig = {
  apiKey: "AIzaSyDnuqf_vlk9eit4bMUb6rw9ccYPlC01lVQ",
  authDomain: "biteandco-a2591.firebaseapp.com",
  projectId: "biteandco-a2591",
  storageBucket: "biteandco-a2591.appspot.com",
  messagingSenderId: "142048686691",
  appId: "1:142048686691:web:ba57a6565d6a24c0657e56",
  measurementId: "G-1TJQNK1ER8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to emulator in development (if needed)
// Uncomment the lines below if you want to use Firebase emulators
/*
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.log('Firestore emulator connection failed or already connected');
  }
}
*/

export default app;
