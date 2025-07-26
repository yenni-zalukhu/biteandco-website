import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    console.log('Verifying OTP for seller email:', email, 'OTP:', otp);

    if (!email || !otp) {
      return withCORSHeaders(createErrorResponse('Email and OTP are required', 400));
    }

    // Find seller document
    const sellersSnapshot = await db.collection('sellers')
      .where('outletEmail', '==', email.toLowerCase())
      .get();

    if (sellersSnapshot.empty) {
      return withCORSHeaders(createErrorResponse('Email not found', 404));
    }

    const sellerDoc = sellersSnapshot.docs[0];
    const sellerData = sellerDoc.data();
    const sellerId = sellerDoc.id;

    console.log('Seller data:', {
      resetPasswordOTP: sellerData.resetPasswordOTP,
      resetPasswordOTPExpiry: sellerData.resetPasswordOTPExpiry,
      resetPasswordOTPVerified: sellerData.resetPasswordOTPVerified
    });

    if (!sellerData.resetPasswordOTP || !sellerData.resetPasswordOTPExpiry) {
      return withCORSHeaders(createErrorResponse('OTP not found or expired', 400));
    }

    // Check if OTP is expired
    const expiryTime = new Date(sellerData.resetPasswordOTPExpiry);
    if (new Date() > expiryTime) {
      // Clean up expired OTP
      await db.collection('sellers').doc(sellerId).update({
        resetPasswordOTP: null,
        resetPasswordOTPExpiry: null,
        resetPasswordOTPVerified: false,
      });
      return withCORSHeaders(createErrorResponse('OTP expired', 400));
    }

    // Verify OTP
    if (sellerData.resetPasswordOTP !== otp) {
      return withCORSHeaders(createErrorResponse('Invalid OTP', 400));
    }

    // Mark OTP as verified
    await db.collection('sellers').doc(sellerId).update({
      resetPasswordOTPVerified: true,
    });

    console.log('OTP verified successfully for seller:', sellerId);

    return withCORSHeaders(createSuccessResponse({
      message: 'OTP verified successfully',
      email: email
    }));

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    return withCORSHeaders(createErrorResponse('Internal server error', 500));
  }
}
