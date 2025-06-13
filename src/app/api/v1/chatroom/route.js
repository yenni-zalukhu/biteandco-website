import { NextResponse } from 'next/server';

// Dummy in-memory chatroom store (replace with DB in production)
let chatrooms = [];

// POST: Create chatroom between buyer and seller
export async function POST(req) {
  try {
    const { buyerId, sellerId } = await req.json();
    if (!buyerId || !sellerId) {
      return NextResponse.json({ error: 'buyerId and sellerId are required' }, { status: 400 });
    }
    // Check if chatroom already exists
    let chatroom = chatrooms.find(
      (c) => c.buyerId === buyerId && c.sellerId === sellerId
    );
    if (!chatroom) {
      chatroom = {
        id: `${buyerId}_${sellerId}_${Date.now()}`,
        buyerId,
        sellerId,
        createdAt: new Date().toISOString(),
        messages: [],
      };
      chatrooms.push(chatroom);
    }
    return NextResponse.json({ chatroom });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create chatroom' }, { status: 500 });
  }
}
