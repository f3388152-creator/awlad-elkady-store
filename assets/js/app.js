/**
 * ==========================================
 *  Awlad El-Kady — Main Application JS
 *  Pure Vanilla JS | Supabase REST API
 * ==========================================
 */

/* ─────────────────────────────────────────
   SUPABASE CLIENT (خفيف بدون مكتبة)
───────────────────────────────────────── */
const SupabaseClient = {
  _headers() {
    return {
      'Content-Type': 'application/json',
      'apikey':       SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
    };
  },

  async select(table, query = '') {
    const res = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/${table}?${query}&select=*`,
      { headers: this._headers() }
    );
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/${table}`,
      {
        method: 'POST',
        headers: { ...this._headers(), 'Prefer': 'return=minimal' },
        body: JSON.stringify(data)
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Insert error: ${err}`);
    }
    return true;
  }
};

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
    const data = await SupabaseClient.select('settings', 'id=eq.1');
    if (data && data.length > 0) {
      const settings = data[0];
      applyMarqueeTimer(settings);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function applyMarqueeTimer(settings) {
  const annBar = document.querySelector('.ann-bar');
  if (!annBar) return;
  
  // If behavior is timer, check the expiration date
  if (settings.marqueeBehavior === 'timer' && settings.marqueeEndDate) {
    const endDate = new Date(settings.marqueeEndDate).getTime();
    const now = new Date().getTime();
    if (now > endDate) {
      // Time is up, hide marquee
      annBar.style.display = 'none';
      if (document.body.contains(annBar)) {
        annBar.remove(); // Remove completely from DOM
      }
    }
  } else if (settings.marqueeBehavior === 'hidden') {
    annBar.style.display = 'none';
  }
}

/* ─────────────────────────────────────────
   PRODUCTS — Load from Supabase
───────────────────────────────────────── */
async function loadProducts() {
  if (!Dom.productGrid) return;
  Dom.productGrid.innerHTML = `
    <div class="products-loading">
      <div class="spinner"></div>
      <p>جاري تحميل المنتجات…</p>
    </div>`;

  try {
    const data = await SupabaseClient.select(
      TABLES.products,
      'order=created_at.desc&is_active=eq.true'
    );
    state.products = data;
    state.filteredProducts = data;
    renderProducts(data);
    buildFilters(data);
  } catch (err) {
    console.error(err);
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
    const hasDiscount = p.price_old && p.price_old > p.price_new;
    const discountPct = hasDiscount
      ? Math.round((1 - p.price_new / p.price_old) * 100)
      : 0;

    // Scarcity tags — assigned pseudo-randomly based on product index
    const scarcityPool = [
      { type: 'danger',     label: '🔥 متبقي 3 قطع فقط!' },
      { type: 'bestseller', label: '⭐ الأكثر مبيعاً' },
      { type: 'bestseller', label: '🏆 الأفضل تقييماً' },
      { type: 'danger',     label: '⚡ عرض محدود!' },
      null, null   // ~33% chance of no tag
    ];
    const scarcity = scarcityPool[(p.id % scarcityPool.length + idx) % scarcityPool.length];
    const scarcityHtml = scarcity
      ? `<span class="scarcity-tag ${scarcity.type}">${scarcity.label}</span>`
      : '';

    return `
    <article class="product-card reveal" data-id="${p.id}">
      <div class="product-img-wrap">
        <img
          src="${p.image_url || 'assets/images/placeholder.webp'}"
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
        ${p.spec ? `<p class="product-spec">${p.spec}</p>` : ''}
        <div class="product-pricing">
          <span class="price-new">${Number(p.price_new).toLocaleString('ar-EG')}</span>
          ${hasDiscount ? `<span class="price-old">${Number(p.price_old).toLocaleString('ar-EG')} جنيه</span>` : ''}
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
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || (p.spec && p.spec.toLowerCase().includes(query)));
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
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || (p.spec && p.spec.toLowerCase().includes(query)));
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

  const hasDiscount = product.price_old && product.price_old > product.price_new;
  const discountPct = hasDiscount ? Math.round((1 - product.price_new / product.price_old) * 100) : 0;

  document.getElementById('qv-img').src = product.image_url || 'assets/images/placeholder.webp';
  document.getElementById('qv-name').textContent = product.name;
  document.getElementById('qv-cat').textContent = product.category || '';
  document.getElementById('qv-spec').textContent = product.spec || '';
  document.getElementById('qv-desc').textContent = product.description || 'لا يوجد وصف متاح.';
  document.getElementById('qv-price-new').textContent = Number(product.price_new).toLocaleString('ar-EG');
  
  const oldPriceEl = document.getElementById('qv-price-old');
  const badgeEl = document.getElementById('qv-badge');
  
  if (hasDiscount) {
    oldPriceEl.textContent = `${Number(product.price_old).toLocaleString('ar-EG')} جنيه`;
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
  if (Dom.modalProdPrice) Dom.modalProdPrice.textContent = `${Number(product.price_new).toLocaleString('ar-EG')}`;
  if (Dom.modalProdImg) {
    Dom.modalProdImg.src = product.image_url || '';
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

  if (!name || !phone || !gov || !address) return;

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:22px;height:22px;border-width:3px;margin:0"></div> جاري الإرسال…`;

  try {
    await SupabaseClient.insert(TABLES.orders, {
      customer_name:    name,
      customer_phone:   phone,
      governorate:      gov,
      address:          address,
      product_id:       state.selectedProduct?.id,
      product_name:     state.selectedProduct?.name,
      product_price:    state.selectedProduct?.price_new,
      status:           'جديد',
      created_at:       new Date().toISOString()
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
  if (!phone) return;

  const result = Dom.trackResult;
  result.innerHTML = `<div class="spinner" style="width:28px;height:28px;border-width:3px;margin:1rem auto"></div>`;

  try {
    const orders = await SupabaseClient.select(
      TABLES.orders,
      `customer_phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=5`
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
    await SupabaseClient.insert(TABLES.complaints, {
      customer_name:    name,
      customer_phone:   phone,
      customer_address: address,
      message:          msg,
      status:           'جديد',
      created_at:       new Date().toISOString()
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
const TESTIMONIALS = [
  { name: 'نورهان السيد',   city: 'القاهرة',    text: 'الأدوات وصلت زي ما وصفوا بالظبط، جودة عالية وبسعر كويس جداً. هعيد الطلب تاني إن شاء الله!', stars: 5, letter: 'ن' },
  { name: 'محمد ابراهيم',  city: 'الإسكندرية', text: 'خدمة التوصيل سريعة جداً، استلمت الطلب في يومين بس. التغليف محترم والمنتج تمام 100%.', stars: 5, letter: 'م' },
  { name: 'سمية حسن',      city: 'الجيزة',      text: 'أخيراً لاقيت المنتجات اللي بدور عليها بجودة حقيقية مش تقليد. شكراً معرض أولاد القاضي!', stars: 5, letter: 'س' },
  { name: 'أحمد مصطفى',   city: 'المنصورة',    text: 'سعر الطاسة النحاس كان مناسب جداً مقارنة بالسوق. الأدوات أصلية وتشتغل بكفاءة ممتازة.', stars: 5, letter: 'أ' },
  { name: 'فاطمة علي',     city: 'أسيوط',       text: 'تعاملت معاهم أكتر من مرة وكل مرة أحسن من اللي قبلها. ربنا يوفقهم، ناس أمانة وأصحاب.', stars: 5, letter: 'ف' },
  { name: 'خالد رمضان',   city: 'سوهاج',       text: 'الكارت بتاع الضمان جاي مع المنتج، وفعلاً ردوا عليا لما عندي سؤال. خدمة عملاء ممتازة.', stars: 5, letter: 'خ' },
];

function renderTestimonials() {
  const track = Dom.sliderTrack;
  const dots  = Dom.sliderDots;
  if (!track) return;

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
});
