import { db } from '@/firebase/configure';
import { verifyToken, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// DELETE: Delete a category
export async function DELETE(request, { params }) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { sellerId } = authResult;
    const categoryId = params.id;

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();
    
    if (!sellerDoc.exists) {
      return createErrorResponse('Seller not found', 404);
    }

    // Update seller document
    const sellerData = sellerDoc.data();
    const categories = sellerData.categories || [];
    const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

    if (categoryIndex === -1) {
      return createErrorResponse('Category not found', 404);
    }

    // Remove category
    categories.splice(categoryIndex, 1);

    // Update Firestore
    await sellerRef.update({ categories });

    return createSuccessResponse({ message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    return createErrorResponse(error.message || 'Internal server error');
  }
}

// PUT: Update a category
export async function PUT(request, { params }) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { sellerId } = authResult;
    const categoryId = params.id;
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

    // Update seller document
    const sellerData = sellerDoc.data();
    const categories = sellerData.categories || [];
    const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

    if (categoryIndex === -1) {
      return createErrorResponse('Category not found', 404);
    }

    // Update category
    categories[categoryIndex] = {
      ...categories[categoryIndex],
      name,
      type: type.toLowerCase(),
      updatedAt: new Date().toISOString()
    };

    // Update Firestore
    await sellerRef.update({ categories });

    return createSuccessResponse({ 
      category: categories[categoryIndex]
    }, 'Category updated successfully');

  } catch (error) {
    console.error('Update category error:', error);
    return createErrorResponse(error.message || 'Internal server error');
  }
}
