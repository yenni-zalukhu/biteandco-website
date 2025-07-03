'use client'

import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore'
import { safeToDateString } from '../../../lib/dateUtils'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    orderTrends: [],
    revenueData: [],
    topCategories: [],
    userActivity: [],
    geographicData: [],
    totalBuyers: 0,
    totalSellers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    avgRating: 0,
    conversionRate: 0,
    monthlyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d') // 7d, 30d, 90d, 1y

  useEffect(() => {
    const calculateAnalytics = (buyers, sellers, orders) => {
      try {
        // Filter orders by time range
        const now = new Date()
        const timeRangeMs = {
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000,
          '1y': 365 * 24 * 60 * 60 * 1000
        }
        
        const cutoffDate = new Date(now.getTime() - timeRangeMs[timeRange])
        
        // Filter successful orders only
        const successfulOrders = orders.filter(order => 
          order.status === 'success' && order.statusProgress === 'completed'
        )
        
        // Calculate total revenue
        const totalRevenue = successfulOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
        
        // Calculate average rating
        const sellersWithRatings = sellers.filter(seller => seller.rating > 0)
        const avgRating = sellersWithRatings.length > 0 
          ? sellersWithRatings.reduce((sum, seller) => sum + seller.rating, 0) / sellersWithRatings.length
          : 0
        
        // Calculate monthly growth (compare last 30 days vs previous 30 days)
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        
        const recentOrders = orders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
          return orderDate >= last30Days
        })
        
        const previousOrders = orders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
          return orderDate >= previous30Days && orderDate < last30Days
        })
        
        const monthlyGrowth = previousOrders.length > 0 
          ? ((recentOrders.length - previousOrders.length) / previousOrders.length) * 100
          : 0
        
        // Group orders by category
        const categoryStats = {}
        successfulOrders.forEach(order => {
          const seller = sellers.find(s => s.id === order.sellerId)
          const category = seller?.category || 'Other'
          
          if (!categoryStats[category]) {
            categoryStats[category] = { orders: 0, revenue: 0 }
          }
          categoryStats[category].orders += 1
          categoryStats[category].revenue += order.totalAmount || 0
        })
        
        const topCategories = Object.entries(categoryStats)
          .map(([name, stats]) => ({
            name,
            orders: stats.orders,
            revenue: stats.revenue,
            growth: Math.random() * 20 + 5 // TODO: Calculate real growth
          }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5)
        
        // Group orders by location/city
        const locationStats = {}
        successfulOrders.forEach(order => {
          const city = order.deliveryAddress?.split(',').slice(-2, -1)[0]?.trim() || 'Unknown'
          
          if (!locationStats[city]) {
            locationStats[city] = { orders: 0, revenue: 0 }
          }
          locationStats[city].orders += 1
          locationStats[city].revenue += order.totalAmount || 0
        })
        
        const geographicData = Object.entries(locationStats)
          .map(([city, stats]) => ({
            city,
            orders: stats.orders,
            revenue: stats.revenue
          }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5)
        
        // Generate user growth data (last 6 months)
        const userGrowth = []
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const buyersCount = buyers.filter(buyer => {
            const createdDate = buyer.createdAt?.toDate ? buyer.createdAt.toDate() : new Date(buyer.createdAt)
            return createdDate <= date
          }).length
          
          const sellersCount = sellers.filter(seller => {
            const createdDate = seller.createdAt?.toDate ? seller.createdAt.toDate() : new Date(seller.createdAt)
            return createdDate <= date
          }).length
          
          userGrowth.push({
            date: date.toISOString().substring(0, 10),
            buyers: buyersCount,
            sellers: sellersCount
          })
        }
        
        // Generate order trends (last 6 months)
        const orderTrends = []
        for (let i = 5; i >= 0; i--) {
          const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
          
          const monthOrders = successfulOrders.filter(order => {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
            return orderDate >= startDate && orderDate <= endDate
          })
          
          const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
          
          orderTrends.push({
            month: startDate.toLocaleString('default', { month: 'short' }),
            orders: monthOrders.length,
            revenue: monthRevenue
          })
        }
        
        // Generate hourly activity pattern
        const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, orders: 0 }))
        
        successfulOrders.forEach(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
          const hour = orderDate.getHours()
          hourlyStats[hour].orders += 1
        })
        
        // Calculate conversion rate (successful orders / total orders)
        const conversionRate = orders.length > 0 ? (successfulOrders.length / orders.length) * 100 : 0
        
        // Update analytics state
        setAnalytics({
          userGrowth,
          orderTrends,
          revenueData: topCategories.map(cat => ({
            category: cat.name,
            revenue: cat.revenue,
            percentage: totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0
          })),
          topCategories,
          userActivity: hourlyStats,
          geographicData,
          totalBuyers: buyers.length,
          totalSellers: sellers.filter(s => s.status === 'approved').length,
          totalOrders: successfulOrders.length,
          totalRevenue,
          avgRating,
          conversionRate,
          monthlyGrowth
        })
        
        setLoading(false)
      } catch (error) {
        console.error('Error calculating analytics:', error)
        setLoading(false)
      }
    }

    const setupRealtimeAnalytics = () => {
      try {
        // Real-time listeners for all collections
        const unsubscribeBuyers = onSnapshot(collection(db, 'buyers'), (snapshot) => {
          const buyersData = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            buyersData.push({
              id: doc.id,
              createdAt: data.createdAt,
              location: data.address?.city || data.location || 'Unknown'
            })
          })
          
          const unsubscribeSellers = onSnapshot(collection(db, 'sellers'), (snapshot) => {
            const sellersData = []
            snapshot.forEach((doc) => {
              const data = doc.data()
              sellersData.push({
                id: doc.id,
                createdAt: data.createdAt,
                status: data.status,
                category: data.businessCategory || data.category || 'Food & Beverage',
                rating: data.rating || 0,
                ratingCount: data.rating_count || 0
              })
            })
            
            const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
              const ordersData = []
              snapshot.forEach((doc) => {
                const data = doc.data()
                ordersData.push({
                  id: doc.id,
                  createdAt: data.createdAt,
                  totalAmount: data.totalAmount || 0,
                  status: data.status,
                  statusProgress: data.statusProgress,
                  orderType: data.orderType,
                  buyerId: data.buyerId,
                  sellerId: data.sellerId,
                  items: data.items || [],
                  deliveryAddress: data.deliveryAddress || '',
                  pax: data.pax || 1
                })
              })
              
              // Calculate analytics from real data
              calculateAnalytics(buyersData, sellersData, ordersData)
            })
          })
        })
        
      } catch (error) {
        console.error('Error setting up analytics:', error)
        setLoading(false)
      }
    }

    setupRealtimeAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    // This function is now replaced by setupRealtimeAnalytics
  }

  const ChartCard = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  )

  const SimpleBarChart = ({ data, dataKey, label }) => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center">
          <div className="w-20 text-sm text-gray-600">{item[label]}</div>
          <div className="flex-1 mx-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#711330] h-2 rounded-full"
                style={{ width: `${(item[dataKey] / Math.max(...data.map(d => d[dataKey]))) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="w-16 text-sm text-gray-900 text-right">{item[dataKey]}</div>
        </div>
      ))}
    </div>
  )

  const LineChart = ({ data, xKey, yKey }) => (
    <div className="space-y-4">
      <div className="flex justify-between items-end h-32">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className="bg-[#711330] w-8 rounded-t"
              style={{ height: `${(item[yKey] / Math.max(...data.map(d => d[yKey]))) * 100}px` }}
            ></div>
            <div className="text-xs text-gray-600 mt-2">{item[xKey]}</div>
          </div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#711330]"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track your platform performance and user behavior.
            </p>
          </div>
          <div className="flex space-x-2">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  timeRange === range
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Growth</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {analytics.monthlyGrowth > 0 ? '+' : ''}{analytics.monthlyGrowth.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Rp {(analytics.totalRevenue / 1000000).toFixed(1)}M
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-[#711330] rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{analytics.conversionRate.toFixed(1)}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Rating</dt>
                  <dd className="text-lg font-medium text-gray-900">{analytics.avgRating.toFixed(1)}/5.0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* User Growth */}
        <ChartCard title="User Growth">
          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#711330] rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Buyers</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Sellers</span>
              </div>
            </div>
            <LineChart data={analytics.userGrowth} xKey="date" yKey="buyers" />
          </div>
        </ChartCard>

        {/* Order Trends */}
        <ChartCard title="Monthly Orders">
          <LineChart data={analytics.orderTrends} xKey="month" yKey="orders" />
        </ChartCard>

        {/* Top Categories */}
        <ChartCard title="Top Categories">
          <SimpleBarChart data={analytics.topCategories} dataKey="orders" label="name" />
        </ChartCard>

        {/* Geographic Distribution */}
        <ChartCard title="Orders by City">
          <SimpleBarChart data={analytics.geographicData} dataKey="orders" label="city" />
        </ChartCard>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue by Category */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Category</h3>
          <div className="space-y-3">
            {analytics.revenueData.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{item.category}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#711330] h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Rp {(item.revenue / 1000000).toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Activity Pattern</h3>
          <div className="space-y-2">
            {analytics.userActivity.slice(6, 22).map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-12 text-xs text-gray-600">{item.hour}</div>
                <div className="flex-1 mx-2">
                  <div className="bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-green-600 h-1 rounded-full"
                      style={{ width: `${(item.orders / 250) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-8 text-xs text-gray-900 text-right">{item.orders}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Buyers</span>
              <span className="text-sm font-medium text-gray-900">{analytics.totalBuyers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Sellers</span>
              <span className="text-sm font-medium text-gray-900">{analytics.totalSellers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Orders</span>
              <span className="text-sm font-medium text-gray-900">{analytics.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium text-green-600">{analytics.conversionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Rating</span>
              <span className="text-sm font-medium text-yellow-600">{analytics.avgRating.toFixed(1)}/5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
