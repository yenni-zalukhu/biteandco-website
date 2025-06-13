import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req) {
  try {
    // Debug: Check Firestore connection
    if (!db) {
      throw new Error('Firestore db is not initialized');
    }

    // Try a simple query to see if collection exists and is accessible
    let testDocError = null;
    try {
      await db.collection('sellers').limit(1).get();
    } catch (e) {
      testDocError = e;
    }
    if (testDocError) {
      throw new Error('Test query to sellers collection failed: ' + testDocError.message);
    }

    // Query sellers collection for approved sellers with address
    let snapshot;
    try {
      snapshot = await db.collection('sellers')
        .where('status', '==', "approved")
        .where('address', '!=', null)
        .get();
    } catch (queryError) {
      throw new Error('Main query failed: ' + queryError.message);
    }

    if (!snapshot) {
      throw new Error('Snapshot is undefined');
    }

    const sellers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.outletName || null,
        rating: data.rating || 0,
        address: data.address,
        logo: data.logo || data.storeIcon || null,
        kelurahan: data.kelurahan || null, // <-- add kelurahan
        distance: null // Distance calculation can be added if needed
      };
    });

    return withCORSHeaders(new Response(JSON.stringify({ sellers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (error) {
    let debugInfo = {
      message: error.message,
      stack: error.stack,
      firebaseError: error?.code || null,
      firebaseMessage: error?.details || null,
      env: process.env.NODE_ENV,
      // Add more debug info
      hint: 'Check Firestore rules, collection name, and if Firestore is initialized properly.'
    };
    return withCORSHeaders(new Response(JSON.stringify({ error: debugInfo }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));
  }
}
