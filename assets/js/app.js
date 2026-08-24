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
const state = {
  products: [],
  filteredProducts: [],
  currentFilter: 'all',
  selectedProduct: null,
  sliderIndex: 0,
  sliderInterval: null
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
    const data = await Supabase.select(TABLES.site_settings, 'id=eq.1');
    if (data && data.length > 0) {
      const settings = data[0];
      window.siteSettings = settings;
      applySiteSettings(settings);
      applyMarqueeTimer(settings);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function applySiteSettings(settings) {
  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value != null) el.textContent = String(value);
  };
  const phone = settings.footer_phone || settings.whatsapp_number;
  if (phone) {
    document.querySelectorAll('a[href^="tel:"]').forEach(el => { el.href = `tel:${phone}`; });
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => { el.href = `https://wa.me/${String(phone).replace(/^0/, '20')}`; });
  }
  setText('.site-brand-name', settings.site_name || 'معرض أولاد القاضي للأدوات المنزلية');
  setText('.footer-brand-name', settings.site_name || 'معرض أولاد القاضي للأدوات المنزلية');
  setText('.contact-info p:first-of-type', settings.address);
  const setAttr = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute(attr, String(value));
  };
  setText('.nav-logo-text', settings.site_name);
  setText('.hero-title', settings.hero_title);
  setText('.marquee-content', settings.marquee_text);
  setAttr('.nav-logo-img-blend', 'src', settings.logo_header);
  setAttr('.footer-logo-blend', 'src', settings.logo_footer || settings.logo_header);
  setAttr('meta[name="description"]', 'content', settings.seo_description);
  setText('#year', new Date().getFullYear());
  if (settings.maintenance_mode) {
    const message = settings.maintenance_message || 'الموقع تحت الصيانة حاليًا.';
    document.body.innerHTML = `<main class="maintenance-state"><h1>${escapeHtml(message)}</h1></main>`;
  }
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
const CATALOG_PRODUCTS = [
  {name:'طقم أواني طهي استانلس 12 قطعة',price:150,sale_price:120,category:'أواني الطهي',images:[{url:'assets/images/catalog_02.png'}]},
  {name:'طقم أواني طهي استانلس 4 قطع',price:120,category:'أواني الطهي',images:[{url:'assets/images/catalog_03.jpeg'}]},
  {name:'طقم أواني طهي غير لاصق 24 قطعة',price:1200,sale_price:650,category:'أواني الطهي',images:[{url:'assets/images/catalog_04.jpeg'}]},
  {name:'طقم أواني طهي 25 قطعة',price:60,category:'أواني الطهي',images:[{url:'assets/images/catalog_05.jpeg'}]},
  {name:'طقم أواني طهي جرانيت 8 قطع',price:3000,sale_price:1500,category:'أواني الطهي',images:[{url:'assets/images/catalog_06.jpeg'}]},
  {name:'طقم أواني استانلس 12 قطعة',price:2900,category:'أواني الطهي',images:[{url:'assets/images/catalog_07.png'}]},
  {name:'طقم حلل استانلس بمقابض وأغطية 8 قطع',price:2600,sale_price:1400,category:'أواني الطهي',images:[{url:'assets/images/catalog_08.png'}]},
  {name:'طقم حلل استانلس تشكيلة منزلية',price:3500,sale_price:1800,category:'أواني الطهي',images:[{url:'assets/images/catalog_09.jpeg'}]},
  {name:'طقم أواني جرانيت متعدد القطع',price:3800,sale_price:1700,category:'أواني الطهي',images:[{url:'assets/images/catalog_10.jpeg'}]},
  {name:'طقم أواني استانلس للمطبخ العصري',price:3200,sale_price:1500,category:'أواني الطهي',images:[{url:'assets/images/catalog_11.jpeg'}]},
  {name:'منظم أدراج المطبخ',price:400,sale_price:180,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_12.jpeg'}]},
  {name:'منظم تخزين متعدد الاستخدام',price:425,sale_price:190,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_13.jpeg'}]},
  {name:'صندوق تخزين للمطبخ',price:450,sale_price:200,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_14.jpeg'}]},
  {name:'منظم أدوات المائدة',price:475,sale_price:210,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_15.jpeg'}]},
  {name:'منظم أجهزة المطبخ',price:500,sale_price:220,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_16.jpeg'}]},
  {name:'منظم منزلي عملي',price:525,sale_price:230,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_17.jpeg'}]},
  {name:'صندوق تخزين منزلي',price:550,sale_price:240,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_18.jpeg'}]},
  {name:'منظم مطبخ صغير',price:575,sale_price:250,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_19.png'}]},
  {name:'أدوات مطبخ للاحتياجات اليومية',price:600,sale_price:260,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_20.jpeg'}]},
  {name:'جهاز مطبخ صغير',price:625,sale_price:270,category:'التخزين والتنظيم',images:[{url:'assets/images/catalog_21.jpeg'}]},
  {name:'طقم سفرة فاخر 4 أفراد',price:4000,sale_price:2500,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_22.jpeg'}]},
  {name:'طقم سفرة فاخر 6 أفراد',price:5000,sale_price:3000,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_23.jpeg'}]},
  {name:'طقم سفرة فاخر 8 أفراد',price:6000,sale_price:3500,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_24.png'}]},
  {name:'طقم سفرة فاخر بتصميم عصري',price:7000,sale_price:4000,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_25.png'}]},
  {name:'طقم أطباق تقديم فاخر',price:8000,sale_price:4500,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_26.jpeg'}]},
  {name:'طقم ضيافة متكامل',price:9000,sale_price:5000,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_27.jpeg'}]},
  {name:'طقم سفرة مودرن',price:10000,sale_price:5500,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_02.png'}]},
  {name:'طقم أطباق بورسلين فاخر',price:11000,sale_price:6000,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_22.jpeg'}]},
  {name:'طقم تقديم للمناسبات',price:12000,sale_price:6500,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_23.jpeg'}]},
  {name:'طقم سفرة فاخر متكامل',price:13000,sale_price:7000,category:'السفرة والتقديم',images:[{url:'assets/images/catalog_24.png'}]}
  ];

  // أسعار العرض المعتمدة فقط هي التي تعرض Badge والسعر القديم.
  CATALOG_PRODUCTS.forEach((product, index) => {
    if (![0, 2, 4, 6, 7, 8, 9, 20, 21, 22, 23, 24, 25].includes(index)) delete product.sale_price;
  });

async function loadProducts() {
  if (!Dom.productGrid) return;
  Dom.productGrid.innerHTML = `
    <div class="products-loading">
      <div class="spinner"></div>
      <p>جاري تحميل المنتجات…</p>
    </div>`;

  try {
    const catalogProducts = CATALOG_PRODUCTS.map((p, index) => ({...p, id: `catalog-${index + 1}`, stock: 1, is_active: true}));
    const safeProducts = catalogProducts;
    state.products = safeProducts;
    state.filteredProducts = safeProducts;
    renderProducts(safeProducts);
    buildFilters(safeProducts);
  } catch (err) {
    const safeProducts = CATALOG_PRODUCTS.map((p, index) => ({...p, id: `catalog-${index + 1}`, stock: 1, is_active: true}));
    state.products = safeProducts;
    state.filteredProducts = safeProducts;
    renderProducts(safeProducts);
    buildFilters(safeProducts);
    return;
    Dom.productGrid.innerHTML = `
      <div class="products-error">
        <div style="font-size:2.5rem;margin-bottom:0.5rem">⚠️</div>
        <h3>لم نتمكن من تحميل المنتجات</h3>
        <p style="margin-top:0.4rem;font-size:0.85rem">تأكد من إعدادات Supabase في ملف config.js</p>
        <button onclick="loadProducts()" style="margin-top:1rem;padding:0.6rem 1.5rem;border-radius:99px;background:var(--clr-primary);color:#fff;font-weight:700;font-size:0.9rem;cursor:pointer;border:none">إعادة المحاولة</button>
      </div>`;
  }
}

function renderProducts(products) {
  if (!Dom.productGrid) return;

  if (!products.length) {
    Dom.productGrid.innerHTML = `<div class="products-error"><p>لا توجد منتجات في هذا القسم حالياً.</p></div>`;
    return;
  }

  Dom.productGrid.innerHTML = products.map((p, idx) => {
    const hasDiscount = Number(p.sale_price) > 0 && Number(p.price) > Number(p.sale_price);
    const discountPct = hasDiscount
      ? Math.round((1 - (p.sale_price / p.price)) * 100)
      : 0;

    const scarcityHtml = p.is_bestseller
      ? '<span class="scarcity-tag bestseller">⭐ الأكثر مبيعاً</span>'
      : '';

    return `
    <article class="product-card reveal" data-id="${p.id}">
      <div class="product-img-wrap">
        <img
          src="${p.images && p.images[0] ? p.images[0].url : 'assets/images/placeholder.webp'}"
          alt="${p.name}"
          loading="lazy"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23f0f4f1%22 width=%22200%22 height=%22200%22/><text y=%22.9em%22 font-size=%2290%22 x=%2250%25%22 text-anchor=%22middle%22>🏠</text></svg>'"
        />
        ${discountPct > 0 ? `<span class="product-badge">خصم ${discountPct}%</span>` : ''}
        ${scarcityHtml}
      </div>
      <div class="product-info">
        ${p.category ? `<span class="product-cat">${p.category}</span>` : ''}
        <h3 class="product-name">${p.name}</h3>
        ${p.description ? `<p class="product-spec">${p.description}</p>` : ''}
        <div class="product-pricing">
          <span class="price-new">${Number(p.sale_price || p.price || 0).toLocaleString('ar-EG')}</span>
          ${hasDiscount ? `<span class="price-old">${Number(p.price).toLocaleString('ar-EG')} جنيه</span>` : ''}
        </div>
        <div class="product-actions">
          <button
            class="btn-order"
            id="order-btn-${p.id}"
            onclick="openCheckout(${JSON.stringify(p).replace(/"/g, '&quot;')})"
          >🛒 اطلب الآن</button>
          <button
            class="btn-details"
            onclick="openQuickView(${JSON.stringify(p).replace(/"/g, '&quot;')})"
            aria-label="تفاصيل ${p.name}"
          >تفاصيل</button>
        </div>
      </div>
    </article>`;
  }).join('');

  initReveal();
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
  state.selectedProduct = product;

  // Product preview
  if (Dom.modalProdName)  Dom.modalProdName.textContent  = product.name;
  if (Dom.modalProdPrice) Dom.modalProdPrice.textContent = `${Number(product.sale_price || product.price || 0).toLocaleString('ar-EG')}`;
  if (Dom.modalProdImg) {
    Dom.modalProdImg.src = (product.images && product.images[0]) ? product.images[0].url : '';
    Dom.modalProdImg.alt = product.name;
  }

  // Restore form state
  if (Dom.modalContent) {
    Dom.modalContent.innerHTML = Dom.modalContent.dataset.origHtml || Dom.modalContent.innerHTML;
  }
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
  if (!state.selectedProduct?.id || Number(state.selectedProduct?.stock) < 1) {
    alert('المنتج غير متاح أو المخزون غير كافٍ.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:22px;height:22px;border-width:3px;margin:0"></div> جاري الإرسال…`;

  const subtotal = Number(state.selectedProduct?.sale_price || state.selectedProduct?.price || 0);
  const shippingFee = calculateShipping(gov, state.selectedProduct?.bosta_size, subtotal);
  const total = subtotal + shippingFee;

  try {
    const orderPayload = {
      customer_name: name,
      customer_phone: phone,
      governorate: gov,
      area: null,
      address,
      subtotal,
      shipping_fee: shippingFee,
      total,
      items: [{
        product_id: state.selectedProduct?.id,
        name: state.selectedProduct?.name,
        qty: 1,
        price: state.selectedProduct?.sale_price || state.selectedProduct?.price || 0,
        sku: state.selectedProduct?.sku
      }],
      status: 'جديد'
    };
    await Supabase.rpc('create_order_with_stock', {
      p_order: orderPayload,
      p_product_id: state.selectedProduct?.id,
      p_quantity: 1
    });

    // Success state
    const modalBox = document.querySelector('.modal-box');
    if (modalBox) {
      modalBox.innerHTML = `
        <button class="modal-close" onclick="closeCheckout()" title="إغلاق">✕</button>
        <div class="success-state">
          <div class="success-icon">✓</div>
          <h3>تم استلام طلبك! 🎉</h3>
          <p>شكراً <strong>${name}</strong>، طلبك في الطريق إليك.<br>سيتواصل معك فريقنا خلال وقت قصير لتأكيد الشحن.</p>
          <button onclick="closeCheckout()" style="margin-top:1rem;padding:0.7rem 2rem;border-radius:99px;background:var(--clr-primary);color:#fff;font-weight:700;font-size:0.95rem;cursor:pointer;border:none">رائع! شكراً</button>
        </div>`;
    }
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.innerHTML = '✓ تأكيد الطلب';
    alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
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
    const orders = await Supabase.select(
      TABLES.orders,
      `customer_phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=1`
    );

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
          <div style="font-weight:700;margin-bottom:0.2rem">${o.product_name || 'طلب'}</div>
          <div style="font-size:0.85rem;color:var(--clr-text-muted)">${date}</div>
          <div style="margin-top:0.4rem;font-weight:700;${s.cls}">${s.icon} ${o.status}</div>
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
   TESTIMONIALS SLIDER
───────────────────────────────────────── */
const TESTIMONIALS = [];

function renderTestimonials() {
  const track = Dom.sliderTrack;
  const dots  = Dom.sliderDots;
  if (!track) return;
  if (!TESTIMONIALS.length) {
    track.innerHTML = '<p class="empty-state">لا توجد تقييمات حقيقية متاحة حاليًا.</p>';
    if (dots) dots.innerHTML = '';
    return;
  }

  track.innerHTML = TESTIMONIALS.map(t => `
    <div class="testi-card">
      <div class="testi-stars">${'★'.repeat(t.stars)}</div>
      <p class="testi-text">"${t.text}"</p>
      <div class="testi-author">
        <div class="testi-avatar">${t.letter}</div>
        <div>
          <div class="testi-name">${t.name}</div>
          <div class="testi-city">${t.city}</div>
        </div>
      </div>
    </div>
  `).join('');

  if (dots) {
    dots.innerHTML = TESTIMONIALS.map((_, i) =>
      `<span class="slider-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})" aria-label="انتقال للشريحة ${i+1}"></span>`
    ).join('');
  }

  startSlider();
}

function goToSlide(index) {
  state.sliderIndex = index;
  const card   = Dom.sliderTrack.querySelector('.testi-card');
  const cardW  = card ? card.offsetWidth + 19 : 300;
  Dom.sliderTrack.style.transform = `translateX(${index * cardW}px)`;
  document.querySelectorAll('.slider-dot').forEach((d, i) =>
    d.classList.toggle('active', i === index)
  );
}

function startSlider() {
  clearInterval(state.sliderInterval);
  state.sliderInterval = setInterval(() => {
    state.sliderIndex = (state.sliderIndex + 1) % TESTIMONIALS.length;
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
  populateGovSelect();
  loadSettings();
  Supabase.select(TABLES.shipping_rates).then(rates => { window.liveShippingRates = rates || []; }).catch(console.error);
  loadProducts();
  renderTestimonials();
  initReveal();
  initModalBackdrops();
  initForms();
  initKeyboard();
  initHeroBtn();

  // Complaint form binding
  document.getElementById('complaint-form')?.addEventListener('submit', submitComplaint);

  // Close complaint modal on backdrop/keyboard
  document.getElementById('complaint-modal')?.addEventListener('click', e => {
    if (e.target.id === 'complaint-modal') closeComplaint();
  });

  /* ─── Landing Page Polling (every 20s) ────────────────────────
     تتحقق كل 20 ثانية من منتجات جديدة/مُعدّلة.
     تتوقف تلقائياً لو فيه modal مفتوحة (لو الزبون بيكمل طلب).
  ────────────────────────────────────────────────────────────── */
  setInterval(async () => {
    const anyModalOpen = document.querySelector(
      '#checkout-modal.open, #quickview-modal.open, #track-modal.open, #complaint-modal.open'
    );
    if (anyModalOpen) return;
    try {
      const fresh = await Supabase.select(
        TABLES.products,
        'order=created_at.desc&is_active=eq.true'
      );
      // Only re-render if data actually changed (simple length + first id check)
      if (
        fresh.length !== state.products.length ||
        (fresh[0]?.id !== state.products[0]?.id)
      ) {
        state.products = fresh;
        filterProducts(state.currentFilter, null);
        buildFilters(fresh);
      }
    } catch { /* silent – no network noise */ }
  }, 20000);
});
