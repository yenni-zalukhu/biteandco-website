import { NextResponse } from "next/server";
import { db } from "@/firebase/configure";
import { verifyBuyerToken } from '@/middleware/buyerAuth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

// POST: Create a new review
export async function POST(request) {
  try {
    // Verify buyer token
    const auth = await verifyBuyerToken(request);
    if (auth.error) {
      return withCORSHeaders(createErrorResponse(auth.error, auth.status));
    }

    const { buyerId, buyerData } = auth;
    const { rating, review, orderId, sellerId } = await request.json();

    // Validate input
    if (!rating || !review || !orderId || !sellerId) {
      return withCORSHeaders(createErrorResponse('Rating, review, orderId, and sellerId are required', 400));
    }

    if (rating < 1 || rating > 5) {
      return withCORSHeaders(createErrorResponse('Rating must be between 1 and 5', 400));
    }

    // Check if order exists and belongs to the buyer
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return withCORSHeaders(createErrorResponse('Order not found', 404));
    }

    const orderData = orderDoc.data();
    if (orderData.buyerId !== buyerId) {
      return withCORSHeaders(createErrorResponse('Unauthorized - Order does not belong to this buyer', 403));
    }

    if (orderData.statusProgress !== 'completed') {
      return withCORSHeaders(createErrorResponse('Can only review completed orders', 400));
    }

    // Check if review already exists for this order
    if (orderData.ulasan) {
      return withCORSHeaders(createErrorResponse('Review already exists for this order', 400));
    }

    // Create review data
    const reviewData = {
      rating: parseInt(rating),
      review: review.trim(),
      buyerId: buyerId,
      buyerName: buyerData.name,
      sellerId: sellerId,
      orderId: orderId,
      createdAt: new Date().toISOString(),
    };

    // Add review to reviews collection
    const reviewRef = await db.collection('reviews').add(reviewData);

    // Update the order with review reference
    await orderRef.update({
      ulasan: {
        id: reviewRef.id,
        rating: parseInt(rating),
        review: review.trim(),
        createdAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    // Update seller's rating statistics
    try {
      const sellerRef = db.collection('sellers').doc(sellerId);
      const sellerDoc = await sellerRef.get();
      
      if (sellerDoc.exists) {
        const sellerData = sellerDoc.data();
        const currentRating = sellerData.rating || 0;
        const currentRatingCount = sellerData.rating_count || 0;
        
        // Calculate new average rating
        const newRatingCount = currentRatingCount + 1;
        const totalRating = (currentRating * currentRatingCount) + parseInt(rating);
        const newAverageRating = totalRating / newRatingCount;
        
        await sellerRef.update({
          rating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal place
          rating_count: newRatingCount,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (sellerUpdateError) {
      console.error('Error updating seller rating:', sellerUpdateError);
      // Don't fail the entire request if seller update fails
    }

    return withCORSHeaders(createSuccessResponse({
      reviewId: reviewRef.id,
      review: {
        id: reviewRef.id,
        ...reviewData,
      }
    }, 'Review submitted successfully'));

  } catch (error) {
    console.error('Error submitting review:', error);
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error'));
  }
}

// GET: Get reviews for a seller (optional, for future use)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    
    if (!sellerId) {
      return withCORSHeaders(createErrorResponse('sellerId is required', 400));
    }

    // Get reviews for the seller
    const reviewsSnapshot = await db.collection('reviews')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return withCORSHeaders(createSuccessResponse({
      reviews
    }, 'Reviews retrieved successfully'));

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error'));
  }
}
