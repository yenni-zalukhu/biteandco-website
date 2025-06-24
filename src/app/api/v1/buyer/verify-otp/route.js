import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { sendWelcomeEmail } from '@/lib/email';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { email, userId, otp } = await request.json();

    // Validate input
    if (!email || !userId || !otp) {
      return withCORSHeaders(createErrorResponse('Email, userId, and OTP are required', 400));
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

    // Check if OTP matches
    if (buyerData.otp !== otp) {
      return withCORSHeaders(createErrorResponse('Invalid OTP', 400));
    }

    // Check if OTP has expired
    const otpExpiry = new Date(buyerData.otpExpiry);
    const now = new Date();
    
    if (now > otpExpiry) {
      return withCORSHeaders(createErrorResponse('OTP has expired', 400));
    }

    // Update buyer document - mark email as validated and remove OTP
    await db.collection('buyers').doc(userId).update({
      emailValidated: true,
      otp: null,
      otpExpiry: null,
      updatedAt: new Date().toISOString()
    });

    // Send welcome email
    const welcomeEmailSent = await sendWelcomeEmail(buyerData.email, buyerData.name);
    
    if (!welcomeEmailSent) {
      console.error('Failed to send welcome email, but verification completed');
    }

    return withCORSHeaders(createSuccessResponse({
      message: 'Email verified successfully',
      emailValidated: true
    }));

  } catch (error) {
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error'));
  }
}
