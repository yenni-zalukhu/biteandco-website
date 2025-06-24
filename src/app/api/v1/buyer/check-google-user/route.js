import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  const startTime = Date.now();
  const requestId = `cgu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] Check Google User Request Started`);
    
    const body = await request.json();
    const { email, googleId, timestamp } = body;

    console.log(`[${requestId}] Request payload:`, {
      email,
      googleId: googleId ? 'present' : 'missing',
      timestamp,
      userAgent: request.headers.get('User-Agent'),
      origin: request.headers.get('Origin'),
    });

    // Validate input
    if (!email) {
      console.log(`[${requestId}] Validation failed: missing email`);
      return withCORSHeaders(createErrorResponse('Email is required', 400, requestId));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(`[${requestId}] Invalid email format:`, email);
      return withCORSHeaders(createErrorResponse('Invalid email format', 400, requestId));
    }

    console.log(`[${requestId}] Checking user existence for email: ${email}`);

    // Check if buyer exists with this email
    const buyersSnapshot = await db.collection('buyers')
      .where('email', '==', email)
      .get();

    console.log(`[${requestId}] Database query completed. Found ${buyersSnapshot.docs.length} users with email`);

    let userExists = false;
    let existingUser = null;
    let conflictDetails = null;

    if (!buyersSnapshot.empty) {
      const buyerData = buyersSnapshot.docs[0].data();
      const buyerId = buyersSnapshot.docs[0].id;
      
      existingUser = {
        id: buyerId,
        email: buyerData.email,
        name: buyerData.name,
        hasGoogleId: !!buyerData.googleId,
        hasPassword: !!buyerData.password,
        emailValidated: buyerData.emailValidated || false,
        createdAt: buyerData.createdAt,
        registrationType: buyerData.googleId ? 'google' : 'email'
      };

      console.log(`[${requestId}] Existing user found:`, {
        id: buyerId,
        hasGoogleId: !!buyerData.googleId,
        hasPassword: !!buyerData.password,
        googleId: buyerData.googleId ? 'present' : 'missing',
        requestedGoogleId: googleId ? 'present' : 'missing',
        registrationType: existingUser.registrationType
      });

      // Check for Google ID conflicts
      if (googleId && buyerData.googleId && buyerData.googleId !== googleId) {
        console.log(`[${requestId}] Google ID conflict detected`, {
          existingGoogleId: buyerData.googleId,
          requestedGoogleId: googleId
        });
        
        conflictDetails = {
          type: 'google_id_mismatch',
          message: 'Email is registered with a different Google account',
          existingGoogleId: buyerData.googleId !== googleId
        };
      }

      // User exists if they have a googleId matching the request or if they're a regular email user
      if (googleId) {
        userExists = buyerData.googleId === googleId;
      } else {
        userExists = !!(buyerData.googleId || buyerData.password);
      }
    }

    const responseData = {
      exists: userExists,
      requestId,
      timestamp: new Date().toISOString(),
      ...(existingUser && {
        userInfo: {
          registrationType: existingUser.registrationType,
          emailValidated: existingUser.emailValidated,
          createdAt: existingUser.createdAt
        }
      }),
      ...(conflictDetails && { conflict: conflictDetails })
    };

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Check completed. User ${userExists ? 'exists' : 'not found'}. Processing time: ${processingTime}ms`);

    return withCORSHeaders(createSuccessResponse(responseData, 'User check completed'));

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Check Google user error (${processingTime}ms):`, {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    return withCORSHeaders(createErrorResponse(
      'Internal server error during user check',
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
