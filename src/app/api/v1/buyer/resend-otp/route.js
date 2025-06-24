import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { sendOTPEmail } from '@/lib/email';

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { email, userId } = await request.json();

    // Validate input
    if (!email || !userId) {
      return withCORSHeaders(createErrorResponse('Email and userId are required', 400));
    }

    // Get buyer document
    const buyerDoc = await db.collection('buyers').doc(userId).get();
    
    if (!buyerDoc.exists) {
      return withCORSHeaders(createErrorResponse('User not found', 404));
    }

    const buyerData = buyerDoc.data();

    // Check if email matches
    if (buyerData.email !== email) {
      return withCORSHeaders(createErrorResponse('Invalid email', 400));
    }

    // Check if email is already verified
    if (buyerData.emailValidated) {
      return withCORSHeaders(createErrorResponse('Email is already verified', 400));
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 5); // OTP expires in 5 minutes

    // Update buyer document with new OTP
    await db.collection('buyers').doc(userId).update({
      otp,
      otpExpiry: otpExpiry.toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Send new OTP email
    const emailSent = await sendOTPEmail(email, otp, buyerData.name);
    
    if (!emailSent) {
      console.error('Failed to send OTP email, but OTP was updated in database');
    }

    return withCORSHeaders(createSuccessResponse({ success: true }, 'OTP resent successfully. Please check your email.'));

  } catch (error) {
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error'));
  }
}
