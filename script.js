/* script.js — storefront behaviour. Uses helpers from store.js (loaded first). */

let state = loadState();     // products + history, shared with the admin page
let filter = "all";          // current category
let query = "";              // current search text
const cart = {};             // { productId: quantity } — lives in memory only
let coupon = "";             // coupon code the shopper applied

const $ = id => document.getElementById(id);
const CATEGORIES = [
  { id: "oils",   name: "Cold-Pressed Oils", note: "Wood- and cold-pressed" },
  { id: "spices", name: "Authentic Spices",  note: "Pure, single-origin" },
  { id: "grains", name: "Natural Grains",    note: "Everyday staples" },
  { id: "pulses", name: "Pulses & Staples",  note: "Unpolished dals" }
];

/* ---------- Rendering ---------- */
function priceHTML(p) {
  if (!hasDiscount(p)) return '<span class="now">' + formatINR(p.price) + "</span>";
  return '<span class="now">' + formatINR(p.discountPrice) + '</span> <s class="was">' + formatINR(p.price) + "</s>";
}

/* Builds one product card, including trust/certification badge. */
function productCard(p) {
  const pct = hasDiscount(p) ? discountPercent(p.price, p.discountPrice) : 0;
  const s = stockStatus(p.stock);
  return '<article class="card product">' +
    (pct ? '<span class="promo">' + pct + '% OFF</span>' : "") +
    '<div class="art">' + productArt(p) + "</div>" +
    "<h3>" + p.name + '</h3>' +
    '<p class="size">' + p.size + ' · <span class="stock ' + s.cls + '">' + s.label + "</span></p>" +
    '<span class="cert-badge">✓ FSSAI & Organic Certified</span>' +
    '<p class="price">' + priceHTML(p) + "</p>" +
    '<div class="card-actions"><button class="btn primary small-btn cta-highlight" data-add="' + p.id + '"' + (p.stock <= 0 ? " disabled" : "") + '>Add to Cart</button>' +
    '<button class="btn ghost small-btn" data-view="' + p.id + '">Quick view</button></div></article>';
}

function renderProducts() {
  const list = state.products.filter(p =>
    (filter === "all" || p.category === filter) &&
    (p.name + " " + p.size).toLowerCase().includes(query));
  $("productGrid").innerHTML = list.length ? list.map(productCard).join("") : "<p>No products match. Try another search.</p>";
  $("clearFilter").hidden = filter === "all";
  const cat = CATEGORIES.find(c => c.id === filter);
  $("productsTitle").textContent = cat ? cat.name : "Featured Products";
}

function renderCategories() {
  const sample = id => state.products.find(p => p.category === id) || state.products[0];
  $("cats").innerHTML = CATEGORIES.map(c =>
    '<button class="cat" data-cat="' + c.id + '"><span class="cat-art">' + productArt(sample(c.id)) + "</span><strong>" + c.name + "</strong><span>" + c.note + "</span></button>").join("");
}

function renderCoupons() {
  $("couponList").innerHTML = COUPONS.map(c => "<li><code>" + c.code + "</code> " + c.description + " — valid until " + c.validUntil + "</li>").join("");
}

function renderHero() {
  const pick = ["p1", "p5", "p7"].map(id => state.products.find(p => p.id === id)).filter(Boolean);
  $("heroArt").innerHTML = pick.map((p, i) => '<div class="hero-item h' + i + '">' + productArt(p) + "</div>").join("");
}

/* ---------- Cart ---------- */
function cartSubtotal() {
  return Object.keys(cart).reduce((sum, id) => {
    const p = state.products.find(x => x.id === id);
    return p ? sum + currentPrice(p) * cart[id] : sum;
  }, 0);
}

function renderCart() {
  const ids = Object.keys(cart).filter(id => state.products.some(p => p.id === id));
  $("cartCount").textContent = ids.reduce((n, id) => n + cart[id], 0);
  $("cartItems").innerHTML = ids.length ? ids.map(id => {
    const p = state.products.find(x => x.id === id);
    return '<div class="line"><div><strong>' + p.name + "</strong><br><span class='small'>" + p.size + " · " + formatINR(currentPrice(p)) + '</span></div>' +
      '<div class="qty"><button data-dec="' + id + '" aria-label="Decrease">−</button><span>' + cart[id] + '</span><button data-inc="' + id + '" aria-label="Increase">+</button></div></div>';
  }).join("") : "<p>Your basket is empty. Add a product to try the coupon.</p>";

  const sub = cartSubtotal();
  const res = coupon ? checkCoupon(coupon, sub) : { valid: false, amount: 0, message: "" };
  $("couponMsg").textContent = res.message;
  $("couponMsg").className = "form-msg " + (res.valid ? "ok" : "err");
  const total = Math.max(0, sub - res.amount);   // never negative
  $("cartTotals").innerHTML = "<p>Subtotal: " + formatINR(sub) + "</p>" +
    (res.valid ? "<p>Coupon: −" + formatINR(res.amount) + "</p>" : "") + "<p><strong>Total: " + formatINR(total) + "</strong></p>";
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove("show"), 2200);
}

