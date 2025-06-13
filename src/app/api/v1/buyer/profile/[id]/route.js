import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/buyer/profile/[id]
export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return withCORSHeaders(
        NextResponse.json({ error: 'Missing buyerId in URL' }, { status: 400 })
      );
    }
    const userRef = db.collection('buyers').doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return withCORSHeaders(
        NextResponse.json({ error: 'Buyer not found', buyerId: id }, { status: 404 })
      );
    }
    const userData = userDoc.data();
    return withCORSHeaders(
      NextResponse.json({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
      })
    );
  } catch (error) {
    return withCORSHeaders(
      NextResponse.json({ error: 'Internal server error', debug: error.message }, { status: 500 })
    );
  }
}
