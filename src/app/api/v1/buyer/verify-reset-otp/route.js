import { NextResponse } from 'next/server';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return withCORSHeaders(createErrorResponse('Email and OTP are required', 400));
    }

    // Check OTP from store
    const otpStore = global.otpStore || {};
    const storedOTP = otpStore[email];

    if (!storedOTP) {
      return withCORSHeaders(createErrorResponse('OTP not found or expired', 400));
    }

    // Check if OTP is expired
    if (new Date() > storedOTP.expiresAt) {
      delete otpStore[email];
      return withCORSHeaders(createErrorResponse('OTP has expired', 400));
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      return withCORSHeaders(createErrorResponse('Invalid OTP', 400));
    }

    // Mark OTP as verified (keep it for password reset)
    otpStore[email].verified = true;

    return withCORSHeaders(createSuccessResponse({
      message: 'OTP verified successfully'
    }));
  } catch (error) {
    console.error('OTP verification error:', error);
    return withCORSHeaders(createErrorResponse('Internal server error', 500));
  }
}
