// GET /api/v1/seller/orders (list all orders for seller, optional for future use)
import { NextResponse } from "next/server";
import db from "@/firebase/configure";

export async function GET(req) {
  // Optionally, get sellerId from query or auth
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");
  if (!sellerId) {
    return NextResponse.json({ error: "Missing sellerId" }, { status: 400 });
  }
  try {
    // Example: get all orders for seller from MongoDB
    const orders = await db.collection("orders").find({ sellerId }).toArray();
    return NextResponse.json({ orders });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
