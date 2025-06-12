// Next.js 15 App Router API route for seller detail
import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req, context) {
  try {
    const params = await context.params;
    const { sellerid } = params;
    if (!sellerid) {
      return withCORSHeaders(NextResponse.json({ message: 'Missing sellerid' }, { status: 400 }));
    }

    // Fetch seller document
    const docRef = db.collection('sellers').doc(sellerid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return withCORSHeaders(NextResponse.json({ message: 'Seller not found' }, { status: 404 }));
    }
    const data = docSnap.data();

    // Get categories array from seller document
    let categories = [];
    if (Array.isArray(data.categories)) {
      categories = data.categories.map(cat => ({
        name: cat.name || '-',
        items: Array.isArray(cat.items) ? cat.items.map(item => ({
          id: item.id || null,
          name: item.name || null,
          description: item.description || null,
          price: item.price || null,
          image: item.image || null,
        })) : []
      }));
    }

    const seller = {
      id: docSnap.id,
      outletName: data.outletName || data.name || null,
      storeIcon: data.storeIcon || data.logo || null,
      kelurahan: data.kelurahan || (data.address && data.address.kelurahan) || null,
      type: data.type || null,
      rating: data.rating || 0,
      rating_count: data.rating_count || 0,
      categories,
      storeBanner: data.storeBanner || data.banner || null, // Add this line
      banner: data.banner || data.storeBanner || null, // For compatibility
    };
    console.log('Seller detail fetched:', seller);
    return withCORSHeaders(NextResponse.json(seller));
  } catch (error) {
    let debugInfo = {
      message: error.message,
      stack: error.stack,
      firebaseError: error?.code || null,
      firebaseMessage: error?.details || null,
      env: process.env.NODE_ENV,
      hint: 'Check Firestore rules, collection name, and if Firestore is initialized properly.'
    };
    console.error('Error in GET /api/v1/seller/detail/[sellerid]:', debugInfo);
    return withCORSHeaders(NextResponse.json({ error: debugInfo }, { status: 500 }));
  }
}
