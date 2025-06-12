import { db } from '@/firebase/configure';
import { verifyToken, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET: Fetch Rantangan packages for a seller
export async function GET(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { sellerId } = authResult;

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();
    
    if (!sellerDoc.exists) {
      return createErrorResponse('Seller not found', 404);
    }

    const sellerData = sellerDoc.data();
    const rantanganPackages = sellerData.rantanganPackages || getDefaultRantanganPackages();

    return createSuccessResponse({ data: rantanganPackages });

  } catch (error) {
    console.error('Get rantangan packages error:', error);
    return createErrorResponse(error.message || 'Internal server error');
  }
}

// PUT: Update a Rantangan package
export async function PUT(request) {
  try {
    const authResult = verifyToken(request);
    if (authResult.error) {
      return createErrorResponse(authResult.error, authResult.status);
    }

    const { sellerId } = authResult;
    const { packageType, name, description, price } = await request.json();

    // Validate input
    if (!packageType || !name || !description || !price) {
      return createErrorResponse('All fields are required', 400);
    }

    if (!['harian', 'mingguan', 'bulanan'].includes(packageType.toLowerCase())) {
      return createErrorResponse('Invalid package type', 400);
    }

    // Get seller document
    const sellerRef = db.collection('sellers').doc(sellerId);
    const sellerDoc = await sellerRef.get();
    
    if (!sellerDoc.exists) {
      return createErrorResponse('Seller not found', 404);
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

    return createSuccessResponse({ 
      package: rantanganPackages[packageIndex]
    }, 'Rantangan package updated successfully');

  } catch (error) {
    console.error('Update rantangan package error:', error);
    return createErrorResponse(error.message || 'Internal server error');
  }
}

// Helper function to get default Rantangan packages
function getDefaultRantanganPackages() {
  return [
    {
      id: 'harian',
      type: 'harian',
      name: 'Paket Harian',
      description: 'Menu : Nasi Rendang, Nasi Ayam, Capjay',
      price: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'mingguan',
      type: 'mingguan',
      name: 'Paket Mingguan',
      description: 'Menu : Nasi Rendang, Nasi Ayam, Capjay',
      price: 60000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'bulanan',
      type: 'bulanan',
      name: 'Paket Bulanan',
      description: 'Menu : Nasi Rendang, Nasi Ayam, Capjay',
      price: 250000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}
