import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { verifyToken } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/seller/customers
// Fetch all customers (buyers) who have placed orders with this seller
export async function GET(request) {
  try {
    // Verify seller token
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(NextResponse.json({ error: authResult.error }, { status: 401 }));
    }

    const { sellerId } = authResult;
    
    if (!sellerId) {
      return withCORSHeaders(NextResponse.json({ error: "Missing sellerId" }, { status: 400 }));
    }

    // Get all orders for this seller
    const ordersSnapshot = await db.collection('orders')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .get();

    if (ordersSnapshot.empty) {
      return withCORSHeaders(NextResponse.json({ 
        customers: [],
        message: 'No customers found'
      }));
    }

    // Create a map to store unique customers and their order details
    const customersMap = new Map();

    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      const buyerId = orderData.buyerId;
      
      if (!buyerId) continue;

      // If we haven't seen this customer before, or if this is a more recent order
      if (!customersMap.has(buyerId)) {
        // Fetch buyer details
        let buyerData = null;
        try {
          const buyerDoc = await db.collection('buyers').doc(buyerId).get();
          if (buyerDoc.exists) {
            buyerData = buyerDoc.data();
          }
        } catch (error) {
          console.warn(`Failed to fetch buyer ${buyerId}:`, error);
        }

        customersMap.set(buyerId, {
          id: buyerId,
          name: orderData.buyerName || buyerData?.name || 'Customer',
          email: orderData.buyerEmail || buyerData?.email || null,
          phone: orderData.buyerPhone || buyerData?.phone || null,
          address: orderData.deliveryAddress || '',
          kelurahan: orderData.kelurahan || '',
          kecamatan: orderData.kecamatan || '',
          provinsi: orderData.provinsi || '',
          kodepos: orderData.kodepos || '',
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          lastOrderId: null,
          lastOrderType: null,
          lastOrderStatus: null,
          orders: []
        });
      }

      // Update customer statistics
      const customer = customersMap.get(buyerId);
      customer.totalOrders += 1;
      customer.totalSpent += orderData.totalAmount || 0;
      
      // Update last order info if this is more recent
      const orderDate = new Date(orderData.createdAt);
      if (!customer.lastOrderDate || orderDate > new Date(customer.lastOrderDate)) {
        customer.lastOrderDate = orderData.createdAt;
        customer.lastOrderId = orderDoc.id;
        customer.lastOrderType = orderData.orderType || 'Catering';
        customer.lastOrderStatus = orderData.statusProgress || orderData.status || 'pending';
      }

      // Add order to customer's order history (limit to last 5 orders)
      if (customer.orders.length < 5) {
        customer.orders.push({
          id: orderDoc.id,
          date: orderData.createdAt,
          type: orderData.orderType || 'Catering',
          amount: orderData.totalAmount || 0,
          status: orderData.statusProgress || orderData.status || 'pending',
          items: orderData.items || [],
          notes: orderData.notes || '',
          pax: orderData.pax || 1
        });
      }
    }

    // Convert map to array and sort by total spent (descending)
    const customers = Array.from(customersMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

    return withCORSHeaders(NextResponse.json({ 
      customers,
      totalCustomers: customers.length,
      message: 'Customers retrieved successfully'
    }));

  } catch (error) {
    console.error('Error fetching customers:', error);
    return withCORSHeaders(NextResponse.json({ 
      error: 'Internal server error',
      debug: error.message 
    }, { status: 500 }));
  }
}
