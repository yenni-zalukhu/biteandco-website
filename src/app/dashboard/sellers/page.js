'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { db } from '../../../lib/firebase'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { safeToDateString } from '../../../lib/dateUtils'

export default function SellersPage() {
  const [rawSellers, setRawSellers] = useState([])
  const [sellers, setSellers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, active, pending, suspended
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)

  const setupRealtimeSellers = useCallback(() => {
    try {
      const sellersRef = collection(db, 'sellers')
      const unsubscribe = onSnapshot(sellersRef, 
        (snapshot) => {
          const sellersData = []
          
          snapshot.forEach((doc) => {
            const sellerData = doc.data()
            
            sellersData.push({
              id: doc.id,
              name: sellerData.outletName || sellerData.businessName || 'Unknown Seller',
              email: sellerData.outletEmail || sellerData.email || '',
              phone: sellerData.outletPhone || sellerData.phone || '',
              status: sellerData.status === 'approved' ? 'active' : 
                     sellerData.status === 'rejected' ? 'suspended' : 'pending',
              joinDate: safeToDateString(sellerData.createdAt),
              totalOrders: 0, // Will be calculated from orders
              revenue: 0, // Will be calculated from successful orders
              rating: sellerData.rating || 0,
              ratingCount: sellerData.rating_count || 0,
              location: sellerData.address || sellerData.outletAddress || sellerData.pinAddress || 'Unknown',
              category: sellerData.businessCategory || sellerData.category || 'Food & Beverage',
              profileImage: sellerData.storeIcon || sellerData.profileImage || null,
              businessDescription: sellerData.businessDescription || sellerData.description || '',
              documents: {
                ktpImageUrl: sellerData.ktpImageUrl,
                selfieImageUrl: sellerData.selfieImageUrl,
                storeIcon: sellerData.storeIcon,
                storeBanner: sellerData.storeBanner
              },
              bankInfo: {
                bankName: sellerData.bankName,
                bankAccountNumber: sellerData.bankAccountNumber
              },
              hasMenu: sellerData.categories && sellerData.categories.length > 0,
              menuCount: sellerData.categories ? sellerData.categories.reduce((total, cat) => total + (cat.items ? cat.items.length : 0), 0) : 0,
              packageCount: sellerData.rantanganPackages ? sellerData.rantanganPackages.length : 0
            })
          })
          
          setRawSellers(sellersData)
        },
        (error) => {
          setError('Failed to load sellers data')
          setLoading(false)
          setSellers([])
        }
      )
      
      return unsubscribe
    } catch (error) {
      setError('Failed to connect to database')
      setLoading(false)
      return null
    }
  }, [])

  const setupRealtimeOrders = useCallback(() => {
    try {
      const ordersRef = collection(db, 'orders')
      const unsubscribe = onSnapshot(ordersRef, 
        (snapshot) => {
          const ordersData = []
          
          snapshot.forEach((doc) => {
            const orderData = doc.data()
            
            // Extract seller ID from various possible structures
            let sellerId = null
            if (orderData.sellerId) {
              sellerId = orderData.sellerId
            } else if (orderData.seller?.id) {
              sellerId = orderData.seller.id
            } else if (orderData.seller_id) {
              sellerId = orderData.seller_id
            } else if (orderData.merchantId) {
              sellerId = orderData.merchantId
            }
            
            // Extract total amount from various possible structures
            let totalAmount = 0
            if (orderData.totalAmount) {
              totalAmount = parseFloat(orderData.totalAmount) || 0
            } else if (orderData.total) {
              totalAmount = parseFloat(orderData.total) || 0
            } else if (orderData.amount) {
              totalAmount = parseFloat(orderData.amount) || 0
            } else if (orderData.price) {
              totalAmount = parseFloat(orderData.price) || 0
            } else if (orderData.grandTotal) {
              totalAmount = parseFloat(orderData.grandTotal) || 0
            }
            
            // Extract status
            let status = orderData.status || orderData.orderStatus || 'unknown'
            
            ordersData.push({
              id: doc.id,
              sellerId,
              buyerId: orderData.buyerId || orderData.buyer?.id || orderData.customerId,
              status,
              totalAmount,
              createdAt: orderData.createdAt || orderData.orderDate,
              seller: orderData.seller || {},
              buyer: orderData.buyer || {}
            })
          })
          
          setOrders(ordersData)
        },
        (error) => {
          setOrders([])
        }
      )
      
      return unsubscribe
    } catch (error) {
      setOrders([])
      return null
    }
  }, [])

  const calculateSellerStats = useCallback((sellersData, ordersData) => {
    const sellersWithStats = sellersData.map(seller => {
      // Find all orders for this seller - exact match on sellerId
      const sellerOrders = ordersData.filter(order => order.sellerId === seller.id)
      
      // Calculate total orders
      const totalOrders = sellerOrders.length
      
      // Calculate revenue from successful orders only
      const successfulOrders = sellerOrders.filter(order => {
        const status = order.status?.toLowerCase().trim() || ''
        return status === 'success'
      })
      
      const revenue = successfulOrders.reduce((total, order) => {
        const amount = parseFloat(order.totalAmount) || 0
        return total + amount
      }, 0)
      
      return {
        ...seller,
        totalOrders,
        revenue
      }
    })
    
    setSellers(sellersWithStats)
    setLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    const sellersUnsubscribe = setupRealtimeSellers()
    const ordersUnsubscribe = setupRealtimeOrders()
    
    return () => {
      if (sellersUnsubscribe) sellersUnsubscribe()
      if (ordersUnsubscribe) ordersUnsubscribe()
    }
  }, [setupRealtimeSellers, setupRealtimeOrders])

  // Recalculate stats whenever rawSellers or orders data changes
  useEffect(() => {
    if (rawSellers.length > 0) {
      calculateSellerStats(rawSellers, orders)
    } else if (rawSellers.length === 0 && !loading) {
      setSellers([])
    }
  }, [rawSellers, orders, calculateSellerStats, loading])

  const handleStatusChange = async (sellerId, newStatus) => {
    try {
      const sellerRef = doc(db, 'sellers', sellerId)
      await updateDoc(sellerRef, {
        status: newStatus === 'active' ? 'approved' : 
                newStatus === 'suspended' ? 'rejected' : 'pending',
        updatedAt: new Date()
      })
    } catch (error) {
      alert('Failed to update seller status. Please try again.')
    }
  }

  const filteredSellers = sellers.filter(seller => {
    const matchesFilter = filter === 'all' || seller.status === filter
    const matchesSearch = seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         seller.location.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-600 text-white`
      case 'pending':
        return `${baseClasses} bg-orange-500 text-white`
      case 'suspended':
        return `${baseClasses} bg-red-600 text-white`
      default:
        return `${baseClasses} bg-gray-600 text-white`
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Sellers</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Management</h1>
          <p className="text-gray-600 text-sm mt-1">Manage seller accounts, approvals, and performance</p>
        </div>
        <div className="flex items-center space-x-2 mt-3 sm:mt-0">
          <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
            <div className="text-lg font-bold text-[#711330]">{sellers.length}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
            <div className="text-lg font-bold text-green-600">{sellers.filter(s => s.status === 'active').length}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
            <div className="text-lg font-bold text-yellow-600">{sellers.filter(s => s.status === 'pending').length}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2 border shadow-sm">
            <div className="text-lg font-bold text-red-600">{sellers.filter(s => s.status === 'suspended').length}</div>
            <div className="text-xs text-gray-600">Suspended</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#711330] focus:border-[#711330]"
                placeholder="Search by name, email, or location..."
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#711330] focus:border-[#711330]"
            >
              <option value="all">All ({sellers.length})</option>
              <option value="active">Active ({sellers.filter(s => s.status === 'active').length})</option>
              <option value="pending">Pending ({sellers.filter(s => s.status === 'pending').length})</option>
              <option value="suspended">Suspended ({sellers.filter(s => s.status === 'suspended').length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sellers List */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">
            {filteredSellers.length} Seller{filteredSellers.length !== 1 ? 's' : ''} Found
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredSellers.map((seller) => (
            <div key={seller.id} className="p-4 hover:bg-gray-50 transition-colors">
              {/* Main Row */}
              <div className="flex items-start space-x-3">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  {seller.profileImage ? (
                    <Image 
                      className="h-12 w-12 rounded-full object-cover border" 
                      src={seller.profileImage} 
                      alt={seller.name}
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[#711330] flex items-center justify-center border">
                      <span className="text-white font-semibold text-sm">
                        {seller.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Basic Info - Takes 2 columns */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {seller.name}
                        </h4>
                        <span className={getStatusBadge(seller.status)}>
                          {seller.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          {seller.email}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {seller.phone}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {seller.location}
                        </div>
                        <div className="flex items-center text-gray-500 pt-1">
                          <span>Joined: {seller.joinDate}</span>
                          <span className="mx-1">•</span>
                          <span>{seller.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats Grid - Takes 1 column */}
                    <div className="lg:col-span-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 rounded p-2 text-center">
                          <div className="text-sm font-bold text-green-700">
                            {formatCurrency(seller.revenue)}
                          </div>
                          <div className="text-xs text-green-600">Revenue</div>
                        </div>
                        <div className="bg-blue-50 rounded p-2 text-center">
                          <div className="text-sm font-bold text-blue-700">
                            {seller.totalOrders}
                          </div>
                          <div className="text-xs text-blue-600">Orders</div>
                        </div>
                        <div className="bg-yellow-50 rounded p-2 text-center">
                          <div className="flex items-center justify-center">
                            <span className="text-sm font-bold text-yellow-700">
                              {seller.rating.toFixed(1)}
                            </span>
                            <svg className="w-3 h-3 text-yellow-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="text-xs text-yellow-600">({seller.ratingCount})</div>
                        </div>
                        <div className="bg-purple-50 rounded p-2 text-center">
                          <div className="text-sm font-bold text-purple-700">
                            {seller.menuCount}
                          </div>
                          <div className="text-xs text-purple-600">Menu</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions - Takes 1 column */}
                    <div className="lg:col-span-1">
                      <select
                        value={seller.status}
                        onChange={(e) => handleStatusChange(seller.id, e.target.value)}
                        className="w-full text-sm rounded border-gray-300 focus:border-[#711330] focus:ring-[#711330] mb-2"
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      
                      {/* Quick Info */}
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Bank:</span>
                          <span className="font-medium">{seller.bankInfo.bankName || 'Not Set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Packages:</span>
                          <span className="font-medium">{seller.packageCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Additional Details - Collapsible */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Documents */}
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 mb-1">Documents</div>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${seller.documents.ktpImageUrl ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        <span className={seller.documents.ktpImageUrl ? 'text-green-700' : 'text-red-700'}>
                          KTP {seller.documents.ktpImageUrl ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${seller.documents.selfieImageUrl ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        <span className={seller.documents.selfieImageUrl ? 'text-green-700' : 'text-red-700'}>
                          Selfie {seller.documents.selfieImageUrl ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu Status */}
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 mb-1">Menu</div>
                    <div className="flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${seller.hasMenu ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      <span className={seller.hasMenu ? 'text-green-700' : 'text-red-700'}>
                        {seller.hasMenu ? `${seller.menuCount} items` : 'No items'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Banking */}
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 mb-1">Banking</div>
                    <div className="text-gray-600">
                      <div>{seller.bankInfo.bankName || 'Not Set'}</div>
                      {seller.bankInfo.bankAccountNumber && (
                        <div className="text-gray-500">***{seller.bankInfo.bankAccountNumber.slice(-4)}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Business Description */}
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 mb-1">Description</div>
                    <div className="text-gray-600 truncate">
                      {seller.businessDescription || 'No description'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredSellers.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sellers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filter !== 'all' ? 'Try adjusting your search or filter.' : 'No sellers have registered yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
