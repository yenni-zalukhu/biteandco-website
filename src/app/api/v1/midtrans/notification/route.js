import { db } from '@/firebase/configure';
import midtransClient from 'midtrans-client';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { order_id, transaction_status, fraud_status, payment_type } = body;

    // Optionally, verify signature key here for extra security

    // Update Firestore order status
    const orderRef = db.collection('orders').doc(order_id);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return withCORSHeaders(new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 }));
    }

    // Map Midtrans status to your app's status
    let newStatus = transaction_status;
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      newStatus = 'success';
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      newStatus = 'failed';
    } else if (transaction_status === 'pending') {
      newStatus = 'pending';
    }

    await orderRef.update({
      status: newStatus,
      midtransStatus: transaction_status,
      fraudStatus: fraud_status,
      paymentType: payment_type,
      updatedAt: new Date().toISOString(),
    });

    return withCORSHeaders(new Response(JSON.stringify({ message: 'Order status updated', status: newStatus }), { status: 200 }));
  } catch (err) {
    return withCORSHeaders(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
  }
}
