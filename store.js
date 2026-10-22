/* store.js — SHARED by the storefront (index.html) and the admin page (admin.html).
   It holds: sample data, price/discount maths, and load/save helpers.
   The admin page saves changes to the browser's localStorage; the storefront reads them.
   All data is SAMPLE data for a demo. localStorage is per-browser and can be cleared. */

const STORAGE_KEY = "surbhiDemoState_v1";

/* ---- Sample coupons: edit freely. validUntil uses YYYY-MM-DD. ---- */
const COUPONS = [
  { code: "ORGANIC10", percent: 10, minSubtotal: 500, validUntil: "2026-12-31",
    description: "10% off orders above ₹500 (demo coupon)" }
];

/* ---- Sample products: price = original price, discountPrice = null or a lower number. ---- */
const DEFAULT_PRODUCTS = [
  { id: "p1", sku: "DEMO-OIL-001", name: "Wood-Pressed Groundnut Oil", size: "1 L",    category: "oils",   price: 520, discountPrice: 468, stock: 42, kind: "bottle", color: "#D9A441", about: "A wood-pressed groundnut oil for everyday cooking. (Sample description.)" },
  { id: "p2", sku: "DEMO-OIL-002", name: "Cold-Pressed Sesame Oil",   size: "500 ml", category: "oils",   price: 340, discountPrice: null, stock: 8, kind: "bottle", color: "#B9893A", about: "A cold-pressed sesame oil with a nutty aroma. (Sample description.)" },
  { id: "p3", sku: "DEMO-OIL-003", name: "Pure Mustard Oil",          size: "1 L",    category: "oils",   price: 410, discountPrice: 369, stock: 25, kind: "bottle", color: "#C9A227", about: "A pungent mustard oil for traditional recipes. (Sample description.)" },
  { id: "p4", sku: "DEMO-OIL-004", name: "Cold-Pressed Sunflower Oil",size: "1 L",    category: "oils",   price: 380, discountPrice: null, stock: 0, kind: "bottle", color: "#E3C14B", about: "A light sunflower oil for daily use. (Sample description.)" },
  { id: "p5", sku: "DEMO-SPC-001", name: "Turmeric Powder",           size: "200 g",  category: "spices", price: 120, discountPrice: 99,  stock: 60, kind: "jar",    color: "#D49A12", about: "Single-origin turmeric powder. (Sample description.)" },
  { id: "p6", sku: "DEMO-SPC-002", name: "Red Chilli Powder",         size: "200 g",  category: "spices", price: 150, discountPrice: null, stock: 5, kind: "jar",    color: "#A8362A", about: "Bright, aromatic red chilli powder. (Sample description.)" },
  { id: "p7", sku: "DEMO-PUL-001", name: "Unpolished Toor Dal",       size: "1 kg",   category: "pulses", price: 210, discountPrice: 189, stock: 37, kind: "bag",    color: "#C8A35A", about: "Unpolished toor dal for daily meals. (Sample description.)" },
  { id: "p8", sku: "DEMO-GRN-001", name: "Whole Wheat Grain",         size: "5 kg",   category: "grains", price: 310, discountPrice: null, stock: 18, kind: "bag",    color: "#B99A63", about: "Natural whole wheat grain. (Sample description.)" }
];

const DEFAULT_HISTORY = [
  { ts: "2026-10-12 10:15", admin: "Demo Admin A", product: "Turmeric Powder", note: "Price ₹110 → ₹120" },
  { ts: "2026-10-15 16:40", admin: "Demo Admin B", product: "Pure Mustard Oil", note: "Discount set: ₹369" },
  { ts: "2026-10-18 09:05", admin: "Demo Admin A", product: "Cold-Pressed Sesame Oil", note: "Discount removed" }
];

/* Sample sales (₹ per day) — dashboard chart only. */
const SAMPLE_SALES = [["Mon", 4200], ["Tue", 5100], ["Wed", 3800], ["Thu", 6400], ["Fri", 7200], ["Sat", 8800], ["Sun", 6100]];

/* ---------- Load / save ---------- */
function clone(x) { return JSON.parse(JSON.stringify(x)); }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (Array.isArray(s.products) && Array.isArray(s.history)) return s;
    }
  } catch (e) { /* storage blocked or corrupt: fall back to defaults */ }
  return { products: clone(DEFAULT_PRODUCTS), history: clone(DEFAULT_HISTORY) };
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function resetState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}

