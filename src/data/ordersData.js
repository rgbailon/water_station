// Water refilling orders — product catalog and sample orders
// All prices, types and bottle options for the shop

// 1. Water types and bottle options
export const WaterType = {
  PURIFIED: { id: 'PURIFIED', label: 'Purified' },
  MINERAL: { id: 'MINERAL', label: 'Mineral' },
  ALKALINE: { id: 'ALKALINE', label: 'Alkaline' },
}

export const BottleSituation = {
  WITH_GALLON: { id: 'WITH_GALLON', label: 'With Gallon', short: 'With Gallon' },
  NEEDS_GALLON: { id: 'NEEDS_GALLON', label: 'New Gallon', short: 'New Gallon' },
  BORROW: { id: 'BORROW', label: 'Borrow', short: 'Borrow' },
}

export const OrderStatus = {
  PENDING: { id: 'PENDING', label: 'Pending' },
  CONFIRMED: { id: 'CONFIRMED', label: 'Order Confirmed' },
  GALLON_TO_GET: { id: 'GALLON_TO_GET', label: 'Gallon Pick Up' },
  OUT_FOR_DELIVERY: { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  DELIVERED: { id: 'DELIVERED', label: 'Delivered' },
  CANCELED: { id: 'CANCELED', label: 'Canceled' },
}

// Product colors
export const accentColors = {
  Aqua: { hex: '#26C6DA', argb: 0xFF26C6DA, signed: -14100902 }, // 4280158682 unsigned
  WaterBlueLight: { hex: '#4FC3F7', argb: 0xFF4FC3F7, signed: -1378441 },
  DeepWater: { hex: '#1565C0', argb: 0xFF1565C0, signed: -14131520 },
  WaterTeal: { hex: '#00897B', argb: 0xFF00897B, signed: -16741061 },
}

export const productImages = {
  Round: 'https://i.ibb.co/rR9LDHXb/round.jpg',
  Slim: 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg',
}

// Shop settings — delivery fees only; order status is now database-driven (no timers)
export const ORDER_CONSTANTS = {
  MIN_DELIVERY_FREE: 100.0,
  DELIVERY_FEE_FLAT: 0.0,
}

// How orders are saved on this device
export const ORDER_STORE_SPEC = {
  file: 'waterrefilling_orders',
  key: 'order_list',
  jsonExample: `[
  {
    "orderId":"WFR-1234",
    "date":1710000000000,
    "customerName":"Ana Reyes",
    "subtotal":55.0,
    "deliveryFee":0.0,
    "total":55.0,
    "payment":"Cash on Delivery",
    "schedule":"Today",
    "notes":"Leave at door",
    "isCanceled":false,
    "items":[{"productId":1,"quantity":2},{"productId":2,"quantity":1}]
  }
]`,
}

// Delivery and payment options
export const scheduleOptions = ['Today', 'Tomorrow']
export const paymentOptions = [
  { label: 'Cash on Delivery', available: true },
  { label: 'GCash', available: false },
  { label: 'Maya', available: false },
]

// 3. Product catalog — 18 items
export const sampleProducts = [
  {
    id: 1,
    name: 'Purified Refill',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Refill for your round 5-gallon jug. RO-filtered, UV-sterilized, and sealed fresh on site.',
    price: 25.0,
    type: WaterType.PURIFIED.id,
    typeLabel: WaterType.PURIFIED.label,
    bottleSituation: BottleSituation.WITH_GALLON.id,
    bottleLabel: BottleSituation.WITH_GALLON.label,
    accent: accentColors.DeepWater.hex,
    accentArgb: accentColors.DeepWater.argb,
  },
  {
    id: 2,
    name: 'Purified Refill',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Refill for your slim 5-gallon jug. RO-filtered, UV-sterilized, and sealed fresh on site.',
    price: 30.0,
    type: WaterType.PURIFIED.id,
    typeLabel: WaterType.PURIFIED.label,
    bottleSituation: BottleSituation.WITH_GALLON.id,
    bottleLabel: BottleSituation.WITH_GALLON.label,
    accent: accentColors.WaterBlueLight.hex,
    accentArgb: accentColors.WaterBlueLight.argb,
  },
  {
    id: 3,
    name: 'Mineral Refill',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Mineral-enriched refill for round jugs. Retains natural minerals for balanced taste.',
    price: 30.0,
    type: WaterType.MINERAL.id,
    typeLabel: WaterType.MINERAL.label,
    bottleSituation: BottleSituation.WITH_GALLON.id,
    bottleLabel: BottleSituation.WITH_GALLON.label,
    accent: accentColors.WaterTeal.hex,
    accentArgb: accentColors.WaterTeal.argb,
  },
  {
    id: 4,
    name: 'Mineral Refill',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Mineral-enriched refill for slim jugs. Retains natural minerals for balanced taste.',
    price: 35.0,
    type: WaterType.MINERAL.id,
    typeLabel: WaterType.MINERAL.label,
    bottleSituation: BottleSituation.WITH_GALLON.id,
    bottleLabel: BottleSituation.WITH_GALLON.label,
    accent: accentColors.Aqua.hex,
    accentArgb: accentColors.Aqua.argb,
  },
  {
    id: 5,
    name: 'Alkaline Refill',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Alkaline refill (pH 8+) for round jugs. Ionized for smooth, crisp hydration.',
    price: 40.0,
    type: WaterType.ALKALINE.id,
    typeLabel: WaterType.ALKALINE.label,
    bottleSituation: BottleSituation.WITH_GALLON.id,
    bottleLabel: BottleSituation.WITH_GALLON.label,
    accent: accentColors.DeepWater.hex,
    accentArgb: accentColors.DeepWater.argb,
  },
  {
    id: 6,
    name: 'Alkaline Refill',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Alkaline refill (pH 8+) for slim jugs. Ionized for smooth, crisp hydration.',
    price: 45.0,
    type: WaterType.ALKALINE.id,
    typeLabel: WaterType.ALKALINE.label,
    bottleSituation: BottleSituation.WITH_GALLON.id,
    bottleLabel: BottleSituation.WITH_GALLON.label,
    accent: accentColors.WaterBlueLight.hex,
    accentArgb: accentColors.WaterBlueLight.argb,
  },
  {
    id: 7,
    name: 'New Gallon + Purified',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Brand-new round gallon + purified refill. Take home a fresh jug sealed and ready.',
    price: 150.0,
    type: WaterType.PURIFIED.id,
    typeLabel: WaterType.PURIFIED.label,
    bottleSituation: BottleSituation.NEEDS_GALLON.id,
    bottleLabel: BottleSituation.NEEDS_GALLON.label,
    accent: accentColors.DeepWater.hex,
    accentArgb: accentColors.DeepWater.argb,
  },
  {
    id: 8,
    name: 'New Gallon + Purified',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Brand-new slim gallon + purified refill. Take home a fresh jug sealed and ready.',
    price: 155.0,
    type: WaterType.PURIFIED.id,
    typeLabel: WaterType.PURIFIED.label,
    bottleSituation: BottleSituation.NEEDS_GALLON.id,
    bottleLabel: BottleSituation.NEEDS_GALLON.label,
    accent: accentColors.WaterBlueLight.hex,
    accentArgb: accentColors.WaterBlueLight.argb,
  },
  {
    id: 9,
    name: 'New Gallon + Mineral',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Brand-new round gallon + mineral refill. Fresh jug with mineral-balanced water.',
    price: 160.0,
    type: WaterType.MINERAL.id,
    typeLabel: WaterType.MINERAL.label,
    bottleSituation: BottleSituation.NEEDS_GALLON.id,
    bottleLabel: BottleSituation.NEEDS_GALLON.label,
    accent: accentColors.WaterTeal.hex,
    accentArgb: accentColors.WaterTeal.argb,
  },
  {
    id: 10,
    name: 'New Gallon + Mineral',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Brand-new slim gallon + mineral refill. Fresh jug with mineral-balanced water.',
    price: 165.0,
    type: WaterType.MINERAL.id,
    typeLabel: WaterType.MINERAL.label,
    bottleSituation: BottleSituation.NEEDS_GALLON.id,
    bottleLabel: BottleSituation.NEEDS_GALLON.label,
    accent: accentColors.Aqua.hex,
    accentArgb: accentColors.Aqua.argb,
  },
  {
    id: 11,
    name: 'New Gallon + Alkaline',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Brand-new round gallon + alkaline refill. Premium pH 8+ water in a new jug.',
    price: 170.0,
    type: WaterType.ALKALINE.id,
    typeLabel: WaterType.ALKALINE.label,
    bottleSituation: BottleSituation.NEEDS_GALLON.id,
    bottleLabel: BottleSituation.NEEDS_GALLON.label,
    accent: accentColors.DeepWater.hex,
    accentArgb: accentColors.DeepWater.argb,
  },
  {
    id: 12,
    name: 'New Gallon + Alkaline',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Brand-new slim gallon + alkaline refill. Premium pH 8+ water in a new jug.',
    price: 180.0,
    type: WaterType.ALKALINE.id,
    typeLabel: WaterType.ALKALINE.label,
    bottleSituation: BottleSituation.NEEDS_GALLON.id,
    bottleLabel: BottleSituation.NEEDS_GALLON.label,
    accent: accentColors.WaterBlueLight.hex,
    accentArgb: accentColors.WaterBlueLight.argb,
  },
  {
    id: 13,
    name: 'Borrow Gallon + Purified',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Borrow a round gallon + purified refill. Return jug on next delivery.',
    price: 25.0,
    type: WaterType.PURIFIED.id,
    typeLabel: WaterType.PURIFIED.label,
    bottleSituation: BottleSituation.BORROW.id,
    bottleLabel: BottleSituation.BORROW.label,
    accent: accentColors.DeepWater.hex,
    accentArgb: accentColors.DeepWater.argb,
  },
  {
    id: 14,
    name: 'Borrow Gallon + Purified',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Borrow a slim gallon + purified refill. Return jug on next delivery.',
    price: 30.0,
    type: WaterType.PURIFIED.id,
    typeLabel: WaterType.PURIFIED.label,
    bottleSituation: BottleSituation.BORROW.id,
    bottleLabel: BottleSituation.BORROW.label,
    accent: accentColors.WaterBlueLight.hex,
    accentArgb: accentColors.WaterBlueLight.argb,
  },
  {
    id: 15,
    name: 'Borrow Gallon + Mineral',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Borrow a round gallon + mineral refill. Return jug on next delivery.',
    price: 30.0,
    type: WaterType.MINERAL.id,
    typeLabel: WaterType.MINERAL.label,
    bottleSituation: BottleSituation.BORROW.id,
    bottleLabel: BottleSituation.BORROW.label,
    accent: accentColors.WaterTeal.hex,
    accentArgb: accentColors.WaterTeal.argb,
  },
  {
    id: 16,
    name: 'Borrow Gallon + Mineral',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Borrow a slim gallon + mineral refill. Return jug on next delivery.',
    price: 35.0,
    type: WaterType.MINERAL.id,
    typeLabel: WaterType.MINERAL.label,
    bottleSituation: BottleSituation.BORROW.id,
    bottleLabel: BottleSituation.BORROW.label,
    accent: accentColors.Aqua.hex,
    accentArgb: accentColors.Aqua.argb,
  },
  {
    id: 17,
    name: 'Borrow Gallon + Alkaline',
    size: '18.9 L (5 Gal)',
    container: 'Round',
    description: 'Borrow a round gallon + alkaline refill. Return jug on next delivery.',
    price: 40.0,
    type: WaterType.ALKALINE.id,
    typeLabel: WaterType.ALKALINE.label,
    bottleSituation: BottleSituation.BORROW.id,
    bottleLabel: BottleSituation.BORROW.label,
    accent: accentColors.DeepWater.hex,
    accentArgb: accentColors.DeepWater.argb,
  },
  {
    id: 18,
    name: 'Borrow Gallon + Alkaline',
    size: '18.9 L (5 Gal)',
    container: 'Slim',
    description: 'Borrow a slim gallon + alkaline refill. Return jug on next delivery.',
    price: 45.0,
    type: WaterType.ALKALINE.id,
    typeLabel: WaterType.ALKALINE.label,
    bottleSituation: BottleSituation.BORROW.id,
    bottleLabel: BottleSituation.BORROW.label,
    accent: accentColors.WaterBlueLight.hex,
    accentArgb: accentColors.WaterBlueLight.argb,
  },
]

// Attach image for each product based on container (Round vs Slim)
sampleProducts.forEach(p => {
  p.image = productImages[p.container]
})

// Helper map for fast lookup
export const productById = Object.fromEntries(sampleProducts.map(p => [p.id, p]))

// 4. Order status — now database-driven (no timers)
// `order.status` is the source of truth (e.g. PENDING, CONFIRMED, GALLON_TO_GET, OUT_FOR_DELIVERY, DELIVERED, CANCELED).
// Legacy `isCanceled` / `is_canceled` boolean is still honored for backward compat.
export function getOrderStatus(order) {
  if (!order) return OrderStatus.PENDING
  if (order.isCanceled || order.is_canceled) return OrderStatus.CANCELED
  const raw = order.status || order.order_status
  if (raw) {
    const key = String(raw).toUpperCase()
    if (OrderStatus[key]) return OrderStatus[key]
    const byId = Object.values(OrderStatus).find(v => v.id === key)
    if (byId) return byId
  }
  return OrderStatus.PENDING
}

export function canCancelOrder(order) {
  if (!order) return false
  if (order.isCanceled || order.is_canceled) return false
  const s = getOrderStatus(order).id
  // Only allow cancel while still in preparation phases
  return s === OrderStatus.PENDING.id || s === OrderStatus.CONFIRMED.id || s === OrderStatus.GALLON_TO_GET.id
}

// Helper: list of statuses that allow manual transition (for UI dropdown)
export const ORDER_STATUS_OPTIONS = Object.values(OrderStatus)

export function formatOrderDate(epochMillis) {
  const d = new Date(epochMillis)
  return d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}
export function formatOrderDateShort(epochMillis) {
  const d = new Date(epochMillis)
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })
}

