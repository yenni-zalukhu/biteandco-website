import { wrapCORS, createSuccessResponse, createErrorResponse } from '../../../../../lib/corsHandler';
import { db } from '../../../../../lib/firebase';
import { verifyBuyerJWT } from '../../../../../lib/jwtUtils';

export async function GET(request, { params }) {
  const { orderId } = params;

  if (!orderId) {
    return wrapCORS(createErrorResponse('Order ID is required', 400));
  }

  try {
    // Verify buyer authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return wrapCORS(createErrorResponse('Authorization header required', 401));
    }

    const token = authHeader.substring(7);
    let buyerData;
    try {
      buyerData = verifyBuyerJWT(token);
    } catch (err) {
      return wrapCORS(createErrorResponse('Invalid or expired token', 401));
    }

    // Get the order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return wrapCORS(createErrorResponse('Order not found', 404));
    }

    const orderData = orderDoc.data();

    // Verify this buyer owns the order
    if (orderData.buyerEmail !== buyerData.email) {
      return wrapCORS(createErrorResponse('You can only view your own orders', 403));
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
      rejectionReason: orderData.rejectionReason
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
      response.message = `Order rejected: ${orderData.rejectionReason}`;
    }
    // If order is still awaiting approval
    else if (orderData.statusProgress === 'awaiting_seller_approval') {
      response.message = 'Order is awaiting seller approval.';
    }
    // If payment is not required (BiteEco)
    else if (orderData.paymentStatus === 'not_required') {
      response.paymentRequired = false;
      response.message = 'Order approved. No payment required.';
    }
    else {
      response.message = 'Order status updated.';
    }

    return wrapCORS(createSuccessResponse(response));

  } catch (error) {
    console.error('Error getting order payment status:', error);
    return wrapCORS(createErrorResponse(error.message || 'Internal server error', 500));
  }
}
