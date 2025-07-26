import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return withCORSHeaders(createErrorResponse('Email and password are required', 400));
    }

    // Find seller document
    const sellersSnapshot = await db.collection('sellers')
      .where('email', '==', email.toLowerCase())
      .get();

    if (sellersSnapshot.empty) {
      return withCORSHeaders(createErrorResponse('Seller not found', 404));
    }

    // Get seller document
    const sellerDoc = sellersSnapshot.docs[0];
    const sellerData = sellerDoc.data();
    const sellerId = sellerDoc.id;

    // Check if OTP was verified
    if (!sellerData.resetPasswordOTPVerified) {
      return withCORSHeaders(createErrorResponse('OTP not verified', 400));
    }

    // Check if OTP is expired
    if (sellerData.resetPasswordOTPExpiry) {
      const expiryTime = new Date(sellerData.resetPasswordOTPExpiry);
      if (new Date() > expiryTime) {
        // Clean up expired OTP
        await db.collection('sellers').doc(sellerId).update({
          resetPasswordOTP: null,
          resetPasswordOTPExpiry: null,
          resetPasswordOTPVerified: false,
          updatedAt: new Date().toISOString(),
        });
        return withCORSHeaders(createErrorResponse('OTP has expired', 400));
      }
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clean up reset data
    await db.collection('sellers').doc(sellerId).update({
      password: hashedPassword,
      resetPasswordOTP: null,
      resetPasswordOTPExpiry: null,
      resetPasswordOTPVerified: false,
      resetPasswordOTPCreatedAt: null,
      passwordUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('Password reset completed for seller:', sellerId);

    return withCORSHeaders(createSuccessResponse({
      message: 'Password has been reset successfully',
      email: email
    }));

  } catch (error) {
    console.error('Reset password complete error:', error);
    return withCORSHeaders(createErrorResponse('Internal server error', 500));
  }
}
