/**
 * ==========================================
 *  Awlad El-Kady — Main Application JS
 *  Pure Vanilla JS | Supabase REST API
 * ==========================================
 */

/* ─────────────────────────────────────────
   SUPABASE CLIENT (خفيف بدون مكتبة)
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   SUPABASE CLIENT INJECTED FROM supabase-client.js
───────────────────────────────────────── */

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const CART_KEY = 'awlad_elkady_cart_v1';

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item && item.id) : [];
  } catch (_) { return []; }
}

const state = {
  products: [],
  filteredProducts: [],
  cart: readCart(),
  currentFilter: 'all',
  selectedProduct: null,
  sliderIndex: 0,
  sliderInterval: null
};

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  updateCartCount();
}

function unitPrice(product) {
  const sale = Number(product?.sale_price || 0);
  const base = Number(product?.price || 0);
  return sale > 0 && sale < base ? sale : base;
}

function cartSubtotal() {
  return state.cart.reduce((sum, item) => sum + (unitPrice(item) * Number(item.qty || 1)), 0);
}

function snapshotProduct(product) {
  return {
    id: product.id,
    name: product.name || '',
    description: product.description || '',
    price: Number(product.price || 0),
    sale_price: Number(product.sale_price || 0),
    stock: Number(product.stock || 0),
    images: Array.isArray(product.images) ? product.images.slice(0, 6) : [],
    category: product.category || '',
    material: product.material || '',
    size: product.size || '',
    bosta_size: product.bosta_size || ''
  };
}

function updateCartCount() {
  const count = state.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const el = document.getElementById('cart-count');
  if (el) el.textContent = String(count);
}

function addToCart(product, quantity = 1) {
  if (!product?.id || Number(product.stock || 0) < 1) {
    alert('المنتج غير متوفر حالياً.');
    return false;
  }
  const existing = state.cart.find(item => String(item.id) === String(product.id));
  const nextQty = Number(existing?.qty || 0) + Number(quantity || 1);
  const maxStock = Math.max(1, Number(product.stock || existing?.stock || 1));
  if (nextQty > maxStock) {
    alert(`المتاح حالياً ${maxStock} قطعة فقط.`);
    return false;
  }
  if (existing) Object.assign(existing, snapshotProduct(product), { qty: nextQty });
  else state.cart.push({ ...snapshotProduct(product), qty: Number(quantity || 1) });
  saveCart();
  renderCart();
  return true;
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => String(item.id) !== String(productId));
  saveCart();
  renderCart();
}

function changeCartQty(productId, delta) {
  const item = state.cart.find(row => String(row.id) === String(productId));
  if (!item) return;
  const next = Number(item.qty || 1) + Number(delta || 0);
  const maxStock = Math.max(1, Number(item.stock || 1));
  if (next <= 0) return removeFromCart(productId);
  if (next > maxStock) return alert(`المتاح حالياً ${maxStock} قطعة فقط.`);
  item.qty = next;
  saveCart();
  renderCart();
  renderCheckoutItems();
}

