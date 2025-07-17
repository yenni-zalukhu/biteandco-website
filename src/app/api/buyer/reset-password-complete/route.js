import { NextResponse } from 'next/server';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if OTP was verified
    const otpStore = global.otpStore || {};
    const storedOTP = otpStore[email];

    if (!storedOTP || !storedOTP.verified) {
      return NextResponse.json(
        { error: 'OTP not verified' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date() > storedOTP.expiresAt) {
      delete otpStore[email];
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }

    // Find buyer document
    const buyersRef = collection(db, 'buyers');
    const q = query(buyersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get buyer document
    const buyerDoc = querySnapshot.docs[0];
    const buyerId = buyerDoc.id;

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const buyerDocRef = doc(db, 'buyers', buyerId);
    await updateDoc(buyerDocRef, {
      password: hashedPassword,
      updatedAt: new Date(),
    });

    // Clean up OTP store
    delete otpStore[email];

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
