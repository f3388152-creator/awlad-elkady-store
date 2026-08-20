/**
 * AWLAD EL-KADY — Landing Page Main Script
 * Dynamic Product Rendering, Checkout Modal, Form Validation & Bosta API Payload
 * ES6+ | Vanilla JS | Ready for Admin Dashboard & API Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

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
  const filterBtns = document.querySelectorAll('.filter-btn');
  const reviewsSlider = document.getElementById('reviewsSlider');
  const reviewsPrevBtn = document.getElementById('reviewsPrev');
  const reviewsNextBtn = document.getElementById('reviewsNext');

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
  const getLandingReviews = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('awladAdminDB'));
      if (saved && Array.isArray(saved.reviews) && saved.reviews.length) {
        return saved.reviews;
      }
    } catch (error) {
      console.warn('Could not read reviews from localStorage', error);
    }

    return [];
  };

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

    const cardsHtml = products.map((item, index) => {
      const delayClass = `delay-${(index % 4) + 1}`;
      const imageMarkup = item.isSvg && item.svgContent
        ? item.svgContent
        : `<img src="${item.image || 'assets/air-fryer.png'}" alt="${item.title}" class="product-image" loading="lazy">`;

      const featuresMarkup = (item.features || [])
        .map(feat => `<li>${feat}</li>`)
        .join('');

      const discountBadge = item.discount
        ? `<span class="badge badge-discount">خصم ${item.discount}%</span>`
        : '';
      const originalPriceMarkup = item.originalPrice
        ? `<span class="product-price-original">${item.originalPrice.toLocaleString('ar-EG')} ج.م</span>`
        : '';
      const specLine = item.spec
        ? `<p class="product-spec-line">${item.spec}</p>`
        : '';

      return `
        <article class="product-card reveal-on-scroll ${delayClass}"
                 data-id="${item.id}"
                 data-category="${item.category}"
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
            <span class="product-category">${item.categoryName || 'أجهزة منزلية'}</span>
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

  // Global hooks — Admin Dashboard / API يستدعيها مباشرة
  window.renderProducts = renderProducts;
  window.updateProductsList = (newProducts) => renderProducts(newProducts);
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
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filterCategory = btn.dataset.filter;
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.product-card').forEach(card => {
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
    });
  };

  /* ==========================================================================
     7. CHECKOUT MODAL
     ========================================================================== */
  const populateGovernorates = () => {
    if (!governorateSelect) return;
    governorateSelect.innerHTML = '<option value="" disabled selected>اختر المحافظة للتوصيل</option>';
    GOVERNORATES.forEach(gov => {
      const opt = document.createElement('option');
      opt.value = gov.name;
      opt.dataset.fee = gov.shippingFee;
      opt.textContent = `${gov.name} (شحن: ${gov.shippingFee} ج.م)`;
      governorateSelect.appendChild(opt);
    });
  };

  const updateModalTotals = () => {
    const subtotal = activeOrderState.price * activeOrderState.quantity;
    const total = subtotal + activeOrderState.shippingFee;
    modalQtyNum.textContent = activeOrderState.quantity;
    costSubtotal.textContent = `${subtotal.toLocaleString('ar-EG')} ج.م`;
    costShipping.textContent = `${activeOrderState.shippingFee.toLocaleString('ar-EG')} ج.م`;
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
      shippingFee: governorateSelect.value
        ? (GOVERNORATES.find(g => g.name === governorateSelect.value)?.shippingFee || 50)
        : 50
    };

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
        const govData = GOVERNORATES.find(g => g.name === governorateSelect.value);
        if (govData) {
          activeOrderState.shippingFee = govData.shippingFee;
          updateModalTotals();
        }
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
    const bostaApiPayload = {
      orderId: `KADY-${Date.now().toString().slice(-6)}`,
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
        shippingFee: activeOrderState.shippingFee,
        totalCODAmount: (activeOrderState.price * activeOrderState.quantity) + activeOrderState.shippingFee
      },
      shippingCarrier: 'Bosta Express',
      paymentType: 'COD',
      createdAt: new Date().toISOString()
    };

    console.log('📦 [BOSTA API PAYLOAD]:', JSON.stringify(bostaApiPayload, null, 2));
    closeCheckoutModal();
    checkoutForm.reset();
    showToast(`شكرًا لك يا ${bostaApiPayload.customer.name}! تم استلام طلبك وسيتواصل معك المندوب قريباً. 🚚`);
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

  /* ==========================================================================
     10. INIT
     ========================================================================== */
  initScrollAnimations();
  initNavbarControls();
  populateGovernorates();
  renderReviews();
  renderProducts([]); // ← صفحة نظيفة — تستقبل الداتا من Admin Dashboard / API
  initProductFilters();
  initModalEvents();

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