function renderCart() {
  const target = document.getElementById('cart-items');
  const subtotal = document.getElementById('cart-subtotal');
  const checkout = document.getElementById('cart-checkout-btn');
  if (!target) return;
  target.innerHTML = state.cart.length ? state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-main"><strong>${escapeHtml(item.name || 'منتج')}</strong><span>${unitPrice(item).toLocaleString('ar-EG')} جنيه</span></div>
      <div class="cart-item-actions">
        <button type="button" onclick="changeCartQty('${escapeHtml(item.id)}', -1)" aria-label="تقليل الكمية">−</button>
        <span>${Number(item.qty || 1)}</span>
        <button type="button" onclick="changeCartQty('${escapeHtml(item.id)}', 1)" aria-label="زيادة الكمية">+</button>
        <button type="button" class="cart-remove" onclick="removeFromCart('${escapeHtml(item.id)}')">حذف</button>
      </div>
    </div>`).join('') : '<p class="cart-empty">السلة فاضية حالياً.</p>';
  if (subtotal) subtotal.textContent = `${cartSubtotal().toLocaleString('ar-EG')} جنيه`;
  if (checkout) checkout.disabled = !state.cart.length;
}

function renderCheckoutItems() {
  const target = document.getElementById('checkout-items');
  if (!target) return;
  target.innerHTML = state.cart.length ? `<div class="checkout-summary">${state.cart.map(item => `<div><span>${escapeHtml(item.name)} × ${Number(item.qty || 1)}</span><strong>${(unitPrice(item) * Number(item.qty || 1)).toLocaleString('ar-EG')} جنيه</strong></div>`).join('')}<div class="checkout-summary-total"><span>إجمالي المنتجات</span><strong>${cartSubtotal().toLocaleString('ar-EG')} جنيه</strong></div></div>` : '';
}

window.openCart = function() {
  renderCart();
  document.getElementById('cart-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
};
window.closeCart = function() {
  document.getElementById('cart-modal')?.classList.remove('open');
  document.body.style.overflow = '';
};
window.removeFromCart = removeFromCart;
window.changeCartQty = changeCartQty;
window.checkoutCart = function() {
  if (!state.cart.length) return alert('السلة فاضية حالياً.');
  closeCart();
  openCheckout();
};

/* ─────────────────────────────────────────
   DOM REFS
───────────────────────────────────────── */
const $ = id => document.getElementById(id);

const Dom = {
  navbar:         $('navbar'),
  productGrid:    $('product-grid'),
  filterBtns:     document.querySelectorAll('.filter-btn'),
  checkoutModal:  $('checkout-modal'),
  modalContent:   $('modal-content'),
  trackModal:     $('track-modal'),
  trackInput:     $('track-phone'),
  trackResult:    $('track-result'),
  orderForm:      $('order-form'),
  confirmBtn:     $('btn-confirm'),
  sliderTrack:    $('slider-track'),
  sliderDots:     $('slider-dots'),
  govSelect:      $('gov-select'),
  modalProdName:  $('modal-prod-name'),
  modalProdPrice: $('modal-prod-price'),
  modalProdImg:   $('modal-prod-img'),
};

/* ─────────────────────────────────────────
   NAVBAR SCROLL BEHAVIOR
───────────────────────────────────────── */
function initNavbar() {
  const onScroll = () => {
    Dom.navbar.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ─────────────────────────────────────────
   HERO PARALLAX (خفيف)
───────────────────────────────────────── */
function initHeroParallax() {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;
  // trigger scale animation on load
  setTimeout(() => { heroBg.style.transform = 'scale(1)'; }, 100);

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    heroBg.style.transform = `scale(1.04) translateY(${y * 0.18}px)`;
  }, { passive: true });
}

/* ─────────────────────────────────────────
   SETTINGS — Load from Supabase & Apply Timer
───────────────────────────────────────── */
async function loadSettings() {
  try {
    const results = await Promise.allSettled([
      Supabase.select(TABLES.site_settings, 'id=eq.1'),
      TABLES.faqs ? Supabase.select(TABLES.faqs, 'is_visible=eq.true&order=sort_order.asc,created_at.asc') : Promise.resolve([]),
      TABLES.socials ? Supabase.select(TABLES.socials, 'is_visible=eq.true&order=sort_order.asc,created_at.asc') : Promise.resolve([])
    ]);
    const settingsRows = results[0].status === 'fulfilled' ? results[0].value : [];
    const faqRows = results[1].status === 'fulfilled' ? results[1].value : [];
    const socialRows = results[2].status === 'fulfilled' ? results[2].value : [];
    const settings = settingsRows?.[0] || {};
    window.siteSettings = settings;
    window.siteFaqs = Array.isArray(faqRows) ? faqRows : [];
    window.siteSocials = Array.isArray(socialRows) ? socialRows : [];
    applySiteSettings(settings);
    renderFaqs(window.siteFaqs);
    renderSocials(window.siteSocials);
    renderTrustCards(settings.trust_cards);
    renderTestimonials(settings.testimonials);
    applyMarqueeTimer(settings);
  } catch (err) {
    console.error('[landing settings]', err);
    renderFaqs([]);
    renderTestimonials([]);
  }
}

function applySiteSettings(settings) {
  const siteName = settings.site_name || 'معرض أولاد القاضي للأدوات المنزلية';
  const address = settings.address || 'شارع الإصلاح الزراعي، بجوار عمر أفقندى، أمام (المان) للعطور';
  const phone = String(settings.footer_phone || settings.phone || '01118060702');
  const whatsapp = String(settings.whatsapp_number || phone).replace(/[^0-9]/g, '').replace(/^0/, '20');
  const setText = (selector, value) => document.querySelectorAll(selector).forEach(el => { el.textContent = String(value ?? ''); });
  const setAttr = (selector, attr, value) => document.querySelectorAll(selector).forEach(el => { if (value) el.setAttribute(attr, String(value)); });

  document.title = settings.page_title || `${siteName} | الأدوات المنزلية`;
  setText('.site-brand-name, .footer-brand-name, #site-contact-name', siteName);
  setText('#site-address, .footer-address, .site-address-footer', address);
  setText('#site-phone-link', phone);
  setAttr('#site-phone-link, a[href^="tel:"], .footer-contact-item[href^="tel:"], .social-link[href^="tel:"]', 'href', `tel:${phone}`);
  setAttr('#site-whatsapp-link, a[href*="wa.me"], .footer-contact-item[href*="wa.me"], .social-link[href*="wa.me"], #whatsapp-float', 'href', `https://wa.me/${whatsapp}`);
  setText('[data-cms="hero-title"]', settings.hero_title || `${siteName}`);
  setText('[data-cms="hero-subtitle"]', settings.hero_subtitle || settings.hero_description || '');
  setText('[data-cms="hero-tagline"]', settings.hero_tagline || '');
  setText('[data-cms="catalog-title"]', settings.catalog_title || 'المنتجات المتاحة حالياً');
  setText('[data-cms="catalog-subtitle"]', settings.catalog_subtitle || '');
  const marqueeText = settings.marquee_text || '';
  setText('[data-cms="marquee-text"], [data-cms="marquee-text-copy"]', marqueeText);
  const marqueeBar = document.querySelector('.ann-bar');
  if (marqueeBar) marqueeBar.hidden = !marqueeText;
  setAttr('.nav-logo-img-blend', 'src', settings.logo_header);
  setAttr('.footer-logo-blend', 'src', settings.logo_footer || settings.logo_header);
  setAttr('meta[name="description"]', 'content', settings.seo_description);
  setText('#year', new Date().getFullYear());
  applySectionVisibility(settings.section_visibility);
  if (settings.maintenance_mode) {
    const message = settings.maintenance_message || 'الموقع غير متاح حالياً.';
    document.body.innerHTML = `<main class="maintenance-state"><h1>${escapeHtml(message)}</h1></main>`;
  }
}

