const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDnuqf_vlk9eit4bMUb6rw9ccYPlC01lVQ",
  authDomain: "biteandco-a2591.firebaseapp.com",
  projectId: "biteandco-a2591",
  storageBucket: "biteandco-a2591.appspot.com",
  messagingSenderId: "142048686691",
  appId: "1:142048686691:web:ba57a6565d6a24c0657e56",
  measurementId: "G-1TJQNK1ER8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestore() {
  try {
    console.log('Testing Firestore connection...');
    
    const collections = ['sellers', 'buyers', 'orders', 'users'];
    
    for (const collectionName of collections) {
      try {
        console.log(`\n--- Checking ${collectionName} collection ---`);
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        console.log(`${collectionName}: ${snapshot.size} documents`);
        
        if (snapshot.size > 0) {
          let count = 0;
          snapshot.forEach((doc) => {
            if (count < 2) {
              console.log(`  Document ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
              count++;
            }
          });
        }
      } catch (error) {
        console.error(`Error with ${collectionName}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Firestore test failed:', error);
  }
  
  process.exit(0);
}

testFirestore();
