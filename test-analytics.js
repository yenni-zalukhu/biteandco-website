// Test script to verify analytics are working with real data

import { db } from './src/lib/firebase.js'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'

async function testAnalytics() {
  try {
    console.log('🧪 Testing Analytics Data Connection...')
    
    // Test buyers collection
    const buyersRef = collection(db, 'buyers')
    const buyersSnapshot = await getDocs(buyersRef)
    const buyersCount = buyersSnapshot.size
    console.log(`📊 Total Buyers: ${buyersCount}`)
    
    // Test sellers collection
    const sellersRef = collection(db, 'sellers')
    const sellersSnapshot = await getDocs(sellersRef)
    const sellersCount = sellersSnapshot.size
    console.log(`🏪 Total Sellers: ${sellersCount}`)
    
    // Test orders collection
    const ordersRef = collection(db, 'orders')
    const ordersSnapshot = await getDocs(ordersRef)
    const ordersCount = ordersSnapshot.size
    console.log(`📦 Total Orders: ${ordersCount}`)
    
    // Sample some orders to check data structure
    if (ordersCount > 0) {
      console.log('\n🔍 Sample Order Data:')
      ordersSnapshot.forEach((doc, index) => {
        if (index < 3) { // Only show first 3 orders
          const data = doc.data()
          console.log(`Order ${index + 1}:`)
          console.log(`  - ID: ${doc.id}`)
          console.log(`  - Status: ${data.status}`)
          console.log(`  - Status Progress: ${data.statusProgress}`)
          console.log(`  - Total Amount: ${data.totalAmount}`)
          console.log(`  - Order Type: ${data.orderType}`)
          console.log(`  - Items Count: ${data.items?.length || 0}`)
          console.log(`  - PAX: ${data.pax || 1}`)
          console.log(`  - Created At: ${data.createdAt?.toDate?.() || data.createdAt}`)
          console.log('')
        }
      })
    }
    
    // Calculate some basic analytics
    let totalRevenue = 0
    let successfulOrders = 0
    let cateringOrders = 0
    
    ordersSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.status === 'success' && data.statusProgress === 'completed') {
        successfulOrders++
        totalRevenue += data.totalAmount || 0
      }
      if (data.orderType === 'catering') {
        cateringOrders++
      }
    })
    
    console.log('\n💰 Analytics Summary:')
    console.log(`  - Total Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}`)
    console.log(`  - Successful Orders: ${successfulOrders}`)
    console.log(`  - Catering Orders: ${cateringOrders}`)
    console.log(`  - Success Rate: ${ordersCount > 0 ? ((successfulOrders / ordersCount) * 100).toFixed(1) : 0}%`)
    
    console.log('\n✅ Analytics test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing analytics:', error)
  }
}

// Run the test
testAnalytics()
