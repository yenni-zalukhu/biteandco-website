import { db } from '@/firebase/configure';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  const startTime = Date.now();
  const requestId = `gr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] Google Registration Request Started`);
    
    const body = await request.json();
    const { name, email, phone, googleId, address, pinPoint, userInfo, timestamp } = body;

    console.log(`[${requestId}] Request payload:`, {
      name,
      email,
      phone: phone ? 'present' : 'missing',
      googleId: googleId ? 'present' : 'missing',
      hasAddress: !!address,
      hasPinPoint: !!pinPoint,
      hasUserInfo: !!userInfo,
      timestamp,
      userAgent: request.headers.get('User-Agent'),
      origin: request.headers.get('Origin'),
    });

    // Validate required fields
    if (!name || !email || !phone || !googleId) {
      console.log(`[${requestId}] Validation failed: missing required fields`, {
        name: !!name,
        email: !!email,
        phone: !!phone,
        googleId: !!googleId
      });
      return withCORSHeaders(createErrorResponse('Name, email, phone, and Google ID are required', 400, requestId));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(`[${requestId}] Invalid email format:`, email);
      return withCORSHeaders(createErrorResponse('Invalid email format', 400, requestId));
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      console.log(`[${requestId}] Invalid phone format:`, phone);
      return withCORSHeaders(createErrorResponse('Invalid phone number format', 400, requestId));
    }

    // Validate address
    if (!address || !address.address) {
      console.log(`[${requestId}] Validation failed: missing address`);
      return withCORSHeaders(createErrorResponse('Address is required', 400, requestId));
    }

    // Validate pinpoint location
    if (!pinPoint || !pinPoint.lat || !pinPoint.lng) {
      console.log(`[${requestId}] Validation failed: missing pinpoint location`);
      return withCORSHeaders(createErrorResponse('Pinpoint location is required', 400, requestId));
    }

    // Validate coordinates
    if (isNaN(pinPoint.lat) || isNaN(pinPoint.lng) || 
        Math.abs(pinPoint.lat) > 90 || Math.abs(pinPoint.lng) > 180) {
      console.log(`[${requestId}] Invalid coordinates:`, pinPoint);
      return withCORSHeaders(createErrorResponse('Invalid coordinates provided', 400, requestId));
    }

    console.log(`[${requestId}] Checking for existing users with email: ${email}`);

    // Check if user already exists with this email
    const existingUserSnapshot = await db.collection('buyers')
      .where('email', '==', email)
      .get();

    if (!existingUserSnapshot.empty) {
      const existingUser = existingUserSnapshot.docs[0].data();
      console.log(`[${requestId}] User already exists`, {
        existingGoogleId: existingUser.googleId,
        requestedGoogleId: googleId,
        hasPassword: !!existingUser.password
      });
      
      // Check if it's the same Google account trying to re-register
      if (existingUser.googleId === googleId) {
        return withCORSHeaders(createErrorResponse('User already registered with this Google account', 409, requestId));
      } else {
        return withCORSHeaders(createErrorResponse('Email already registered with different account', 409, requestId));
      }
    }

    // Check if phone number is already in use
    const phoneSnapshot = await db.collection('buyers')
      .where('phone', '==', phone)
      .get();

    if (!phoneSnapshot.empty) {
      console.log(`[${requestId}] Phone number already in use:`, phone);
      return withCORSHeaders(createErrorResponse('Phone number already registered', 409, requestId));
    }

    console.log(`[${requestId}] Creating new buyer document`);

    // Create new buyer document
    const newBuyer = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      googleId,
      address: {
        address: address.address.trim(),
        ...(address.city && { city: address.city.trim() }),
        ...(address.state && { state: address.state.trim() }),
        ...(address.country && { country: address.country.trim() }),
        ...(address.postalCode && { postalCode: address.postalCode.trim() })
      },
      pinPoint: {
        lat: parseFloat(pinPoint.lat),
        lng: parseFloat(pinPoint.lng),
        ...(pinPoint.address && { address: pinPoint.address })
      },
      emailValidated: true, // Google users are considered verified
      registrationType: 'google',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      registrationIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('User-Agent') || 'unknown',
      ...(userInfo && userInfo.photo && { profilePhoto: userInfo.photo })
    };

    // Add to Firestore
    const docRef = await db.collection('buyers').add(newBuyer);
    console.log(`[${requestId}] User created successfully with ID: ${docRef.id}`);

    // Generate JWT token
    const tokenPayload = {
      buyerId: docRef.id,
      email: newBuyer.email,
      name: newBuyer.name,
      googleId: newBuyer.googleId,
      loginType: 'google',
      registrationType: 'google',
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
        id: docRef.id,
        name: newBuyer.name,
        email: newBuyer.email,
        phone: newBuyer.phone,
        googleId: newBuyer.googleId,
        address: newBuyer.address,
        pinPoint: newBuyer.pinPoint,
        emailValidated: newBuyer.emailValidated,
        registrationType: newBuyer.registrationType,
        createdAt: newBuyer.createdAt,
        ...(newBuyer.profilePhoto && { profilePhoto: newBuyer.profilePhoto })
      },
      isNewUser: true,
      registrationType: 'google',
      timestamp: new Date().toISOString(),
      requestId
    };

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Google registration successful. Processing time: ${processingTime}ms`);

    return withCORSHeaders(createSuccessResponse(responseData, 'Google registration successful'));

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Google registration error (${processingTime}ms):`, {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    // Handle specific Firestore errors
    let errorMessage = 'Internal server error during registration';
    let statusCode = 500;

    if (error.code === 'permission-denied') {
      errorMessage = 'Database permission denied';
      statusCode = 403;
    } else if (error.code === 'unavailable') {
      errorMessage = 'Database temporarily unavailable';
      statusCode = 503;
    } else if (error.message.includes('already exists')) {
      errorMessage = 'User already exists';
      statusCode = 409;
    }

    return withCORSHeaders(createErrorResponse(
      errorMessage,
      statusCode,
      requestId,
      process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack,
        processingTime,
        code: error.code
      } : undefined
    ));
  }
}
