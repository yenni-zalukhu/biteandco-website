import { sendOTPEmail } from '@/lib/email';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { email, name } = await request.json();
    
    if (!email || !name) {
      return withCORSHeaders(createErrorResponse('Email and name are required', 400));
    }

    // Generate test OTP
    const testOTP = '1234';
    
    // Send test email
    const emailSent = await sendOTPEmail(email, testOTP, name);
    
    if (emailSent) {
      return withCORSHeaders(createSuccessResponse({ 
        message: 'Test email sent successfully',
        otp: testOTP 
      }));
    } else {
      return withCORSHeaders(createErrorResponse('Failed to send email', 500));
    }
    
  } catch (error) {
    console.error('Test email error:', error);
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error', 500));
  }
}
