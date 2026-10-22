# Surbhi Organic — Demo Website (design prototype)

**All products, prices, offers, stock, sales and admin names are SAMPLE data. Nothing here is verified company information.**

## Run in VS Code
1. Install VS Code, then the **Live Server** extension (Ritwick Dey).
2. File → Open Folder → choose `surbhi-organic-demo`.
3. Right-click `index.html` → **Open with Live Server**. Open `admin.html` from the "Admin preview" link.
(Double-clicking `index.html` also works, but Live Server is more reliable for sharing data between the two pages. Google Fonts load online; the site falls back to Georgia/system fonts offline.)

## Files
| File | Job |
|---|---|
| `index.html` | Storefront structure (nav, hero, categories, products, offers, story, why us, wholesale form, footer, cart, quick view) |
| `style.css` | Look and layout: colours in `:root`, responsive rules at the bottom |
| `script.js` | Storefront behaviour: renders products, cart, coupon, search, filters, form validation |
| `store.js` | **Shared by both pages**: sample data, price/discount functions, load/save |
| `admin.html` / `admin.css` / `admin.js` | Dashboard preview |

**HTML = structure, CSS = appearance, JavaScript = behaviour.** `script.js` reads the product list, builds HTML text for each card, and puts it into `<div id="productGrid">`.

## How prices work (store.js)
- Each product has `price` (original) and `discountPrice` (a number, or `null`).
- `discountPercent = ((original − discounted) ÷ original) × 100`, rounded to 1 decimal. It returns **0** if either value is invalid or the discounted price is not below the original, so an invalid discount is never shown.
- `currentPrice(product)` returns the discounted price only if it is valid, never below 0.
- Coupon `ORGANIC10` (edit `COUPONS` in `store.js`): checks the code, expiry date (`validUntil`) and minimum subtotal, then takes 10% off the cart subtotal. Total is never negative.
- To change a sample price permanently in the code, edit `DEFAULT_PRODUCTS` in `store.js`, then click "Reset sample data" in the admin page.

## How admin changes reach the storefront
The admin page edits the product list and saves it with `saveState()` into the browser's **localStorage** under one key. The storefront loads the same key with `loadState()`. When the key changes, the browser fires a `storage` event in the other open tab and `script.js` redraws the products. Limits to state honestly: it works only in the same browser, data can be cleared, it is not permanent storage, there is no real login, and nothing is sent to a server. A real version needs a backend, database and authentication. SAP integration could be a possible future phase after technical discovery; this demo is not connected to SAP.

## Images
Product pictures are simple SVG illustrations drawn by `productArt()` so the demo needs no downloads. For real photos, replace the `<svg>` output in `productCard()` with an `<img src="...">` using the company's own product photos.

## Likely questions (and honest answers)
1. **Why vanilla HTML/CSS/JS?** Quick to run anywhere with no tools; it proves the concept. A production build would likely use a platform such as Shopify/WooCommerce or a framework plus backend.
2. **How do admin changes appear on the storefront?** Shared localStorage plus the `storage` event (see above). It simulates a database.
3. **How is the discount calculated, and how do you prevent bad values?** The formula above, plus `validatePricing()` and `discountPercent()` rejecting zero, negative, or not-lower discounts.
4. **Is this secure / production-ready?** No. There is no authentication, server validation, payments or inventory sync.
5. **How would you connect real data or SAP?** Replace `loadState/saveState` with API calls to a backend. SAP would need discovery of what systems and interfaces the company uses first.
6. **Where did the content come from?** From the brief about the company; sample prices and descriptions are placeholders to be replaced with company-approved information.
7. **How is it accessible and responsive?** Contrast-checked palette, visible focus, labelled controls, reduced-motion support, mobile menu and flexible grids.
8. **What would you do next?** Get real photos and copy, add a backend, real login, order and enquiry handling, and test with users.
