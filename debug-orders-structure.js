const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBOoOEIdUU5ZHhj5mlW3qnVmxTtJBE95rQ",
  authDomain: "bite-and-co.firebaseapp.com",
  projectId: "bite-and-co",
  storageBucket: "bite-and-co.appspot.com",
  messagingSenderId: "643904830623",
  appId: "1:643904830623:web:ed59b8e9b26c74b7b68d6a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectOrdersStructure() {
  try {
    console.log('=== ORDERS COLLECTION STRUCTURE INSPECTION ===\n');
    
    const ordersRef = collection(db, 'orders');
    const ordersQuery = query(ordersRef, limit(5));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    console.log(`Total orders found: ${ordersSnapshot.size}\n`);
    
    if (ordersSnapshot.size === 0) {
      console.log('No orders found in the collection.');
      return;
    }
    
    ordersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Order ${index + 1} (ID: ${doc.id}) ---`);
      console.log('Available fields:', Object.keys(data));
      
      // Check key fields for seller identification
      console.log('\nSeller identification:');
      console.log('  sellerId:', data.sellerId || 'NOT FOUND');
      console.log('  seller.id:', data.seller?.id || 'NOT FOUND');
      console.log('  seller object:', data.seller ? 'Present' : 'Not present');
      
      // Check amount fields
      console.log('\nAmount fields:');
      console.log('  totalAmount:', data.totalAmount || 'NOT FOUND');
      console.log('  total:', data.total || 'NOT FOUND');
      console.log('  amount:', data.amount || 'NOT FOUND');
      console.log('  price:', data.price || 'NOT FOUND');
      
      // Check status field
      console.log('\nStatus:');
      console.log('  status:', data.status || 'NOT FOUND');
      
      // Check date fields
      console.log('\nDate fields:');
      console.log('  createdAt:', data.createdAt ? (typeof data.createdAt === 'object' ? data.createdAt.toDate?.() || data.createdAt : data.createdAt) : 'NOT FOUND');
      console.log('  orderDate:', data.orderDate ? (typeof data.orderDate === 'object' ? data.orderDate.toDate?.() || data.orderDate : data.orderDate) : 'NOT FOUND');
      
      // Show full structure for first order
      if (index === 0) {
        console.log('\nFull structure of first order:');
        console.log(JSON.stringify(data, (key, value) => {
          // Handle Firestore Timestamp objects
          if (value && typeof value === 'object' && value.toDate) {
            return value.toDate().toISOString();
          }
          return value;
        }, 2));
      }
    });
    
  } catch (error) {
    console.error('Error inspecting orders:', error);
  }
}

// Also check sellers structure
async function inspectSellersStructure() {
  try {
    console.log('\n\n=== SELLERS COLLECTION STRUCTURE INSPECTION ===\n');
    
    const sellersRef = collection(db, 'sellers');
    const sellersQuery = query(sellersRef, limit(3));
    const sellersSnapshot = await getDocs(sellersQuery);
    
    console.log(`Total sellers found: ${sellersSnapshot.size}\n`);
    
    if (sellersSnapshot.size === 0) {
      console.log('No sellers found in the collection.');
      return;
    }
    
    sellersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Seller ${index + 1} (ID: ${doc.id}) ---`);
      console.log('Name fields:');
      console.log('  outletName:', data.outletName || 'NOT FOUND');
      console.log('  businessName:', data.businessName || 'NOT FOUND');
      console.log('  name:', data.name || 'NOT FOUND');
      
      console.log('\nStatus:');
      console.log('  status:', data.status || 'NOT FOUND');
      
      console.log('\nAvailable fields:', Object.keys(data));
    });
    
  } catch (error) {
    console.error('Error inspecting sellers:', error);
  }
}

async function main() {
  await inspectOrdersStructure();
  await inspectSellersStructure();
  process.exit(0);
}

main();
