/* admin.js — dashboard behaviour. It edits `state`, saves it with saveState(),
   and the storefront (index.html) loads the same saved state. */

let state = loadState();
let editingId = null;
const $ = id => document.getElementById(id);

function now() { const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove("show"), 2200); }

function render() {
  const low = state.products.filter(p => p.stock <= 10).length;
  const offers = state.products.filter(hasDiscount).length;
  const salesTotal = SAMPLE_SALES.reduce((s, d) => s + d[1], 0);
  $("stats").innerHTML = [["Total products", state.products.length], ["Low or out of stock", low], ["Active offers", offers], ["Sample sales (week)", formatINR(salesTotal)]]
    .map(s => '<div class="stat"><strong>' + s[1] + "</strong>" + s[0] + "</div>").join("");

  $("rows").innerHTML = state.products.map(p => {
    const st = stockStatus(p.stock), pct = hasDiscount(p) ? discountPercent(p.price, p.discountPrice) : 0;
    return "<tr><td>" + p.name + " <span class='small'>(" + p.size + ")</span></td><td>" + p.sku + "</td>" +
      "<td>" + formatINR(currentPrice(p)) + (pct ? " <s class='was'>" + formatINR(p.price) + "</s> <span class='promo inline'>" + pct + "% OFF</span>" : "") + "</td>" +
      "<td><span class='stock " + st.cls + "'>" + st.label + " (" + p.stock + ")</span></td>" +
      "<td><div class='card-actions'><button class='btn ghost small-btn' data-edit='" + p.id + "'>Edit price</button>" +
      (hasDiscount(p) ? "<button class='btn ghost small-btn' data-rm='" + p.id + "'>Remove discount</button>" : "<button class='btn ghost small-btn' data-edit='" + p.id + "'>Set discount</button>") + "</div></td></tr>";
  }).join("");

  const max = Math.max(...SAMPLE_SALES.map(d => d[1]));
  $("chart").innerHTML = SAMPLE_SALES.map(d => "<div class='bar'>" + formatINR(d[1]) + "<i style='height:" + Math.round(d[1] / max * 150) + "px'></i>" + d[0] + "</div>").join("");
  $("history").innerHTML = state.history.slice(0, 12).map(h => "<li><strong>" + h.product + "</strong><br>" + h.note + "<br><span class='small'>" + h.ts + " · " + h.admin + " (demo)</span></li>").join("");
}

/* Save to localStorage + add a price-history record. */
function commit(product, note) {
  state.history.unshift({ ts: now(), admin: $("adminName").value, product: product.name, note });
  saveState(state);
  render();
  toast("Saved. Storefront will show the change.");
}

function openEdit(id) {
  const p = state.products.find(x => x.id === id); editingId = id;
  $("editTitle").textContent = "Edit: " + p.name + " (" + p.size + ")";
  $("fPrice").value = p.price; $("fDisc").value = hasDiscount(p) ? p.discountPrice : "";
  updatePreview(); $("editDlg").showModal();
}

/* Live preview of the discount % while typing. */
function readForm() { const d = $("fDisc").value.trim(); return { price: parseFloat($("fPrice").value), disc: d === "" ? null : parseFloat(d) }; }
function updatePreview() {
  const { price, disc } = readForm(), err = validatePricing(price, disc), el = $("fPreview");
  el.className = "form-msg " + (err ? "err" : "ok");
  el.textContent = err || (disc === null ? "No discount. Customers pay " + formatINR(price) + "." : discountPercent(price, disc) + "% OFF. Customers pay " + formatINR(disc) + ".");
  return err;
}

$("fPrice").oninput = $("fDisc").oninput = updatePreview;
$("editForm").addEventListener("submit", e => {
  e.preventDefault();
  if (updatePreview()) return;                       // invalid → keep dialog open, error is shown
  const { price, disc } = readForm(), p = state.products.find(x => x.id === editingId);
  const note = "Price " + formatINR(p.price) + " → " + formatINR(price) + (disc === null ? ", no discount" : ", discount " + formatINR(disc));
  p.price = price; p.discountPrice = disc;
  $("editDlg").close(); commit(p, note);
});
$("rmDisc").onclick = () => { $("fDisc").value = ""; updatePreview(); };
$("cancelBtn").onclick = () => $("editDlg").close();

document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.edit) openEdit(b.dataset.edit);
  if (b.dataset.rm) { const p = state.products.find(x => x.id === b.dataset.rm); p.discountPrice = null; commit(p, "Discount removed"); }
});
$("resetBtn").onclick = () => { resetState(); state = loadState(); render(); toast("Sample data reset."); };

render();