/* ---------- Price maths (reused everywhere) ---------- */

/* A discount is valid only if it is a positive number BELOW the original price. */
function hasDiscount(p) {
  return Number.isFinite(p.discountPrice) && p.discountPrice > 0 && p.discountPrice < p.price;
}

/* Discount % = ((original - discounted) / original) × 100, rounded to 1 decimal. Invalid → 0. */
function discountPercent(original, discounted) {
  if (!Number.isFinite(original) || !Number.isFinite(discounted)) return 0;
  if (original <= 0 || discounted <= 0 || discounted >= original) return 0;
  return Math.round(((original - discounted) / original) * 1000) / 10;
}

/* The price a customer pays for one unit. Never negative. */
function currentPrice(p) {
  return Math.max(0, hasDiscount(p) ? p.discountPrice : p.price);
}

/* Returns "" if OK, otherwise a message for the admin form. */
function validatePricing(price, discount) {
  if (!Number.isFinite(price) || price <= 0) return "Enter a price greater than 0.";
  if (discount !== null) {
    if (!Number.isFinite(discount) || discount <= 0) return "Discounted price must be greater than 0.";
    if (discount >= price) return "Discounted price must be lower than the original price.";
  }
  return "";
}

/* Coupon check: returns { valid, message, amount }. */
function checkCoupon(code, subtotal, today = new Date()) {
  const c = COUPONS.find(x => x.code === String(code).trim().toUpperCase());
  if (!c) return { valid: false, message: "Coupon not recognised.", amount: 0 };
  if (today > new Date(c.validUntil + "T23:59:59")) return { valid: false, message: "This offer has expired.", amount: 0 };
  if (subtotal < c.minSubtotal) return { valid: false, message: "Add ₹" + (c.minSubtotal - subtotal) + " more to use " + c.code + ".", amount: 0 };
  const amount = Math.min(subtotal, Math.round(subtotal * c.percent / 100));
  return { valid: true, message: c.code + " applied: " + c.percent + "% off. Valid until " + c.validUntil + ".", amount };
}

function stockStatus(n) {
  if (n <= 0) return { label: "Out of stock", cls: "out" };
  if (n <= 10) return { label: "Low stock", cls: "low" };
  return { label: "In stock", cls: "ok" };
}

const formatINR = n => "₹" + Number(n).toLocaleString("en-IN");

/* ---------- Simple SVG product illustrations (no image files needed) ---------- */
function productArt(p) {
  const c = p.color;
  const bg = '<rect width="200" height="200" rx="24" fill="#EFE6D2"/>';
  let body = "";
  if (p.kind === "bottle") {
    body = '<rect x="82" y="22" width="36" height="22" rx="5" fill="#1F3D2B"/><path d="M84 44h32v16c0 10 22 16 22 40v70a10 10 0 0 1-10 10H72a10 10 0 0 1-10-10v-70c0-24 22-30 22-40z" fill="' + c + '"/>' +
           '<rect x="72" y="104" width="56" height="50" rx="6" fill="#FAF6EC"/><path d="M86 140c6-14 22-14 28 0" stroke="#1F3D2B" stroke-width="3" fill="none"/>';
  } else if (p.kind === "jar") {
    body = '<rect x="64" y="34" width="72" height="24" rx="8" fill="#1F3D2B"/><rect x="58" y="58" width="84" height="116" rx="14" fill="' + c + '"/>' +
           '<rect x="68" y="86" width="64" height="56" rx="6" fill="#FAF6EC"/><circle cx="100" cy="114" r="12" fill="#1F3D2B" opacity=".85"/>';
  } else {
    body = '<path d="M60 46h80l10 128a8 8 0 0 1-8 8H58a8 8 0 0 1-8-8z" fill="' + c + '"/><path d="M60 46h80l-6 18H66z" fill="#1F3D2B" opacity=".85"/>' +
           '<rect x="68" y="90" width="64" height="52" rx="6" fill="#FAF6EC"/><path d="M84 124c4-14 28-14 32 0" stroke="#1F3D2B" stroke-width="3" fill="none"/>';
  }
  return '<svg viewBox="0 0 200 200" role="img" aria-label="' + p.name + ' illustration" xmlns="http://www.w3.org/2000/svg">' + bg + body + '</svg>';
}
