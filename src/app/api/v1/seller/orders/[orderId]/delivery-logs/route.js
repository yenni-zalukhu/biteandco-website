
import { NextResponse } from "next/server";
import { db } from "@/firebase/configure";
import { verifyToken } from '@/lib/auth';
import { withCORSHeaders } from '@/lib/cors';

/**
 * GET /api/v1/seller/orders/[orderId]/delivery-logs
 * Get daily delivery logs for a recurring Rantangan order
 */
export async function GET(req, { params }) {
  try {
    const authResult = verifyToken(req);
    if (authResult.error) {
      return withCORSHeaders(NextResponse.json({ error: authResult.error }, { status: 401 }));
    }

    const { sellerId } = authResult;
    const { orderId } = params;
    
    if (!orderId) {
      return withCORSHeaders(NextResponse.json({ error: "Missing orderId" }, { status: 400 }));
    }

    // Get order document
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) {
      return withCORSHeaders(NextResponse.json({ error: "Order not found" }, { status: 404 }));
    }

    const orderData = orderSnap.data();
    
    if (orderData.sellerId !== sellerId) {
      return withCORSHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 403 }));
    }

    // Get daily delivery logs
    const dailyDeliveryLogs = orderData.dailyDeliveryLogs || [];
    
    // Calculate summary information
    const startDate = new Date(orderData.startDate);
    const endDate = new Date(orderData.endDate);
    const today = new Date();
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const completedDays = dailyDeliveryLogs.length;
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return withCORSHeaders(NextResponse.json({
      success: true,
      dailyDeliveryLogs,
      summary: {
        orderType: orderData.orderType,
        packageType: orderData.packageType,
        startDate: orderData.startDate,
        endDate: orderData.endDate,
        statusProgress: orderData.statusProgress,
        totalDays,
        completedDays,
        daysRemaining,
        isFullyCompleted: orderData.statusProgress === 'completed'
      }
    }));

  } catch (error) {
    console.error('[Get Delivery Logs Error]', error);
    return withCORSHeaders(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return withCORSHeaders(new Response(null, { status: 200 }));
}
