import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { verifyBuyerToken } from '@/middleware/buyerAuth';
import { db } from '@/firebase/configure';
import midtransClient from 'midtrans-client';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function withCORSHeaders(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function GET(request) {
  try {
    // Debug log for Vercel
    console.log('[DEBUG][GET] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));
    console.log('[DEBUG][GET] MIDTRANS_MODE:', process.env.MIDTRANS_MODE);
    console.log('[DEBUG][GET] MIDTRANS_SANDBOX_SERVER_KEY:', process.env.MIDTRANS_SANDBOX_SERVER_KEY);
    console.log('[DEBUG][GET] MIDTRANS_PRODUCTION_SERVER_KEY:', process.env.MIDTRANS_PRODUCTION_SERVER_KEY);

    // Verify buyer token
    const auth = await verifyBuyerToken(request);
    console.log('[DEBUG][GET] verifyBuyerToken result:', auth);
    
    if (auth.error) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { buyerId } = auth;

    // Get buyer's orders from Firestore
    const ordersSnapshot = await db.collection('orders')
      .where('buyerId', '==', buyerId)
      .orderBy('createdAt', 'desc')
      .get();

    // Log the query for debugging index issues
    console.log('[FIRESTORE QUERY] buyerId ==', buyerId, 'orderBy createdAt desc');

    const orders = [];
    for (const doc of ordersSnapshot.docs) {
      const order = { id: doc.id, ...doc.data() };
      // Check payment status in Midtrans if snapToken exists
      if (order.snapToken) {
        try {
          let isProduction = false;
          let serverKey = process.env.MIDTRANS_SANDBOX_SERVER_KEY;
          if (process.env.MIDTRANS_MODE === 'production') {
            isProduction = true;
            serverKey = process.env.MIDTRANS_PRODUCTION_SERVER_KEY;
          }
          let snap = new midtransClient.Snap({ isProduction, serverKey });
          const status = await snap.transaction.status(order.id);
          order.paymentStatus = status.transaction_status;
        } catch (err) {
          order.paymentStatus = 'unknown';
        }
      } else {
        order.paymentStatus = order.status || 'pending';
      }
      orders.push(order);
    }

    const result = createSuccessResponse({
      orders
    }, 'Orders retrieved successfully');
    return withCORSHeaders(result);

  } catch (error) {
    console.error('Get buyer orders error:', error);
    const errRes = createErrorResponse(error.message || 'Internal server error');
    return withCORSHeaders(errRes);
  }
}

export async function POST(request) {
  try {
    // Debug log for Vercel
    console.log('[DEBUG][POST] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));
    console.log('[DEBUG][POST] MIDTRANS_MODE:', process.env.MIDTRANS_MODE);
    console.log('[DEBUG][POST] MIDTRANS_SANDBOX_SERVER_KEY:', process.env.MIDTRANS_SANDBOX_SERVER_KEY);
    console.log('[DEBUG][POST] MIDTRANS_PRODUCTION_SERVER_KEY:', process.env.MIDTRANS_PRODUCTION_SERVER_KEY);

    // Verify buyer token
    const auth = await verifyBuyerToken(request);
    console.log('[DEBUG][POST] verifyBuyerToken result:', auth);
    
    if (auth.error) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { buyerId, buyerData } = auth;
    const orderData = await request.json();

    // Validate order data
    if (!orderData.sellerId || !orderData.items || !orderData.totalAmount) {
      return createErrorResponse('Seller ID, items, and total amount are required', 400);
    }

    // Create new order
    const newOrder = {
      buyerId,
      buyerName: buyerData.name,
      buyerEmail: buyerData.email,
      buyerPhone: buyerData.phone,
      sellerId: orderData.sellerId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      status: 'pending',
      deliveryAddress: orderData.deliveryAddress || '',
      notes: orderData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firestore
    const orderRef = await db.collection('orders').add(newOrder);

    // Midtrans Snap integration
    let isProduction = false;
    let serverKey = process.env.MIDTRANS_SANDBOX_SERVER_KEY;
    if (process.env.MIDTRANS_MODE === 'production') {
      isProduction = true;
      serverKey = process.env.MIDTRANS_PRODUCTION_SERVER_KEY;
    }
    let snap = new midtransClient.Snap({
      isProduction,
      serverKey,
    });
    const parameter = {
      transaction_details: {
        order_id: orderRef.id,
        gross_amount: orderData.totalAmount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: buyerData.name,
        email: buyerData.email,
        phone: buyerData.phone,
      },
    };
    let snapResponse;
    try {
      snapResponse = await snap.createTransaction(parameter);
    } catch (err) {
      return createErrorResponse('Failed to create Midtrans transaction: ' + err.message, 500);
    }

    // Save snapUrl to Firestore order document
    await db.collection('orders').doc(orderRef.id).update({
      snapUrl: snapResponse.redirect_url,
      snapToken: snapResponse.token,
    });

    const result = createSuccessResponse({
      orderId: orderRef.id,
      order: {
        id: orderRef.id,
        ...newOrder,
        snapUrl: snapResponse.redirect_url,
        snapToken: snapResponse.token,
      },
      snapUrl: snapResponse.redirect_url,
      snapToken: snapResponse.token,
    }, 'Order created successfully');
    return withCORSHeaders(result);

  } catch (error) {
    console.error('Create order error:', error);
    const errRes = createErrorResponse(error.message || 'Internal server error');
    return withCORSHeaders(errRes);
  }
}