function applySectionVisibility(visibility = {}) {
  if (!visibility || typeof visibility !== 'object') return;
  Object.entries(visibility).forEach(([id, enabled]) => {
    const el = document.getElementById(id);
    if (el) el.hidden = enabled === false;
  });
}

function renderSocials(socials = []) {
  const target = document.getElementById('footer-socials');
  if (!target) return;
  const allowed = /^(https?:|tel:|mailto:)/i;
  const list = Array.isArray(socials) ? socials.filter(item => item && allowed.test(String(item.link || '')) && !String(item.link).includes('#')) : [];
  target.innerHTML = list.map(item => `<a class="social-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.name || 'تواصل')}"><span>${escapeHtml(item.name || 'تواصل')}</span></a>`).join('');
}

function renderTrustCards(cards = []) {
  const target = document.getElementById('trust-cards');
  if (!target) return;
  const list = Array.isArray(cards) ? cards.filter(card => card && (card.title || card.text)) : [];
  target.innerHTML = list.map(card => `<div class="trust-card reveal"><div class="trust-icon" aria-hidden="true">${escapeHtml(card.icon || '')}</div><div class="trust-text"><h3>${escapeHtml(card.title || '')}</h3><p>${escapeHtml(card.text || '')}</p></div></div>`).join('');
  initReveal();
}

