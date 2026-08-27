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
const ORDER_ACCESS_KEY = 'awlad_elkady_order_access_v1';
let bostaLocationsPromise = null;
let bostaLocationRows = [];

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item && item.id) : [];
  } catch (_) { return []; }
}

const state = {
  products: [],
  categories: [],
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

function saveOrderAccess(orderId, accessToken) {
  if (!orderId || !accessToken) return;
  try {
    const current = JSON.parse(sessionStorage.getItem(ORDER_ACCESS_KEY) || '{}');
    current[String(orderId)] = String(accessToken);
    const entries = Object.entries(current).slice(-10);
    sessionStorage.setItem(ORDER_ACCESS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (_) { /* session storage may be unavailable */ }
}

function getOrderAccess(orderId) {
  try {
    const current = JSON.parse(sessionStorage.getItem(ORDER_ACCESS_KEY) || '{}');
    return String(current[String(orderId)] || '');
  } catch (_) { return ''; }
}

window.copyOrderAccessToken = async function(token) {
  try {
    await navigator.clipboard.writeText(String(token || ''));
    const notice = document.getElementById('order-access-copy-notice');
    if (notice) notice.textContent = 'تم نسخ رمز الإدارة.';
  } catch (_) {
    const notice = document.getElementById('order-access-copy-notice');
    if (notice) notice.textContent = 'انسخ الرمز يدوياً واحتفظ به.';
  }
};

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
    alert('المنتج غير متاح حالياً. اختار منتجاً آخر أو حاول لاحقاً.');
    return false;
  }
  const existing = state.cart.find(item => String(item.id) === String(product.id));
  const nextQty = Number(existing?.qty || 0) + Number(quantity || 1);
  const maxStock = Math.max(1, Number(product.stock || existing?.stock || 1));
  if (nextQty > maxStock) {
    alert('الكمية المطلوبة غير متاحة حالياً. قلل الكمية أو اختار منتجاً آخر.');
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
  if (next > maxStock) return alert('الكمية المطلوبة غير متاحة حالياً. قلل الكمية أو اختار منتجاً آخر.');
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
  trackOrderId:   $('track-order-id'),
  trackAccessToken: $('track-access-token'),
  trackManageBtn: $('track-manage-btn'),
  trackManagedResult: $('track-managed-result'),
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

let maintenanceCountdownTimer = null;

function safeMaintenanceLogo(value) {
  const fallback = 'assets/images/logo.png';
  try {
    const url = new URL(String(value || fallback), window.location.href);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch (_) { /* fallback below */ }
  return fallback;
}

function renderMaintenanceScreen(settings = {}) {
  const enabled = settings.maintenance_mode === true;
  const existing = document.getElementById('maintenance-root');
  clearInterval(maintenanceCountdownTimer);
  maintenanceCountdownTimer = null;

  if (!enabled) {
    existing?.remove();
    document.body.classList.remove('maintenance-open');
    document.documentElement.classList.remove('maintenance-open');
    document.querySelectorAll('[data-maintenance-was-hidden]').forEach(el => {
      if (el.dataset.maintenanceWasHidden === 'false') el.hidden = false;
      delete el.dataset.maintenanceWasHidden;
    });
    return;
  }

  const root = existing || document.createElement('main');
  root.id = 'maintenance-root';
  root.className = 'maintenance-state';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  if (!existing) {
    root.innerHTML = `
      <div class="maintenance-glow maintenance-glow-one" aria-hidden="true"></div>
      <div class="maintenance-glow maintenance-glow-two" aria-hidden="true"></div>
      <section class="maintenance-card" aria-label="وضع الصيانة">
        <div class="maintenance-brand">
          <span class="maintenance-logo-wrap"><img data-maintenance-logo alt="لوجو المتجر"></span>
          <span class="maintenance-brand-line"></span>
          <span data-maintenance-site-name>معرض أولاد القاضي للأدوات المنزلية</span>
        </div>
        <div class="maintenance-icon" aria-hidden="true"><i class="fa-solid fa-screwdriver-wrench"></i></div>
        <p class="maintenance-eyebrow">تحديثات بسيطة وتجربة أفضل</p>
        <h1>راجعِين لكم قريباً</h1>
        <p class="maintenance-message" data-maintenance-message></p>
        <div class="maintenance-return-box">
          <span class="maintenance-return-label">موعد العودة المتوقع</span>
          <strong data-maintenance-end-label>قريباً</strong>
        </div>
        <div class="maintenance-countdown" data-maintenance-countdown aria-label="الوقت المتبقي">
          <div class="maintenance-time-unit"><strong data-maintenance-days>00</strong><span>يوم</span></div>
          <div class="maintenance-time-unit"><strong data-maintenance-hours>00</strong><span>ساعة</span></div>
          <div class="maintenance-time-unit"><strong data-maintenance-minutes>00</strong><span>دقيقة</span></div>
          <div class="maintenance-time-unit"><strong data-maintenance-seconds>00</strong><span>ثانية</span></div>
        </div>
        <p class="maintenance-footer-note">شكراً لصبركم وثقتكم — هنرجعلكم بكل جديد.</p>
      </section>`;
    document.body.appendChild(root);
  }

  const siteName = settings.site_name || 'معرض أولاد القاضي للأدوات المنزلية';
  const message = settings.maintenance_message || 'بنجهز لكم تجربة أفضل وعروض جديدة. هنرجع قريباً بكل جديد!';
  const logo = root.querySelector('[data-maintenance-logo]');
  const endLabel = root.querySelector('[data-maintenance-end-label]');
  const messageEl = root.querySelector('[data-maintenance-message]');
  const siteNameEl = root.querySelector('[data-maintenance-site-name]');
  if (logo) {
    logo.src = safeMaintenanceLogo(settings.logo_header);
    logo.onerror = () => { logo.onerror = null; logo.src = 'assets/images/logo.png'; };
  }
  if (messageEl) messageEl.textContent = message;
  if (siteNameEl) siteNameEl.textContent = siteName;

  const endTime = new Date(settings.maintenance_end_at || '').getTime();
  const formatEnd = () => {
    if (!Number.isFinite(endTime)) return 'سنعود قريباً';
    try {
      return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(endTime));
    } catch (_) { return new Date(endTime).toLocaleString('ar-EG'); }
  };
  if (endLabel) endLabel.textContent = formatEnd();

  document.body.classList.add('maintenance-open');
  document.documentElement.classList.add('maintenance-open');
  Array.from(document.body.children).forEach(child => {
    if (child === root) return;
    if (!Object.prototype.hasOwnProperty.call(child.dataset, 'maintenanceWasHidden')) {
      child.dataset.maintenanceWasHidden = child.hidden ? 'true' : 'false';
      child.hidden = true;
    }
  });

  const units = {
    days: root.querySelector('[data-maintenance-days]'),
    hours: root.querySelector('[data-maintenance-hours]'),
    minutes: root.querySelector('[data-maintenance-minutes]'),
    seconds: root.querySelector('[data-maintenance-seconds]')
  };
  const updateCountdown = () => {
    let remaining = Number.isFinite(endTime) ? Math.max(0, endTime - Date.now()) : 0;
    const days = Math.floor(remaining / 86400000); remaining %= 86400000;
    const hours = Math.floor(remaining / 3600000); remaining %= 3600000;
    const minutes = Math.floor(remaining / 60000); remaining %= 60000;
    const seconds = Math.floor(remaining / 1000);
    if (units.days) units.days.textContent = String(days).padStart(2, '0');
    if (units.hours) units.hours.textContent = String(hours).padStart(2, '0');
    if (units.minutes) units.minutes.textContent = String(minutes).padStart(2, '0');
    if (units.seconds) units.seconds.textContent = String(seconds).padStart(2, '0');
    if (!Number.isFinite(endTime) || endTime <= Date.now()) {
      root.querySelector('[data-maintenance-countdown]')?.classList.add('is-complete');
    }
  };
  updateCountdown();
  maintenanceCountdownTimer = setInterval(updateCountdown, 1000);
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
  renderMaintenanceScreen(settings);
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
const CATEGORY_IMAGE_DEFAULTS = {
  'أدوات الطهي وأواني المطبخ': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1000&q=82',
  'أجهزة المطبخ الكهربائية': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1000&q=82',
  'مستلزمات التنظيم والتقديم والتنظيف': 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=82'
};

function categoryImage(category) {
  const value = category?.image_url || category?.image || category?.cover_image || '';
  return String(value || CATEGORY_IMAGE_DEFAULTS[category?.name] || 'assets/images/logo.png');
}

function normalizeCategories(categories = []) {
  return (Array.isArray(categories) ? categories : []).map(category => ({
    ...category,
    name: String(category.name || '').trim(),
    desc: String(category.desc || category.description || '').trim(),
    is_visible: category.is_visible !== false,
    image_url: categoryImage(category)
  })).filter(category => category.name && category.is_visible);
}

function renderLandingCategories(categories = [], products = []) {
  const target = document.getElementById('landing-category-grid');
  if (!target) return;
  const list = normalizeCategories(categories);
  if (!list.length) {
    target.innerHTML = '<div class="category-empty-state"><strong>الأقسام هتظهر هنا قريباً</strong><span>يتم تجهيز تشكيلات المعرض حالياً.</span></div>';
    return;
  }
  target.innerHTML = list.map(category => {
    const categoryProducts = products.filter(product => (product.category_ids || []).includes(Number(category.id)) || (product.category_names || []).includes(category.name));
    const hasProducts = categoryProducts.length > 0;
    return `<article class="landing-category-card reveal" data-category-id="${escapeHtml(category.id)}" data-category-name="${escapeHtml(category.name)}">
      <div class="landing-category-art"><img src="${escapeHtml(category.image_url)}" alt="${escapeHtml(category.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo.png'"><span class="landing-category-count">${hasProducts ? `${categoryProducts.length} منتجات` : 'قسم جديد'}</span></div>
      <div class="landing-category-body"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.desc || 'تشكيلة مختارة من منتجات المعرض للاستخدام اليومي.')}</p>${hasProducts ? `<button class="category-browse-btn" type="button" data-category-action="browse">تصفح منتجات القسم <span aria-hidden="true">←</span></button>` : '<div class="category-empty-message"><i class="fa-solid fa-box-open" aria-hidden="true"></i><span>لا توجد منتجات في القسم حالياً، لكن القسم متاح وسيتم إضافة المنتجات قريباً.</span></div>'}</div>
    </article>`;
  }).join('');
  initReveal();
}

function initLandingCategoryEvents() {
  const target = document.getElementById('landing-category-grid');
  if (!target || target.dataset.bound === '1') return;
  target.dataset.bound = '1';
  target.addEventListener('click', event => {
    const card = event.target.closest('[data-category-name]');
    if (!card) return;
    const name = card.dataset.categoryName || '';
    const button = event.target.closest('[data-category-action="browse"]');
    if (!button && !event.target.closest('.landing-category-art')) return;
    const filterButton = Array.from(document.querySelectorAll('.filter-btn')).find(item => item.dataset.cat === name);
    filterProducts(name, filterButton);
    document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function attachProductCategories(products, categories, links) {
  const namesById = new Map((Array.isArray(categories) ? categories : []).map(category => [Number(category.id), category.name || '']));
  const idsByProduct = new Map();
  (Array.isArray(links) ? links : []).forEach(link => {
    const productId = Number(link.product_id);
    const categoryId = Number(link.category_id);
    if (!Number.isInteger(productId) || !Number.isInteger(categoryId)) return;
    if (!idsByProduct.has(productId)) idsByProduct.set(productId, []);
    idsByProduct.get(productId).push(categoryId);
  });
  return (Array.isArray(products) ? products : []).map(product => {
    const categoryIds = idsByProduct.get(Number(product.id)) || [];
    const categoryNames = categoryIds.map(id => namesById.get(id)).filter(Boolean);
    return {
      ...product,
      category_ids: categoryIds,
      category_names: categoryNames,
      category: categoryNames.join('، ') || product.category || ''
    };
  });
}

async function loadProducts({ preserveModal = true } = {}) {
  if (!Dom.productGrid) return [];
  try {
    const [productsResult, categoriesResult, linksResult] = await Promise.race([
      Promise.allSettled([
        Supabase.select(TABLES.products, 'is_active=eq.true&is_archived=eq.false&order=created_at.desc'),
        Supabase.select(TABLES.categories, 'is_visible=eq.true&order=sort_order.asc,created_at.asc'),
        Supabase.select(TABLES.product_categories)
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PRODUCTS_TIMEOUT')), 8000))
    ]);
    if (productsResult.status !== 'fulfilled') throw productsResult.reason || new Error('PRODUCTS_LOAD_FAILED');
    const fresh = Array.isArray(productsResult.value) ? productsResult.value : [];
    const categories = categoriesResult.status === 'fulfilled' ? normalizeCategories(categoriesResult.value) : [];
    const links = linksResult.status === 'fulfilled' ? linksResult.value : [];
    state.categories = categories;
    state.products = attachProductCategories(fresh, categories, links);
    state.filteredProducts = state.products;
    if (!preserveModal || !document.querySelector('#checkout-modal.open, #quickview-modal.open')) {
      renderProducts(state.products);
      renderLandingCategories(state.categories, state.products);
      buildFilters(state.products, state.categories);
    }
    return state.products;
  } catch (err) {
    console.error('[landing products]', err);
    state.products = [];
    state.filteredProducts = [];
    if (!document.querySelector('#checkout-modal.open, #quickview-modal.open')) {
      Dom.productGrid.innerHTML = '<div class="products-error"><p>لم توجد منتجات متاحة حالياً أو انتهت مهلة التحميل.</p><button type="button" class="btn-retry-products" onclick="loadProducts({ preserveModal: false })">إعادة المحاولة</button></div>';
      renderLandingCategories(state.categories, []);
      buildFilters([], state.categories);
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
function buildFilters(products, sourceCategories = state.categories) {
  const categoryNames = (Array.isArray(sourceCategories) ? sourceCategories : []).map(category => category.name).filter(Boolean);
  const productCategoryNames = products.flatMap(product => Array.isArray(product.category_names) ? product.category_names : []).filter(Boolean);
  const categories = ['all', ...new Set([...categoryNames, ...productCategoryNames])];
  const filterContainer = document.querySelector('.filters');
  if (!filterContainer) return;

  filterContainer.innerHTML = categories.map(cat => `
    <button type="button" class="filter-btn ${cat === 'all' ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${cat === 'all' ? '🏷️ الكل' : escapeHtml(cat)}</button>
  `).join('');
  filterContainer.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => filterProducts(button.dataset.cat || 'all', button));
  });
}

function filterProducts(cat, btn) {
  state.currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Search input interaction (clear search visually if needed, but here we just re-run filter)
  const query = document.getElementById('product-search')?.value.toLowerCase().trim() || '';

  let filtered = state.products;
  if (cat !== 'all') {
    filtered = filtered.filter(p => (p.category_names || []).includes(cat) || p.category === cat);
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
    filtered = filtered.filter(p => (p.category_names || []).includes(state.currentFilter) || p.category === state.currentFilter);
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

function normalizeQuickViewProduct(product = {}) {
  const images = Array.isArray(product.images) ? product.images.map(image => typeof image === 'string' ? image : image?.url).filter(Boolean) : [];
  const name = String(product.name || product.product_name || '').trim();
  const description = String(product.description || product.desc || product.details || '').trim();
  const material = String(product.material || product.raw_material || '').trim();
  const size = String(product.size || product.dimensions || '').trim();
  return { ...product, name, description, material, size, images, price: Number(product.price || 0), sale_price: Number(product.sale_price || 0), stock: Number(product.stock || 0) };
}

function setQuickViewImage(url, alt, activeButton) {
  const image = document.getElementById('qv-img');
  if (image) { image.src = url || 'assets/images/logo.png'; image.alt = alt || 'صورة المنتج'; }
  document.querySelectorAll('#qv-gallery button').forEach(button => button.classList.toggle('active', button === activeButton));
}

window.openQuickView = function(product) {
  const normalized = normalizeQuickViewProduct(product);
  currentQVProduct = normalized;
  const modal = document.getElementById('quickview-modal');
  if (!modal) return;
  const get = id => document.getElementById(id);
  const hasDiscount = normalized.sale_price > 0 && normalized.price > normalized.sale_price;
  const discountPct = hasDiscount ? Math.round((1 - (normalized.sale_price / normalized.price)) * 100) : 0;
  const images = normalized.images.length ? normalized.images : ['assets/images/logo.png'];
  setQuickViewImage(images[0], normalized.name || 'صورة المنتج', null);

  const nameEl = get('qv-product-name');
  const categoryEl = get('qv-cat');
  const specEl = get('qv-spec');
  const descEl = get('qv-desc');
  const extraEl = get('qv-extra-details');
  const stockEl = get('qv-stock');
  const priceEl = get('qv-price-new');
  const oldPriceEl = get('qv-price-old');
  const badgeEl = get('qv-badge');
  if (nameEl) nameEl.textContent = normalized.name || 'اسم المنتج غير متاح حالياً';
  if (categoryEl) { categoryEl.textContent = normalized.category || 'منتجات منزلية'; categoryEl.hidden = false; }
  if (specEl) { const specs = [normalized.material && `الخامة: ${normalized.material}`, normalized.size && `المقاس: ${normalized.size}`].filter(Boolean); specEl.textContent = specs.join(' · ') || 'المواصفات غير متاحة حالياً'; specEl.classList.toggle('qv-data-fallback', !specs.length); }
  if (descEl) { descEl.textContent = normalized.description || 'التفاصيل غير متاحة حالياً.'; descEl.classList.toggle('qv-data-fallback', !normalized.description); }
  if (extraEl) extraEl.innerHTML = `<div><strong>حالة التوفر:</strong> ${normalized.stock > 0 ? 'متوفر حالياً' : 'غير متوفر حالياً'}</div><div><strong>الكمية:</strong> ${normalized.stock > 0 ? 'متاحة للطلب' : 'غير متاحة للطلب'}</div>`;
  if (stockEl) stockEl.textContent = normalized.stock > 0 ? 'متوفر حالياً' : 'غير متوفر حالياً';
  if (priceEl) priceEl.textContent = `${(hasDiscount ? normalized.sale_price : normalized.price).toLocaleString('ar-EG')} جنيه`;
  if (hasDiscount) {
    if (oldPriceEl) { oldPriceEl.textContent = `${normalized.price.toLocaleString('ar-EG')} جنيه`; oldPriceEl.style.display = 'inline-block'; }
    if (badgeEl) { badgeEl.textContent = `خصم ${discountPct}%`; badgeEl.style.display = 'block'; }
  } else {
    if (oldPriceEl) { oldPriceEl.textContent = ''; oldPriceEl.style.display = 'none'; }
    if (badgeEl) { badgeEl.textContent = ''; badgeEl.style.display = 'none'; }
  }

  const gallery = get('qv-gallery');
  if (gallery) {
    gallery.innerHTML = images.length > 1 ? images.map((url, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" aria-label="عرض الصورة ${index + 1}"><img src="${escapeHtml(url)}" alt="" loading="lazy"></button>`).join('') : '';
    gallery.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => setQuickViewImage(images[index], normalized.name || 'صورة المنتج', button)));
  }
  const orderButton = get('qv-order-btn');
  if (orderButton) orderButton.disabled = normalized.stock <= 0;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
};

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
function clearOrderErrorState() {
  const box = $('order-error');
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
  ['cust-name', 'cust-phone', 'gov-select', 'area-select', 'cust-address'].forEach(id => {
    const field = $(id);
    if (field) field.removeAttribute('aria-invalid');
  });
}

function showOrderError(title, issues = []) {
  const box = $('order-error');
  if (!box) return;
  clearOrderErrorState();
  const rows = issues.map(issue => `
    <li>
      <strong>${escapeHtml(issue.label || 'الطلب')}:</strong>
      ${escapeHtml(issue.problem || 'راجع البيانات المدخلة.')}<br>
      <span class="order-error-solution">الحل: ${escapeHtml(issue.solution || 'راجع القيمة وحاول مرة أخرى.')}</span>
    </li>`).join('');
  box.innerHTML = `<strong class="order-error-title">${escapeHtml(title)}</strong>${rows ? `<ul>${rows}</ul>` : ''}`;
  box.hidden = false;
  issues.forEach(issue => { if (issue.id) $(issue.id)?.setAttribute('aria-invalid', 'true'); });
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function normalizePhoneInput(value = '') {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const easternDigits = '۰۱۲۳۴۵۶۷۸۹';
  let normalized = String(value)
    .split('').map(char => {
      const arabicIndex = arabicDigits.indexOf(char);
      if (arabicIndex >= 0) return String(arabicIndex);
      const easternIndex = easternDigits.indexOf(char);
      return easternIndex >= 0 ? String(easternIndex) : char;
    }).join('')
    .replace(/[\s()\-]/g, '');
  if (/^20(10|11|12|15)\d{8}$/.test(normalized)) normalized = `0${normalized.slice(2)}`;
  return normalized;
}

function getOrderValidationIssues({ name, phone, gov, area, address }) {
  const issues = [];
  if (!name) issues.push({ id: 'cust-name', label: 'الاسم الكامل', problem: 'الاسم مش مكتوب.', solution: 'اكتب اسمك بالكامل.' });
  else if (name.length < 2 || name.length > 120) issues.push({ id: 'cust-name', label: 'الاسم الكامل', problem: 'الاسم قصير جداً أو طويل بشكل غير صحيح.', solution: 'اكتب اسماً من حرفين إلى 120 حرفاً.' });
  if (!phone) issues.push({ id: 'cust-phone', label: 'رقم الموبايل', problem: 'رقم الموبايل ناقص.', solution: 'اكتب رقم مصري من 11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015.' });
  else if (!/^01[0125]\d{8}$/.test(phone)) issues.push({ id: 'cust-phone', label: 'رقم الموبايل', problem: 'صيغة الرقم غير صحيحة.', solution: 'اكتب الرقم 11 رقماً بدون مسافات، مثال: 01012345678.' });
  if (!gov) issues.push({ id: 'gov-select', label: 'المحافظة', problem: 'لم يتم اختيار المحافظة.', solution: 'اختار المحافظة من القائمة.' });
  if (!area) {
    const areaSelect = $('area-select');
    issues.push({ id: 'area-select', label: 'المنطقة / الحي', problem: areaSelect?.disabled && gov ? 'مناطق الشحن لم تحمل أو المحافظة غير مدعومة حالياً.' : 'لم يتم اختيار المنطقة / الحي.', solution: areaSelect?.disabled && gov ? 'حدّث الصفحة وتأكد من اتصال الإنترنت، ثم اختار منطقة مدعومة.' : 'اختار المنطقة بعد اختيار المحافظة.' });
  }
  if (!address) issues.push({ id: 'cust-address', label: 'العنوان التفصيلي', problem: 'العنوان ناقص.', solution: 'اكتب عنواناً تفصيلياً لا يقل عن 5 حروف.' });
  else if (address.length < 5 || address.length > 300) issues.push({ id: 'cust-address', label: 'العنوان التفصيلي', problem: 'طول العنوان غير صحيح.', solution: 'اكتب عنواناً من 5 إلى 300 حرف.' });
  return issues;
}

function orderSendErrorDetails(error) {
  const raw = String(error?.message || error || '');
  const code = String(error?.code || '');
  const context = `${code} ${raw} ${String(error?.details || '')}`;
  if (raw === 'PRODUCT_PRICE_CHANGED') return { title: 'السعر اتغير قبل تأكيد الطلب', issues: [{ label: 'المنتج', problem: 'السعر الموجود في السلة لم يعد هو السعر الحالي.', solution: 'افتح السلة وراجع السعر الجديد ثم أكد الطلب مرة أخرى.' }] };
  if (raw === 'PRODUCT_UNAVAILABLE') return { title: 'المنتج لم يعد متاحاً', issues: [{ label: 'المنتج أو الكمية', problem: 'المنتج اتوقف أو الكمية المطلوبة أكبر من المخزون.', solution: 'راجع السلة وقلل الكمية أو احذف المنتج غير المتاح.' }] };
  if (code === 'P0001' || /invalid order/i.test(context)) return { title: 'بيانات الطلب اترفضت من النظام', issues: [{ label: 'بيانات الطلب', problem: 'الخدمة رفضت بيانات الطلب أو لم تجد منتجاً صالحاً بالسعر والكمية الحاليين.', solution: 'افتح السلة من جديد، راجع السعر والكمية والمحافظة والمنطقة، ثم حاول مرة واحدة.' }] };
  if (code === '23505') return { title: 'الطلب اتسجل بالفعل', issues: [{ label: 'تكرار الطلب', problem: 'النظام اكتشف محاولة تكرار نفس الطلب.', solution: 'راجع صفحة تتبع الطلب أو تواصل مع المعرض قبل إعادة الإرسال.' }] };
  if (code === '23502') return { title: 'بيانات أساسية ناقصة في النظام', issues: [{ label: 'حفظ الطلب', problem: 'قاعدة البيانات رفضت الحفظ لأن حقلاً أساسياً لم يصلها.', solution: 'حدّث الصفحة وأعد المحاولة؛ لو استمرت المشكلة تواصل مع المعرض.' }] };
  if (code === '22P02' || code === '22003') return { title: 'قيمة غير صالحة في الطلب', issues: [{ label: 'السعر أو الكمية', problem: 'النظام لم يستطع قراءة إحدى القيم الرقمية في الطلب.', solution: 'افتح السلة من جديد وتأكد أن السعر والكمية ظاهرين بشكل طبيعي ثم أعد المحاولة.' }] };
  if (code === '42703' || code === 'PGRST202' || /column .* does not exist|function .* does not exist/i.test(context)) return { title: 'إعدادات الطلب تحتاج تحديثاً', issues: [{ label: 'خدمة الطلب', problem: 'خدمة حفظ الطلب غير متوافقة مع النسخة الحالية من المتجر.', solution: 'لا تعيد الضغط؛ تم تسجيل المشكلة للمراجعة الفنية.' }] };
  if (code === '42501' || error?.status === 401 || error?.status === 403) return { title: 'تعذر السماح بحفظ الطلب', issues: [{ label: 'خدمة الطلب', problem: 'الاتصال بخدمة الحفظ مرفوض حالياً.', solution: 'لا تكرر الضغط؛ حدّث الصفحة وحاول مرة أخرى، وسيتم مراجعة صلاحية الخدمة إذا استمرت.' }] };
  if (Number(error?.status) >= 500) return { title: 'خدمة الطلب غير متاحة مؤقتاً', issues: [{ label: 'خدمة الحفظ', problem: 'الخادم لم يستطع إكمال حفظ الطلب الآن.', solution: 'انتظر دقيقة ثم حاول مرة واحدة، وإذا استمرت المشكلة تواصل مع المعرض.' }] };
  if (/Failed to fetch|NetworkError|Network request failed/i.test(raw)) return { title: 'مشكلة في الاتصال', issues: [{ label: 'الاتصال بالمتجر', problem: 'تعذر الوصول لخدمة الطلب حالياً.', solution: 'تأكد من الإنترنت، عطّل أي VPN إن وجد، ثم أعد المحاولة.' }] };
  if (/BOSTA|bosta/i.test(context)) return { title: 'تعذر تجهيز الشحن', issues: [{ label: 'بيانات الشحن', problem: 'تم رفض تجهيز الشحنة أو لم تكتمل بيانات الشحن.', solution: 'راجع المحافظة والمنطقة والعنوان، وإذا استمرت المشكلة تواصل مع المعرض.' }] };
  const responseLabel = code || (error?.status ? `HTTP ${error.status}` : 'رد غير معروف');
  return { title: 'تعذر تسجيل الطلب', issues: [{ label: 'إرسال الطلب', problem: `خدمة التسجيل رجعت ${responseLabel} ولم تؤكد حفظ الطلب.`, solution: 'لا تضغط عدة مرات؛ احتفظ بالبيانات وتواصل مع المعرض ليتحقق من الطلب قبل إعادة المحاولة.' }] };
}

function resetCheckoutView() {
  $('checkout-success')?.remove();
  clearOrderErrorState();
  const form = $('order-form');
  if (form) {
    form.hidden = false;
    Dom.orderForm = form;
    Dom.confirmBtn = $('btn-confirm');
  }
  $('checkout-items')?.removeAttribute('hidden');
  $('checkout-title')?.removeAttribute('hidden');
  const preview = $('modal-preview');
  if (preview) preview.hidden = true;
}

function openCheckout(product) {
  if (product && !state.cart.some(item => String(item.id) === String(product.id))) {
    if (!addToCart(product)) return;
  }
  resetCheckoutView();
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

  const name    = $('cust-name')?.value?.trim() || '';
  const phoneField = $('cust-phone');
  const phone   = normalizePhoneInput(phoneField?.value || '');
  if (phoneField && phoneField.value !== phone) phoneField.value = phone;
  const gov     = $('gov-select')?.value || '';
  const area    = $('area-select')?.value?.trim() || '';
  const address = $('cust-address')?.value?.trim() || '';

  clearOrderErrorState();
  const validationIssues = getOrderValidationIssues({ name, phone, gov, area, address });
  if (validationIssues.length) {
    showOrderError('راجع الحقول المحددة قبل تأكيد الطلب', validationIssues);
    return;
  }
  if (!state.cart.length) {
    showOrderError('السلة فاضية', [{ label: 'المنتجات', problem: 'مفيش منتج جاهز للإرسال حالياً.', solution: 'ارجع للمنتجات وأضف المنتج للسلة ثم افتح الطلب من جديد.' }]);
    return;
  }

  const originalButtonMarkup = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:22px;height:22px;border-width:3px;margin:0"></div> جاري الإرسال…`;

  const subtotal = cartSubtotal();
  const bostaSize = state.cart.map(item => Number(item.bosta_size) || 0).reduce((max, value) => Math.max(max, value), 0) || 140;
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
      area,
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
    if (!orderId) throw new Error('ORDER_RESPONSE_INVALID');
    const accessToken = orderResult?.access_token || '';
    saveOrderAccess(orderId, accessToken);
    state.cart = [];
    saveCart();

    let bostaResult = null;
    try {
      bostaResult = await queueBostaCreation(orderId, accessToken);
    } catch (bostaError) {
      console.error('[bosta create]', bostaError);
    }

    const shippingMessage = bostaResult?.tracking_number || bostaResult?.delivery_id
      ? `تم تأكيد الشحنة مع Bosta. رقم التتبع: <strong dir="ltr">${escapeHtml(bostaResult.tracking_number || bostaResult.delivery_id)}</strong>.`
      : 'تم استلام الطلب، لكن لم يتم تأكيد بوليصة Bosta تلقائياً. الإدارة ستراجع الشحنة قبل التسليم.';
    const form = $('order-form');
    const checkoutItems = $('checkout-items');
    const checkoutTitle = $('checkout-title');
    const preview = $('modal-preview');
    const content = $('modal-content');
    if (form) form.hidden = true;
    if (checkoutItems) checkoutItems.setAttribute('hidden', '');
    if (checkoutTitle) checkoutTitle.setAttribute('hidden', '');
    if (preview) preview.hidden = true;
    if (content) {
      $('checkout-success')?.remove();
      const success = document.createElement('div');
      success.id = 'checkout-success';
      success.className = 'success-state';
        success.innerHTML = `
        <div class="success-icon">✓</div>
        <h3>تم استلام طلبك!</h3>
        <p>شكراً <strong>${escapeHtml(name)}</strong>، رقم طلبك <strong>#${escapeHtml(orderId)}</strong>.<br>الدفع عند الاستلام. ${shippingMessage}</p>
        ${accessToken ? `<div class="order-access-card"><strong>رمز إدارة الطلب</strong><code dir="ltr">${escapeHtml(accessToken)}</code><button type="button" class="track-action-secondary" onclick="copyOrderAccessToken('${escapeHtml(accessToken)}')">نسخ الرمز</button><small id="order-access-copy-notice">احتفظ بالرمز؛ ستحتاجه مع رقم الطلب لعرض التفاصيل وطلب إلغاء أو تعديل.</small></div>` : '<p class="track-inline-message error">لم يتم إصدار رمز الإدارة؛ تواصل مع المعرض قبل طلب أي تعديل.</p>'}
        <button type="button" onclick="closeCheckout()" style="margin-top:1rem;padding:0.7rem 2rem;border-radius:99px;background:var(--clr-primary);color:#fff;font-weight:700;font-size:0.95rem;cursor:pointer;border:none">رائع! شكراً</button>`;
      content.appendChild(success);
    }
  } catch (err) {
    console.error('[order submit]', err);
    btn.disabled = false;
    btn.innerHTML = originalButtonMarkup;
    const details = orderSendErrorDetails(err);
    showOrderError(details.title, details.issues);
  }
}

async function queueBostaCreation(orderId, accessToken) {
  if (!ADMIN_BACKEND_URL || !orderId || !accessToken) throw new Error('BOSTA_BACKEND_NOT_CONFIGURED');
  const response = await fetch(`${ADMIN_BACKEND_URL}/api/bosta-create-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ order_id: orderId, access_token: accessToken })
  });
  let details = {};
  try { details = await response.json(); } catch (_) { /* keep empty response */ }
  if (!response.ok || !details.ok || (!details.tracking_number && !details.delivery_id)) {
    const error = new Error(details.error || 'BOSTA_CREATE_FAILED');
    error.status = response.status;
    throw error;
  }
  return details;
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

const TRACK_STATUS_MAP = {
  'جديد': { icon: '🕐', cls: 'color:#c9a227' },
  'قيد التجهيز': { icon: '📦', cls: 'color:#1a6b3c' },
  'تم الشحن': { icon: '🚚', cls: 'color:#2980b9' },
  'تم التسليم': { icon: '✅', cls: 'color:#27ae60' },
  'مرفوض': { icon: '❌', cls: 'color:#c0392b' },
  'ملغي': { icon: '✕', cls: 'color:#c0392b' }
};

function managedOrderEndpoint(orderId, accessToken) {
  return `${ADMIN_BACKEND_URL}/api/bosta-track?order_id=${encodeURIComponent(orderId)}&access_token=${encodeURIComponent(accessToken)}`;
}

function publicTrackCard(order) {
  const status = TRACK_STATUS_MAP[order.status] || { icon: '📋', cls: '' };
  const date = new Date(order.created_at).toLocaleDateString('ar-EG');
  const savedToken = getOrderAccess(order.id);
  return `<div class="track-managed-card">
    <div class="track-managed-item"><span>رقم الطلب</span><strong dir="ltr">#${escapeHtml(order.id || '—')}</strong></div>
    <div class="track-managed-item"><span>تاريخ الطلب</span><strong>${escapeHtml(date)}</strong></div>
    <div class="track-managed-item"><span>الحالة</span><strong style="${status.cls}">${status.icon} ${escapeHtml(order.status || 'جديد')}</strong></div>
    <div class="track-managed-item"><span>الإجمالي</span><strong>${Number(order.total || 0).toLocaleString('ar-EG')} جنيه</strong></div>
    ${order.bosta_tracking_number ? `<div class="track-managed-item"><span>رقم التتبع</span><strong dir="ltr">${escapeHtml(order.bosta_tracking_number)}</strong></div>` : '<p class="track-inline-message">لم يصدر رقم تتبع حتى الآن.</p>'}
    ${savedToken ? `<button type="button" class="track-action-secondary" style="margin-top:.7rem;width:100%" onclick="loadManagedOrderForOrder('${escapeHtml(order.id)}')">عرض التفاصيل وإدارة الطلب</button>` : '<small class="track-inline-message">لأمان البيانات، التفاصيل الكاملة وإدارة الطلب تحتاج رقم الطلب ورمز الإدارة الموجود بعد الشراء.</small>'}
  </div>`;
}

async function trackOrder() {
  const phone = normalizePhoneInput(Dom.trackInput?.value || '');
  if (Dom.trackInput) Dom.trackInput.value = phone;
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
    if (!Array.isArray(orders) || !orders.length) {
      result.innerHTML = `<p class="track-inline-message">لا توجد طلبات مسجلة بهذا الرقم.</p>`;
      return;
    }
    result.innerHTML = orders.map(publicTrackCard).join('');
  } catch (err) {
    console.error('[track order]', err);
    result.innerHTML = `<p class="track-inline-message error">حصلت مشكلة في تحميل التتبع. حاول تاني.</p>`;
  }
}

window.loadManagedOrderForOrder = function(orderId) {
  const token = getOrderAccess(orderId);
  if (Dom.trackOrderId) Dom.trackOrderId.value = String(orderId || '');
  if (Dom.trackAccessToken) Dom.trackAccessToken.value = token;
  return window.loadManagedOrder();
};

function renderManagedOrder(order) {
  const result = Dom.trackManagedResult;
  if (!result) return;
  const status = TRACK_STATUS_MAP[order.status] || { icon: '📋', cls: '' };
  const itemRows = (order.items || []).map(item => `<div class="track-managed-item"><span>${escapeHtml(item.name || 'منتج')} × ${Number(item.qty || 1)}</span><strong>${Number(item.price || 0).toLocaleString('ar-EG')} جنيه</strong></div>`).join('');
  const requests = (order.customer_requests || []).map(request => `<div class="track-managed-item"><span>${request.request_type === 'cancel' ? 'طلب إلغاء' : 'طلب تعديل'}</span><strong>${request.status === 'pending' ? 'قيد المراجعة' : request.status === 'applied' ? 'تم التنفيذ' : 'تم الرفض'}</strong></div>`).join('');
  const policy = order.policy || {};
  const editFields = [
    ['customer_name', 'الاسم', order.customer_name],
    ['customer_phone', 'رقم الموبايل', order.customer_phone],
    ['governorate', 'المحافظة', order.governorate],
    ['area', 'المنطقة', order.area],
    ['address', 'العنوان التفصيلي', order.address],
    ['notes', 'ملاحظات التوصيل', order.notes]
  ].map(([key, label, value]) => `<div class="form-group"><label for="managed-${key}">${label}</label>${key === 'address' || key === 'notes' ? `<textarea id="managed-${key}" name="${key}" rows="2">${escapeHtml(value || '')}</textarea>` : `<input id="managed-${key}" name="${key}" value="${escapeHtml(value || '')}" ${key === 'customer_phone' ? 'inputmode="numeric" dir="ltr"' : ''} />`}</div>`).join('');
  const cancelBox = policy.can_request_cancel ? `<form class="track-request-box" onsubmit="submitCustomerRequest(event, 'cancel')"><h5>طلب إلغاء الطلب</h5><small>الإلغاء لا يتم بمجرد الضغط؛ يتم تسجيله للمراجعة، وخصوصاً لو الشحنة اتعملت على Bosta.</small><textarea name="reason" required minlength="5" maxlength="1000" placeholder="اكتب سبب الإلغاء — إجباري"></textarea><button type="submit" class="track-action-danger">إرسال طلب الإلغاء</button></form>` : '';
  const editBox = policy.can_request_edit ? `<form class="track-request-box" onsubmit="submitCustomerRequest(event, 'edit')"><h5>طلب تعديل بيانات التوصيل</h5><small>التعديل متاح لبيانات العميل والتوصيل فقط، وليس المنتجات أو السعر أو الكمية.</small>${editFields}<div class="form-group"><label for="managed-edit-reason">سبب التعديل <span aria-hidden="true">*</span></label><textarea id="managed-edit-reason" name="reason" required minlength="5" maxlength="1000" placeholder="اكتب سبب التعديل"></textarea></div><button type="submit" class="track-action-primary">إرسال طلب التعديل</button></form>` : '';
  result.innerHTML = `<div class="track-managed-card"><h4>تفاصيل الطلب #${escapeHtml(order.id)}</h4><div class="track-managed-item"><span>الحالة</span><strong style="${status.cls}">${status.icon} ${escapeHtml(order.status || 'جديد')}</strong></div><div class="track-managed-item"><span>العميل</span><strong>${escapeHtml(order.customer_name || '—')}</strong></div><div class="track-managed-item"><span>التواصل</span><strong dir="ltr">${escapeHtml(order.customer_phone || '—')}</strong></div><div class="track-managed-item"><span>العنوان</span><strong>${escapeHtml([order.governorate, order.area, order.address].filter(Boolean).join(' — ') || '—')}</strong></div><div class="track-managed-item"><span>الإجمالي</span><strong>${Number(order.total || 0).toLocaleString('ar-EG')} جنيه</strong></div>${order.bosta_tracking_number ? `<div class="track-managed-item"><span>رقم التتبع</span><strong dir="ltr">${escapeHtml(order.bosta_tracking_number)}</strong></div>` : ''}<div class="track-managed-items">${itemRows || '<span class="track-inline-message">تفاصيل المنتجات غير متاحة حالياً.</span>'}</div>${policy.message ? `<p class="track-inline-message">${escapeHtml(policy.message)}</p>` : ''}${requests ? `<div class="track-managed-items"><h5>طلباتك السابقة</h5>${requests}</div>` : ''}${cancelBox || editBox ? `<div class="track-management-grid">${cancelBox}${editBox}</div>` : ''}</div>`;
}

window.loadManagedOrder = async function() {
  const orderId = Number(Dom.trackOrderId?.value || 0);
  const accessToken = String(Dom.trackAccessToken?.value || '').trim();
  const result = Dom.trackManagedResult;
  if (!result) return;
  if (!Number.isInteger(orderId) || orderId <= 0 || accessToken.length < 16) {
    result.innerHTML = '<p class="track-inline-message error">اكتب رقم الطلب ورمز الإدارة بشكل صحيح.</p>';
    return;
  }
  const button = Dom.trackManageBtn;
  if (button) { button.disabled = true; button.textContent = 'جاري تحميل التفاصيل…'; }
  result.innerHTML = '<div class="spinner" style="width:28px;height:28px;border-width:3px;margin:1rem auto"></div>';
  try {
    const response = await fetch(managedOrderEndpoint(orderId, accessToken), { credentials: 'omit' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) throw new Error(data.error || 'تعذر التحقق من الطلب');
    saveOrderAccess(orderId, accessToken);
    window.currentManagedOrder = data;
    renderManagedOrder(data);
  } catch (error) {
    result.innerHTML = `<p class="track-inline-message error">${escapeHtml(error.message || 'رمز الإدارة غير صحيح أو الطلب غير موجود.')}</p>`;
  } finally {
    if (button) { button.disabled = false; button.textContent = 'عرض التفاصيل وإدارة الطلب'; }
  }
};

window.submitCustomerRequest = async function(event, requestType) {
  event.preventDefault();
  const form = event.currentTarget;
  const order = window.currentManagedOrder;
  const accessToken = String(Dom.trackAccessToken?.value || '').trim();
  if (!order || !accessToken) return;
  const formData = new FormData(form);
  const reason = String(formData.get('reason') || '').trim();
  if (reason.length < 5) {
    form.querySelector('[name="reason"]')?.focus();
    return;
  }
  const requestedChanges = {};
  if (requestType === 'edit') ['customer_name', 'customer_phone', 'governorate', 'area', 'address', 'notes'].forEach(key => { const value = String(formData.get(key) || '').trim(); if (value) requestedChanges[key] = key === 'customer_phone' ? normalizePhoneInput(value) : value; });
  const button = form.querySelector('button[type="submit"]');
  if (button) { button.disabled = true; button.textContent = 'جاري الإرسال…'; }
  try {
    const response = await fetch(`${ADMIN_BACKEND_URL}/api/bosta-track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', body: JSON.stringify({ order_id: order.id, access_token: accessToken, request_type: requestType, reason, requested_changes: requestedChanges }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'تعذر إرسال الطلب');
    await window.loadManagedOrder();
    const card = Dom.trackManagedResult?.querySelector('.track-managed-card');
    if (card) card.insertAdjacentHTML('afterbegin', '<p class="track-inline-message success">تم تسجيل طلبك وإرساله للإدارة للمراجعة.</p>');
  } catch (error) {
    const current = form.parentElement?.querySelector('.track-inline-message.error');
    if (current) current.textContent = error.message || 'تعذر إرسال الطلب حالياً.';
    else form.insertAdjacentHTML('afterend', `<p class="track-inline-message error">${escapeHtml(error.message || 'تعذر إرسال الطلب حالياً.')}</p>`);
  } finally {
    if (button) { button.disabled = false; button.textContent = requestType === 'cancel' ? 'إرسال طلب الإلغاء' : 'إرسال طلب التعديل'; }
  }
};

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
   POPULATE GOVERNORATES / BOSTA DISTRICTS
───────────────────────────────────────── */
function normalizePlace(value) {
  return String(value || '').trim().toLowerCase()
    .normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

function populateGovSelect() {
  if (!Dom.govSelect) return;
  Dom.govSelect.innerHTML =
    `<option value="">اختر المحافظة</option>` +
    EGYPT_GOVS.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
}

function populateAreaSelect() {
  const areaSelect = document.getElementById('area-select');
  const help = document.getElementById('area-help');
  if (!areaSelect || !Dom.govSelect) return;
  const governorate = normalizePlace(Dom.govSelect.value);
  const rows = bostaLocationRows.filter(row => [row.cityName, row.cityOtherName].some(value => normalizePlace(value) === governorate));
  areaSelect.innerHTML = rows.length
    ? `<option value="">اختر المنطقة / الحي</option>` + rows.map(row => `<option value="${escapeHtml(row.districtOtherName || row.districtName)}" data-district-id="${escapeHtml(row.districtId)}">${escapeHtml(row.districtOtherName || row.districtName)}</option>`).join('')
    : `<option value="">${governorate ? 'المحافظة غير متاحة للشحن حالياً' : 'اختار المحافظة الأول'}</option>`;
  areaSelect.disabled = !rows.length;
  if (help) help.textContent = rows.length ? 'اختار المنطقة كما هي ظاهرة في قائمة Bosta.' : 'لازم نختار منطقة مدعومة قبل تأكيد الطلب.';
}

async function loadBostaLocations() {
  const areaSelect = document.getElementById('area-select');
  const help = document.getElementById('area-help');
  if (!ADMIN_BACKEND_URL || !areaSelect) return [];
  if (!bostaLocationsPromise) {
    bostaLocationsPromise = fetch(`${ADMIN_BACKEND_URL}/api/bosta-locations`, { credentials: 'omit' })
      .then(response => { if (!response.ok) throw new Error('BOSTA_LOCATIONS_FAILED'); return response.json(); })
      .then(rows => { bostaLocationRows = Array.isArray(rows) ? rows : []; populateAreaSelect(); return bostaLocationRows; })
      .catch(error => { console.error('[bosta locations]', error); bostaLocationRows = []; areaSelect.disabled = true; if (help) help.textContent = 'تعذر تحميل مناطق الشحن؛ حاول تحديث الصفحة.'; return []; });
  }
  return bostaLocationsPromise;
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
  document.getElementById('area-select')?.addEventListener('change', () => {});
  Dom.govSelect?.addEventListener('change', () => { populateAreaSelect(); });
  loadBostaLocations();
  loadSettings();
  Supabase.select(TABLES.shipping_rates).then(rates => { window.liveShippingRates = rates || []; }).catch(console.error);
  loadProducts({ preserveModal: false });
  initProductGridEvents();
  initLandingCategoryEvents();
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
  const tables = [TABLES.products, TABLES.categories, TABLES.product_categories, TABLES.site_settings, TABLES.faqs, TABLES.socials].filter(Boolean);
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
