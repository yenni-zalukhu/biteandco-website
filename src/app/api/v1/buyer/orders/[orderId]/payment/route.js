import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth';
import { db } from '@/firebase/configure';
import { verifyBuyerToken } from '@/middleware/buyerAuth';

export async function POST(request, { params }) {
  const { orderId } = params;

  console.log('Payment initiation request for order:', orderId);

  if (!orderId) {
    return withCORSHeaders(createErrorResponse('Order ID is required', 400));
  }

  try {
    // Verify buyer authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(createErrorResponse('Authorization header required', 401));
    }

    const token = authHeader.substring(7);
    let buyerData;
    try {
      buyerData = verifyBuyerToken(token);
    } catch (err) {
      return withCORSHeaders(createErrorResponse('Invalid or expired token', 401));
    }

    // Get the order
    let orderDoc;
    try {
      orderDoc = await db.collection('orders').doc(orderId).get();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return withCORSHeaders(createErrorResponse('Database connection failed', 500));
    }
    
    if (!orderDoc.exists) {
      return withCORSHeaders(createErrorResponse('Order not found', 404));
    }

    const orderData = orderDoc.data();

    console.log('Order payment initiation data:', {
      orderId,
      status: orderData.status,
      statusProgress: orderData.statusProgress,
      paymentStatus: orderData.paymentStatus,
      hasSnapUrl: !!orderData.snapUrl,
      buyerEmail: orderData.buyerEmail
    });

    // Verify this buyer owns the order
    if (orderData.buyerEmail !== buyerData.email) {
      return withCORSHeaders(createErrorResponse('You can only initiate payment for your own orders', 403));
    }

    // Check if order can accept payment
    if (orderData.statusProgress !== 'approved_awaiting_payment') {
      return withCORSHeaders(createErrorResponse('Order is not ready for payment', 400));
    }

    // If snapUrl already exists, return it
    if (orderData.snapUrl) {
      return withCORSHeaders(createSuccessResponse({
        orderId,
        snapUrl: orderData.snapUrl,
        snapToken: orderData.snapToken,
        paymentRequired: true,
        message: 'Payment link ready'
      }));
    }

    // If no snapUrl, generate new payment link (this would typically involve Midtrans API)
    // For now, we'll return an error asking them to wait
    return withCORSHeaders(createErrorResponse('Payment link is being generated. Please try again in a moment.', 422));

  } catch (error) {
    console.error('Error initiating payment:', error);
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error', 500));
  }
}

export async function GET(request, { params }) {
  const { orderId } = params;

  console.log('Payment status request for order:', orderId);

  if (!orderId) {
    return withCORSHeaders(createErrorResponse('Order ID is required', 400));
  }

  try {
    // Verify buyer authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCORSHeaders(createErrorResponse('Authorization header required', 401));
    }

    const token = authHeader.substring(7);
    let buyerData;
    try {
      buyerData = verifyBuyerToken(token);
    } catch (err) {
      return withCORSHeaders(createErrorResponse('Invalid or expired token', 401));
    }

    // Get the order
    let orderDoc;
    try {
      orderDoc = await db.collection('orders').doc(orderId).get();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return withCORSHeaders(createErrorResponse('Database connection failed', 500));
    }
    
    if (!orderDoc.exists) {
      return withCORSHeaders(createErrorResponse('Order not found', 404));
    }

    const orderData = orderDoc.data();

    console.log('Order payment data:', {
      orderId,
      status: orderData.status,
      statusProgress: orderData.statusProgress,
      paymentStatus: orderData.paymentStatus,
      hasSnapUrl: !!orderData.snapUrl,
      buyerEmail: orderData.buyerEmail
    });

    // Verify this buyer owns the order
    if (orderData.buyerEmail !== buyerData.email) {
      return withCORSHeaders(createErrorResponse('You can only view your own orders', 403));
    }

    // Check order status and return appropriate response
    const response = {
      orderId,
      status: orderData.status,
      statusProgress: orderData.statusProgress,
      paymentStatus: orderData.paymentStatus,
      totalAmount: orderData.totalAmount,
      orderType: orderData.orderType,
      approvedAt: orderData.approvedAt,
      rejectionReason: orderData.rejectionReason,
      paymentRequired: false // Default to false
    };

    // If order is approved and needs payment
    if (orderData.statusProgress === 'approved_awaiting_payment' && orderData.snapUrl) {
      response.paymentRequired = true;
      response.snapUrl = orderData.snapUrl;
      response.snapToken = orderData.snapToken;
      response.message = 'Order approved by seller. Please complete payment.';
    }
    // If order is rejected
    else if (orderData.statusProgress === 'cancelled' && orderData.rejectionReason) {
      response.paymentRequired = false;
      response.message = `Order rejected: ${orderData.rejectionReason}`;
    }
    // If order is still awaiting approval
    else if (orderData.statusProgress === 'awaiting_seller_approval') {
      response.paymentRequired = false;
      response.message = 'Order is awaiting seller approval.';
    }
    // If payment is not required (BiteEco)
    else if (orderData.paymentStatus === 'not_required') {
      response.paymentRequired = false;
      response.message = 'Order approved. No payment required.';
    }
    // If order is approved but no snapUrl yet
    else if (orderData.statusProgress === 'approved_awaiting_payment' && !orderData.snapUrl) {
      response.paymentRequired = false;
      response.message = 'Payment link is being generated. Please try again in a moment.';
    }
    else {
      response.paymentRequired = false;
      response.message = 'Order status updated.';
    }

    return withCORSHeaders(createSuccessResponse(response));

  } catch (error) {
    console.error('Error getting order payment status:', error);
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error', 500));
  }
}

export const OPTIONS = handleOptions;
