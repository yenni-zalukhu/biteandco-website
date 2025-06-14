// GET /api/v1/seller/orders (list all orders for seller, optional for future use)
import { NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';
import { withCORSHeaders } from '@/lib/cors';
import { db } from '@/firebase/configure';

export async function GET(req) {
  try {
    const authResult = verifyToken(req);
    if (authResult.error) {
      return withCORSHeaders(NextResponse.json({ error: authResult.error }, { status: 401 }));
    }
    const { sellerId } = authResult;
    if (!sellerId) {
      return withCORSHeaders(NextResponse.json({ error: "Missing sellerId" }, { status: 400 }));
    }
    // Firestore query for orders by sellerId
    console.log('[FIREBASE] Query: db.collection("orders").where("sellerId", "==",', sellerId, ').orderBy("createdAt", "desc")');
    console.log('[FIREBASE] Firestore orders collection link: https://console.firebase.google.com/project/_/firestore/data/~2Forders');
    const snapshot = await db.collection("orders").where("sellerId", "==", sellerId).orderBy("createdAt", "desc").get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return withCORSHeaders(NextResponse.json({ orders }));
  } catch (e) {
    return withCORSHeaders(NextResponse.json({ error: e.message }, { status: 500 }));
  }
}