function addToCart(id) { cart[id] = (cart[id] || 0) + 1; renderCart(); toast("Added to organic basket"); }

/* ---------- Quick view ---------- */
function openQuick(id) {
  const p = state.products.find(x => x.id === id); if (!p) return;
  const pct = hasDiscount(p) ? discountPercent(p.price, p.discountPrice) : 0;
  $("quickBody").innerHTML = '<div class="quick"><div class="art">' + productArt(p) + "</div><div><h3>" + p.name + "</h3><p>" + p.size + "</p><p class='price'>" + priceHTML(p) + (pct ? ' <span class="promo inline">' + pct + "% OFF</span>" : "") + "</p><p>" + p.about + "</p><p class='small'>SKU " + p.sku + " · FSSAI & Organic Certified</p></div></div>";
  $("quick").showModal();
}

/* ---------- Events (one listener each, using event delegation) ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.add) addToCart(t.dataset.add);
  if (t.dataset.view) openQuick(t.dataset.view);
  if (t.dataset.cat) { filter = t.dataset.cat; renderProducts(); $("productsTitle").scrollIntoView({ behavior: "smooth" }); }
  if (t.dataset.inc) { cart[t.dataset.inc]++; renderCart(); }
  if (t.dataset.dec) { if (--cart[t.dataset.dec] <= 0) delete cart[t.dataset.dec]; renderCart(); }
});
if ($("clearFilter")) {
  $("clearFilter").onclick = () => { filter = "all"; renderProducts(); };
}
$("cartBtn").onclick = () => { $("cart").hidden = false; renderCart(); };
$("closeCart").onclick = () => { $("cart").hidden = true; };
if ($("applyCoupon")) {
  $("applyCoupon").onclick = () => { coupon = $("couponInput").value; renderCart(); };
}
$("checkout").onclick = () => toast("Demo only: no real checkout or payment gateway connected.");
$("quickClose").onclick = () => $("quick").close();
$("searchBtn").onclick = () => { const s = $("searchInput"); s.hidden = !s.hidden; if (!s.hidden) s.focus(); };
$("searchInput").oninput = e => { query = e.target.value.trim().toLowerCase(); renderProducts(); };
$("menuBtn").onclick = () => { const o = $("menu").classList.toggle("open"); $("menuBtn").setAttribute("aria-expanded", o); };
$("menu").onclick = () => $("menu").classList.remove("open");

/* Wholesale form: check required fields, then show a success message (nothing is sent). */
const wsForm = $("wsForm");
if (wsForm) {
  wsForm.addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target, msg = $("wsMsg");
    const missing = ["name", "business", "contact", "product", "qty"].filter(k => !f[k].value.trim());
    const c = f.contact.value.trim();
    if (missing.length) { msg.className = "form-msg err"; msg.textContent = "Please fill in: " + missing.join(", ") + "."; f[missing[0]].focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(c) && !/^[+\d][\d\s-]{6,}$/.test(c)) { msg.className = "form-msg err"; msg.textContent = "Enter a valid email address or phone number."; f.contact.focus(); return; }
    msg.className = "form-msg ok";
    msg.textContent = "Thank you, " + f.name.value.trim() + ". Your wholesale enquiry has been noted. (Prototype: not transmitted to server.)";
    f.reset();
  });
}

/* When the admin page saves a change in another tab, the browser fires "storage". We reload and redraw. */
window.addEventListener("storage", e => {
  if (e.key === STORAGE_KEY) { state = loadState(); renderProducts(); renderCart(); renderCategories(); renderHero(); }
});
/* Also refresh when the tab becomes visible again. */
document.addEventListener("visibilitychange", () => { if (!document.hidden) { state = loadState(); renderProducts(); renderCart(); } });

renderHero(); renderCategories(); renderProducts(); renderCart();