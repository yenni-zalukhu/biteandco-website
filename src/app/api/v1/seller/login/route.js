import { db } from '@/firebase/configure';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email atau password diperlukan!' },
        { status: 400 }
      );
    }

    // Find seller by email
    const sellersRef = db.collection('sellers');
    const snapshot = await sellersRef.where('outletEmail', '==', email).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, message: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const sellerDoc = snapshot.docs[0];
    const sellerData = sellerDoc.data();

    // Verify password
    const passwordMatch = await bcrypt.compare(password, sellerData.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Check if seller is approved
    if (sellerData.status !== 'approved') {
      return NextResponse.json(
        { success: false, message: 'Akun anda belum di setujui oleh admin' },
        { status: 403 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        sellerId: sellerDoc.id,
        email: sellerData.outletEmail,
        outletName: sellerData.outletName,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response with token
    return NextResponse.json({
      success: true,
      token,
      seller: {
        id: sellerDoc.id,
        outletName: sellerData.outletName,
        email: sellerData.outletEmail,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}