// 5. Sample orders
function calcTotals(items) {
  const subtotal = items.reduce((s, it) => s + productById[it.productId].price * it.quantity, 0)
  const deliveryFee = subtotal >= ORDER_CONSTANTS.MIN_DELIVERY_FREE ? 0 : ORDER_CONSTANTS.DELIVERY_FEE_FLAT
  const total = subtotal + deliveryFee
  return { subtotal, deliveryFee, total }
}

function mkOrder({ orderId, date, status = 'PENDING', customerName, phone, address, items, payment = 'Cash on Delivery', schedule = 'Today', notes = '', isCanceled = false }) {
  const ts = date ?? Date.now()
  const finalStatus = isCanceled ? 'CANCELED' : status
  const { subtotal, deliveryFee, total } = calcTotals(items)
  const expanded = items.map(it => ({ ...it, product: productById[it.productId] }))
  return { orderId, date: ts, status: finalStatus, customerName, phone, address, items: expanded, subtotal, deliveryFee, total, payment, schedule, notes, isCanceled: finalStatus === 'CANCELED' }
}

// Sample orders — each has explicit database status (no timers)
export function generateSampleOrders() {
  const now = Date.now()
  return [
    mkOrder({
      orderId: 'WFR-4821',
      date: now - 25 * 60 * 1000,
      status: 'PENDING',
      customerName: 'Juan Dela Cruz',
      phone: '0912-345-6789',
      address: 'Brgy. Monbon, Irosin - Purok 3 near chapel',
      items: [{ productId: 1, quantity: 2 }, { productId: 14, quantity: 1 }],
      payment: 'Cash on Delivery',
      schedule: 'Today',
      notes: 'Leave at gate — dog is friendly',
    }),
    mkOrder({
      orderId: 'WFR-7392',
      date: now - 2 * 60 * 60 * 1000,
      status: 'CONFIRMED',
      customerName: 'Maria Santos',
      phone: '0917-000-1122',
      address: 'Brgy. Patag, Irosin',
      items: [{ productId: 4, quantity: 3 }],
      payment: 'Cash on Delivery',
      schedule: 'Today',
      notes: '',
    }),
    mkOrder({
      orderId: 'WFR-6105',
      date: now - 4 * 60 * 60 * 1000,
      status: 'GALLON_TO_GET',
      customerName: 'Ana Reyes',
      phone: '0905-123-4567',
      address: 'Brgy. San Isidro, Irosin - San Isidro Elementary',
      items: [{ productId: 2, quantity: 1 }, { productId: 1, quantity: 2 }],
      payment: 'Cash on Delivery',
      schedule: 'Today',
      notes: 'Leave at door',
    }),
    mkOrder({
      orderId: 'WFR-2847',
      date: now - 8 * 60 * 60 * 1000,
      status: 'OUT_FOR_DELIVERY',
      customerName: 'Kap. Reyes',
      phone: '0917-***-4321',
      address: 'Brgy. Patag - Barangay Hall',
      items: [{ productId: 8, quantity: 2 }, { productId: 6, quantity: 1 }],
      payment: 'Cash on Delivery',
      schedule: 'Tomorrow',
      notes: 'Deliver before 10am — barangay meeting',
    }),
    mkOrder({
      orderId: 'WFR-9153',
      date: now - 15 * 60 * 60 * 1000,
      status: 'DELIVERED',
      customerName: 'Mina Store',
      phone: '0920-***-9876',
      address: 'Brgy. Bagsangan - National Road',
      items: [{ productId: 13, quantity: 5 }],
      payment: 'Cash on Delivery',
      schedule: 'Today',
      notes: '',
    }),
    mkOrder({
      orderId: 'WFR-5033',
      date: now - 2 * 60 * 60 * 1000,
      status: 'CANCELED',
      customerName: 'Lito Manalo',
      phone: '0930-111-2222',
      address: 'Brgy. Carriedo, Irosin',
      items: [{ productId: 3, quantity: 2 }],
      payment: 'Cash on Delivery',
      schedule: 'Today',
      notes: 'Customer requested cancel — wrong size',
      isCanceled: true,
    }),
    // Historical (older, already delivered)
    {
      orderId: 'WFR-1234',
      date: new Date('2026-09-11T09:30:00+08:00').getTime(),
      status: 'DELIVERED',
      customerName: 'Aling Nena Sari-Sari',
      phone: '0905-***-6789',
      address: 'Brgy. San Isidro - near market',
      items: [{ productId: 11, quantity: 1, product: productById[11] }, { productId: 5, quantity: 2, product: productById[5] }],
      subtotal: 250.0,
      deliveryFee: 0,
      total: 250.0,
      payment: 'Cash on Delivery',
      schedule: 'Today',
      notes: 'Partial hiram return included',
      isCanceled: false,
    },
    {
      orderId: 'WFR-8761',
      date: new Date('2026-09-10T14:00:00+08:00').getTime(),
      status: 'DELIVERED',
      customerName: 'Irosin NHS Canteen',
      phone: '0930-***-1111',
      address: 'San Julian, Irosin - Irosin NHS',
      items: [{ productId: 18, quantity: 4, product: productById[18] }],
      subtotal: 180.0,
      deliveryFee: 0,
      total: 180.0,
      payment: 'Cash on Delivery',
      schedule: 'Tomorrow',
      notes: 'School event — need OR',
      isCanceled: false,
    },
  ]
}

export const defaultSampleOrders = generateSampleOrders()

// Check if required customer details are filled in
export function isCheckoutValid({ name, phone, address }) {
  return Boolean(name?.trim() && phone?.trim() && address?.trim())
}
