import { verifyBuyerToken, createErrorResponse, createSuccessResponse, generateRequestId } from '@/lib/auth';
import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  const startTime = Date.now();
  const requestId = generateRequestId('vgt');
  
  try {
    console.log(`[${requestId}] Verify Google Token Request Started`);
    
    const body = await request.json();
    const { token, refreshUserData = false } = body;

    console.log(`[${requestId}] Request payload:`, {
      hasToken: !!token,
      refreshUserData,
      userAgent: request.headers.get('User-Agent'),
      origin: request.headers.get('Origin'),
    });

    if (!token) {
      console.log(`[${requestId}] Validation failed: missing token`);
      return withCORSHeaders(createErrorResponse('Token is required', 400, requestId));
    }

    // Create a mock request object with the authorization header
    const mockRequest = {
      headers: {
        get: (name) => {
          if (name === 'Authorization') {
            return `Bearer ${token}`;
          }
          return request.headers.get(name);
        }
      }
    };

    // Verify the token
    const tokenVerification = verifyBuyerToken(mockRequest);
    
    if (tokenVerification.error) {
      console.log(`[${requestId}] Token verification failed:`, tokenVerification.error);
      return withCORSHeaders(createErrorResponse(tokenVerification.error, tokenVerification.status, requestId));
    }

    console.log(`[${requestId}] Token verified successfully for buyer:`, tokenVerification.buyerId);

    let responseData = {
      valid: true,
      buyerId: tokenVerification.buyerId,
      tokenData: {
        buyerId: tokenVerification.buyerData.buyerId,
        email: tokenVerification.buyerData.email,
        name: tokenVerification.buyerData.name,
        googleId: tokenVerification.buyerData.googleId,
        loginType: tokenVerification.buyerData.loginType,
        iat: tokenVerification.buyerData.iat,
        exp: tokenVerification.buyerData.exp
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    // If refreshUserData is requested, fetch current user data from database
    if (refreshUserData) {
      console.log(`[${requestId}] Refreshing user data from database`);
      
      try {
        const userDoc = await db.collection('buyers').doc(tokenVerification.buyerId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          responseData.user = {
            id: userDoc.id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            googleId: userData.googleId,
            address: userData.address,
            pinPoint: userData.pinPoint,
            emailValidated: userData.emailValidated,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
            lastLogin: userData.lastLogin,
            registrationType: userData.registrationType || 'unknown',
            ...(userData.profilePhoto && { profilePhoto: userData.profilePhoto })
          };
          console.log(`[${requestId}] User data refreshed successfully`);
        } else {
          console.warn(`[${requestId}] User document not found in database`);
          responseData.warning = 'User document not found in database';
        }
      } catch (dbError) {
        console.error(`[${requestId}] Database error while refreshing user data:`, dbError);
        responseData.warning = 'Could not refresh user data from database';
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Token verification completed successfully. Processing time: ${processingTime}ms`);

    return withCORSHeaders(createSuccessResponse(responseData, 'Token verified successfully'));

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Token verification error (${processingTime}ms):`, {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    return withCORSHeaders(createErrorResponse(
      'Internal server error during token verification',
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

export async function GET(request) {
  const requestId = generateRequestId('vgt_get');
  
  try {
    console.log(`[${requestId}] GET Token verification request`);
    
    // Verify the token from Authorization header
    const tokenVerification = verifyBuyerToken(request);
    
    if (tokenVerification.error) {
      console.log(`[${requestId}] Token verification failed:`, tokenVerification.error);
      return withCORSHeaders(createErrorResponse(tokenVerification.error, tokenVerification.status, requestId));
    }

    console.log(`[${requestId}] GET Token verified successfully for buyer:`, tokenVerification.buyerId);

    const responseData = {
      valid: true,
      buyerId: tokenVerification.buyerId,
      tokenData: {
        buyerId: tokenVerification.buyerData.buyerId,
        email: tokenVerification.buyerData.email,
        name: tokenVerification.buyerData.name,
        googleId: tokenVerification.buyerData.googleId,
        loginType: tokenVerification.buyerData.loginType,
        iat: tokenVerification.buyerData.iat,
        exp: tokenVerification.buyerData.exp
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    return withCORSHeaders(createSuccessResponse(responseData, 'Token verified successfully'));

  } catch (error) {
    console.error(`[${requestId}] GET Token verification error:`, error);
    return withCORSHeaders(createErrorResponse(
      'Internal server error during token verification',
      500,
      requestId
    ));
  }
}
