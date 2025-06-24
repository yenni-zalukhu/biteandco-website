import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { verifyToken } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/seller/notifications
// Fetch all notifications for this seller
export async function GET(request) {
  try {
    // Verify seller token
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(NextResponse.json({ error: authResult.error }, { status: 401 }));
    }

    const { sellerId } = authResult;
    
    if (!sellerId) {
      return withCORSHeaders(NextResponse.json({ error: "Missing sellerId" }, { status: 400 }));
    }

    console.log('Fetching notifications for seller:', sellerId);

    // Get query parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const isRead = url.searchParams.get('isRead');
    const type = url.searchParams.get('type');

    // Build query
    let query = db.collection('notifications')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc');

    // Apply filters
    if (isRead !== null && isRead !== undefined) {
      query = query.where('isRead', '==', isRead === 'true');
    }
    if (type) {
      query = query.where('type', '==', type);
    }

    // Get notifications
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log('No notifications found, creating sample notifications');
      // Create sample notifications for this seller
      const sampleNotifications = await createSampleNotifications(sellerId);
      
      return withCORSHeaders(NextResponse.json({
        success: true,
        data: sampleNotifications,
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalCount: sampleNotifications.length,
          hasNext: false,
          hasPrev: false
        },
        unreadCount: sampleNotifications.filter(n => !n.isRead).length
      }));
    }

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    // Get unread count
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return withCORSHeaders(NextResponse.json({
      success: true,
      data: paginatedNotifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(notifications.length / limit),
        totalCount: notifications.length,
        hasNext: endIndex < notifications.length,
        hasPrev: page > 1
      },
      unreadCount
    }));

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return withCORSHeaders(NextResponse.json({ 
      error: 'Internal server error',
      debug: error.message 
    }, { status: 500 }));
  }
}

// Create sample notifications for new sellers
async function createSampleNotifications(sellerId) {
  const currentTime = new Date();
  
  const sampleNotifications = [
    {
      id: 'sample-1',
      sellerId,
      type: 'order',
      title: 'Pesanan Baru',
      message: 'Anda mendapat pesanan baru dari pelanggan. Segera siapkan makanan terbaik!',
      isRead: false,
      createdAt: new Date(currentTime.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      data: {
        orderId: 'sample-order-1',
        customerName: 'Kevin Septian'
      }
    },
    {
      id: 'sample-2',
      sellerId,
      type: 'payment',
      title: 'Pembayaran Diterima',
      message: 'Pembayaran sebesar Rp 350.000 telah diterima untuk pesanan hari ini.',
      isRead: false,
      createdAt: new Date(currentTime.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      data: {
        amount: 350000,
        orderId: 'sample-order-2'
      }
    },
    {
      id: 'sample-3',
      sellerId,
      type: 'review',
      title: 'Ulasan Baru',
      message: 'Pelanggan memberikan ulasan 5 bintang untuk makanan Anda. Terima kasih atas pelayanan yang baik!',
      isRead: true,
      createdAt: new Date(currentTime.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      data: {
        rating: 5,
        reviewId: 'sample-review-1'
      }
    },
    {
      id: 'sample-4',
      sellerId,
      type: 'system',
      title: 'Fitur Baru Tersedia',
      message: 'Sistem analisis pelanggan telah diperbarui. Cek insight pelanggan Anda untuk meningkatkan bisnis!',
      isRead: true,
      createdAt: new Date(currentTime.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      data: {
        feature: 'customer-analytics'
      }
    },
    {
      id: 'sample-5',
      sellerId,
      type: 'order',
      title: 'Pesanan Akan Berakhir',
      message: 'Paket rantangan pelanggan akan berakhir besok. Siapkan penawaran renewal!',
      isRead: true,
      createdAt: new Date(currentTime.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      data: {
        orderId: 'sample-order-3',
        endDate: new Date(currentTime.getTime() + 24 * 60 * 60 * 1000).toISOString()
      }
    }
  ];

  // Save sample notifications to Firebase (optional, for persistence)
  try {
    const batch = db.batch();
    sampleNotifications.forEach(notification => {
      const ref = db.collection('notifications').doc(notification.id);
      batch.set(ref, notification);
    });
    await batch.commit();
    console.log('Sample notifications created successfully');
  } catch (error) {
    console.warn('Could not save sample notifications to Firebase:', error);
  }

  return sampleNotifications;
}
