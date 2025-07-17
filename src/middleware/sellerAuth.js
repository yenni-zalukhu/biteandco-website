import { createErrorResponse } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { db } from '@/firebase/configure';

export async function verifySellerToken(tokenOrRequest) {
  try {
    let token;
    
    // Handle both token string and request object
    if (typeof tokenOrRequest === 'string') {
      token = tokenOrRequest;
    } else {
      const authHeader = tokenOrRequest.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'No token provided', status: 401 };
      }
      token = authHeader.split('Bearer ')[1];
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get seller data from Firestore
    const sellerDoc = await db.collection('sellers').doc(decoded.sellerId).get();
    
    if (!sellerDoc.exists) {
      return { error: 'Seller not found', status: 404 };
    }

    const sellerData = sellerDoc.data();

    // Check if email is still verified (if applicable)
    if (sellerData.emailValidated === false) {
      return { error: 'Email not verified', status: 401 };
    }

    // Return seller data for use in protected routes
    return { 
      sellerId: decoded.sellerId, 
      sellerData: {
        ...sellerData,
        id: decoded.sellerId
      }
    };

  } catch (error) {
    console.error('Seller token verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return { error: 'Invalid token format', status: 401 };
    } else if (error.name === 'TokenExpiredError') {
      return { error: 'Token expired', status: 401 };
    } else {
      return { error: 'Token verification failed', status: 401 };
    }
  }
}

// For backward compatibility, create an alias
export const verifySellerJWT = verifySellerToken;

// Example usage in a protected route:
/*
export async function GET(request) {
  const auth = await verifySellerToken(request);
  
  if (auth.error) {
    return createErrorResponse(auth.error, auth.status);
  }

  const { sellerId, sellerData } = auth;
  // Use sellerId and sellerData in your route logic
}
*/
