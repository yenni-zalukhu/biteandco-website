# Bite&Co Dashboard

A professional admin dashboard for managing the Bite&Co food delivery platform. This dashboard bridges the React Native mobile app and Next.js backend, providing comprehensive management tools for sellers, buyers, orders, and analytics.

## 🚀 Features

### Dashboard Overview
- **Real-time Statistics**: Monitor key metrics like total sellers, buyers, orders, and revenue
- **Growth Analytics**: Track monthly growth and platform performance
- **Recent Activity Feed**: Stay updated with platform activities
- **Quick Actions**: Fast access to common administrative tasks

### Seller Management
- **Seller Approval System**: Review and approve new seller applications
- **Status Management**: Update seller status (active, pending, suspended)
- **Comprehensive Profiles**: View seller details, revenue, and performance metrics
- **Document Verification**: Review business licenses and certifications

### Buyer Management
- **User Analytics**: Track buyer behavior and spending patterns
- **Customer Tiers**: Gold, Silver, Bronze classification based on spending
- **Geographic Insights**: Understand user distribution across cities
- **Order History**: View complete buyer purchase history

### Order Management
- **Order Tracking**: Monitor all orders across the platform
- **Status Updates**: Manage order lifecycle (pending, confirmed, delivered, cancelled)
- **Payment Tracking**: Monitor payment methods and transaction status
- **Revenue Analytics**: Track order values and platform revenue

### Analytics & Reporting
- **User Growth Tracking**: Monitor buyer and seller acquisition
- **Revenue Analytics**: Track income by category and time period
- **Peak Hours Analysis**: Understand platform usage patterns
- **Geographic Performance**: City-wise performance metrics
- **Category Insights**: Top performing food categories

### System Settings
- **General Configuration**: Site settings and maintenance mode
- **Notification Management**: Email, SMS, and push notification settings
- **Payment Settings**: Commission rates and payment method configuration
- **Delivery Settings**: Delivery fees and radius configuration
- **Security Settings**: Two-factor authentication and password policies

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Firebase (configurable)
- **Authentication**: JWT-based authentication
- **Styling**: Tailwind CSS with custom components
- **Icons**: Unicode emojis and SVG icons

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Firebase project (for database integration)

### Setup Instructions

1. **Clone the repository**
   ```bash
   cd biteandco-next
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration**
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id

   # JWT Secret
   JWT_SECRET=your_jwt_secret_key

   # Admin Credentials
   ADMIN_EMAIL=admin@biteandco.com
   ADMIN_PASSWORD=your_secure_password

   # API Configuration
   API_BASE_URL=http://localhost:3000/api
   ```

4. **Firebase Setup**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication and Firestore Database
   - Copy your configuration to the `.env.local` file

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Access the dashboard**
   Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) in your browser

## 🔧 Configuration

### Database Integration

Replace the mock data in API routes with actual database queries:

```javascript
// Example: /src/app/api/dashboard/stats/route.js
import { db } from '@/lib/firebase-admin'

export async function GET() {
  try {
    const sellersSnapshot = await db.collection('sellers').get()
    const buyersSnapshot = await db.collection('buyers').get()
    const ordersSnapshot = await db.collection('orders').get()
    
    // Calculate real statistics
    const stats = {
      totalSellers: sellersSnapshot.size,
      totalBuyers: buyersSnapshot.size,
      totalOrders: ordersSnapshot.size,
      // ... more calculations
    }
    
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Authentication Setup

Implement proper authentication middleware:

```javascript
// middleware.js
import { NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'

export function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    try {
      verify(token.value, process.env.JWT_SECRET)
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
}
```

## 📱 Integration with React Native App

The dashboard is designed to work seamlessly with the React Native mobile app:

### API Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/approvals` - Pending seller approvals
- `POST /api/dashboard/approvals` - Approve/reject sellers
- `GET /api/dashboard/analytics` - Analytics data
- `GET /api/v1/seller/*` - Seller management APIs
- `GET /api/v1/buyer/*` - Buyer management APIs

### Real-time Updates
Implement WebSocket connections for real-time updates between the mobile app and dashboard:

```javascript
// Real-time order updates
const ws = new WebSocket('ws://localhost:3000/ws')
ws.on('order_update', (data) => {
  // Update dashboard in real-time
  updateOrderStatus(data.orderId, data.newStatus)
})
```

## 🎨 Customization

### Styling
The dashboard uses Tailwind CSS for styling. Customize the appearance by:

1. **Colors**: Update the color palette in `tailwind.config.js`
2. **Components**: Modify component styles in individual page files
3. **Layout**: Adjust the sidebar and header in `layout.js`

### Adding New Features
1. Create new page components in `/src/app/dashboard/`
2. Add corresponding API routes in `/src/app/api/dashboard/`
3. Update the navigation in the dashboard layout

## 🔒 Security Considerations

- **Authentication**: Implement proper JWT-based authentication
- **Authorization**: Add role-based access control
- **Input Validation**: Validate all user inputs on the server
- **Rate Limiting**: Implement API rate limiting
- **HTTPS**: Use HTTPS in production
- **Environment Variables**: Keep sensitive data in environment variables

## 📊 Data Models

### Seller
```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  businessName: string,
  category: string,
  location: string,
  status: 'pending' | 'active' | 'suspended',
  documents: Array,
  joinDate: Date,
  totalOrders: number,
  revenue: number,
  rating: number
}
```

### Order
```javascript
{
  id: string,
  buyerId: string,
  sellerId: string,
  items: Array,
  totalAmount: number,
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled',
  orderDate: Date,
  deliveryAddress: string,
  paymentMethod: string
}
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
- Set up production environment variables
- Configure Firebase for production
- Set up proper logging and monitoring
- Configure backup and disaster recovery

### Recommended Hosting
- **Vercel**: Seamless Next.js deployment
- **AWS**: Full control with EC2 or ECS
- **Google Cloud**: Integration with Firebase
- **DigitalOcean**: Cost-effective hosting

## 📈 Performance Optimization

- **API Caching**: Implement Redis caching for frequently accessed data
- **Image Optimization**: Use Next.js Image component
- **Code Splitting**: Leverage Next.js automatic code splitting
- **Database Indexing**: Optimize database queries with proper indexing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Email: support@biteandco.com
- Documentation: [Link to detailed docs]
- Issue Tracker: [GitHub Issues]

---

**Bite&Co Dashboard** - Empowering food delivery platform management with comprehensive analytics and intuitive controls.
