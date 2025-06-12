import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request) {
  try {
    const { email, userId } = await request.json();

    // Validate input
    if (!email || !userId) {
      return createErrorResponse('Email and userId are required', 400);
    }

    // Get buyer document
    const buyerDoc = await db.collection('buyers').doc(userId).get();
    
    if (!buyerDoc.exists) {
      return createErrorResponse('User not found', 404);
    }

    const buyerData = buyerDoc.data();

    // Check if email matches
    if (buyerData.email !== email) {
      return createErrorResponse('Invalid email', 400);
    }

    // Check if email is already verified
    if (buyerData.emailValidated) {
      return createErrorResponse('Email is already verified', 400);
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

    // TODO: Send OTP email
    // For now, just log it (will be implemented when email service is ready)
    console.log(`New OTP for ${email}: ${otp}`);
    /* 
    // Email sending code will be added here later
    await sendEmail({
      to: email,
      subject: "Your new OTP - BiteAndCo",
      text: `Your new OTP is: ${otp}`,
    });
    */

    return createSuccessResponse({
      message: 'New OTP sent successfully'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    return createErrorResponse(error.message || 'Internal server error');
  }
}
