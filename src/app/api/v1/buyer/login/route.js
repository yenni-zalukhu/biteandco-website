import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
      return withCORSHeaders(NextResponse.json({
        success: false,
        message: 'Email belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu.',
        userId: buyerDoc.id,
        email: buyerData.email
      }, { status: 401 }));
    }

    // Verify password
    let passwordValid = false;
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, etc.)
    if (buyerData.password && buyerData.password.startsWith('$2')) {
      // Compare with bcrypt for hashed passwords
      passwordValid = await bcrypt.compare(password, buyerData.password);
    } else {
      // Direct comparison for plain text passwords (legacy)
      passwordValid = buyerData.password === password;
    }

    if (!passwordValid) {
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
