// GET /api/v1/seller/orders/[orderId]
import { NextResponse } from "next/server";
import db from "@/firebase/configure";

export async function GET(req, { params }) {
  const { orderId } = params;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }
  try {
    // Example: get order by ID from a MongoDB collection 'orders'
    const order = await db.collection("orders").findOne({ id: orderId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
