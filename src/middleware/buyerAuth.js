import { createErrorResponse } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { db } from '@/firebase/configure';

export async function verifyBuyerToken(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get buyer data from Firestore
    const buyerDoc = await db.collection('buyers').doc(decoded.buyerId).get();
    
    if (!buyerDoc.exists) {
      return { error: 'Buyer not found', status: 404 };
    }

    const buyerData = buyerDoc.data();

    // Check if email is still verified
    if (!buyerData.emailValidated) {
      return { error: 'Email not verified', status: 401 };
    }

    // Return buyer data for use in protected routes
    return { 
      buyerId: decoded.buyerId, 
      buyerData: {
        ...buyerData,
        id: decoded.buyerId
      }
    };

  } catch (error) {
    console.error('Token verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// Example usage in a protected route:
/*
export async function GET(request) {
  const auth = await verifyBuyerToken(request);
  
  if (auth.error) {
    return createErrorResponse(auth.error, auth.status);
  }

  const { buyerId, buyerData } = auth;
  
  // Use buyerId and buyerData in your route logic
  // ...
}
*/
