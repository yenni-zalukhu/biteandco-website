import { NextResponse } from 'next/server'

export function middleware(request) {
  // Check if the request is for dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // In a real application, you would:
    // 1. Check for authentication token in cookies or headers
    // 2. Verify the token with your authentication system
    // 3. Check user permissions/roles
    // 4. Redirect to login if unauthorized
    
    const authToken = request.cookies.get('auth-token')
    
    // For demo purposes, we'll allow access
    // In production, implement proper authentication
    if (!authToken && request.nextUrl.pathname !== '/dashboard/login') {
      // Redirect to login page
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Check if the request is for API routes that require authentication
  if (request.nextUrl.pathname.startsWith('/api/dashboard')) {
    // Verify API authentication
    const authHeader = request.headers.get('authorization')
    
    // For demo purposes, we'll allow access
    // In production, implement proper API authentication
    if (!authHeader && !request.nextUrl.pathname.includes('/api/dashboard/stats')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/dashboard/:path*'
  ]
}
