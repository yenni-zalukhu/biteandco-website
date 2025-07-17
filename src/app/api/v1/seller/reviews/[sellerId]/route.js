import { NextResponse } from "next/server";
import { db } from "@/firebase/configure";
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

// GET: Get reviews for a specific seller
export async function GET(request, { params }) {
  try {
    const { sellerId } = params;

    if (!sellerId) {
      return withCORSHeaders(createErrorResponse('Seller ID is required', 400));
    }

    // Fetch reviews for the seller
    const reviewsSnapshot = await db.collection('reviews')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = [];
    reviewsSnapshot.forEach((doc) => {
      reviews.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return withCORSHeaders(createSuccessResponse({
      reviews: reviews,
      total: reviews.length,
    }, 'Reviews retrieved successfully'));

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return withCORSHeaders(createErrorResponse('Failed to fetch reviews', 500));
  }
}
