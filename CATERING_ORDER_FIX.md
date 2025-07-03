# Catering Order Item Display Fix

## Issue
Individual items in catering orders were showing base prices instead of pax-multiplied prices:
- 1x Testing: `Rp 10.000` ❌ (should be `Rp 700.000`)
- 1x Testing 2: `Rp 20.000` ❌ (should be `Rp 1.400.000`)
- 1x Testing kategori 3: `Rp 30.000` ❌ (should be `Rp 2.100.000`)

## Fix Applied
Updated item display logic to multiply by pax for catering orders:

```javascript
const isCateringOrder = order.orderType && order.orderType.toLowerCase().includes('catering')
const itemTotal = isCateringOrder ? (price * quantity * pax) : (price * quantity)

// Display with pax indicator
{quantity}x {item.name}
{isCateringOrder && pax > 1 && (
  <span className="text-gray-500 ml-1">({pax} pax)</span>
)}
```

## Expected Result
Order MYXhASgnoYylBQeiPeiT should now show:
- 1x Testing (70 pax): `Rp 700.000`
- 1x Testing 2 (70 pax): `Rp 1.400.000`
- 1x Testing kategori 3 (70 pax): `Rp 2.100.000`
- **Total: `Rp 4.200.000`** ✅

## Calculation Logic
For catering orders: `Base Price × Quantity × Pax`
- Testing: `10,000 × 1 × 70 = 700,000`
- Testing 2: `20,000 × 1 × 70 = 1,400,000`
- Testing kategori 3: `30,000 × 1 × 70 = 2,100,000`
- **Total: `4,200,000`**
