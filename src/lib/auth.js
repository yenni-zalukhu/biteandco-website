import jwt from 'jsonwebtoken';
import { auth, db } from './firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

// NextResponse for API routes (only available in Next.js context)
let NextResponse
try {
  if (typeof window === 'undefined') {
    // We're on the server, try to import Next.js
    const { NextResponse: NR } = require('next/server')
    NextResponse = NR
  }
} catch (error) {
  // Next.js not available or we're in a different context
}

// Production: Default admin should be created manually
// Remove or comment out automatic admin creation for production

// Initialize default admin user - DISABLED FOR PRODUCTION
export const initializeDefaultAdmin = async () => {
  // Production: Admin users should be created manually through proper setup
  // This function is disabled for production security
  return;
  /*
  try {
    // Check if admin user already exists in Firestore
    const adminDoc = await getDoc(doc(db, 'admin_users', DEFAULT_ADMIN.username))
    
    if (!adminDoc.exists()) {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        DEFAULT_ADMIN.email, 
        DEFAULT_ADMIN.password
      )
      
      // Store admin user data in Firestore
      await setDoc(doc(db, 'admin_users', DEFAULT_ADMIN.username), {
        email: DEFAULT_ADMIN.email,
        username: DEFAULT_ADMIN.username,
        role: DEFAULT_ADMIN.role,
        uid: userCredential.user.uid,
        createdAt: new Date(),
        lastLogin: null
      })
      
      console.log('Default admin user created successfully')
    } else {
      console.log('Default admin user already exists')
    }
  } catch (error) {
    console.error('Error initializing default admin:', error)
  }
  */
}

// Admin login function
export const adminLogin = async (username, password) => {
  try {
    // Check if it's the default admin credentials
    if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        DEFAULT_ADMIN.email, 
        DEFAULT_ADMIN.password
      )
      
      // Update last login time
      await setDoc(doc(db, 'admin_users', username), {
        lastLogin: new Date()
      }, { merge: true })
      
      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: username,
          role: 'admin'
        }
      }
    } else {
      // Check if user exists in Firestore
      const adminDoc = await getDoc(doc(db, 'admin_users', username))
      
      if (!adminDoc.exists()) {
        throw new Error('Invalid username or password')
      }
      
      const adminData = adminDoc.data()
      
      // Sign in with Firebase Auth using email
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        adminData.email, 
        password
      )
      
      // Update last login time
      await setDoc(doc(db, 'admin_users', username), {
        lastLogin: new Date()
      }, { merge: true })
      
      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: username,
          role: adminData.role
        }
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Admin logout function
export const adminLogout = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, error: error.message }
  }
}

// Get current admin user
export const getCurrentAdmin = () => {
  return auth.currentUser
}

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser
}

// Legacy JWT functions for API routes
export function verifyToken(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    return { 
      sellerId: decoded.sellerId, 
      buyerId: decoded.buyerId,
      sellerData: decoded,
      buyerData: decoded,
      userData: decoded
    };
  } catch (error) {
    console.error('Token verification error:', error.message);
    return { error: 'Invalid token', status: 401 };
  }
}

export function verifyBuyerToken(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.buyerId) {
      return { error: 'Invalid buyer token', status: 401 };
    }
    
    return { 
      buyerId: decoded.buyerId,
      buyerData: decoded,
      isValid: true
    };
  } catch (error) {
    console.error('Buyer token verification error:', error.message);
    return { error: 'Invalid token', status: 401 };
  }
}

export function createErrorResponse(message, status = 500, requestId = null, debugInfo = null) {
  const errorResponse = {
    success: false,
    message,
    error: true,
    timestamp: new Date().toISOString()
  };

  if (requestId) {
    errorResponse.requestId = requestId;
  }

  if (debugInfo && process.env.NODE_ENV === 'development') {
    errorResponse.debug = debugInfo;
  }

  return NextResponse.json(errorResponse, { status });
}

export function createSuccessResponse(data, message = 'Success', requestId = null) {
  const successResponse = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...data
  };

  if (requestId) {
    successResponse.requestId = requestId;
  }

  return NextResponse.json(successResponse);
}

// Utility function to generate request ID
export function generateRequestId(prefix = 'req') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to log API requests
export function logApiRequest(requestId, method, path, data = {}) {
  // console.log(`[${requestId}] ${method} ${path}`, {
  //   timestamp: new Date().toISOString(),
  //   ...data
  // });
}

// Utility function to validate email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Utility function to validate phone number
export function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Utility function to sanitize user input
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}
