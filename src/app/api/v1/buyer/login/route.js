import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return withCORSHeaders(createErrorResponse('Email and password are required', 400));
    }

    // Get buyer with matching email
    const buyersSnapshot = await db.collection('buyers')
      .where('email', '==', email)
      .get();

    if (buyersSnapshot.empty) {
      return withCORSHeaders(createErrorResponse('Email atau password salah', 401));
    }

    const buyerDoc = buyersSnapshot.docs[0];
    const buyerData = buyerDoc.data();

    // Check if email is verified
    if (!buyerData.emailValidated) {
      return withCORSHeaders(createErrorResponse('Email belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu.', 401));
    }

    // Verify password
    // Note: In production, use proper password hashing comparison
    if (buyerData.password !== password) {
      return withCORSHeaders(createErrorResponse('Email atau password salah', 401));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        buyerId: buyerDoc.id,
        email: buyerData.email,
        name: buyerData.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success with token
    const res = createSuccessResponse({
      token,
      user: {
        id: buyerDoc.id,
        name: buyerData.name,
        email: buyerData.email,
        phone: buyerData.phone,
      }
    }, 'Login successful');
    return withCORSHeaders(res);

  } catch (error) {
    console.error('Buyer login error:', error);
    const errRes = createErrorResponse(error.message || 'Internal server error');
    return withCORSHeaders(errRes);
  }
}
