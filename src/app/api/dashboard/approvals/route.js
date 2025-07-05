import { NextResponse } from 'next/server'

// Mock seller approvals data - replace with actual database queries
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

export async function GET() {
  try {
    // In a real application, you would:
    // 1. Query database for pending approvals
    // 2. Filter by status and type
    // 3. Include pagination
    // 4. Handle authentication

    return NextResponse.json({
      success: true,
      data: mockApprovals,
      total: mockApprovals.length
    })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { approvalId, action, reason } = body

    if (!approvalId || !action) {
      return NextResponse.json(
        { success: false, error: 'Approval ID and action are required' },
        { status: 400 }
      )
    }

    // Find the approval
    const approval = mockApprovals.find(a => a.id === approvalId)
    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      )
    }

    // Process the approval action
    switch (action) {
      case 'approve':
        // In a real application:
        // 1. Update seller status to 'active'
        // 2. Send approval email
        // 3. Create seller profile
        // 4. Log the action
        // console.log(`Approving seller: ${approval.sellerName}`)
        
        return NextResponse.json({
          success: true,
          message: `Seller ${approval.sellerName} has been approved successfully`,
          data: {
            sellerId: approval.sellerId,
            status: 'approved'
          }
        })

      case 'reject':
        // In a real application:
        // 1. Update application status to 'rejected'
        // 2. Send rejection email with reason
        // 3. Archive the application
        // 4. Log the action
        // console.log(`Rejecting seller: ${approval.sellerName}, reason: ${reason}`)
        
        return NextResponse.json({
          success: true,
          message: `Seller application for ${approval.sellerName} has been rejected`,
          data: {
            sellerId: approval.sellerId,
            status: 'rejected',
            reason: reason
          }
        })

      case 'request_info':
        // Request additional information
        // console.log(`Requesting additional info from: ${approval.sellerName}`)
        
        return NextResponse.json({
          success: true,
          message: `Additional information requested from ${approval.sellerName}`,
          data: {
            sellerId: approval.sellerId,
            status: 'info_requested'
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}
