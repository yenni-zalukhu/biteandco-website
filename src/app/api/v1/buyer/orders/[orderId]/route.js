import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { verifyBuyerToken } from '@/middleware/buyerAuth';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return handleOptions();
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
    if (body.statusProgress) updateData.statusProgress = body.statusProgress;
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
