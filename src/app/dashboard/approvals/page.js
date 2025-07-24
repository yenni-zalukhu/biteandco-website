'use client'

import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore'
import { safeToDate } from '../../../lib/dateUtils'

export default function ApprovalsPage() {
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    const unsubscribe = setupRealtimeApprovals()
    return () => unsubscribe && unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setupRealtimeApprovals = () => {
    try {
      // Query sellers that are pending approval or recently processed
      const sellersRef = collection(db, 'sellers')
      const pendingQuery = query(sellersRef, where('status', 'in', ['pending', 'under_review', 'ready_for_approval']))
      
      const unsubscribe = onSnapshot(pendingQuery, 
        (snapshot) => {
          const approvalsData = []
          // console.log('Pending approvals found:', snapshot.size)
          
          snapshot.forEach((doc) => {
            const sellerData = doc.data()
            // console.log('Pending seller:', { id: doc.id, outletName: sellerData.outletName, status: sellerData.status })
            
            // Get menu items from categories
            const menuItems = []
            if (sellerData.categories && Array.isArray(sellerData.categories)) {
              sellerData.categories.forEach(category => {
                if (category.items && Array.isArray(category.items)) {
                  category.items.forEach(item => {
                    menuItems.push({
                      name: item.name || 'Unknown Item',
                      description: item.description || 'No description',
                      price: item.price || 0,
                      image: item.image || null,
                      category: category.name || 'Unknown Category'
                    })
                  })
                }
              })
            }

            approvalsData.push({
              id: doc.id,
              type: 'seller_registration',
              sellerId: doc.id,
              sellerName: sellerData.outletName || sellerData.businessName || 'Unknown Seller',
              email: sellerData.outletEmail || sellerData.email || '',
              phone: sellerData.outletPhone || sellerData.phone || '',
              businessName: sellerData.outletName || sellerData.businessName || '',
              category: sellerData.businessCategory || sellerData.category || 'Food & Beverage',
              location: sellerData.address || sellerData.outletAddress || 'Unknown',
              description: sellerData.businessDescription || sellerData.description || '',
              submittedAt: safeToDate(sellerData.createdAt),
              documents: sellerData.documents || [],
              ktpImageUrl: sellerData.ktpImageUrl || null,
              selfieImageUrl: sellerData.selfieImageUrl || null,
              storeIcon: sellerData.storeIcon || null,
              storeBanner: sellerData.storeBanner || null,
              categories: sellerData.categories || [],
              menuItems: menuItems,
              status: sellerData.status || 'pending'
            })
          })
          
          setPendingApprovals(approvalsData)
          setLoading(false)
          setError(null)
        },
        (error) => {
          console.error('Error fetching pending approvals:', error)
          setError('Failed to load pending approvals')
          setLoading(false)
          setPendingApprovals([])
        }
      )
      
      return unsubscribe
    } catch (error) {
      console.error('Error setting up realtime approvals:', error)
      setError('Failed to setup real-time data')
      setLoading(false)
      setPendingApprovals([])
    }
  }

  const handleApproval = async (approvalId, action) => {
    try {
      // Update seller approval status in Firebase
      const sellerRef = doc(db, 'sellers', approvalId)
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      
      await updateDoc(sellerRef, {
        status: newStatus,
        approvedAt: action === 'approve' ? new Date() : null,
        rejectedAt: action === 'reject' ? new Date() : null,
        updatedAt: new Date()
      })
      
      // Show success message
      alert(`Seller ${action === 'approve' ? 'approved' : 'rejected'} successfully!`)
      
      // console.log(`Seller ${approvalId} ${action}d successfully`)
    } catch (error) {
      console.error('Error handling approval:', error)
      alert(`Failed to ${action} seller. Please try again.`)
    }
  }

  const ImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
        <div className="max-w-4xl max-h-full p-4">
          <img
            src={imageUrl}
            alt="Document"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  const ApprovalCard = ({ approval }) => (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{approval.businessName}</h3>
            <p className="text-sm text-gray-600">{approval.email} • {approval.phone}</p>
            <p className="text-sm text-gray-500 mt-1">{approval.location}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              approval.status === 'ready_for_approval' || approval.status === 'approved'
                ? 'bg-green-600 text-white' 
                : approval.status === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-yellow-600 text-white'
            }`}>
              {approval.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              Submitted: {new Date(approval.submittedAt).toLocaleDateString()}
            </p>
            
            {/* Quick info badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {approval.menuItems && approval.menuItems.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                  {approval.menuItems.length} menu items
                </span>
              )}
              {approval.ktpImageUrl && approval.selfieImageUrl && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800">
                  Documents complete
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Business Information</h4>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Category:</span>
                <span className="ml-2 text-sm text-gray-900">{approval.category}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Description:</span>
                <p className="text-sm text-gray-900 mt-1">{approval.description}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Documents & Images</h4>
            <div className="space-y-3">
              {/* KTP Image */}
              {approval.ktpImageUrl && (
                <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <span className="text-sm text-gray-900">KTP Image</span>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600 text-white">
                      ✓ Available
                    </span>
                    <button 
                      onClick={() => setSelectedImage(approval.ktpImageUrl)}
                      className="text-[#711330] hover:text-[#8b1538] text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              )}
              
              {/* Selfie Image */}
              {approval.selfieImageUrl && (
                <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <span className="text-sm text-gray-900">Selfie with KTP</span>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600 text-white">
                      ✓ Available
                    </span>
                    <button 
                      onClick={() => setSelectedImage(approval.selfieImageUrl)}
                      className="text-[#711330] hover:text-[#8b1538] text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              )}

              {/* Store Icon */}
              {approval.storeIcon && (
                <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <span className="text-sm text-gray-900">Store Icon</span>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                      ✓ Available
                    </span>
                    <button 
                      onClick={() => setSelectedImage(approval.storeIcon)}
                      className="text-[#711330] hover:text-[#8b1538] text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              )}

              {/* Store Banner */}
              {approval.storeBanner && (
                <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <span className="text-sm text-gray-900">Store Banner</span>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                      ✓ Available
                    </span>
                    <button 
                      onClick={() => setSelectedImage(approval.storeBanner)}
                      className="text-[#711330] hover:text-[#8b1538] text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              )}

              {/* Additional Documents */}
              {approval.documents && approval.documents.length > 0 && approval.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <span className="text-sm text-gray-900">{doc.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      doc.verified ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {doc.verified ? '✓ Verified' : '✗ Pending'}
                    </span>
                    <button 
                      onClick={() => doc.url && setSelectedImage(doc.url)}
                      className="text-[#711330] hover:text-[#8b1538] text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}

              {/* No documents message */}
              {!approval.ktpImageUrl && !approval.selfieImageUrl && !approval.storeIcon && !approval.storeBanner && (!approval.documents || approval.documents.length === 0) && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No documents or images available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        {approval.menuItems && approval.menuItems.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Menu Items ({approval.menuItems.length} items)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approval.menuItems.slice(0, 6).map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  {/* Menu Image */}
                  {item.image && (
                    <div className="mb-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                        onClick={() => setSelectedImage(item.image)}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      {item.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900 ml-2">
                      Rp {item.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {approval.menuItems.length > 6 && (
              <p className="text-xs text-gray-500 mt-2">
                And {approval.menuItems.length - 6} more items...
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button className="text-sm text-gray-600 hover:text-gray-900">
              View Full Application
            </button>
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Contact Applicant
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleApproval(approval.id, 'reject')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#711330]"
            >
              Reject
            </button>
            <button
              onClick={() => handleApproval(approval.id, 'approve')}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#711330] hover:bg-[#8b1538] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#711330]"
            >
              Approve
            </button>
          </div>
        </div>
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

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Approvals</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#711330] hover:bg-[#8b1538]"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Image Modal */}
      <ImageModal 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Seller Approvals</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and approve new seller applications.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pendingApprovals.filter(a => a.status === 'under_review').length}
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
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ready to Approve</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pendingApprovals.filter(a => a.status === 'ready_for_approval').length}
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
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
                  <dd className="text-lg font-medium text-gray-900">{pendingApprovals.length}</dd>
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
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Review Time</dt>
                  <dd className="text-lg font-medium text-gray-900">2.5 days</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
          <p className="text-gray-500">All seller applications have been processed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingApprovals.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} />
          ))}
        </div>
      )}
    </div>
  )
}
