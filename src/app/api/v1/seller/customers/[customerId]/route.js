import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { verifyToken } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/seller/customers/[customerId]
// Fetch detailed information about a specific customer including full order history
export async function GET(request, { params }) {
  try {
    // Verify seller token
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(NextResponse.json({ error: authResult.error }, { status: 401 }));
    }

    const { sellerId } = authResult;
    const { customerId } = await params;
    
    if (!sellerId) {
      return withCORSHeaders(NextResponse.json({ error: "Missing sellerId" }, { status: 400 }));
    }

    if (!customerId) {
      return withCORSHeaders(NextResponse.json({ error: "Missing customerId" }, { status: 400 }));
    }

    // Fetch customer basic info
    let customerData = null;
    try {
      const buyerDoc = await db.collection('buyers').doc(customerId).get();
      if (buyerDoc.exists) {
        customerData = buyerDoc.data();
      }
    } catch (error) {
      console.warn(`Failed to fetch customer ${customerId}:`, error);
    }

    // Get all orders from this customer to this seller
    const ordersSnapshot = await db.collection('orders')
      .where('sellerId', '==', sellerId)
      .where('buyerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();

    if (ordersSnapshot.empty) {
      return withCORSHeaders(NextResponse.json({ 
        error: 'Customer not found or no orders from this customer',
        customerId 
      }, { status: 404 }));
    }

    // Process all orders
    const orders = [];
    let totalSpent = 0;
    let lastOrderDate = null;
    let mostRecentAddress = '';
    let preferredService = {};
    let allergyNotes = [];

    ordersSnapshot.docs.forEach(orderDoc => {
      const orderData = orderDoc.data();
      const orderDate = new Date(orderData.createdAt);
      
      // Update last order date
      if (!lastOrderDate || orderDate > lastOrderDate) {
        lastOrderDate = orderDate;
        mostRecentAddress = orderData.deliveryAddress || '';
      }

      // Track total spent
      totalSpent += orderData.totalAmount || 0;

      // Track service preferences
      const serviceType = orderData.orderType || 'Catering';
      preferredService[serviceType] = (preferredService[serviceType] || 0) + 1;

      // Collect allergy/custom notes
      if (orderData.notes && orderData.notes.toLowerCase().includes('alergi') || 
          orderData.notes && orderData.notes.toLowerCase().includes('diabetes') ||
          orderData.notes && orderData.notes.toLowerCase().includes('diet')) {
        if (!allergyNotes.includes(orderData.notes)) {
          allergyNotes.push(orderData.notes);
        }
      }

      orders.push({
        id: orderDoc.id,
        date: orderData.createdAt,
        type: orderData.orderType || 'Catering',
        amount: orderData.totalAmount || 0,
        status: orderData.statusProgress || orderData.status || 'pending',
        items: orderData.items || [],
        notes: orderData.notes || '',
        pax: orderData.pax || 1,
        address: orderData.deliveryAddress || '',
        kelurahan: orderData.kelurahan || '',
        kecamatan: orderData.kecamatan || '',
        provinsi: orderData.provinsi || '',
        packageType: orderData.packageType || null,
        startDate: orderData.startDate || null,
        endDate: orderData.endDate || null,
        dailyDeliveryLogs: orderData.dailyDeliveryLogs || []
      });
    });

    // Determine most preferred service
    const mostPreferredService = Object.entries(preferredService)
      .sort(([,a], [,b]) => b - a)
      .map(([service]) => service)[0] || 'Catering';

    // Build customer profile
    const customerProfile = {
      id: customerId,
      name: customerData?.name || orders[0]?.buyerName || 'Customer',
      email: customerData?.email || orders[0]?.buyerEmail || null,
      phone: customerData?.phone || orders[0]?.buyerPhone || null,
      address: mostRecentAddress,
      totalOrders: orders.length,
      totalSpent: totalSpent,
      lastOrderDate: lastOrderDate?.toISOString(),
      mostPreferredService: mostPreferredService,
      servicePreferences: preferredService,
      allergyNotes: allergyNotes,
      averageOrderValue: totalSpent / orders.length,
      customerSince: orders[orders.length - 1]?.date, // First order date
      orders: orders
    };

    return withCORSHeaders(NextResponse.json({ 
      customer: customerProfile,
      message: 'Customer details retrieved successfully'
    }));

  } catch (error) {
    console.error('Error fetching customer details:', error);
    return withCORSHeaders(NextResponse.json({ 
      error: 'Internal server error',
      debug: error.message 
    }, { status: 500 }));
  }
}
