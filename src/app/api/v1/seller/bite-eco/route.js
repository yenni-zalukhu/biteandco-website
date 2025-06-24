import { NextResponse } from 'next/server';
import { db, storage } from '@/firebase/configure';
import { verifyToken, createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { v4 as uuidv4 } from 'uuid';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/seller/bite-eco
// Fetch all Bite Eco waste items for this seller
export async function GET(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(createErrorResponse(authResult.error, authResult.status));
    }

    const { sellerId } = authResult;

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();

    if (!sellerDoc.exists) {
      return withCORSHeaders(createErrorResponse('Seller not found', 404));
    }

    const sellerData = sellerDoc.data();
    const wasteItems = sellerData.wasteItems || [];

    return withCORSHeaders(createSuccessResponse({
      wasteItems,
      total: wasteItems.length
    }, 'Waste items fetched successfully'));

  } catch (error) {
    console.error('Error fetching waste items:', error);
    return withCORSHeaders(createErrorResponse('Internal server error'));
  }
}

// POST /api/v1/seller/bite-eco
// Add new Bite Eco waste item
export async function POST(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(createErrorResponse(authResult.error, authResult.status));
    }

    const { sellerId } = authResult;
    const formData = await request.formData();

    const title = formData.get('title');
    const description = formData.get('description');
    const quantity = formData.get('quantity');
    const condition = formData.get('condition');
    const imageFile = formData.get('image');

    // Validate input
    if (!title || !description || !quantity || !condition) {
      return withCORSHeaders(createErrorResponse('All fields are required', 400));
    }

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();

    if (!sellerDoc.exists) {
      return withCORSHeaders(createErrorResponse('Seller not found', 404));
    }

    let imageUrl = null;
    if (imageFile) {
      try {
        const bucket = storage.bucket();
        const uuid = uuidv4();
        const fileName = `bite-eco/${sellerId}/${uuid}-${imageFile.name || 'waste-item.jpg'}`;
        const buffer = await imageFile.arrayBuffer();
        const fileRef = bucket.file(fileName);

        await fileRef.save(Buffer.from(buffer), {
          metadata: {
            contentType: imageFile.type || 'image/jpeg',
          },
        });

        const [url] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });

        imageUrl = url;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return withCORSHeaders(createErrorResponse('Failed to upload image', 500));
      }
    }

    // Create new waste item
    const newWasteItem = {
      id: uuidv4(),
      title,
      description,
      quantity,
      condition,
      image: imageUrl,
      status: 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to seller's waste items array
    const sellerData = sellerDoc.data();
    const wasteItems = sellerData.wasteItems || [];
    wasteItems.push(newWasteItem);

    await sellerRef.update({ wasteItems });

    return withCORSHeaders(createSuccessResponse({
      wasteItem: newWasteItem
    }, 'Waste item added successfully'));

  } catch (error) {
    console.error('Error adding waste item:', error);
    return withCORSHeaders(createErrorResponse('Internal server error'));
  }
}

// PUT /api/v1/seller/bite-eco
// Update existing Bite Eco waste item
export async function PUT(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(createErrorResponse(authResult.error, authResult.status));
    }

    const { sellerId } = authResult;
    const formData = await request.formData();

    const itemId = formData.get('itemId');
    const title = formData.get('title');
    const description = formData.get('description');
    const quantity = formData.get('quantity');
    const condition = formData.get('condition');
    const imageFile = formData.get('image');

    // Validate input
    if (!itemId || !title || !description || !quantity || !condition) {
      return withCORSHeaders(createErrorResponse('All fields are required', 400));
    }

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();

    if (!sellerDoc.exists) {
      return withCORSHeaders(createErrorResponse('Seller not found', 404));
    }

    const sellerData = sellerDoc.data();
    const wasteItems = sellerData.wasteItems || [];
    const itemIndex = wasteItems.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return withCORSHeaders(createErrorResponse('Waste item not found', 404));
    }

    let imageUrl = wasteItems[itemIndex].image;

    // Handle image upload if new image provided
    if (imageFile) {
      try {
        const bucket = storage.bucket();
        const uuid = uuidv4();
        const fileName = `bite-eco/${sellerId}/${uuid}-${imageFile.name || 'waste-item.jpg'}`;
        const buffer = await imageFile.arrayBuffer();
        const fileRef = bucket.file(fileName);

        await fileRef.save(Buffer.from(buffer), {
          metadata: {
            contentType: imageFile.type || 'image/jpeg',
          },
        });

        const [url] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });

        imageUrl = url;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return withCORSHeaders(createErrorResponse('Failed to upload image', 500));
      }
    }

    // Update waste item
    wasteItems[itemIndex] = {
      ...wasteItems[itemIndex],
      title,
      description,
      quantity,
      condition,
      image: imageUrl,
      updatedAt: new Date().toISOString()
    };

    await sellerRef.update({ wasteItems });

    return withCORSHeaders(createSuccessResponse({
      wasteItem: wasteItems[itemIndex]
    }, 'Waste item updated successfully'));

  } catch (error) {
    console.error('Error updating waste item:', error);
    return withCORSHeaders(createErrorResponse('Internal server error'));
  }
}

// DELETE /api/v1/seller/bite-eco
// Delete Bite Eco waste item
export async function DELETE(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(createErrorResponse(authResult.error, authResult.status));
    }

    const { sellerId } = authResult;
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return withCORSHeaders(createErrorResponse('Item ID is required', 400));
    }

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();

    if (!sellerDoc.exists) {
      return withCORSHeaders(createErrorResponse('Seller not found', 404));
    }

    const sellerData = sellerDoc.data();
    const wasteItems = sellerData.wasteItems || [];
    const filteredItems = wasteItems.filter(item => item.id !== itemId);

    if (filteredItems.length === wasteItems.length) {
      return withCORSHeaders(createErrorResponse('Waste item not found', 404));
    }

    await sellerRef.update({ wasteItems: filteredItems });

    return withCORSHeaders(createSuccessResponse({
      deletedItemId: itemId
    }, 'Waste item deleted successfully'));

  } catch (error) {
    console.error('Error deleting waste item:', error);
    return withCORSHeaders(createErrorResponse('Internal server error'));
  }
}
