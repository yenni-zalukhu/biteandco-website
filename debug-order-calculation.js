// Debug script to test order calculation with actual Firestore data
const testOrderData = {
  "id": "MYXhASgnoYylBQeiPeiT",
  "totalAmount": 4200000,
  "pax": 70,
  "items": [
    {
      "price": 10000,
      "id": "1749563550639",
      "name": "Testing",
      "description": "This is testing"
    },
    {
      "id": "1749573634207",
      "price": 20000,
      "name": "Testing 2",
      "description": "Testing 2 menu"
    },
    {
      "id": "1749573677491",
      "name": "Testing kategori 3",
      "description": "This is testing",
      "price": 30000
    }
  ]
}

// Test calculation function
function calculateOrderTotal(items, pax = 1) {
  if (!items || !Array.isArray(items)) {
    console.log('Invalid items for calculation:', items)
    return 0
  }
  
  console.log('Calculating total for items:', items, 'pax:', pax)
  
  const subtotal = items.reduce((total, item) => {
    const itemPrice = item.price || 0
    const itemQuantity = item.quantity || 1
    const itemTotal = itemPrice * itemQuantity
    console.log(`Item: ${item.name}, Price: ${itemPrice}, Quantity: ${itemQuantity}, Total: ${itemTotal}`)
    return total + itemTotal
  }, 0)
  
  // For catering orders, multiply by pax
  const finalTotal = subtotal * pax
  console.log(`Subtotal: ${subtotal}, Pax: ${pax}, Final Total: ${finalTotal}`)
  return finalTotal
}

// Test with actual data
console.log('=== TESTING ORDER CALCULATION ===')
console.log('Original totalAmount from Firestore:', testOrderData.totalAmount)

const calculatedTotal = calculateOrderTotal(testOrderData.items, testOrderData.pax)
console.log('Calculated total:', calculatedTotal)

// Expected: (10000 + 20000 + 30000) * 70 = 4,200,000
console.log('Expected total: 4,200,000')
console.log('Matches expected:', calculatedTotal === 4200000)

// Test formatCurrency function
function formatCurrency(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

console.log('=== TESTING INDIVIDUAL ITEM DISPLAY (WITH PAX) ===')
const orderType = "Catering" // This order is catering type
const pax = testOrderData.pax
const isCateringOrder = orderType && orderType.toLowerCase().includes('catering')

testOrderData.items.forEach((item, index) => {
  const quantity = item.quantity || 1
  const price = item.price || 0  
  
  // For catering orders, multiply by pax
  const itemTotal = isCateringOrder ? (price * quantity * pax) : (price * quantity)
  
  console.log(`Item ${index + 1}: ${quantity}x ${item.name}${isCateringOrder && pax > 1 ? ` (${pax} pax)` : ''} = ${formatCurrency(itemTotal)}`)
  console.log(`  - Base price: ${formatCurrency(price)}`)
  console.log(`  - Quantity: ${quantity}`)
  if (isCateringOrder) {
    console.log(`  - Pax: ${pax}`)
    console.log(`  - Calculation: ${price} × ${quantity} × ${pax} = ${itemTotal}`)
  } else {
    console.log(`  - Calculation: ${price} × ${quantity} = ${itemTotal}`)
  }
})

console.log('\n=== EXPECTED RESULTS ===')
console.log('Item 1: 1x Testing (70 pax) = Rp 700.000')
console.log('Item 2: 1x Testing 2 (70 pax) = Rp 1.400.000') 
console.log('Item 3: 1x Testing kategori 3 (70 pax) = Rp 2.100.000')
console.log('Total: Rp 4.200.000')

console.log('=== TESTING CURRENCY FORMATTING ===')
console.log('Formatted calculated total:', formatCurrency(calculatedTotal))
console.log('Formatted original total:', formatCurrency(testOrderData.totalAmount))
console.log('Formatted 0:', formatCurrency(0))
console.log('Formatted NaN:', formatCurrency(NaN))
console.log('Formatted null:', formatCurrency(null))
console.log('Formatted undefined:', formatCurrency(undefined))
