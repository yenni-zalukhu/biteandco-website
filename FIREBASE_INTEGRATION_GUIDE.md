# Firebase Integration Guide

## Overview
The Bite&Co admin dashboard has been successfully connected to Firebase Firestore for real-time data management.

## Features Implemented

### Real-time Data Synchronization
- **Dashboard Overview**: Live stats from users and orders collections
- **Buyers Management**: Real-time buyer data from users collection
- **Sellers Management**: Real-time seller data with approval functionality
- **Orders Management**: Live order tracking and status updates

### Firebase Collections Used

#### Users Collection (`users`)
```javascript
{
  name: string,
  email: string,
  phone: string,
  role: 'buyer' | 'seller' | null,
  isApproved: boolean, // for sellers
  createdAt: timestamp,
  totalOrders: number,
  totalSpent: number, // for buyers
  totalRevenue: number, // for sellers
  location: string,
  profileImage: string,
  // ... other user fields
}
```

#### Orders Collection (`orders`)
```javascript
{
  buyerName: string,
  buyerEmail: string,
  sellerName: string,
  items: array,
  totalAmount: number,
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled',
  createdAt: timestamp,
  deliveredAt: timestamp,
  paymentMethod: string,
  deliveryAddress: string,
  // ... other order fields
}
```

## Key Features

### 1. Real-time Data Updates
- All pages use `onSnapshot` listeners for live data updates
- Changes in Firebase are immediately reflected in the dashboard
- No manual refresh required

### 2. Error Handling & Fallbacks
- Connection error states with retry functionality
- Fallback to mock data if Firebase is unavailable
- Loading states with proper indicators

### 3. Status Management
- Sellers can be approved/suspended through the dashboard
- Order statuses can be updated in real-time
- Changes are immediately synced to Firebase

### 4. Live Data Indicators
- Green pulse indicators show live data connection
- Real-time stats and counts update automatically

## Firebase Configuration
The dashboard uses the existing Firebase configuration from your React Native app:
- Project ID: `biteandco-a2591`
- All Firebase services (Firestore, Auth, Storage) are available

## Testing the Integration

### 1. Start the Dashboard
```bash
cd biteandco-next
npm run dev
```

### 2. Navigate to Dashboard Pages
- **Overview**: `http://localhost:3001/dashboard`
- **Buyers**: `http://localhost:3001/dashboard/buyers`
- **Sellers**: `http://localhost:3001/dashboard/sellers`
- **Orders**: `http://localhost:3001/dashboard/orders`

### 3. Test Real-time Updates
1. Open Firebase Console for your project
2. Navigate to Firestore Database
3. Add/modify documents in the `users` or `orders` collections
4. Watch the dashboard update in real-time

### 4. Test Status Changes
- In the Sellers page, try approving/suspending sellers
- In the Orders page, try changing order statuses
- Changes should be reflected in Firebase immediately

## Data Structure Compatibility
The dashboard handles data from both your React Native app and direct Firebase entries:
- Flexible field mapping (e.g., `name` or `displayName`)
- Graceful handling of missing fields
- Default values for undefined data

## Next Steps
1. **Authentication**: Add Firebase Auth for admin login
2. **Data Validation**: Add Firestore security rules
3. **Advanced Analytics**: Implement more detailed reporting
4. **Notifications**: Add real-time notifications for new orders/sellers

## Troubleshooting

### Connection Issues
- Check Firebase configuration in `src/lib/firebase.js`
- Verify network connectivity
- Check browser console for errors

### Data Not Appearing
1. Verify Firebase project ID is correct
2. Check Firestore security rules
3. Ensure collections exist with proper data structure
4. Check browser network tab for API calls

### Performance
- Firebase automatically caches data for offline support
- Real-time listeners are optimized for efficiency
- Consider pagination for large datasets in production
