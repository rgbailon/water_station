// Sample data for demo — all dates in September 2026

export const inventoryItems = [
  { id: 1, name: "5-Gal Round (Refill)", sku: "GAL-RND-5", price: 30, stockFilled: 42, stockEmpty: 18, threshold: 10, icon: "💧", unit: "gals" },
  { id: 2, name: "5-Gal Slim (Refill)", sku: "GAL-SLM-5", price: 30, stockFilled: 28, stockEmpty: 9, threshold: 10, icon: "🧴", unit: "gals" },
  { id: 3, name: "350ml Bottles (24pcs)", sku: "BTL-350", price: 140, stockFilled: 15, stockEmpty: 0, threshold: 5, icon: "🥤", unit: "cases" },
  { id: 4, name: "500ml Bottles (24pcs)", sku: "BTL-500", price: 160, stockFilled: 8, stockEmpty: 0, threshold: 5, icon: "💦", unit: "cases" },
  { id: 5, name: "1L Bottles (12pcs)", sku: "BTL-1L", price: 180, stockFilled: 6, stockEmpty: 0, threshold: 4, icon: "🧊", unit: "cases" },
  { id: 6, name: "Caps & Seals", sku: "CAP-SEAL", price: 0, stockFilled: 120, stockEmpty: 0, threshold: 50, icon: "🔵", unit: "pcs" },
  { id: 7, name: "Filters (Stage 1-3)", sku: "FLT-SET", price: 0, stockFilled: 2, stockEmpty: 0, threshold: 2, icon: "⚙️", unit: "sets" },
  { id: 8, name: "Stickers / Labels", sku: "LBL", price: 0, stockFilled: 300, stockEmpty: 0, threshold: 100, icon: "🏷️", unit: "pcs" },
];

