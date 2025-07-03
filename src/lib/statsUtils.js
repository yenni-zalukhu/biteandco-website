import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Calculate seller statistics from orders
 * @param {string} sellerId - The seller ID
 * @returns {Promise<{totalOrders: number, totalRevenue: number, averageRating: number}>}
 */
export const calculateSellerStats = async (sellerId) => {
  try {
    // Get orders for this seller
    const ordersRef = collection(db, 'orders')
    const sellerOrdersQuery = query(ordersRef, where('sellerId', '==', sellerId))
    const ordersSnapshot = await getDocs(sellerOrdersQuery)
    
    let totalOrders = 0
    let totalRevenue = 0
    let ratingSum = 0
    let ratingCount = 0
    
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data()
      
      totalOrders++
      
      // Only count revenue from successful orders
      if (orderData.status === 'success' && orderData.totalAmount) {
        totalRevenue += orderData.totalAmount
      }
      
      // Count ratings
      if (orderData.ulasan && orderData.ulasan.rating) {
        ratingSum += orderData.ulasan.rating
        ratingCount++
      }
    })
    
    const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 0
    
    return {
      totalOrders,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10
    }
  } catch (error) {
    console.error('Error calculating seller stats:', error)
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageRating: 0
    }
  }
}

/**
 * Calculate buyer statistics from orders
 * @param {string} buyerId - The buyer ID
 * @returns {Promise<{totalOrders: number, totalSpent: number, lastOrderDate: Date|null}>}
 */
export const calculateBuyerStats = async (buyerId) => {
  try {
    // Get orders for this buyer
    const ordersRef = collection(db, 'orders')
    const buyerOrdersQuery = query(ordersRef, where('buyerId', '==', buyerId))
    const ordersSnapshot = await getDocs(buyerOrdersQuery)
    
    let totalOrders = 0
    let totalSpent = 0
    let lastOrderDate = null
    
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data()
      
      totalOrders++
      
      // Only count spending from successful orders
      if (orderData.status === 'success' && orderData.totalAmount) {
        totalSpent += orderData.totalAmount
      }
      
      // Track last order date
      if (orderData.createdAt) {
        const orderDate = orderData.createdAt.toDate ? orderData.createdAt.toDate() : new Date(orderData.createdAt)
        if (!lastOrderDate || orderDate > lastOrderDate) {
          lastOrderDate = orderDate
        }
      }
    })
    
    return {
      totalOrders,
      totalSpent,
      lastOrderDate
    }
  } catch (error) {
    console.error('Error calculating buyer stats:', error)
    return {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null
    }
  }
}

/**
 * Get all seller statistics
 * @returns {Promise<Object>} - Object with sellerId as key and stats as value
 */
export const getAllSellerStats = async () => {
  try {
    const sellersRef = collection(db, 'sellers')
    const sellersSnapshot = await getDocs(sellersRef)
    
    const sellerStats = {}
    
    // Calculate stats for each seller
    for (const sellerDoc of sellersSnapshot.docs) {
      const sellerId = sellerDoc.id
      const stats = await calculateSellerStats(sellerId)
      sellerStats[sellerId] = stats
    }
    
    return sellerStats
  } catch (error) {
    console.error('Error getting all seller stats:', error)
    return {}
  }
}

/**
 * Get all buyer statistics
 * @returns {Promise<Object>} - Object with buyerId as key and stats as value
 */
export const getAllBuyerStats = async () => {
  try {
    const buyersRef = collection(db, 'buyers')
    const buyersSnapshot = await getDocs(buyersRef)
    
    const buyerStats = {}
    
    // Calculate stats for each buyer
    for (const buyerDoc of buyersSnapshot.docs) {
      const buyerId = buyerDoc.id
      const stats = await calculateBuyerStats(buyerId)
      buyerStats[buyerId] = stats
    }
    
    return buyerStats
  } catch (error) {
    console.error('Error getting all buyer stats:', error)
    return {}
  }
}
