import { db } from '@/firebase/configure';
import { verifyToken, createErrorResponse, createSuccessResponse } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

// GET: Fetch Rantangan packages for a seller
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
    const rantanganPackages = sellerData.rantanganPackages || getDefaultRantanganPackages();

    return withCORSHeaders(createSuccessResponse({ data: rantanganPackages }));

  } catch (error) {
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error'));
  }
}

// PUT: Update a Rantangan package
export async function PUT(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(createErrorResponse(authResult.error, authResult.status));
    }

    const { sellerId } = authResult;
    const { packageType, name, description, price } = await request.json();

    // Validate input
    if (!packageType || !name || !description || !price) {
      return withCORSHeaders(createErrorResponse('All fields are required', 400));
    }

    if (!['harian', 'mingguan', 'bulanan'].includes(packageType.toLowerCase())) {
      return withCORSHeaders(createErrorResponse('Invalid package type', 400));
    }

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();
    
    if (!sellerDoc.exists) {
      return withCORSHeaders(createErrorResponse('Seller not found', 404));
    }

    const sellerData = sellerDoc.data();
    let rantanganPackages = sellerData.rantanganPackages || getDefaultRantanganPackages();

    // Update the specific package
    const packageIndex = rantanganPackages.findIndex(pkg => pkg.type === packageType.toLowerCase());
    if (packageIndex !== -1) {
      rantanganPackages[packageIndex] = {
        ...rantanganPackages[packageIndex],
        name,
        description,
        price: parseFloat(price),
        updatedAt: new Date().toISOString()
      };
    }

    // Update Firestore
    await sellerRef.update({ rantanganPackages });

    return withCORSHeaders(createSuccessResponse({ 
      package: rantanganPackages[packageIndex]
    }, 'Rantangan package updated successfully'));

  } catch (error) {
    return withCORSHeaders(createErrorResponse(error.message || 'Internal server error'));
  }
}

// Helper function to get default Rantangan packages
function getDefaultRantanganPackages() {
  return [
    {
      id: 'harian',
      type: 'harian',
      name: 'Paket Harian',
      description: 'isi disini',
      price: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'mingguan',
      type: 'mingguan',
      name: 'Paket Mingguan',
      description: 'isi disini',
      price: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'bulanan',
      type: 'bulanan',
      name: 'Paket Bulanan',
      description: 'isi disini',
      price: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}
