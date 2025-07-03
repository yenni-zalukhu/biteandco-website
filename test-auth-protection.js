// Test script to clear authentication and verify protection

console.log('🧪 Testing Authentication Protection')
console.log('====================================')

// Check current localStorage
console.log('Current localStorage:')
console.log('bite-admin-user:', localStorage.getItem('bite-admin-user'))

// Clear all authentication data
localStorage.removeItem('bite-admin-user')
sessionStorage.clear()

console.log('✅ Cleared authentication data')
console.log('🔄 Now try accessing: http://localhost:3002/dashboard')
console.log('📋 You should be redirected to: http://localhost:3002/login')

// Refresh the page to trigger the auth check
if (confirm('Clear auth data and reload page to test protection?')) {
  window.location.reload()
}