function renderFaqs(faqs = []) {
  const list = document.getElementById('faq-list');
  if (!list) return;
  if (!Array.isArray(faqs) || !faqs.length) { list.innerHTML = ''; return; }
  list.innerHTML = faqs.map(faq => `<div class="faq-item reveal" role="listitem"><button class="faq-q" onclick="toggleFaq(this)" aria-expanded="false"><span>${escapeHtml(faq.q || '')}</span><span aria-hidden="true">⌄</span></button><div class="faq-a"><p>${escapeHtml(faq.a || '')}</p></div></div>`).join('');
  initReveal();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function applyMarqueeTimer(settings) {
  const annBar = document.querySelector('.ann-bar');
  if (!annBar) return;

  // If behavior is timer, check the expiration date
  if ((settings.marquee_behavior || settings.marqueeBehavior) === 'timer' && (settings.marquee_end_date || settings.marqueeEndDate)) {
    const endDate = new Date(settings.marquee_end_date || settings.marqueeEndDate).getTime();
    const now = new Date().getTime();
    if (now > endDate) {
      // Time is up, hide marquee
      annBar.style.display = 'none';
      if (document.body.contains(annBar)) {
        annBar.remove(); // Remove completely from DOM
      }
    }
  } else if ((settings.marquee_behavior || settings.marqueeBehavior) === 'hidden') {
    annBar.style.display = 'none';
  }
}

/* ─────────────────────────────────────────
   PRODUCTS — Load from Supabase
───────────────────────────────────────── */
/* لا يوجد كتالوج ثابت هنا: قاعدة البيانات هي المصدر الوحيد للمنتجات. */
async function loadProducts({ preserveModal = true } = {}) {
  if (!Dom.productGrid) return [];
  try {
    const fresh = await Promise.race([
      Supabase.select(TABLES.products, 'is_active=eq.true&order=created_at.desc'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PRODUCTS_TIMEOUT')), 8000))
    ]);
    state.products = Array.isArray(fresh) ? fresh : [];
    state.filteredProducts = state.products;
    if (!preserveModal || !document.querySelector('#checkout-modal.open, #quickview-modal.open')) {
      renderProducts(state.products);
      buildFilters(state.products);
    }
    return state.products;
  } catch (err) {
    console.error('[landing products]', err);
    state.products = [];
    state.filteredProducts = [];
    if (!document.querySelector('#checkout-modal.open, #quickview-modal.open')) {
      Dom.productGrid.innerHTML = '<div class="products-error"><p>لم توجد منتجات متاحة حالياً أو انتهت مهلة التحميل.</p><button type="button" class="btn-retry-products" onclick="loadProducts({ preserveModal: false })">إعادة المحاولة</button></div>';
      buildFilters([]);
    }
    return [];
  }
}

function productImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const main = images.find(image => image && image.main) || images[0];
  return typeof main === 'string' ? main : (main?.url || '');
}

function renderProducts(products) {
  if (!Dom.productGrid) return;
  if (!Array.isArray(products) || !products.length) {
    Dom.productGrid.innerHTML = '<div class="products-error"><p>لا توجد منتجات متاحة حالياً.</p></div>';
    return;
  }

  Dom.productGrid.innerHTML = products.map((p) => {
    const hasDiscount = Number(p.sale_price) > 0 && Number(p.price) > Number(p.sale_price);
    const discountPct = hasDiscount ? Math.round((1 - (Number(p.sale_price) / Number(p.price))) * 100) : 0;
    const image = productImage(p);
    const imageHtml = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(p.name || 'صورة المنتج')}" loading="lazy">`
      : '<div class="product-no-image" aria-label="لا توجد صورة للمنتج">لا توجد صورة</div>';
    const scarcityHtml = p.is_bestseller ? '<span class="scarcity-tag bestseller">الأكثر مبيعاً</span>' : '';
    return `
      <article class="product-card reveal" data-id="${escapeHtml(p.id)}">
        <div class="product-img-wrap">
          ${imageHtml}
          ${discountPct > 0 ? `<span class="product-badge">خصم ${discountPct}%</span>` : ''}
          ${scarcityHtml}
        </div>
        <div class="product-info">
          ${p.category ? `<span class="product-cat">${escapeHtml(p.category)}</span>` : ''}
          <h3 class="product-name">${escapeHtml(p.name || 'منتج')}</h3>
          ${p.description ? `<p class="product-spec">${escapeHtml(p.description)}</p>` : ''}
          <div class="product-pricing">
            <span class="price-new">${Number(hasDiscount ? p.sale_price : p.price || 0).toLocaleString('ar-EG')} جنيه</span>
            ${hasDiscount ? `<span class="price-old">${Number(p.price).toLocaleString('ar-EG')} جنيه</span>` : ''}
          </div>
          <div class="product-actions">
            <button class="btn-order" data-action="order" data-product-id="${escapeHtml(p.id)}">🛒 اطلب الآن</button>
            <button class="btn-details" data-action="details" data-product-id="${escapeHtml(p.id)}" aria-label="تفاصيل ${escapeHtml(p.name || 'المنتج')}">تفاصيل</button>
          </div>
        </div>
      </article>`;
  }).join('');
  initReveal();
}

function initProductGridEvents() {
  Dom.productGrid?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-product-id]');
    if (!button) return;
    const product = state.products.find(item => String(item.id) === String(button.dataset.productId));
    if (!product) return;
    if (button.dataset.action === 'details') openQuickView(product);
    if (button.dataset.action === 'order') {
      if (addToCart(product)) openCheckout();
    }
  });
}

/* ─── Filters ─── */
function buildFilters(products) {
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filterContainer = document.querySelector('.filters');
  if (!filterContainer) return;

  filterContainer.innerHTML = categories.map(cat => `
    <button
      class="filter-btn ${cat === 'all' ? 'active' : ''}"
      data-cat="${cat}"
      onclick="filterProducts('${cat}', this)"
    >${cat === 'all' ? '🏷️ الكل' : cat}</button>
  `).join('');
}

function filterProducts(cat, btn) {
  state.currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Search input interaction (clear search visually if needed, but here we just re-run filter)
  const query = document.getElementById('product-search')?.value.toLowerCase().trim() || '';

  let filtered = state.products;
  if (cat !== 'all') {
    filtered = filtered.filter(p => p.category === cat);
  }
  if (query) {
    filtered = filtered.filter(p => String(p.name || '').toLowerCase().includes(query) || String(p.description || '').toLowerCase().includes(query));
  }

  state.filteredProducts = filtered;
  renderProducts(state.filteredProducts);
}

