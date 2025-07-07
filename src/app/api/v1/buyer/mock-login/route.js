import jwt from 'jsonwebtoken';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth';
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

    // Mock users for development
    const mockUsers = [
      {
        id: 'mock-buyer-1',
        email: 'buyer@test.com',
        password: 'test123',
        name: 'Test Buyer',
        phone: '081234567890',
        emailValidated: true
      },
      {
        id: 'mock-buyer-2', 
        email: 'user@biteandco.com',
        password: 'password123',
        name: 'Demo User',
        phone: '081234567891',
        emailValidated: true
      }
    ];

    // Find user
    const user = mockUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      return withCORSHeaders(createErrorResponse('Email atau password salah', 401));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        buyerId: user.id,
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET || 'mock-secret-key',
      { expiresIn: '7d' }
    );

    // Return success with token
    const res = createSuccessResponse({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      }
    }, 'Login successful');
    return withCORSHeaders(res);

  } catch (error) {
    console.error('Mock buyer login error:', error);
    const errRes = createErrorResponse(error.message || 'Internal server error');
    return withCORSHeaders(errRes);
  }
}
