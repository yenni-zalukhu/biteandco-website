import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/buyer/bite-eco
// Fetch all available Bite Eco waste items from all sellers
export async function GET(request) {
  try {
    console.log('Fetching Bite Eco waste items for buyers');

    // Get all sellers with their waste items
    const sellersSnapshot = await db.collection('sellers').get();
    const wasteItems = [];

    for (const sellerDoc of sellersSnapshot.docs) {
      const sellerData = sellerDoc.data();
      
      // Check if seller has Bite Eco waste items
      if (sellerData.wasteItems && Array.isArray(sellerData.wasteItems)) {
        sellerData.wasteItems.forEach(item => {
          // Only include items that are still available
          if (item.status === 'available') {
            wasteItems.push({
              id: item.id,
              sellerId: sellerDoc.id,
              title: item.title,
              description: item.description,
              quantity: item.quantity,
              condition: item.condition,
              image: item.image,
              createdAt: item.createdAt,
              seller: {
                outletName: sellerData.outletName,
                address: sellerData.address,
                kelurahan: sellerData.kelurahan,
                kecamatan: sellerData.kecamatan,
                latitude: sellerData.pinLat,
                longitude: sellerData.pinLng,
                pinAddress: sellerData.pinAddress
              }
            });
          }
        });
      }
    }

    // Sort by creation date (newest first)
    wasteItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return withCORSHeaders(
      NextResponse.json({
        success: true,
        data: wasteItems,
        total: wasteItems.length,
        message: 'Bite Eco items fetched successfully'
      })
    );

  } catch (error) {
    console.error('Error fetching Bite Eco items:', error);
    return withCORSHeaders(
      NextResponse.json({
        success: false,
        error: 'Failed to fetch Bite Eco items',
        debug: error.message
      }, { status: 500 })
    );
  }
}
