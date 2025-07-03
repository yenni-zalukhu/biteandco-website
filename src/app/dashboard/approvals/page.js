'use client'

import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore'
import { safeToDate } from '../../../lib/dateUtils'

export default function ApprovalsPage() {
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = setupRealtimeApprovals()
    return () => unsubscribe && unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setupRealtimeApprovals = () => {
    try {
      // Query sellers that are pending approval
      const sellersRef = collection(db, 'sellers')
      const pendingQuery = query(sellersRef, where('status', 'in', ['pending', 'under_review']))
      
      const unsubscribe = onSnapshot(pendingQuery, 
        (snapshot) => {
          const approvalsData = []
          console.log('Pending approvals found:', snapshot.size)
          
          snapshot.forEach((doc) => {
            const sellerData = doc.data()
            console.log('Pending seller:', { id: doc.id, outletName: sellerData.outletName, status: sellerData.status })
            
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
          
          // Fallback to mock data if Firebase fails
          fetchPendingApprovals()
        }
      )
      
      return unsubscribe
    } catch (error) {
      console.error('Error setting up realtime approvals:', error)
      setError('Failed to setup real-time data')
      setLoading(false)
      fetchPendingApprovals()
    }
  }

  const fetchPendingApprovals = async () => {
    try {
      // Mock data - replace with actual API call
      const mockApprovals = [
        {
          id: 1,
          type: 'seller_registration',
          sellerId: 2,
          sellerName: 'Kedai Nusantara',
          email: 'nusantara@email.com',
          phone: '+62 813-9876-5432',
          businessName: 'Kedai Nusantara',
          category: 'Indonesian Food',
          location: 'Bandung, Jawa Barat',
          description: 'Authentic Indonesian cuisine with traditional recipes passed down through generations.',
          submittedAt: '2024-06-20T10:30:00Z',
          documents: [
            { name: 'Business License', url: '/docs/business-license.pdf', verified: false },
            { name: 'Health Certificate', url: '/docs/health-cert.pdf', verified: true },
            { name: 'Tax Registration', url: '/docs/tax-reg.pdf', verified: false }
          ],
          menuItems: [
            { name: 'Nasi Gudeg', price: 15000, description: 'Traditional Yogyakarta jackfruit curry' },
            { name: 'Rendang', price: 25000, description: 'Slow-cooked beef in coconut curry' },
            { name: 'Gado-gado', price: 12000, description: 'Indonesian vegetable salad with peanut sauce' }
          ],
          status: 'under_review'
        },
        {
          id: 2,
          type: 'seller_registration',
          sellerId: 6,
          sellerName: 'Warung Bahari',
          email: 'bahari@email.com',
          phone: '+62 814-5555-9999',
          businessName: 'Warung Bahari Seafood',
          category: 'Seafood',
          location: 'Jakarta Utara',
          description: 'Fresh seafood restaurant specializing in grilled fish and seafood dishes.',
          submittedAt: '2024-06-21T14:15:00Z',
          documents: [
            { name: 'Business License', url: '/docs/business-license-2.pdf', verified: true },
            { name: 'Health Certificate', url: '/docs/health-cert-2.pdf', verified: true },
            { name: 'Tax Registration', url: '/docs/tax-reg-2.pdf', verified: true }
          ],
          menuItems: [
            { name: 'Grilled Snapper', price: 45000, description: 'Fresh snapper grilled with Indonesian spices' },
            { name: 'Seafood Platter', price: 85000, description: 'Mixed seafood with rice and vegetables' },
            { name: 'Fish Soup', price: 20000, description: 'Clear fish soup with vegetables' }
          ],
          status: 'ready_for_approval'
        }
      ]
      setPendingApprovals(mockApprovals)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
      setLoading(false)
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
      
      console.log(`Seller ${approvalId} ${action}d successfully`)
    } catch (error) {
      console.error('Error handling approval:', error)
      alert(`Failed to ${action} seller. Please try again.`)
    }
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
              approval.status === 'ready_for_approval' 
                ? 'bg-green-600 text-white' 
                : 'bg-yellow-600 text-white'
            }`}>
              {approval.status.replace('_', ' ')}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              Submitted: {new Date(approval.submittedAt).toLocaleDateString()}
            </p>
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
            <h4 className="text-sm font-medium text-gray-900 mb-3">Documents</h4>
            <div className="space-y-2">
              {approval.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{doc.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      doc.verified ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {doc.verified ? '✓ Verified' : '✗ Pending'}
                    </span>
                    <button className="text-[#711330] hover:text-[#8b1538] text-sm">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Sample Menu Items</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {approval.menuItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    Rp {item.price.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
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

  return (
    <div>
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
