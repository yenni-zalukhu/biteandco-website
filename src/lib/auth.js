import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export function verifyToken(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    return { 
      sellerId: decoded.sellerId, 
      buyerId: decoded.buyerId,
      sellerData: decoded,
      buyerData: decoded,
      userData: decoded
    };
  } catch (error) {
    console.error('Token verification error:', error.message);
    return { error: 'Invalid token', status: 401 };
  }
}

export function verifyBuyerToken(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.buyerId) {
      return { error: 'Invalid buyer token', status: 401 };
    }
    
    return { 
      buyerId: decoded.buyerId,
      buyerData: decoded,
      isValid: true
    };
  } catch (error) {
    console.error('Buyer token verification error:', error.message);
    return { error: 'Invalid token', status: 401 };
  }
}

export function createErrorResponse(message, status = 500, requestId = null, debugInfo = null) {
  const errorResponse = {
    success: false,
    message,
    error: true,
    timestamp: new Date().toISOString()
  };

  if (requestId) {
    errorResponse.requestId = requestId;
  }

  if (debugInfo && process.env.NODE_ENV === 'development') {
    errorResponse.debug = debugInfo;
  }

  return NextResponse.json(errorResponse, { status });
}

export function createSuccessResponse(data, message = 'Success', requestId = null) {
  const successResponse = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...data
  };

  if (requestId) {
    successResponse.requestId = requestId;
  }

  return NextResponse.json(successResponse);
}

// Utility function to generate request ID
export function generateRequestId(prefix = 'req') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to log API requests
export function logApiRequest(requestId, method, path, data = {}) {
  console.log(`[${requestId}] ${method} ${path}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
}

// Utility function to validate email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Utility function to validate phone number
export function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Utility function to sanitize user input
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}