export const initialEvents = [
  // Sep 2
  { id: "e1", date: "2026-09-02", type: "sale", title: "Refill - 12 gals", customer: "Brgy. Monbon", amount: 360, icon: "💧", note: "Walk-in" },
  { id: "e2", date: "2026-09-02", type: "expense", title: "Fuel - Delivery", customer: "", amount: 250, icon: "⛽", note: "Tricycle" },
  // Sep 5
  { id: "e3", date: "2026-09-05", type: "sale", title: "Refill - 20 gals", customer: "San Isidro", amount: 600, icon: "💧", note: "Delivery" },
  { id: "e4", date: "2026-09-05", type: "hiram", title: "Hiram - 5 gals", customer: "Aling Nena", amount: 0, icon: "🤝", note: "Due Sep 08" },
  { id: "e5", date: "2026-09-05", type: "delivery", title: "Delivery - San Juan", customer: "San Juan", amount: 450, icon: "🛵", note: "15 gals" },
  // Sep 7
  { id: "e6", date: "2026-09-07", type: "sale", title: "Bottles - 5 cases", customer: "Irosin Central", amount: 800, icon: "🥤", note: "500ml" },
  { id: "e7", date: "2026-09-07", type: "maintenance", title: "Filter Check", customer: "", amount: 0, icon: "🔧", note: "Stage 2" },
  // Sep 8
  { id: "e8", date: "2026-09-08", type: "expense", title: "Electric Bill", customer: "", amount: 2850, icon: "⚡", note: "Aug bill" },
  { id: "e9", date: "2026-09-08", type: "hiram", title: "Return - 3 gals", customer: "Aling Nena", amount: 0, icon: "✅", note: "Partial" },
  // Sep 10
  { id: "e10", date: "2026-09-10", type: "sale", title: "Refill - 18 gals", customer: "Brgy. Patag", amount: 540, icon: "💧", note: "Walk-in + delivery" },
  { id: "e11", date: "2026-09-10", type: "delivery", title: "Delivery - Bagsangan", customer: "Bagsangan", amount: 600, icon: "🛵", note: "20 gals" },
  // Sep 11 - today
  { id: "e12", date: "2026-09-11", type: "sale", title: "Refill - 25 gals", customer: "Multiple", amount: 750, icon: "💧", note: "Peak day" },
  { id: "e13", date: "2026-09-11", type: "delivery", title: "Delivery - Gulang-Gulang", customer: "Gulang-Gulang", amount: 390, icon: "🛵", note: "13 gals" },
  { id: "e14", date: "2026-09-11", type: "expense", title: "Caps & Seals Purchase", customer: "", amount: 850, icon: "🔵", note: "200 pcs" },
  { id: "e15", date: "2026-09-11", type: "hiram", title: "Hiram - 4 gals", customer: "Juan Dela Cruz", amount: 0, icon: "🤝", note: "Due Sep 14" },
  // Sep 12
  { id: "e16", date: "2026-09-12", type: "sale", title: "Refill - 10 gals", customer: "Brgy. Carriedo", amount: 300, icon: "💧", note: "" },
  { id: "e17", date: "2026-09-12", type: "expense", title: "Water Source", customer: "", amount: 1200, icon: "🚰", note: "NAWASA" },
  // Sep 15
  { id: "e18", date: "2026-09-15", type: "delivery", title: "Scheduled - Monbon", customer: "Monbon", amount: 900, icon: "🛵", note: "30 gals pre-order" },
  { id: "e19", date: "2026-09-15", type: "maintenance", title: "UV Light Replacement", customer: "", amount: 1500, icon: "💡", note: "Every 6 months" },
  // Sep 18
  { id: "e20", date: "2026-09-18", type: "sale", title: "New Container Sale", customer: "Walk-in", amount: 450, icon: "🧴", note: "3 slim containers" },
  // Sep 20
  { id: "e21", date: "2026-09-20", type: "hiram", title: "Hiram Due - 6 gals", customer: "Kap. Reyes", amount: 0, icon: "⏰", note: "Overdue follow-up" },
  { id: "e22", date: "2026-09-22", type: "sale", title: "Refill - 22 gals", customer: "Brgy. Liang", amount: 660, icon: "💧", note: "" },
  { id: "e23", date: "2026-09-25", type: "expense", title: "Fuel + Maintenance", customer: "", amount: 1100, icon: "⛽", note: "" },
  { id: "e24", date: "2026-09-28", type: "delivery", title: "Delivery - Tabon-Tabon", customer: "Tabon-Tabon", amount: 750, icon: "🛵", note: "25 gals" },
];

export const hiramRecords = [
  { id: 1, customer: "Juan Dela Cruz", phone: "0912-***-1234", barangay: "Monbon", borrowed: 4, returned: 0, due: "2026-09-14", status: "active" },
  { id: 2, customer: "Aling Nena Sari-Sari", phone: "0905-***-6789", barangay: "San Isidro", borrowed: 5, returned: 3, due: "2026-09-08", status: "partial" },
  { id: 3, customer: "Kap. Reyes", phone: "0917-***-4321", barangay: "Patag", borrowed: 6, returned: 0, due: "2026-09-20", status: "overdue" },
  { id: 4, customer: "Mina Store", phone: "0920-***-9876", barangay: "Bagsangan", borrowed: 3, returned: 0, due: "2026-09-13", status: "active" },
  { id: 5, customer: "Irosin NHS Canteen", phone: "0930-***-1111", barangay: "San Julian", borrowed: 8, returned: 8, due: "2026-09-09", status: "returned" },
];

export const expensesList = [
  { id: 1, date: "2026-09-02", category: "Fuel", desc: "Tricycle delivery - Monbon loop", amount: 250 },
  { id: 2, date: "2026-09-05", category: "Caps/Seals", desc: "200 pcs seals + caps", amount: 650 },
  { id: 3, date: "2026-09-08", category: "Electricity", desc: "August electric bill", amount: 2850 },
  { id: 4, date: "2026-09-11", category: "Caps/Seals", desc: "Emergency purchase", amount: 850 },
  { id: 5, date: "2026-09-12", category: "Water", desc: "NAWASA deep well", amount: 1200 },
  { id: 6, date: "2026-09-15", category: "Maintenance", desc: "UV light replacement", amount: 1500 },
];