/* ─── Search ─── */
window.searchProducts = function(query) {
  query = query.toLowerCase().trim();
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) {
    clearBtn.style.display = query ? 'block' : 'none';
  }

  let filtered = state.products;
  if (state.currentFilter !== 'all') {
    filtered = filtered.filter(p => p.category === state.currentFilter);
  }
  if (query) {
    filtered = filtered.filter(p => String(p.name || '').toLowerCase().includes(query) || String(p.description || '').toLowerCase().includes(query));
  }

  state.filteredProducts = filtered;
  renderProducts(state.filteredProducts);
}

window.clearSearch = function() {
  const input = document.getElementById('product-search');
  if (input) {
    input.value = '';
    searchProducts('');
    input.focus();
  }
}

/* ─────────────────────────────────────────
   QUICK VIEW MODAL
───────────────────────────────────────── */
let currentQVProduct = null;
window.openQuickView = function(product) {
  currentQVProduct = product;
  const modal = document.getElementById('quickview-modal');
  if (!modal) return;

  const hasDiscount = Number(product.sale_price) > 0 && Number(product.price) > Number(product.sale_price);
  const discountPct = hasDiscount ? Math.round((1 - (product.sale_price / product.price)) * 100) : 0;

  const image = (product.images && product.images[0]) ? (product.images[0].url || product.images[0]) : 'assets/images/logo.png';
  document.getElementById('qv-img').src = image;
  document.getElementById('qv-img').alt = product.name || 'صورة المنتج';
  document.getElementById('qv-product-name').textContent = product.name;
  document.getElementById('qv-cat').textContent = product.category || '';
  document.getElementById('qv-spec').textContent = [product.material && `الخامة: ${product.material}`, product.size && `المقاس: ${product.size}`].filter(Boolean).join(' · ');
  document.getElementById('qv-desc').textContent = product.description || 'لا يوجد وصف متاح.';
  document.getElementById('qv-stock').textContent = Number(product.stock) > 0 ? 'متوفر' : 'غير متوفر';
  const basePrice = Number(product.price || 0);
  const salePrice = Number(product.sale_price || 0);
  document.getElementById('qv-price-new').textContent = Number(hasDiscount ? salePrice : basePrice).toLocaleString('ar-EG');

  const oldPriceEl = document.getElementById('qv-price-old');
  const badgeEl = document.getElementById('qv-badge');

  if (hasDiscount) {
    oldPriceEl.textContent = `${Number(product.price).toLocaleString('ar-EG')} جنيه`;
    oldPriceEl.style.display = 'inline-block';
    badgeEl.textContent = `خصم ${discountPct}%`;
    badgeEl.style.display = 'block';
  } else {
    oldPriceEl.style.display = 'none';
    badgeEl.style.display = 'none';
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

window.closeQuickView = function() {
  document.getElementById('quickview-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

window.orderFromQV = function() {
  closeQuickView();
  if (currentQVProduct) openCheckout(currentQVProduct);
}


/* ─────────────────────────────────────────
   CHECKOUT MODAL
───────────────────────────────────────── */
function openCheckout(product) {
  if (product && !state.cart.some(item => String(item.id) === String(product.id))) {
    if (!addToCart(product)) return;
  }
  state.selectedProduct = product || state.cart[0] || null;
  renderCheckoutItems();
  if (Dom.orderForm) Dom.orderForm.reset();
  Dom.checkoutModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  Dom.checkoutModal.classList.remove('open');
  document.body.style.overflow = '';
}

async function submitOrder(e) {
  e.preventDefault();
  const btn = Dom.confirmBtn;
  if (!btn) return;

  const name    = $('cust-name')?.value?.trim();
  const phone   = $('cust-phone')?.value?.trim();
  const gov     = $('gov-select')?.value;
  const address = $('cust-address')?.value?.trim();

  const phonePattern = /^01[0125]\d{8}$/;
  if (!name || name.length < 2 || name.length > 120 || !phonePattern.test(phone) || !gov || address.length < 5 || address.length > 300) {
    alert('راجع الاسم ورقم الموبايل والمحافظة والعنوان؛ البيانات غير صحيحة.');
    return;
  }
  if (!state.cart.length) {
    alert('السلة فاضية أو المنتج لم يعد متاحاً.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:22px;height:22px;border-width:3px;margin:0"></div> جاري الإرسال…`;

  const subtotal = cartSubtotal();
  const bostaSize = state.cart.map(item => item.bosta_size).find(Boolean) || '';
  const shippingFee = calculateShipping(gov, bostaSize, subtotal);
  const total = subtotal + shippingFee;

  try {
    const productIds = state.cart.map(item => encodeURIComponent(item.id)).join(',');
    const currentRows = await Supabase.select(TABLES.products, `id=in.(${productIds})&limit=100`);
    const currentById = new Map((currentRows || []).map(row => [String(row.id), row]));
    for (const item of state.cart) {
      const current = currentById.get(String(item.id));
      const requestedPrice = unitPrice(item);
      const actualPrice = unitPrice(current);
      if (!current || current.is_active === false || Number(current.stock || 0) < Number(item.qty || 1)) {
        throw new Error('PRODUCT_UNAVAILABLE');
      }
      if (actualPrice !== requestedPrice) {
        throw new Error('PRODUCT_PRICE_CHANGED');
      }
    }

    const orderPayload = {
      customer_name: name,
      customer_phone: phone,
      governorate: gov,
      area: null,
      address,
      subtotal,
      shipping_fee: shippingFee,
      total,
      payment_method: 'cod',
      items: state.cart.map(item => ({
        product_id: item.id,
        name: item.name,
        qty: Number(item.qty || 1),
        price: unitPrice(item),
        image: productImage(item)
      }))
    };
    const orderResult = await Supabase.rpc('create_order_with_stock_bulk', { p_order: orderPayload });
    const orderId = orderResult?.order_id || orderResult?.id || orderResult;
    const accessToken = orderResult?.access_token || '';
    state.cart = [];
    saveCart();

    const modalBox = document.querySelector('.modal-box');
    if (modalBox) {
      modalBox.innerHTML = `
        <button type="button" class="modal-close" onclick="closeCheckout()" title="إغلاق">✕</button>
        <div class="success-state">
          <div class="success-icon">✓</div>
          <h3>تم استلام طلبك!</h3>
          <p>شكراً <strong>${escapeHtml(name)}</strong>، رقم طلبك <strong>#${escapeHtml(orderId)}</strong>.<br>الدفع عند الاستلام. سيتم تجهيز الشحنة والتواصل معك قريباً.</p>
          <button type="button" onclick="closeCheckout()" style="margin-top:1rem;padding:0.7rem 2rem;border-radius:99px;background:var(--clr-primary);color:#fff;font-weight:700;font-size:0.95rem;cursor:pointer;border:none">رائع! شكراً</button>
        </div>`;
    }
    queueBostaCreation(orderId, accessToken);
  } catch (err) {
    console.error('[order submit]', err);
    btn.disabled = false;
    btn.innerHTML = '✓ تأكيد الطلب';
    if (err.message === 'PRODUCT_PRICE_CHANGED') alert('سعر منتج اتحدث. السلة محفوظة؛ راجعها وحاول مرة أخرى.');
    else if (err.message === 'PRODUCT_UNAVAILABLE') alert('منتج في السلة لم يعد متاحاً أو الكمية غير كافية. السلة محفوظة.');
    else alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
  }
}

async function queueBostaCreation(orderId, accessToken) {
  if (!ADMIN_BACKEND_URL || !orderId || !accessToken) return;
  try {
    await fetch(`${ADMIN_BACKEND_URL}/api/bosta-create-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ order_id: orderId, access_token: accessToken })
    });
  } catch (err) {
    console.warn('[bosta create]', err);
  }
}

/* ─────────────────────────────────────────
   TRACK MODAL
───────────────────────────────────────── */
function openTrack() {
  $('track-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTrack() {
  $('track-modal').classList.remove('open');
  document.body.style.overflow = '';
}

async function trackOrder() {
  const phone = Dom.trackInput?.value?.trim();
  if (!/^01[0125]\d{8}$/.test(phone)) {
    if (Dom.trackResult) Dom.trackResult.textContent = 'اكتب رقم موبايل مصري صحيح.';
    return;
  }

  const result = Dom.trackResult;
  result.innerHTML = `<div class="spinner" style="width:28px;height:28px;border-width:3px;margin:1rem auto"></div>`;

  try {
    const response = await fetch(`${ADMIN_BACKEND_URL}/api/bosta-track?phone=${encodeURIComponent(phone)}`, { credentials: 'omit' });
    if (!response.ok) throw new Error('TRACK_FAILED');
    const orders = await response.json();

    if (!orders.length) {
      result.innerHTML = `<p style="color:var(--clr-text-muted);text-align:center;margin-top:1rem">لا توجد طلبات مسجلة بهذا الرقم.</p>`;
      return;
    }

    const statusMap = {
      'جديد': { icon: '🕐', cls: 'color:#c9a227' },
      'قيد التجهيز': { icon: '📦', cls: 'color:#1a6b3c' },
      'تم الشحن': { icon: '🚚', cls: 'color:#2980b9' },
      'تم التسليم': { icon: '✅', cls: 'color:#27ae60' },
      'مرفوض': { icon: '❌', cls: 'color:#c0392b' }
    };

    result.innerHTML = orders.map(o => {
      const s = statusMap[o.status] || { icon: '📋', cls: '' };
      const date = new Date(o.created_at).toLocaleDateString('ar-EG');
      return `
        <div style="background:var(--clr-surface);border-radius:var(--radius-md);padding:0.9rem 1rem;margin-top:0.7rem;border:1px solid #dde8df">
          <div style="font-weight:700;margin-bottom:0.2rem">طلب #${escapeHtml(o.id || '—')}</div>
          <div style="font-size:0.85rem;color:var(--clr-text-muted)">${escapeHtml(date)}</div>
          <div style="margin-top:0.4rem;font-weight:700;${s.cls}">${s.icon} ${escapeHtml(o.status || 'جديد')}</div>
          ${o.bosta_tracking_number ? `<div style="margin-top:.35rem;font-size:.85rem">رقم التتبع: <strong>${escapeHtml(o.bosta_tracking_number)}</strong></div>` : ''}
        </div>`;
    }).join('');
  } catch (err) {
    result.innerHTML = `<p style="color:var(--clr-danger);text-align:center;margin-top:1rem">حدث خطأ. حاول تاني.</p>`;
  }
}

/* ─────────────────────────────────────────
   COMPLAINT MODAL
───────────────────────────────────────── */
function openComplaint() {
  const modal = document.getElementById('complaint-modal');
  if (!modal) return;
  // Reset form each open
  const wrap = document.getElementById('complaint-form-wrap');
  if (wrap) {
    const form = document.getElementById('complaint-form');
    if (form) form.reset();
    const btn = document.getElementById('btn-complaint-submit');
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> إرسال الرسالة`; }
    wrap.style.display = '';
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeComplaint() {
  document.getElementById('complaint-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

async function submitComplaint(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-complaint-submit');
  if (!btn) return;

  const name    = document.getElementById('comp-name')?.value?.trim();
  const phone   = document.getElementById('comp-phone')?.value?.trim();
  const address = document.getElementById('comp-address')?.value?.trim();
  const msg     = document.getElementById('comp-msg')?.value?.trim();

  if (!name || !phone || !address || !msg) {
    const firstEmpty = !name ? 'comp-name' : !phone ? 'comp-phone' : !address ? 'comp-address' : 'comp-msg';
    document.getElementById(firstEmpty)?.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:3px;margin:0"></div> جاري الإرسال…`;

  try {
    await Supabase.insert(TABLES.complaints, {
      customer_name:    name,
      customer_phone:   phone,
      customer_address: address,
      message:          msg,
      status:           'new'
    });

    // Show success inside the modal
    const wrap = document.getElementById('complaint-form-wrap');
    if (wrap) {
      wrap.innerHTML = `
        <div class="complaint-success">
          <div class="success-icon" style="width:72px;height:72px;background:linear-gradient(135deg,var(--clr-success),#2ecc71);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both">✓</div>
          <h3 style="font-size:1.1rem;font-weight:800;color:var(--clr-text)">تم إرسال رسالتك بنجاح! 🎉</h3>
          <p style="font-size:0.88rem;color:var(--clr-text-muted);line-height:1.7">إدارة المعرض هتتواصل معاك في أقرب وقت.<br>نقدر اهتمامك وتفاعلك معنا.</p>
          <button onclick="closeComplaint()" style="margin-top:0.5rem;padding:0.65rem 1.8rem;border-radius:99px;background:var(--clr-primary);color:#fff;font-weight:700;font-size:0.9rem;cursor:pointer;border:none">رائع، شكراً!</button>
        </div>`;
    }
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> إرسال الرسالة`;
    alert('حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.');
  }
}

/* ─────────────────────────────────────────
   TESTIMONIALS — database content only
───────────────────────────────────────── */
function renderTestimonials(testimonials = []) {
  const section = document.getElementById('testimonials');
  const track = Dom.sliderTrack;
  const dots = Dom.sliderDots;
  const list = Array.isArray(testimonials) ? testimonials.filter(item => item && item.text && item.name) : [];
  if (!section || !track) return;
  if (!list.length) {
    section.hidden = true;
    track.replaceChildren();
    if (dots) dots.replaceChildren();
    clearInterval(state.sliderInterval);
    return;
  }
  section.hidden = false;
  track.innerHTML = list.map(t => `
    <div class="testi-card">
      <div class="testi-stars">${'★'.repeat(Math.min(5, Math.max(1, Number(t.stars) || 5)))}</div>
      <p class="testi-text">"${escapeHtml(t.text)}"</p>
      <div class="testi-author">
        <div class="testi-avatar">${escapeHtml(String(t.name).trim().slice(0, 1))}</div>
        <div><div class="testi-name">${escapeHtml(t.name)}</div><div class="testi-city">${escapeHtml(t.city || '')}</div></div>
      </div>
    </div>`).join('');
  if (dots) dots.innerHTML = list.map((_, i) => `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})" aria-label="انتقال للشريحة ${i + 1}"></button>`).join('');
  state.testimonials = list;
  startSlider();
}

function goToSlide(index) {
  state.sliderIndex = index;
  const card = Dom.sliderTrack?.querySelector('.testi-card');
  const cardW = card ? card.offsetWidth + 19 : 300;
  if (Dom.sliderTrack) Dom.sliderTrack.style.transform = `translateX(${index * cardW}px)`;
  document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === index));
}

function startSlider() {
  clearInterval(state.sliderInterval);
  if (!state.testimonials?.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  state.sliderInterval = setInterval(() => {
    state.sliderIndex = (state.sliderIndex + 1) % state.testimonials.length;
    goToSlide(state.sliderIndex);
  }, 4000);
}

/* ─────────────────────────────────────────
   SCROLL REVEAL (IntersectionObserver)
───────────────────────────────────────── */
function initReveal() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.remove('visible');
    observer.observe(el);
  });
}

/* ─────────────────────────────────────────
   POPULATE GOVERNORATES SELECT
───────────────────────────────────────── */
function populateGovSelect() {
  if (!Dom.govSelect) return;
  Dom.govSelect.innerHTML =
    `<option value="">اختر المحافظة</option>` +
    EGYPT_GOVS.map(g => `<option value="${g}">${g}</option>`).join('');
}

/* ─────────────────────────────────────────
   CLOSE MODALS ON BACKDROP CLICK
───────────────────────────────────────── */
function initModalBackdrops() {
  $('cart-modal')?.addEventListener('click', e => {
    if (e.target.id === 'cart-modal') closeCart();
  });
  $('checkout-modal')?.addEventListener('click', e => {
    if (e.target.id === 'checkout-modal') closeCheckout();
  });
  $('track-modal')?.addEventListener('click', e => {
    if (e.target.id === 'track-modal') closeTrack();
  });
}

/* ─────────────────────────────────────────
   FORM SUBMIT BINDING
───────────────────────────────────────── */
function initForms() {
  Dom.orderForm?.addEventListener('submit', submitOrder);
}

/* ─────────────────────────────────────────
   FAQ ACCORDION
───────────────────────────────────────── */
window.toggleFaq = function(button) {
  const item = button.closest('.faq-item');
  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', !isExpanded);
  item.classList.toggle('active');
}

/* ─────────────────────────────────────────
   INIT & UTILITIES
───────────────────────────────────────── */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCart();
      closeCheckout();
      closeTrack();
      closeComplaint();
      closeQuickView();
    }
  });
}

/* ─────────────────────────────────────────
   SMOOTH SCROLL FOR HERO BUTTON
───────────────────────────────────────── */
function initHeroBtn() {
  document.querySelector('[data-scroll]')?.addEventListener('click', function () {
    const target = document.querySelector(this.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroParallax();
  updateCartCount();
  renderCart();
  populateGovSelect();
  loadSettings();
  Supabase.select(TABLES.shipping_rates).then(rates => { window.liveShippingRates = rates || []; }).catch(console.error);
  loadProducts({ preserveModal: false });
  initProductGridEvents();
  initReveal();
  initModalBackdrops();
  initForms();
  initKeyboard();
  initHeroBtn();
  initRealtimeSync();

  // Complaint form binding
  document.getElementById('complaint-form')?.addEventListener('submit', submitComplaint);

  // Close complaint modal on backdrop/keyboard
  document.getElementById('complaint-modal')?.addEventListener('click', e => {
    if (e.target.id === 'complaint-modal') closeComplaint();
  });

  /* ─── Live CMS synchronization ─── */

function initRealtimeSync() {
  const tables = [TABLES.products, TABLES.categories, TABLES.site_settings, TABLES.faqs, TABLES.socials].filter(Boolean);
  let refreshTimer = null;
  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      await Promise.all([loadProducts(), loadSettings()]);
    }, 250);
  };
  const unsubscribe = Supabase.subscribeRealtime(tables, refresh);
  window.landingRealtimeUnsubscribe = unsubscribe;

  // Fallback فقط لو Realtime غير متاح أو انقطع.
  setInterval(() => {
    if (window.landingRealtimeConnected) return;
    if (document.querySelector('#checkout-modal.open, #quickview-modal.open, #track-modal.open, #complaint-modal.open')) return;
    refresh();
  }, 30000);
}

});
