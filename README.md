# BiteAndCo Admin Dashboard

A Next.js-based admin dashboard for managing the BiteAndCo food delivery platform, including seller approvals, order management, and analytics.

## 🚀 Production Ready

This application has been cleaned and prepared for production deployment with all debug code removed and security measures implemented.

## Features

- **Seller Management**: Approve/reject seller applications
- **Order Management**: View and manage customer orders
- **Analytics Dashboard**: Track business metrics and revenue
- **Buyer Management**: View customer information
- **Real-time Updates**: Live data synchronization with Firebase
- **Secure Authentication**: Admin user management system

## Getting Started

### Development

First, install dependencies:

```bash
npm install
```

Set up your environment variables by copying `.env.example` to `.env` and filling in your values:

```bash
cp .env.example .env
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Production Deployment

**⚠️ Important:** Before deploying to production, please review the `PRODUCTION_CHECKLIST.md` file for required manual configuration steps.

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Test production build locally:**
   ```bash
   npm run start
   ```

3. **Deploy to your hosting platform**

## Environment Variables

Required environment variables for production:

```bash
# Midtrans Payment Gateway
MIDTRANS_MODE=production
MIDTRANS_PRODUCTION_SERVER_KEY=your_production_server_key
MIDTRANS_PRODUCTION_CLIENT_KEY=your_production_client_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_production_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_production_app_id
```

## Security Notes

- Default admin credentials have been removed for security
- All debug code has been commented out
- Admin users must be created manually through Firebase Console
- Proper Firestore security rules should be configured

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Payment**: Midtrans Payment Gateway
- **Styling**: Tailwind CSS
- **Icons**: Heroicons

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Admin dashboard pages
│   ├── api/              # API routes
│   └── login/            # Authentication
├── components/           # Reusable components
├── lib/                 # Utilities and configurations
│   ├── firebase.js      # Firebase configuration
│   ├── auth.js          # Authentication utilities
│   └── email.js         # Email service
└── config/              # App configuration
```

## Documentation

- See `PRODUCTION_CHECKLIST.md` for production deployment guide
- Check Firebase documentation for database setup
- Review Midtrans documentation for payment integration

## License

© 2025 Bite&Co. All rights reserved.
