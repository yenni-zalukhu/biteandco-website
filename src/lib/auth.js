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
    
    return { sellerId: decoded.sellerId, sellerData: decoded };
  } catch (error) {
    return { error: 'Invalid token', status: 401 };
  }
}

export function createErrorResponse(message, status = 500) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export function createSuccessResponse(data, message = 'Success') {
  return NextResponse.json({
    success: true,
    message,
    ...data
  });
}
