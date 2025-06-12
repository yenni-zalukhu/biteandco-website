import { db } from '@/firebase/configure';
import { verifyToken, createErrorResponse, createSuccessResponse } from '@/lib/auth';

export async function POST(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { sellerId } = authResult;
    const { name, type } = await request.json();

    // Validate input
    if (!name || !type) {
      return createErrorResponse('Name and type are required', 400);
    }

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();
    
    if (!sellerDoc.exists) {
      return createErrorResponse('Seller not found', 404);
    }

    // Create new category
    const newCategory = {
      id: Date.now().toString(),
      name,
      type: type.toLowerCase(),
      items: [],
      createdAt: new Date().toISOString()
    };

    // Update seller document with new category
    const sellerData = sellerDoc.data();
    const categories = sellerData.categories || [];
    categories.push(newCategory);

    await sellerRef.update({ categories });

    return createSuccessResponse({
      category: newCategory
    }, 'Category created successfully');

  } catch (error) {
    console.error('Create category error:', error);
    return createErrorResponse(error.message || 'Internal server error');
  }
}
