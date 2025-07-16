import { wrapCORS, createSuccessResponse, createErrorResponse } from '../../../../lib/corsHandler';
import { db } from '../../../../lib/firebase';
import { verifySellerJWT } from '../../../../lib/jwtUtils';
import midtransClient from 'midtrans-client';

export async function POST(request) {
  const reqData = await request.json();
  const { orderId, action, rejectionReason } = reqData; // action: 'approve' or 'reject'

  if (!orderId || !action) {
    return wrapCORS(createErrorResponse('Order ID and action are required', 400));
  }

  if (!['approve', 'reject'].includes(action)) {
    return wrapCORS(createErrorResponse('Action must be approve or reject', 400));
  }

  try {
    // Verify seller authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return wrapCORS(createErrorResponse('Authorization header required', 401));
    }

    const token = authHeader.substring(7);
    let sellerData;
    try {
      sellerData = verifySellerJWT(token);
    } catch (err) {
      return wrapCORS(createErrorResponse('Invalid or expired token', 401));
    }

    // Get the order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return wrapCORS(createErrorResponse('Order not found', 404));
    }

    const orderData = orderDoc.data();

    // Verify this seller owns the order
    if (orderData.sellerId !== sellerData.id) {
      return wrapCORS(createErrorResponse('You can only manage your own orders', 403));
    }

    // Check if order is in correct status
    if (orderData.statusProgress !== 'awaiting_seller_approval') {
      return wrapCORS(createErrorResponse('Order is not awaiting seller approval', 400));
    }

    if (action === 'reject') {
      // Reject the order
      await db.collection('orders').doc(orderId).update({
        status: 'cancelled',
        statusProgress: 'cancelled',
        rejectionReason: rejectionReason || 'Rejected by seller',
        updatedAt: new Date().toISOString()
      });

      return wrapCORS(createSuccessResponse({
        orderId,
        message: 'Order rejected successfully'
      }));
    }

    if (action === 'approve') {
      // For BiteEco or free orders, approve directly without payment
      if (orderData.orderType === 'Bite Eco' || orderData.totalAmount === 0 || orderData.paymentStatus === 'not_required') {
        await db.collection('orders').doc(orderId).update({
          status: 'processing',
          statusProgress: 'processing',
          paymentStatus: 'not_required',
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        return wrapCORS(createSuccessResponse({
          orderId,
          message: 'BiteEco order approved successfully',
          paymentRequired: false
        }));
      }

      // For paid orders, create Midtrans payment link
      let isProduction = false;
      let serverKey = process.env.MIDTRANS_SANDBOX_SERVER_KEY;
      if (process.env.MIDTRANS_MODE === 'production') {
        isProduction = true;
        serverKey = process.env.MIDTRANS_PRODUCTION_SERVER_KEY;
      }

      const snap = new midtransClient.Snap({
        isProduction,
        serverKey,
      });

      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: orderData.totalAmount,
        },
        credit_card: {
          secure: true,
        },
        customer_details: {
          first_name: orderData.buyerName,
          email: orderData.buyerEmail,
          phone: orderData.buyerPhone,
        },
      };

      let snapResponse;
      try {
        snapResponse = await snap.createTransaction(parameter);
      } catch (err) {
        console.error('Midtrans error:', err);
        return wrapCORS(createErrorResponse('Failed to create payment link: ' + err.message, 500));
      }

      // Update order with payment link and approved status
      await db.collection('orders').doc(orderId).update({
        statusProgress: 'approved_awaiting_payment',
        snapUrl: snapResponse.redirect_url,
        snapToken: snapResponse.token,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return wrapCORS(createSuccessResponse({
        orderId,
        message: 'Order approved successfully. Payment link generated.',
        paymentRequired: true,
        snapUrl: snapResponse.redirect_url,
        snapToken: snapResponse.token
      }));
    }

  } catch (error) {
    console.error('Error processing seller action:', error);
    return wrapCORS(createErrorResponse(error.message || 'Internal server error', 500));
  }
}
