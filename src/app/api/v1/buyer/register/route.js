import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { name, email, phone, password } = await request.json();

    // Validate input
    if (!name || !email || !phone || !password) {
      return withCORSHeaders(createErrorResponse('All fields are required', 400));
    }

    // Check if email already exists
    const buyersSnapshot = await db.collection('buyers')
      .where('email', '==', email)
      .get();

    if (!buyersSnapshot.empty) {
      return withCORSHeaders(createErrorResponse('Email already registered', 400));
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 5); // OTP expires in 5 minutes

    // Create new buyer document
    const buyerRef = await db.collection('buyers').add({
      name,
      email,
      phone,
      password, // Note: In production, hash the password before storing
      emailValidated: false,
      phoneValidated: false,
      otp,
      otpExpiry: otpExpiry.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // TODO: Send OTP email
    // For now, just log it (will be implemented when email service is ready)
    console.log(`OTP for ${email}: ${otp}`);
    /* 
    // Email sending code will be added here later
    await sendEmail({
      to: email,
      subject: "Verify your email - BiteAndCo",
      text: `Your OTP is: ${otp}`,
    });
    */

    return withCORSHeaders(createSuccessResponse({
      userId: buyerRef.id
    }, 'Registration successful. Please check your email for OTP.'));

  } catch (error) {
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error'));
  }
}
