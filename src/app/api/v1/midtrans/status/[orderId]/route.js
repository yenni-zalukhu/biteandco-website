import { NextResponse } from 'next/server';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import axios from 'axios';

// This route: /api/v1/midtrans/status/[orderId]
// Usage: GET /api/v1/midtrans/status/:orderId

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request, { params }) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return withCORSHeaders(
        NextResponse.json({ error: 'Missing orderId in URL' }, { status: 400 })
      );
    }
    // Midtrans API credentials
    const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!MIDTRANS_SERVER_KEY) {
      return withCORSHeaders(
        NextResponse.json({ error: 'Missing Midtrans server key' }, { status: 500 })
      );
    }
    // Call Midtrans API
    const midtransUrl = `https://api.midtrans.com/v2/${orderId}/status`;
    const auth = Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');
    const res = await axios.get(midtransUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return withCORSHeaders(
      NextResponse.json(res.data)
    );
  } catch (error) {
    return withCORSHeaders(
      NextResponse.json({ error: 'Failed to fetch Midtrans status', debug: error.message }, { status: 500 })
    );
  }
}
