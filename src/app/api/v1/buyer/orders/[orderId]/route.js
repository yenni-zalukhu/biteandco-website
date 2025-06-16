import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { verifyBuyerToken } from '@/middleware/buyerAuth';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return handleOptions();
}

// GET: Get order details for buyer
export async function GET(request, { params }) {
  try {
    const { orderId } = params;
    
    if (!orderId) {
      return withCORSHeaders(
        NextResponse.json({ error: "Missing orderId" }, { status: 400 })
      );
    }

    // Verify buyer token
    const auth = await verifyBuyerToken(request);
    if (auth.error) {
      return withCORSHeaders(
        NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
      );
    }

    const { buyerId } = auth;

    // Get order details
    const orderDoc = await db.collection("orders").doc(orderId).get();
    
    if (!orderDoc.exists) {
      return withCORSHeaders(
        NextResponse.json({ error: "Order not found" }, { status: 404 })
      );
    }

    const orderData = orderDoc.data();
    
    // Check if order belongs to the buyer
    if (orderData.buyerId !== buyerId) {
      return withCORSHeaders(
        NextResponse.json({ error: "Unauthorized - Order does not belong to this buyer" }, { status: 403 })
      );
    }

    const order = { id: orderDoc.id, ...orderData };
    
    return withCORSHeaders(
      NextResponse.json({ order })
    );

  } catch (error) {
    console.error('Error fetching order details:', error);
    return withCORSHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

// PATCH /api/v1/buyer/orders/[orderId]
export async function PATCH(request, { params }) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return withCORSHeaders(
        NextResponse.json({ error: 'Missing orderId in URL' }, { status: 400 })
      );
    }
    // Optionally, verify buyer token (uncomment if needed)
    // const auth = await verifyBuyerToken(request);
    // if (auth.error) {
    //   return withCORSHeaders(NextResponse.json({ error: auth.error }, { status: auth.status || 401 }));
    // }
    const body = await request.json();
    const updateData = {};
    if (body.status) updateData.status = body.status;
    // Do NOT update statusProgress from PATCH anymore
    updateData.updatedAt = new Date().toISOString();
    await db.collection('orders').doc(orderId).update(updateData);
    return withCORSHeaders(
      NextResponse.json({ success: true, orderId, updated: updateData })
    );
  } catch (error) {
    return withCORSHeaders(
      NextResponse.json({ error: 'Failed to update order', debug: error.message }, { status: 500 })
    );
  }
}
