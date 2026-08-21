/**
 * AWLAD EL-KADY — Landing Page Main Script
 * Dynamic Product Rendering, Checkout Modal, Form Validation & Bosta API Payload
 * ES6+ | Vanilla JS | Ready for Admin Dashboard & API Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const API_BASE = '/api';

  /* ==========================================================================
     1. STATE & DATA
     ========================================================================== */

  const GOVERNORATES = [
    { name: 'القاهرة', shippingFee: 50 },
    { name: 'الجيزة', shippingFee: 50 },
    { name: 'الإسكندرية', shippingFee: 65 },
    { name: 'القليوبية', shippingFee: 60 },
    { name: 'الدقهلية', shippingFee: 65 },
    { name: 'الغربية', shippingFee: 65 },
    { name: 'الشرقية', shippingFee: 65 },
    { name: 'المنوفية', shippingFee: 65 },
    { name: 'البحيرة', shippingFee: 70 },
    { name: 'كفر الشيخ', shippingFee: 70 },
    { name: 'دمياط', shippingFee: 70 },
    { name: 'بورسعيد', shippingFee: 75 },
    { name: 'الإسماعيلية', shippingFee: 75 },
    { name: 'السويس', shippingFee: 75 },
    { name: 'الفيوم', shippingFee: 75 },
    { name: 'بني سويف', shippingFee: 75 },
    { name: 'المنيا', shippingFee: 85 },
    { name: 'أسيوط', shippingFee: 85 },
    { name: 'سوهاج', shippingFee: 90 },
    { name: 'قنا', shippingFee: 95 },
    { name: 'الأقصر', shippingFee: 100 },
    { name: 'أسوان', shippingFee: 100 }
  ];

  const SHIPPING_WEIGHT_FIELD_MAP = {
    small_medium: 'size_small_medium',
    l: 'size_l',
    xl: 'size_xl',
    xxl: 'size_xxl',
    large: 'size_large',
    huge: 'size_huge'
  };

  const PRODUCT_CATEGORY_LABELS = {
    'kitchen-tools': 'أدوات مطبخ',
    'storage-organization': 'تنظيم وتخزين',
    furniture: 'أثاث'
  };

  /**
   * MOCK_PRODUCTS — يُستبدل بـ API call من لوحة التحكم
   * Categories: electrical | kitchen-tools | serving-sets | kitchen-extras
   */
  const MOCK_PRODUCTS = [];

  let activeOrderState = {
    productId: null,
    title: '',
    price: 0,
    imageSrc: '',
    quantity: 1,
    shippingFee: 50
  };

  const LANDING_CACHE = {
    config: null,
    products: [],
    categories: [],
    shippingRates: [],
    reviews: [],
    hero: null,
    announcement: null,
    cms: null,
    contact: null,
    platform: null,
    hydrated: false
  };

  async function fetchLandingConfig() {
    if (LANDING_CACHE.config) return LANDING_CACHE.config;

    try {
      const response = await fetch('/api/config');
      const payload = await response.json();
      LANDING_CACHE.config = payload;
      return payload;
    } catch (error) {
      console.warn('Could not load landing config', error);
      LANDING_CACHE.config = {};
      return {};
    }
  }

  async function supabaseSelect(table, select = '*') {
    const config = await fetchLandingConfig();
    const supabaseUrl = config.supabaseUrl || '';
    const supabaseAnonKey = config.supabaseAnonKey || '';
    if (!supabaseUrl || !supabaseAnonKey) return [];

    const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}`);
    url.searchParams.set('select', select);

    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Database select failed for ${table}`);
    }

    return response.json();
  }

  async function hydrateLandingData() {
    if (LANDING_CACHE.hydrated) return LANDING_CACHE;

    try {
      const [products, settings, shippingRates] = await Promise.all([
        supabaseSelect('products'),
        supabaseSelect('site_settings'),
        supabaseSelect('shipping_rates')
      ]);

      LANDING_CACHE.products = Array.isArray(products) ? products : [];
      LANDING_CACHE.settings = Array.isArray(settings) ? (settings[0] || {}) : {};
      LANDING_CACHE.shippingRates = Array.isArray(shippingRates) ? shippingRates : [];
      LANDING_CACHE.siteSettings = LANDING_CACHE.settings;
      LANDING_CACHE.hero = {
        title: LANDING_CACHE.settings.hero_title || '',
        subtitle: LANDING_CACHE.settings.hero_subtitle || '',
        image_url: LANDING_CACHE.settings.hero_image_url || '',
        contact_phone: LANDING_CACHE.settings.contact_phone || '',
        contact_whatsapp: LANDING_CACHE.settings.contact_whatsapp || ''
      };
      LANDING_CACHE.reviews = [];
      LANDING_CACHE.announcement = null;
      LANDING_CACHE.contact = {
        phone: LANDING_CACHE.settings.contact_phone || '',
        whatsapp: LANDING_CACHE.settings.contact_whatsapp || ''
      };
      LANDING_CACHE.platform = null;
      LANDING_CACHE.categories = buildProductCategories(LANDING_CACHE.products);

      LANDING_CACHE.hydrated = true;
    } catch (error) {
      console.warn('Could not hydrate landing data from the database', error);
      LANDING_CACHE.hydrated = true;
    }

    return LANDING_CACHE;
  };

  function normalizeCategory(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'kitchen-tools';
    const aliases = {
      kitchen: 'kitchen-tools',
      kitchen_tools: 'kitchen-tools',
      'kitchen-tools': 'kitchen-tools',
      'أدوات مطبخ': 'kitchen-tools',
      storage: 'storage-organization',
      storage_organization: 'storage-organization',
      'storage-organization': 'storage-organization',
      'تنظيم وتخزين': 'storage-organization',
      furniture: 'furniture',
      'أثاث': 'furniture'
    };
    return aliases[raw] || raw;
  }

  function buildProductCategories(products) {
    const seen = new Map();
    (Array.isArray(products) ? products : []).forEach((product) => {
      const category = normalizeCategory(product.category || product.category_name || '');
      if (!seen.has(category)) {
        seen.set(category, PRODUCT_CATEGORY_LABELS[category] || product.categoryName || category);
      }
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }

  function renderCategoryFilters(products = []) {
    const filterTabs = document.querySelector('.filter-tabs');
    if (!filterTabs) return;

    const categories = buildProductCategories(products);
    filterTabs.innerHTML = [
      '<button class="filter-btn active" data-filter="all">الكل</button>',
      ...categories.map((category) => `<button class="filter-btn" data-filter="${category.value}">${category.label}</button>`)
    ].join('');
  }

  /* ==========================================================================
     2. DOM CACHING
     ========================================================================== */
  const navbar = document.querySelector('.navbar');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const checkoutModal = document.getElementById('checkoutModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const checkoutForm = document.getElementById('checkoutForm');
  const governorateSelect = document.getElementById('governorateSelect');
  const toastContainer = document.getElementById('toastContainer');
  const reviewsSlider = document.getElementById('reviewsSlider');
  const reviewsPrevBtn = document.getElementById('reviewsPrev');
  const reviewsNextBtn = document.getElementById('reviewsNext');
  const trackingForm = document.getElementById('trackingForm');
  const trackingResult = document.getElementById('trackingResult');

  const modalProdTitle = document.getElementById('modalProdTitle');
  const modalProdPrice = document.getElementById('modalProdPrice');
  const modalProdImg = document.getElementById('modalProdImg');
  const modalQtyNum = document.getElementById('modalQtyNum');
  const btnDecreaseQty = document.getElementById('btnDecreaseQty');
  const btnIncreaseQty = document.getElementById('btnIncreaseQty');
  const costSubtotal = document.getElementById('costSubtotal');
  const costShipping = document.getElementById('costShipping');
  const costTotal = document.getElementById('costTotal');

  let scrollObserverInstance = null;

  /* ==========================================================================
     3. DYNAMIC PRODUCT RENDERING ENGINE
     ========================================================================== */
  /**
   * Renders product cards into #productsGrid dynamically.
   * Pass an empty array [] to show the awaiting-API empty state.
   * @param {Array} products
   */
  const getLandingReviews = () => Array.isArray(LANDING_CACHE.reviews) ? LANDING_CACHE.reviews : [];

  const renderReviews = () => {
    if (!reviewsSlider) return;

    const reviews = getLandingReviews();
    reviewsSlider.innerHTML = reviews.map((review) => `
      <article class="review-card reveal-on-scroll" data-review-id="${review.id}">
        <div class="review-header">
          <div class="review-avatar">${(review.name || 'م').charAt(0)}</div>
          <div class="review-info">
            <div class="review-name-row">
              <span class="review-name">${review.name || 'عميل'}</span>
              ${review.verified ? '<span class="verified-badge">✓ مشتري مؤكد</span>' : ''}
            </div>
            <span class="review-city">${review.city || 'القاهرة'}</span>
          </div>
        </div>
        <div class="review-stars">${'★'.repeat(review.rating || 5)}</div>
        <p class="review-text">"${review.text || ''}"</p>
      </article>
    `).join('');

    let currentReviewIndex = 0;
    const cards = reviewsSlider.querySelectorAll('.review-card');

    const moveReviews = () => {
      if (!cards.length) return;
      const firstCard = cards[0];
      const gap = 16;
      const cardWidth = firstCard.getBoundingClientRect().width + gap;
      reviewsSlider.style.transform = `translateX(${-currentReviewIndex * cardWidth}px)`;
    };

    if (reviewsPrevBtn) {
      reviewsPrevBtn.onclick = () => {
        currentReviewIndex = Math.max(0, currentReviewIndex - 1);
        moveReviews();
      };
    }

    if (reviewsNextBtn) {
      reviewsNextBtn.onclick = () => {
        currentReviewIndex = Math.min(cards.length - 1, currentReviewIndex + 1);
        moveReviews();
      };
    }

    window.addEventListener('resize', moveReviews);
    moveReviews();
  };

  const renderProducts = (products = []) => {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    if (!products || !Array.isArray(products) || products.length === 0) {
      productsGrid.innerHTML = `
        <div class="empty-products-notice">
          <div class="empty-icon">📦</div>
          <h3>لا توجد منتجات معروضة حالياً</h3>
          <p>جاري ربط لوحة التحكم وتحميل أحدث العروض والمنتجات المتاحة... ⏳</p>
        </div>
      `;
      return;
    }

    renderCategoryFilters(products);

    const cardsHtml = products.map((item, index) => {
      const delayClass = `delay-${(index % 4) + 1}`;
      const normalizedCategory = normalizeCategory(item.category || item.category_name || '');
      const categoryLabel = PRODUCT_CATEGORY_LABELS[normalizedCategory] || item.categoryName || normalizedCategory;
      const imageMarkup = item.isSvg && item.svgContent
        ? item.svgContent
        : `<img src="${item.image_url || 'assets/air-fryer.png'}" alt="${item.title}" class="product-image" loading="lazy">`;

      const featuresMarkup = (item.features || [])
        .map(feat => `<li>${feat}</li>`)
        .join('');

      const discountBadge = item.discount
        ? `<span class="badge badge-discount">خصم ${item.discount}%</span>`
        : '';
      const originalPriceMarkup = item.original_price
        ? `<span class="product-price-original">${item.original_price.toLocaleString('ar-EG')} ج.م</span>`
        : '';
      const specLine = item.description
        ? `<p class="product-spec-line">${item.description}</p>`
        : '';

      return `
        <article class="product-card reveal-on-scroll ${delayClass}"
                 data-id="${item.id}"
                 data-category="${normalizedCategory}"
                 data-title="${item.title}"
                 data-price="${item.price}">
          <div class="product-badge-group">
            ${discountBadge}
            <span class="badge badge-stock">متوفر</span>
          </div>
          <div class="product-image-box">
            ${imageMarkup}
          </div>
          <div class="product-details">
            <span class="product-category">${categoryLabel || 'أجهزة منزلية'}</span>
            <h3 class="product-name">${item.title}</h3>
            ${specLine}
            <div class="product-rating">
              ★★★★★ <span class="product-rating-count">(${item.rating || '5.0'} / 5.0 — ${item.ratingCount || 50} تقييم)</span>
            </div>
            <ul class="product-features-mini">
              ${featuresMarkup}
            </ul>
            <div class="product-card-footer">
              <div class="product-price-box">
                <span class="product-price-current">${item.price.toLocaleString('ar-EG')} <small class="product-price-currency">ج.م</small></span>
                ${originalPriceMarkup}
              </div>
              <button class="product-order-btn js-trigger-checkout">
                اطلب الآن
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    productsGrid.innerHTML = cardsHtml;
    bindOrderButtons();
    reobserveScrollElements();
  };

  // Public hooks used by the admin dashboard and API
  window.renderProducts = renderProducts;
  window.updateProductsList = (newProducts) => {
    renderCategoryFilters(newProducts);
    renderProducts(newProducts);
  };
  window.MOCK_PRODUCTS_CATALOG = MOCK_PRODUCTS;

  /* ==========================================================================
     4. SCROLL ANIMATIONS (Intersection Observer)
     ========================================================================== */
  const initScrollAnimations = () => {
    scrollObserverInstance = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.12 });

    reobserveScrollElements();
  };

  const reobserveScrollElements = () => {
    if (!scrollObserverInstance) return;
    document.querySelectorAll('.reveal-on-scroll:not(.is-visible)')
      .forEach(el => scrollObserverInstance.observe(el));
  };

  /* ==========================================================================
     5. NAVBAR & MOBILE MENU
     ========================================================================== */
  const initNavbarControls = () => {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });

    if (mobileMenuToggle && mobileDrawer) {
      mobileMenuToggle.addEventListener('click', () => {
        mobileDrawer.classList.toggle('open');
      });
      mobileDrawer.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => mobileDrawer.classList.remove('open'));
      });
    }
  };

  /* ==========================================================================
     6. PRODUCT CATEGORY FILTERING
     ========================================================================== */
  const initProductFilters = () => {
    const tabs = document.querySelector('.filter-tabs');
    if (!tabs) return;

    tabs.addEventListener('click', (event) => {
      const btn = event.target.closest('.filter-btn');
      if (!btn) return;

      const filterCategory = btn.dataset.filter;
      tabs.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.product-card').forEach((card) => {
        const match = filterCategory === 'all' || card.dataset.category === filterCategory;
        if (match) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => { card.style.display = 'none'; }, 250);
        }
      });
    });
  };

  /* ==========================================================================
     7. CHECKOUT MODAL
     ========================================================================== */
  function normalizeWeight(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (['small', 'sm', 'small_medium', 'medium', 's/m', 'small-medium'].includes(raw)) return 'small_medium';
    if (raw === 'l') return 'l';
    if (raw === 'xl') return 'xl';
    if (raw === 'xxl') return 'xxl';
    if (['large', 'big', 'kebira', 'كبيرة'].includes(raw)) return 'large';
    if (['huge', 'massive', 'damha', 'ضخمة'].includes(raw)) return 'huge';
    return 'small_medium';
  }

  function parseGovernorates(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    const raw = String(value).trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item).trim()).filter(Boolean)
        : [raw];
    } catch {
      return raw.split(/[,،\n]/).map((item) => String(item).trim()).filter(Boolean);
    }
  }

  function findShippingRateForGovernorate(governorate) {
    const target = String(governorate || '').trim().toLowerCase();
    const rows = Array.isArray(LANDING_CACHE.shippingRates) ? LANDING_CACHE.shippingRates : [];
    if (!target) return rows[0] || null;
    return rows.find((rate) =>
      parseGovernorates(rate.governorates).some((item) => item.toLowerCase() === target)
    ) || rows[0] || null;
  }

  function getShippingFeeForSelection(governorate, shippingSize) {
    const rate = findShippingRateForGovernorate(governorate);
    const field = SHIPPING_WEIGHT_FIELD_MAP[normalizeWeight(shippingSize)] || SHIPPING_WEIGHT_FIELD_MAP.small_medium;
    const fee = Number(rate?.[field] || 0);
    if (fee > 0) return fee;
    return Number(GOVERNORATES.find((gov) => gov.name === governorate)?.shippingFee || 0);
  }
  const populateGovernorates = (shippingSize = 'small_medium') => {
    if (!governorateSelect) return;
    governorateSelect.innerHTML = '<option value="" disabled selected>اختر المحافظة للتوصيل</option>';
    GOVERNORATES.forEach(gov => {
      const opt = document.createElement('option');
      opt.value = gov.name;
      const fee = getShippingFeeForSelection(gov.name, shippingSize);
      opt.dataset.fee = fee;
      opt.textContent = `${gov.name} (شحن: ${fee} ج.م)`;
      governorateSelect.appendChild(opt);
    });
  };

  const updateModalTotals = () => {
    const subtotal = activeOrderState.price * activeOrderState.quantity;
    const selectedGovernorate = governorateSelect?.value || activeOrderState.governorate || GOVERNORATES[0]?.name || '';
    const shippingFee = getShippingFeeForSelection(selectedGovernorate, activeOrderState.shippingSize);
    activeOrderState.governorate = selectedGovernorate;
    activeOrderState.shippingFee = shippingFee;
    const total = subtotal + shippingFee;
    modalQtyNum.textContent = activeOrderState.quantity;
    costSubtotal.textContent = `${subtotal.toLocaleString('ar-EG')} ج.م`;
    costShipping.textContent = `${shippingFee.toLocaleString('ar-EG')} ج.م`;
    costTotal.textContent = `${total.toLocaleString('ar-EG')} ج.م`;
  };

  const openCheckoutModal = (productCard) => {
    const imgEl = productCard.querySelector('.product-image');
    const img = imgEl && imgEl.tagName === 'IMG' ? imgEl.src : 'assets/air-fryer.png';

    activeOrderState = {
      productId: productCard.dataset.id,
      title: productCard.dataset.title,
      price: parseFloat(productCard.dataset.price),
      imageSrc: img,
      quantity: 1,
      shippingSize: (LANDING_CACHE.products || []).find((row) => String(row.id) === String(productCard.dataset.id))?.bosta_weight || 'small_medium',
      governorate: governorateSelect?.value || GOVERNORATES[0]?.name || '',
      shippingFee: 0
    };

    populateGovernorates(activeOrderState.shippingSize);
    if (governorateSelect && !governorateSelect.value) {
      governorateSelect.value = GOVERNORATES[0]?.name || '';
    }

    modalProdTitle.textContent = activeOrderState.title;
    modalProdPrice.textContent = `${activeOrderState.price.toLocaleString('ar-EG')} ج.م`;
    modalProdImg.src = img;
    modalProdImg.alt = activeOrderState.title;

    updateModalTotals();
    clearFormErrors();
    checkoutModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeCheckoutModal = () => {
    checkoutModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  const bindOrderButtons = () => {
    document.querySelectorAll('.product-order-btn, .js-trigger-checkout').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const card = btn.closest('.product-card');
        if (card) openCheckoutModal(card);
      };
    });
  };

  const initModalEvents = () => {
    bindOrderButtons();
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeCheckoutModal);
    if (checkoutModal) {
      checkoutModal.addEventListener('click', (e) => {
        if (e.target === checkoutModal) closeCheckoutModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && checkoutModal.classList.contains('active')) closeCheckoutModal();
    });
    if (btnIncreaseQty) btnIncreaseQty.addEventListener('click', () => {
      activeOrderState.quantity += 1;
      updateModalTotals();
    });
    if (btnDecreaseQty) btnDecreaseQty.addEventListener('click', () => {
      if (activeOrderState.quantity > 1) {
        activeOrderState.quantity -= 1;
        updateModalTotals();
      }
    });
    if (governorateSelect) {
      governorateSelect.addEventListener('change', () => {
        updateModalTotals();
      });
    }
  };

  /* ==========================================================================
     8. FORM VALIDATION & BOSTA API PAYLOAD
     ========================================================================== */
  const clearFormErrors = () => {
    checkoutForm.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('has-error');
      const input = group.querySelector('.form-control');
      if (input) input.classList.remove('error');
    });
  };

  const showInputError = (el, msg) => {
    const group = el.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    el.classList.add('error');
    const errEl = group.querySelector('.error-text');
    if (errEl && msg) errEl.textContent = msg;
  };

  const validateCheckoutForm = () => {
    clearFormErrors();
    let isValid = true;
    let firstErr = null;

    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const altPhoneInput = document.getElementById('altPhone');
    const addressInput = document.getElementById('address');
    const egPhoneRegex = /^01[0125][0-9]{8}$/;

    if (fullNameInput.value.trim().length < 5) {
      showInputError(fullNameInput, 'الرجاء إدخال الاسم الثلاثي بالكامل');
      isValid = false; firstErr = firstErr || fullNameInput;
    }
    if (!egPhoneRegex.test(phoneInput.value.trim())) {
      showInputError(phoneInput, 'رقم التليفون غير صحيح (11 رقم — مثال: 01012345678)');
      isValid = false; firstErr = firstErr || phoneInput;
    }
    const altVal = altPhoneInput.value.trim();
    if (altVal && !egPhoneRegex.test(altVal)) {
      showInputError(altPhoneInput, 'رقم التليفون الإضافي غير صحيح');
      isValid = false; firstErr = firstErr || altPhoneInput;
    }
    if (!governorateSelect.value) {
      showInputError(governorateSelect, 'الرجاء اختيار المحافظة');
      isValid = false; firstErr = firstErr || governorateSelect;
    }
    if (addressInput.value.trim().length < 10) {
      showInputError(addressInput, 'الرجاء إدخال العنوان بالتفصيل');
      isValid = false; firstErr = firstErr || addressInput;
    }

    if (!isValid && firstErr) firstErr.focus();
    return isValid;
  };

  const handleFormSubmission = (e) => {
    e.preventDefault();
    if (!validateCheckoutForm()) return;

    const formData = new FormData(checkoutForm);
    const currentShippingSize = (LANDING_CACHE.products || []).find((row) => String(row.id) === String(activeOrderState.productId))?.bosta_weight || activeOrderState.shippingSize || 'small_medium';
    const shippingFee = getShippingFeeForSelection(formData.get('governorate'), currentShippingSize);
    activeOrderState.shippingSize = currentShippingSize;
    activeOrderState.shippingFee = shippingFee;
    const bostaApiPayload = {
      orderId: `KADY-${Date.now().toString().slice(-6)}`,
      orderNumber: `KADY-${Date.now().toString().slice(-6)}`,
      customer: {
        name: formData.get('fullName').trim(),
        phone: formData.get('phone').trim(),
        altPhone: formData.get('altPhone')?.trim() || null,
        city: formData.get('governorate'),
        address: formData.get('address').trim(),
        notes: formData.get('notes')?.trim() || ''
      },
      itemDetails: {
        productId: activeOrderState.productId,
        productTitle: activeOrderState.title,
        unitPrice: activeOrderState.price,
        quantity: activeOrderState.quantity,
        subtotal: activeOrderState.price * activeOrderState.quantity,
        shippingFee,
        totalCODAmount: (activeOrderState.price * activeOrderState.quantity) + shippingFee
      },
      shippingCarrier: 'Bosta Express',
      paymentType: 'COD',
      createdAt: new Date().toISOString()
    };

    fetch(`${API_BASE}/bosta-create-label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: bostaApiPayload.customer.name,
          phone: bostaApiPayload.customer.phone,
          altPhone: bostaApiPayload.customer.altPhone,
          governorate: bostaApiPayload.customer.city,
          address: bostaApiPayload.customer.address,
          notes: bostaApiPayload.customer.notes
        },
        order: {
          productId: activeOrderState.productId,
          productTitle: activeOrderState.title,
          quantity: activeOrderState.quantity,
          unitPrice: activeOrderState.price,
          subtotal: activeOrderState.price * activeOrderState.quantity,
          shippingSize: currentShippingSize,
          shippingFee
        },
        shippingSize: currentShippingSize,
        governorate: bostaApiPayload.customer.city,
        orderNumber: bostaApiPayload.orderNumber,
        persistOrder: true
      })
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'فشل إرسال الطلب');
        }
        closeCheckoutModal();
        checkoutForm.reset();
        showToast(`تم تأكيد طلبك بنجاح يا ${bostaApiPayload.customer.name}، وهنتواصل معاك في أقرب وقت لتسليم الشحنة.`);
      })
      .catch((error) => {
        console.error('Order submission failed:', error);
        showToast(error.message || 'فشل إرسال الطلب');
      });
  };

  /* ==========================================================================
     9. TOAST SYSTEM
     ========================================================================== */
  const showToast = (message, duration = 5000) => {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">✓</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  };

  const TRACKING_STATUS_LABELS = {
    label_created: 'تم إنشاء البوليصة',
    pending: 'قيد الانتظار',
    created: 'تم إنشاء الطلب',
    confirmed: 'تم تأكيد الطلب',
    processing: 'جاري التجهيز',
    picked_up: 'تم استلام الشحنة',
    in_transit: 'جاري التوصيل',
    out_for_delivery: 'خرجت للتوصيل',
    delivered: 'تم التوصيل',
    completed: 'تم التوصيل',
    returned: 'مرتجع',
    return: 'مرتجع',
    cancelled: 'تم الإلغاء',
    failed: 'تعذر التوصيل',
    updated: 'تم تحديث الحالة'
  };

  const getTrackingStatusLabel = (status) => {
    const key = String(status || 'pending').trim().toLowerCase().replace(/[ -]/g, '_');
    return TRACKING_STATUS_LABELS[key] || 'قيد المتابعة';
  };

  const renderTrackingResult = (payload) => {
    if (!trackingResult) return;
    if (!payload || !payload.found || !payload.tracking) {
      trackingResult.className = 'tracking-result empty';
      trackingResult.innerHTML = `
        <h3>لم يتم العثور على الطلب</h3>
        <p>راجع رقم الموبايل أو رقم الأوردر وجرب مرة ثانية.</p>
      `;
      return;
    }

    const tracking = payload.tracking;
    const statusLabel = getTrackingStatusLabel(tracking.status);
    const waybill = tracking.bosta_tracking_number || '';
    trackingResult.className = 'tracking-result has-data';
    trackingResult.innerHTML = `
      <div class="tracking-result-header">
        <div>
          <span class="tracking-kicker">تفاصيل الشحنة</span>
          <h3>نتيجة تتبع طلبك</h3>
        </div>
        <span class="tracking-status tracking-status-${String(tracking.status || 'pending').toLowerCase().replace(/[^a-z0-9_-]/g, '')}">${statusLabel}</span>
      </div>
      <div class="tracking-details-grid">
        <div class="tracking-detail"><span>اسم العميل</span><strong>${tracking.customer_name || 'عميل'}</strong></div>
        <div class="tracking-detail"><span>المحافظة</span><strong>${tracking.governorate || 'غير محددة'}</strong></div>
        <div class="tracking-detail"><span>رقم الطلب</span><strong>${tracking.order_number || 'غير متاح'}</strong></div>
        <div class="tracking-detail"><span>رقم البوليصة</span><strong>${waybill || 'غير متاح'}</strong></div>
      </div>
    `;
  };

  async function handleTrackingLookup(event) {
    event.preventDefault();
    if (!trackingForm || !trackingResult) return;

    const data = new FormData(trackingForm);
    const query = String(data.get('query') || '').trim();
    if (!query) return;

    trackingResult.className = 'tracking-result';
    trackingResult.innerHTML = `
      <h3>جارٍ البحث...</h3>
      <p>بنراجع البيانات مع Supabase دلوقتي.</p>
    `;

    try {
      const response = await fetch(`${API_BASE}/order-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: query,
          orderNumber: query,
          trackingNumber: query
        })
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'تعذر جلب بيانات التتبع');
      }

      renderTrackingResult(result);
      if (result.found && result.tracking?.customer_name) {
        showToast(`تم إظهار حالة الطلب للعميل ${result.tracking.customer_name}`);
      }
    } catch (error) {
      renderTrackingResult({ found: false });
      showToast(error.message || 'فشل التتبع');
    }
  }

  const syncWithAdminDB = () => {
    return (async () => {
      try {
        await hydrateLandingData();
        const db = LANDING_CACHE;

        if (db.hero) {
          const prefix = document.querySelector('.brand-prefix');
          const mainHighlight = document.querySelector('.brand-main-highlight');
          const suffix = document.querySelector('.brand-suffix');
          const desc = document.querySelector('.hero-description');
          const img = document.querySelector('.hero-img');

          if (prefix && (db.hero.prefix || db.hero.title)) prefix.textContent = db.hero.prefix || '';
          if (mainHighlight && (db.hero.mainTitle || db.hero.title)) mainHighlight.textContent = db.hero.mainTitle || db.hero.title || '';
          if (suffix && (db.hero.suffix || db.hero.subtitle)) suffix.textContent = db.hero.suffix || db.hero.subtitle || '';
          if (desc && (db.hero.subtext || db.hero.subtitle)) desc.textContent = db.hero.subtext || db.hero.subtitle || '';

          const heroBtns = document.querySelectorAll('.hero-cta-group .btn');
          if (heroBtns[0] && (db.hero.cta1 || db.hero.cta_primary)) heroBtns[0].textContent = db.hero.cta1 || db.hero.cta_primary;
          if (heroBtns[1] && (db.hero.cta2 || db.hero.cta_secondary)) heroBtns[1].textContent = db.hero.cta2 || db.hero.cta_secondary;
          if (img && (db.hero.img || db.hero.image_url)) img.src = db.hero.img || db.hero.image_url;
        }

        if (db.announcement && db.announcement.active) {
          let annBar = document.getElementById('topAnnouncementBar');
          if (!annBar) {
            annBar = document.createElement('div');
            annBar.id = 'topAnnouncementBar';
            annBar.style.padding = '0.5rem';
            annBar.style.textAlign = 'center';
            annBar.style.fontSize = '0.95rem';
            annBar.style.fontWeight = 'bold';
            annBar.style.zIndex = '9999';
            annBar.style.position = 'relative';
            document.body.insertBefore(annBar, document.body.firstChild);
          }
          annBar.textContent = db.announcement.text || '';
          annBar.style.backgroundColor = db.announcement.bgColor || '#2C3E50';
          annBar.style.color = db.announcement.textColor || '#FFFFFF';
        } else {
          const annBar = document.getElementById('topAnnouncementBar');
          if (annBar) annBar.remove();
        }

        if (db.contact) {
          const waLinks = document.querySelectorAll('a[href^="https://wa.me"]');
          waLinks.forEach((link) => {
            if (db.contact.whatsapp) {
              const text = encodeURIComponent('مرحباً، أنا مهتم بمنتج من معرض أولاد القاضي');
              link.href = `https://wa.me/2${db.contact.whatsapp}?text=${text}`;
            }
          });
        }

        if (db.platform) {
          if (db.platform.logo) {
            const logos = document.querySelectorAll('.brand-logo-img, .footer-logo img');
            logos.forEach((logo) => (logo.src = db.platform.logo));
          }
          if (db.platform.brandName) {
            document.title = db.platform.brandName;
          }
        }

        if (db.cms) {
          const footerStoreName = document.querySelector('.footer-logo-title');
          if (footerStoreName && db.cms.storeName) footerStoreName.textContent = db.cms.storeName;
        }

        renderProducts((Array.isArray(db.products) ? db.products : []).filter((row) => row.is_visible !== false));
        renderReviews();
      } catch (error) {
        console.error('Error syncing with database data:', error);
        renderProducts([]);
      }
    })();
    try {
      const db = LANDING_CACHE;
      if (!db) {
        renderProducts([]);
        return;
      }

      // 1. Hero sync
      if (db.hero) {
        const prefix = document.querySelector('.brand-prefix');
        const mainHighlight = document.querySelector('.brand-main-highlight');
        const suffix = document.querySelector('.brand-suffix');
        const desc = document.querySelector('.hero-description');
        const img = document.querySelector('.hero-img');

        if (prefix && db.hero.prefix) prefix.textContent = db.hero.prefix;
        if (mainHighlight && db.hero.mainTitle) mainHighlight.textContent = db.hero.mainTitle;
        if (suffix && db.hero.suffix) suffix.textContent = db.hero.suffix;
        if (desc && db.hero.subtext) desc.textContent = db.hero.subtext;

        const heroBtns = document.querySelectorAll('.hero-cta-group .btn');
        if (heroBtns[0] && db.hero.cta1) heroBtns[0].textContent = db.hero.cta1;
        if (heroBtns[1] && db.hero.cta2) heroBtns[1].textContent = db.hero.cta2;
        if (img && db.hero.img) img.src = db.hero.img;
      }

      // 2. Announcement sync
      if (db.announcement && db.announcement.active) {
        let annBar = document.getElementById('topAnnouncementBar');
        if (!annBar) {
           annBar = document.createElement('div');
           annBar.id = 'topAnnouncementBar';
           annBar.style.padding = '0.5rem';
           annBar.style.textAlign = 'center';
           annBar.style.fontSize = '0.95rem';
           annBar.style.fontWeight = 'bold';
           annBar.style.zIndex = '9999';
           annBar.style.position = 'relative';
           document.body.insertBefore(annBar, document.body.firstChild);
        }
        annBar.textContent = db.announcement.text || '';
        annBar.style.backgroundColor = db.announcement.bgColor || '#2C3E50';
        annBar.style.color = db.announcement.textColor || '#FFFFFF';
      } else {
        const annBar = document.getElementById('topAnnouncementBar');
        if (annBar) annBar.remove();
      }

      // 3. Contact & CMS Sync
      if (db.contact) {
         const waLinks = document.querySelectorAll('a[href^="https://wa.me"]');
         waLinks.forEach(link => {
             if (db.contact.whatsapp) {
                const text = encodeURIComponent('مرحبا، أنا مهتم بمنتج من معرض أولاد القاضي');
                link.href = `https://wa.me/2${db.contact.whatsapp}?text=${text}`;
             }
         });
      }

      if (db.platform) {
         if (db.platform.logo) {
            const logos = document.querySelectorAll('.brand-logo-img, .footer-logo img');
            logos.forEach(logo => logo.src = db.platform.logo);
         }
         if (db.platform.brandName) {
            document.title = db.platform.brandName;
         }
      }

      if (db.cms) {
         const footerStoreName = document.querySelector('.footer-logo-title');
         if (footerStoreName && db.cms.storeName) footerStoreName.textContent = db.cms.storeName;
      }

      // 4. Products Sync
      if (db.products && Array.isArray(db.products)) {
        renderCategoryFilters(db.products);
        renderProducts(db.products);
      } else {
        renderProducts([]);
      }

    } catch (error) {
      console.error('Error syncing with awladAdminDB:', error);
      renderProducts([]);
    }
  };

  /* ==========================================================================
     10. INIT
     ========================================================================== */
  initScrollAnimations();
  initNavbarControls();
  populateGovernorates();
  renderReviews();
  syncWithAdminDB(); // ← Syncs everything from Admin Dashboard instead of empty array
  initProductFilters();
  initModalEvents();

  if (trackingForm) trackingForm.addEventListener('submit', handleTrackingLookup);

  if (checkoutForm) {
    checkoutForm.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('input', () => {
        const group = input.closest('.form-group');
        if (group?.classList.contains('has-error')) {
          group.classList.remove('has-error');
          input.classList.remove('error');
        }
      });
    });
    checkoutForm.addEventListener('submit', handleFormSubmission);
  }
});

