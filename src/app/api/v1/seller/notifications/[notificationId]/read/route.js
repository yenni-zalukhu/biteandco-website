import { NextResponse } from 'next/server';
import { db } from '@/firebase/configure';
import { verifyToken } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function PATCH(request, { params }) {
  try {
    // Verify authentication
    const authResult = verifyToken(request);
    if (authResult.error) {
      return withCORSHeaders(NextResponse.json({ error: authResult.error }, { status: 401 }));
    }

    const { sellerId } = authResult;
    const { notificationId } = params;

    if (!notificationId) {
      return withCORSHeaders(NextResponse.json(
        { success: false, message: 'ID notifikasi tidak valid' },
        { status: 400 }
      ));
    }

    console.log('Marking notification as read:', notificationId, 'for seller:', sellerId);

    // Get the notification to check if it exists and belongs to this seller
    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return withCORSHeaders(NextResponse.json(
        { success: false, message: 'Notifikasi tidak ditemukan' },
        { status: 404 }
      ));
    }

    const notificationData = notificationDoc.data();

    // Check if notification belongs to this seller
    if (notificationData.sellerId !== sellerId) {
      return withCORSHeaders(NextResponse.json(
        { success: false, message: 'Akses ditolak' },
        { status: 403 }
      ));
    }

    // Check if already read
    if (notificationData.isRead) {
      return withCORSHeaders(NextResponse.json({
        success: true,
        message: 'Notifikasi sudah ditandai sebagai sudah dibaca'
      }));
    }

    // Update the notification
    await notificationRef.update({
      isRead: true,
      readAt: new Date()
    });

    console.log('Notification marked as read successfully');

    return withCORSHeaders(NextResponse.json({
      success: true,
      message: 'Notifikasi berhasil ditandai sebagai sudah dibaca'
    }));

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return withCORSHeaders(NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server', error: error.message },
      { status: 500 }
    ));
  }
}