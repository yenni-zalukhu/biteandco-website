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

    console.log('Verifying OTP for email:', email, 'OTP:', otp);

    if (!email || !otp) {
      return withCORSHeaders(createErrorResponse('Email and OTP are required', 400));
    }

    // Find buyer document
    const buyersSnapshot = await db.collection('buyers')
      .where('email', '==', email)
      .get();

    if (buyersSnapshot.empty) {
      return withCORSHeaders(createErrorResponse('Email not found', 404));
    }

    const buyerDoc = buyersSnapshot.docs[0];
    const buyerData = buyerDoc.data();
    const buyerId = buyerDoc.id;

    console.log('Buyer data:', {
      resetOtp: buyerData.resetOtp,
      resetOtpExpiry: buyerData.resetOtpExpiry,
      resetOtpVerified: buyerData.resetOtpVerified
    });

    if (!buyerData.resetOtp || !buyerData.resetOtpExpiry) {
      return withCORSHeaders(createErrorResponse('OTP not found or expired', 400));
    }

    // Check if OTP is expired
    const expiryTime = new Date(buyerData.resetOtpExpiry);
    if (new Date() > expiryTime) {
      // Clean up expired OTP
      await db.collection('buyers').doc(buyerId).update({
        resetOtp: null,
        resetOtpExpiry: null,
        resetOtpVerified: false,
        updatedAt: new Date().toISOString(),
      });
      return withCORSHeaders(createErrorResponse('OTP has expired', 400));
    }

    // Verify OTP - convert both to strings for comparison
    const storedOTPString = String(buyerData.resetOtp);
    const inputOTPString = String(otp);
    
    console.log('Comparing OTPs:', {
      stored: storedOTPString,
      input: inputOTPString,
      match: storedOTPString === inputOTPString
    });

    if (storedOTPString !== inputOTPString) {
      return withCORSHeaders(createErrorResponse('Invalid OTP', 400));
    }

    // Mark OTP as verified in database
    await db.collection('buyers').doc(buyerId).update({
      resetOtpVerified: true,
      updatedAt: new Date().toISOString(),
    });

    return withCORSHeaders(createSuccessResponse({
      message: 'OTP verified successfully'
    }));
  } catch (error) {
    console.error('OTP verification error:', error);
    return withCORSHeaders(createErrorResponse('Internal server error', 500));
  }
}
