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

    // Check if OTP was verified
    const otpStore = global.otpStore || {};
    const storedOTP = otpStore[email];

    if (!storedOTP || !storedOTP.verified) {
      return withCORSHeaders(createErrorResponse('OTP not verified', 400));
    }

    // Check if OTP is expired
    if (new Date() > storedOTP.expiresAt) {
      delete otpStore[email];
      return withCORSHeaders(createErrorResponse('OTP has expired', 400));
    }

    // Find buyer document
    const buyersSnapshot = await db.collection('buyers')
      .where('email', '==', email)
      .get();

    if (buyersSnapshot.empty) {
      return withCORSHeaders(createErrorResponse('User not found', 404));
    }

    // Get buyer document
    const buyerDoc = buyersSnapshot.docs[0];
    const buyerId = buyerDoc.id;

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await db.collection('buyers').doc(buyerId).update({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    // Clean up OTP store
    delete otpStore[email];

    return withCORSHeaders(createSuccessResponse({
      message: 'Password reset successfully'
    }));
  } catch (error) {
    console.error('Password reset error:', error);
    return withCORSHeaders(createErrorResponse('Internal server error', 500));
  }
}
