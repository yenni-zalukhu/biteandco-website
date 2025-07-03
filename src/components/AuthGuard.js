'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthGuard({ children }) {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      // Check if user is logged in
      const storedUser = localStorage.getItem('bite-admin-user')
      
      if (!storedUser) {
        // No user found, redirect to login
        router.push('/login')
        return false
      }
      
      try {
        const user = JSON.parse(storedUser)
        if (!user.username || !user.role) {
          // Invalid user data, redirect to login
          localStorage.removeItem('bite-admin-user')
          router.push('/login')
          return false
        }
        return true
      } catch (error) {
        // Invalid JSON, redirect to login
        localStorage.removeItem('bite-admin-user')
        router.push('/login')
        return false
      }
    }

    // Check authentication immediately
    checkAuth()
  }, [router])

  return <>{children}</>
}
