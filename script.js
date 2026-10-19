let products = [];   // сюди завантажуємо товари з store_db.json
let cart = [];       // кошик: [{ id: 1, qty: 2 }, ...]

const fmt = n => n.toLocaleString("uk-UA").replace(/\u00a0/g, " ");
const grid = document.getElementById("grid");

// =====================================================
//  2. ЗАВАНТАЖЕННЯ ТОВАРІВ З БАЗИ (async fetch)
// =====================================================
async function loadProducts() {
  try {
    const response = await fetch("store_db.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    products = await response.json();
  } catch (err) {
    console.warn("fetch не спрацював, беремо запасну копію store_db.js:", err);
    if (window.STORE_DB) {
      products = window.STORE_DB;       // запасний варіант: дані з store_db.js
    } else {
      grid.innerHTML = `<p class="load-error">Не вдалося завантажити товари.<br>
        Відкрийте сайт через локальний сервер (наприклад, Live Server у VS Code).</p>`;
    }
  }
}

// =====================================================
//  3. ВИВЕДЕННЯ ТОВАРІВ НА СТОРІНКУ
// =====================================================

// Намальований ПК (запасна картинка, якщо немає фото)
function pcSvg(color) {
  return `
  <svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="200" height="150" fill="#05070b"/>
    <rect x="45" y="15" width="110" height="120" rx="8" fill="#10151d" stroke="#3a4352" stroke-width="2"/>
    <g fill="none" stroke="${color}" stroke-width="3">
      <circle cx="75" cy="42" r="14"/><circle cx="75" cy="42" r="5"/>
      <circle cx="75" cy="76" r="14"/><circle cx="75" cy="76" r="5"/>
      <circle cx="75" cy="110" r="14"/><circle cx="75" cy="110" r="5"/>
    </g>
    <rect x="102" y="30" width="42" height="8" rx="3" fill="#232a36"/>
    <rect x="102" y="66" width="42" height="14" rx="3" fill="#1b212c" stroke="${color}" stroke-width="1.5"/>
    <rect x="102" y="104" width="42" height="14" rx="3" fill="#232a36"/>
    <rect x="110" y="125" width="30" height="3" fill="${color}"/>
  </svg>`;
}

function productCard(product) {
  return `
    <div class="card fade">
      <div class="photo">
        ${pcSvg(product.color || "#7cfc00")}
        <img src="images/${product.image}" alt="${product.title}" onerror="this.remove()">
      </div>
      <span class="stock">● В наявності</span>
      <h3>${product.title}</h3>
      <ul>${(product.specs || []).map(s => `<li>${s}</li>`).join("")}</ul>
      <div class="bottom">
        <div class="price">${fmt(product.price)} ₴</div>
        <button class="buy" type="button" onclick="addToCart(${product.id})">В КОШИК</button>
      </div>
    </div>`;
}


function renderProducts() {
  grid.innerHTML = products.map(productCard).join("");
}

// =====================================================
//  4. РОЗУМНИЙ КОШИК
// =====================================================
function addToCart(productId) {
  const item = cart.find(i => i.id === productId);

  if (item) {
    item.qty++;                              // товар вже є: збільшуємо кількість
  } else {
    cart.push({ id: productId, qty: 1 });    // товару немає: додаємо новий
  }

  saveCart();
  renderCart();
  bumpCartButton();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

function cartTotal() {
  return cart.reduce((sum, item) => {
    const p = products.find(pr => pr.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// =====================================================
//  5. ПАМ'ЯТЬ САЙТУ: COOKIES
// =====================================================
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const part = document.cookie.split("; ").find(row => row.startsWith(name + "="));
  return part ? decodeURIComponent(part.split("=")[1]) : null;
}

function saveCart() {
  try { setCookie("cart", JSON.stringify(cart), 7); } catch (e) { /* cookies недоступні */ }
  // запасний варіант: якщо браузер не тримає cookies (наприклад, файл відкрито без сервера)
  try { localStorage.setItem("cart", JSON.stringify(cart)); } catch (e) { /* недоступно */ }
}

function loadCart() {
  try {
    let saved = getCookie("cart");
    if (!saved) { try { saved = localStorage.getItem("cart"); } catch (e) { /* недоступно */ } }
    const parsed = saved ? JSON.parse(saved) : [];
    // залишаємо лише ті товари, які ще існують у базі
    cart = parsed.filter(i => products.some(p => p.id === i.id) && i.qty > 0);
  } catch (e) {
    cart = [];
  }
}

// =====================================================
//  ВІДОБРАЖЕННЯ КОШИКА
// =====================================================
const cartBtn     = document.getElementById("cartBtn");
const cartCountEl = document.getElementById("cartCount");
const cartOverlay = document.getElementById("cartOverlay");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

function renderCart() {
  cartCountEl.textContent = cartCount();

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="cart-empty">Кошик порожній</p>`;
    cartTotalEl.textContent = "0 ₴";
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;
  cartItemsEl.innerHTML = cart.map(item => {
    const p = products.find(pr => pr.id === item.id);
    if (!p) return "";
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <b>${p.title}</b>
          <span>${fmt(p.price)} ₴ × ${item.qty} = ${fmt(p.price * item.qty)} ₴</span>
        </div>
        <div class="qty">
          <button type="button" onclick="changeQty(${p.id}, -1)" aria-label="Менше">−</button>
          <span>${item.qty}</span>
          <button type="button" onclick="changeQty(${p.id}, 1)" aria-label="Більше">+</button>
        </div>
        <button class="cart-remove" type="button" onclick="removeFromCart(${p.id})" aria-label="Видалити">&times;</button>
      </div>`;
  }).join("");
  cartTotalEl.textContent = fmt(cartTotal()) + " ₴";
}

function bumpCartButton() {
  cartBtn.classList.remove("bump");
  void cartBtn.offsetWidth;          // перезапуск анімації
  cartBtn.classList.add("bump");
}

function openCart()  { cartOverlay.classList.add("open"); }
function closeCart() { cartOverlay.classList.remove("open"); }

cartBtn.onclick = openCart;
document.getElementById("cartClose").onclick = closeCart;
cartOverlay.addEventListener("click", e => { if (e.target === cartOverlay) closeCart(); });
document.getElementById("clearBtn").onclick = clearCart;

// =====================================================
//  ОПЛАТА (вікно з номером, спінер, галочка)
// =====================================================
const overlay     = document.getElementById("overlay");
const form        = document.getElementById("form");
const bank        = document.getElementById("bank");
const error       = document.getElementById("error");
const formView    = document.getElementById("formView");
const loadingView = document.getElementById("loadingView");
const okView      = document.getElementById("okView");
let closeTimer = null;

function showView(view) {
  [formView, loadingView, okView].forEach(v => v.hidden = (v !== view));
}

function openModal() {
  document.getElementById("orderInfo").textContent =
    `Товарів: ${cartCount()}. До сплати: ${fmt(cartTotal())} ₴`;
  bank.value = "";
  bank.classList.remove("bad");
  error.textContent = "";
  showView(formView);
  closeCart();
  overlay.classList.add("open");
  bank.focus();
}

function closeModal() {
  overlay.classList.remove("open");
  clearTimeout(closeTimer);
}

checkoutBtn.onclick = openModal;
document.getElementById("close").onclick = closeModal;
overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeModal(); closeCart(); }
});

// Тільки цифри, пробіл після кожних 4
bank.addEventListener("input", () => {
  const digits = bank.value.replace(/\D/g, "").slice(0, 16);
  bank.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  bank.classList.remove("bad");
  error.textContent = "";
});

// Поле обов'язкове. Оплата несправжня: просто спінер і галочка
form.addEventListener("submit", e => {
  e.preventDefault();
  const digits = bank.value.replace(/\D/g, "");

  if (digits.length !== 16) {
    bank.classList.add("bad");
    error.textContent = digits.length === 0
      ? "Це поле обов'язкове: вкажіть номер для переказу."
      : "Номер має містити 16 цифр.";
    bank.focus();
    return;
  }

  showView(loadingView);
  setTimeout(() => {
    showView(okView);
    clearCart();                               // після "оплати" кошик порожній
    closeTimer = setTimeout(closeModal, 3500);
  }, 1800);
});


async function init() {
  await loadProducts();
  renderProducts();
  loadCart();
  renderCart();
}
init();