import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { verifyToken } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function PATCH(request) {
  try {
    // Verify authentication
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(NextResponse.json({ error: authResult.error }, { status: 401 }));
    }

    const { sellerId } = authResult;
    
    if (!sellerId) {
      return withCORSHeaders(NextResponse.json({ error: "Missing sellerId" }, { status: 400 }));
    }

    console.log('Marking all notifications as read for seller:', sellerId);

    // Get all unread notifications for this seller
    const unreadSnapshot = await db.collection('notifications')
      .where('sellerId', '==', sellerId)
      .where('isRead', '==', false)
      .get();

    if (unreadSnapshot.empty) {
      return withCORSHeaders(NextResponse.json({
        success: true,
        message: 'Tidak ada notifikasi yang belum dibaca',
        updatedCount: 0
      }));
    }

    // Update all unread notifications in a batch
    const batch = db.batch();
    const currentTime = new Date();
    
    unreadSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: currentTime
      });
    });

    await batch.commit();

    console.log('All notifications marked as read successfully');

    return withCORSHeaders(NextResponse.json({
      success: true,
      message: 'Semua notifikasi berhasil ditandai sebagai sudah dibaca',
      updatedCount: unreadSnapshot.size
    }));

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return withCORSHeaders(NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server', error: error.message },
      { status: 500 }
    ));
  }
}
