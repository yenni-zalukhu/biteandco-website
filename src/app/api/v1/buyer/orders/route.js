import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { verifyBuyerToken } from '@/middleware/buyerAuth';
import { db } from '@/firebase/configure';
import midtransClient from 'midtrans-client';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

function wrapCORS(response) {
  return withCORSHeaders(response);
}

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
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
      return wrapCORS(createErrorResponse(auth.error, auth.status));
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

      // Use stored statusProgress if exists, otherwise map status to statusProgress for frontend
      let statusProgress = order.statusProgress;
      if (!statusProgress) {
        // Default: waiting_approval -> processing -> delivery -> completed
        if (order.status === 'pending' || order.paymentStatus === 'pending') {
          statusProgress = 'waiting_approval';
        } else if (
          order.status === 'processing' ||
          order.status === 'diproses' ||
          order.paymentStatus === 'processing'
        ) {
          statusProgress = 'processing';
        } else if (
          order.status === 'delivery' ||
          order.status === 'pengiriman' ||
          order.paymentStatus === 'delivery'
        ) {
          statusProgress = 'delivery';
        } else if (
          order.status === 'completed' ||
          order.status === 'selesai' ||
          order.paymentStatus === 'settlement' ||
          order.paymentStatus === 'success' ||
          order.paymentStatus === 'completed'
        ) {
          statusProgress = 'completed';
        } else if (
          order.status === 'cancelled' ||
          order.status === 'dibatalkan' ||
          order.paymentStatus === 'cancel' ||
          order.paymentStatus === 'failed' ||
          order.paymentStatus === 'expire'
        ) {
          statusProgress = 'cancelled';
        } else {
          statusProgress = 'waiting_approval';
        }
      }
      order.statusProgress = statusProgress;
      orders.push(order);
    }

    return wrapCORS(createSuccessResponse({
      orders
    }, 'Orders retrieved successfully'));

  } catch (error) {
    return wrapCORS(createErrorResponse(error.message || 'Internal server error'));
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
      return wrapCORS(createErrorResponse(auth.error, auth.status));
    }

    const { buyerId, buyerData } = auth;
    const orderData = await request.json();

    // Validate order data
    if (!orderData.sellerId || !orderData.items || !orderData.totalAmount) {
      return wrapCORS(createErrorResponse('Seller ID, items, and total amount are required', 400));
    }

    // Fetch seller data to get seller coordinates
    let sellerData = null;
    let sellerLat = orderData.sellerLat || null; // Use from request first
    let sellerLng = orderData.sellerLng || null; // Use from request first
    
    try {
      const sellerDoc = await db.collection('sellers').doc(orderData.sellerId).get();
      if (sellerDoc.exists) {
        sellerData = sellerDoc.data();
        // Use coordinates from database if not provided in request
        if (!sellerLat) sellerLat = sellerData.pinLat || null;
        if (!sellerLng) sellerLng = sellerData.pinLng || null;
      }
    } catch (error) {
      console.error('Error fetching seller data:', error);
    }

    // Calculate distance between buyer and seller if coordinates are available
    let distance = null;
    if (orderData.buyerLat && orderData.buyerLng && sellerLat && sellerLng) {
      distance = calculateDistance(orderData.buyerLat, orderData.buyerLng, sellerLat, sellerLng);
      console.log(`[ORDER] Distance calculated: ${distance}km between buyer(${orderData.buyerLat}, ${orderData.buyerLng}) and seller(${sellerLat}, ${sellerLng})`);
    } else {
      console.log(`[ORDER] Cannot calculate distance - buyer coords: ${orderData.buyerLat}, ${orderData.buyerLng}, seller coords: ${sellerLat}, ${sellerLng}`);
    }

    // Create new order
    // Determine statusProgress for new order
    let statusProgress = 'waiting_approval';
    // Default: waiting_approval -> processing -> delivery -> completed
    if ('pending' === 'pending') {
      statusProgress = 'waiting_approval';
    }
    const newOrder = {
      buyerId,
      buyerName: buyerData.name,
      buyerEmail: buyerData.email,
      buyerPhone: buyerData.phone,
      sellerId: orderData.sellerId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      status: 'pending',
      statusProgress, // <-- add statusProgress to Firestore
      deliveryAddress: orderData.deliveryAddress || '',
      kelurahan: orderData.kelurahan || '',
      kecamatan: orderData.kecamatan || '',
      provinsi: orderData.provinsi || '',
      kodepos: orderData.kodepos || '',
      notes: orderData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pax: orderData.pax ? parseInt(orderData.pax) || 1 : 1, // Store pax if provided
      orderType: orderData.orderType || '', // Store OrderType if provided
      // Add date fields for Rantangan orders
      startDate: orderData.startDate || null,
      endDate: orderData.endDate || null,
      packageType: orderData.packageType || null,
      // Add buyer coordinates
      buyerLat: orderData.buyerLat || null,
      buyerLng: orderData.buyerLng || null,
      // Add seller coordinates from seller document
      sellerLat: sellerLat,
      sellerLng: sellerLng,
      sellerName: sellerData?.outletName || sellerData?.name || null,
      sellerAddress: sellerData?.address || null,
      sellerPinAddress: sellerData?.pinAddress || null,
      // Add calculated distance
      distance: distance,
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
      return wrapCORS(createErrorResponse('Failed to create Midtrans transaction: ' + err.message, 500));
    }

    // Save snapUrl to Firestore order document
    await db.collection('orders').doc(orderRef.id).update({
      snapUrl: snapResponse.redirect_url,
      snapToken: snapResponse.token,
    });

    return wrapCORS(createSuccessResponse({
      orderId: orderRef.id,
      order: {
        id: orderRef.id,
        ...newOrder,
        snapUrl: snapResponse.redirect_url,
        snapToken: snapResponse.token,
      },
      snapUrl: snapResponse.redirect_url,
      snapToken: snapResponse.token,
    }, 'Order created successfully'));

  } catch (error) {
    return wrapCORS(createErrorResponse(error.message || 'Internal server error'));
  }
}
