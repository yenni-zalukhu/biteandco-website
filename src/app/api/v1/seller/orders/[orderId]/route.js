// GET /api/v1/seller/orders/[orderId]
import { NextResponse } from "next/server";
import db from "@/firebase/configure";

export async function GET(req, { params }) {
  const { orderId } = params;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }
  try {
    console.log('[DEBUG][Order Detail] orderId:', orderId);
    const doc = await db.collection("orders").doc(orderId).get();
    console.log('[DEBUG][Order Detail] doc.exists:', doc.exists);
    if (!doc.exists) {
      return NextResponse.json({ error: "Order not found", debug: { orderId, exists: doc.exists } }, { status: 404 });
    }
    const order = { id: doc.id, ...doc.data() };
    return NextResponse.json({ order });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
