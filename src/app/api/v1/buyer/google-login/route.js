import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  const startTime = Date.now();
  const requestId = `gl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] Google Login Request Started`);
    
    const body = await request.json();
    const { email, googleId, name, userInfo, timestamp } = body;

    console.log(`[${requestId}] Request payload:`, {
      email,
      googleId: googleId ? 'present' : 'missing',
      name,
      hasUserInfo: !!userInfo,
      timestamp,
      userAgent: request.headers.get('User-Agent'),
      origin: request.headers.get('Origin'),
    });

    // Validate input
    if (!email || !googleId) {
      console.log(`[${requestId}] Validation failed: missing email or googleId`, { email: !!email, googleId: !!googleId });
      return withCORSHeaders(createErrorResponse('Email and Google ID are required', 400, requestId));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(`[${requestId}] Invalid email format:`, email);
      return withCORSHeaders(createErrorResponse('Invalid email format', 400, requestId));
    }

    console.log(`[${requestId}] Searching for buyer with email: ${email} and googleId: ${googleId}`);

    // Check if buyer exists with this email and googleId
    const buyersSnapshot = await db.collection('buyers')
      .where('email', '==', email)
      .where('googleId', '==', googleId)
      .get();

    console.log(`[${requestId}] Database query completed. Found ${buyersSnapshot.docs.length} matching buyers`);

    if (buyersSnapshot.empty) {
      console.log(`[${requestId}] User not found in database`);
      
      // Also check if user exists with email but different googleId
      const emailSnapshot = await db.collection('buyers')
        .where('email', '==', email)
        .get();
      
      if (!emailSnapshot.empty) {
        const existingUser = emailSnapshot.docs[0].data();
        console.log(`[${requestId}] User exists with different googleId`, {
          existingGoogleId: existingUser.googleId,
          requestedGoogleId: googleId
        });
        return withCORSHeaders(createErrorResponse('Email already registered with different Google account', 409, requestId));
      }
      
      return withCORSHeaders(createErrorResponse('User not found. Please register first.', 404, requestId));
    }

    const buyerDoc = buyersSnapshot.docs[0];
    const buyerData = buyerDoc.data();

    console.log(`[${requestId}] User found:`, {
      id: buyerDoc.id,
      email: buyerData.email,
      name: buyerData.name,
      hasPhone: !!buyerData.phone,
      createdAt: buyerData.createdAt,
      lastLogin: buyerData.lastLogin
    });

    // Update last login time
    try {
      await buyerDoc.ref.update({
        lastLogin: new Date().toISOString(),
        lastLoginIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        updatedAt: new Date().toISOString()
      });
      console.log(`[${requestId}] Last login updated successfully`);
    } catch (updateError) {
      console.warn(`[${requestId}] Failed to update last login:`, updateError.message);
      // Continue with login even if update fails
    }

    // Generate JWT token
    const tokenPayload = {
      buyerId: buyerDoc.id,
      email: buyerData.email,
      name: buyerData.name,
      googleId: buyerData.googleId,
      loginType: 'google',
      iat: Math.floor(Date.now() / 1000),
      requestId
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d', issuer: 'biteandco-api' }
    );

    const responseData = {
      token,
      user: {
        id: buyerDoc.id,
        name: buyerData.name,
        email: buyerData.email,
        phone: buyerData.phone || null,
        googleId: buyerData.googleId,
        address: buyerData.address || null,
        pinPoint: buyerData.pinPoint || null,
        emailValidated: buyerData.emailValidated || false,
        createdAt: buyerData.createdAt,
        lastLogin: buyerData.lastLogin
      },
      loginType: 'google',
      timestamp: new Date().toISOString(),
      requestId
    };

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Google login successful. Processing time: ${processingTime}ms`);

    return withCORSHeaders(createSuccessResponse(responseData, 'Google login successful'));

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Google login error (${processingTime}ms):`, {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    // Return detailed error information for debugging
    return withCORSHeaders(createErrorResponse(
      'Internal server error during Google login',
      500,
      requestId,
      process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack,
        processingTime
      } : undefined
    ));
  }
}
