// ========================================================
// KURDISH FUEL & COUPON APP (سیستەمی کۆبۆن و کڕینی بەنزین)
// - Home page: Showcase all coupons with zoomable photo
// - Fuel page: Coupon & commercial liters, buy/sell prices, live profit
// - Auto-refresh 3-day cycle upon refuel
// - Dashboard: Barcode and comprehensive analytics totals
// - Account: 4-Digit Security PIN Lock screen
// ========================================================

const STORAGE_KEY_COUPONS = 'kurdish_coupon_app_coupons_v3';
const STORAGE_KEY_FUELS = 'kurdish_coupon_app_fuels_v3';
const STORAGE_KEY_PIN = 'kurdish_coupon_app_pin_v3';
const STORAGE_KEY_UNIT_PRICES = 'kurdish_coupon_app_unit_prices_v1';
const CYCLE_MS = 3 * 24 * 60 * 60 * 1000; // 72 Hours (3 Days)

// Global State
let coupons = [];
let fuelRecords = [];
let currentEnteredPin = '';
let activeCouponForModal = null;
let countdownTimer = null;
let lastDashboardCodeEntry = '';

// ========================================================
// INITIALIZATION
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupLiveClock();
  setupEventListeners();
  setupQuickDashboard();
  checkPinSecurityOnLaunch();
  renderAll();

  // Tick countdowns every second
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    updateCouponsCountdownDisplay();
    renderCouponCycleCountdown();
  }, 1000);
});

// Load saved data or initialize with sample data
function loadData() {
  const savedCoupons = localStorage.getItem(STORAGE_KEY_COUPONS);
  const savedFuels = localStorage.getItem(STORAGE_KEY_FUELS);

  if (savedCoupons) {
    try {
      coupons = JSON.parse(savedCoupons);
    } catch (e) {
      coupons = [];
    }
  }

  if (savedFuels) {
    try {
      fuelRecords = JSON.parse(savedFuels);
    } catch (e) {
      fuelRecords = [];
    }
  }

  // Sample data if empty
  if (!coupons || coupons.length === 0) {
    const pastActivation = new Date(Date.now() - (72 - (2 * 24 + 16 + 12 / 60)) * 60 * 60 * 1000).toISOString();
    coupons = [
      {
        id: 'cpn-1',
        name: 'تۆیۆتا کۆرۆلا هایبرید سالۆن',
        phone: '0750 123 4567',
        password: 'KRD-88421',
        code: '18490',
        activatedAt: pastActivation,
        image: 'https://images.unsplash.com/photo-1590362891988-f77804702088?auto=format&fit=crop&w=700&q=80',
        notes: 'تایبەت بە بەنزینی موحەسەن لە وێستگەی مەخموور'
      },
      {
        id: 'cpn-2',
        name: 'هیۆندای ئەلەنترا ٢٠٢٣',
        phone: '0770 987 6543',
        password: 'HYN-54321',
        code: '29814',
        activatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // > 3 days (ready)
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=700&q=80',
        notes: 'ئۆتۆمبێلی خێزانی، وێستگەی هەولێر'
      }
    ];
    saveCoupons();
  }

  if (!fuelRecords || fuelRecords.length === 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    fuelRecords = [
      {
        id: 'fuel-1',
        couponId: 'cpn-1',
        vehicleName: 'تۆیۆتا کۆرۆلا هایبرید سالۆن',
        station: 'وێستگەی مەخموور',
        date: todayStr + 'T10:30',
        couponLiters: 100,
        commLiters: 50,
        couponBuyPrice: 450,
        commBuyPrice: 800,
        couponSellPrice: 750,
        commSellPrice: 950,
        totalLiters: 150,
        totalCost: (100 * 450) + (50 * 800), // 45000 + 40000 = 85000
        totalRevenue: (100 * 750) + (50 * 950), // 75000 + 47500 = 122500
        netProfit: 122500 - 85000 // +37500
      }
    ];
    saveFuels();
  }
}

function saveCoupons() {
  localStorage.setItem(STORAGE_KEY_COUPONS, JSON.stringify(coupons));
}

function saveFuels() {
  localStorage.setItem(STORAGE_KEY_FUELS, JSON.stringify(fuelRecords));
}

// Live Status Bar Clock
function setupLiveClock() {
  const clockEl = document.getElementById('statusClock');
  if (!clockEl) return;
  function updateClock() {
    const d = new Date();
    let hours = d.getHours();
    let minutes = d.getMinutes();
    hours = hours % 12 || 12;
    const minStr = String(minutes).padStart(2, '0');
    clockEl.textContent = `${hours}:${minStr}`;
  }
  updateClock();
  setInterval(updateClock, 30000);
}

// ========================================================
// PAGE NAVIGATION
// ========================================================
function switchPage(pageId, activeTab = pageId) {
  document.querySelectorAll('.app-page').forEach(page => {
    page.classList.remove('active');
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-page') === pageId) {
      btn.classList.add('active');
    }
  });

  document.querySelectorAll('.quick-tab').forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.tab || btn.dataset.page) === activeTab);
  });

  if (pageId === 'homePage') {
    populateHomeCouponDropdown();
    renderHomeSummary();
  } else if (pageId === 'couponsPage') {
    renderHomeCoupons();
  } else if (pageId === 'fuelPage') {
    populateFuelCouponDropdown();
    renderFullFuelHistory();
    recalculateLiveFuel();
  } else if (pageId === 'dashboardPage') {
    renderDashboardTotals();
  } else if (pageId === 'addCouponPage') {
    if (!document.getElementById('cEditId').value) {
      setCurrentDateTimeToInput();
    }
  } else if (pageId === 'settingsPage') {
    syncPinSettingsUI();
  }
}

// ========================================================
// PAGE 1: HOME PAGE (SHOWCASING COUPONS BEAUTIFULLY)
// ========================================================
function renderHomeCoupons(filterQuery = '') {
  const grid = document.getElementById('homeCouponsGrid');
  if (!grid) return;

  let list = [...coupons];
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    list = list.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.password && c.password.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div style="background:#fff; border-radius:18px; padding:32px 20px; text-align:center; color:#8c9b92; box-shadow:var(--shadow-card);">
        <p style="font-size:16px; font-weight:800; color:#1e293b; margin-bottom:8px;">هیچ کۆبۆنێک نەدۆزرایەوە</p>
        <p style="font-size:12px; margin-bottom:16px;">دەتوانیت کۆبۆنی نوێ زیادبکەیت بە هەڵبژاردنی وێنە و کات</p>
        <button class="btn-green-submit" style="width:auto; padding:10px 20px;" onclick="switchPage('addCouponPage')">
          ➕ زیادکردنی یەکەم کۆبۆن
        </button>
      </div>
    `;
    return;
  }

  const now = Date.now();

  grid.innerHTML = list.map(c => {
    const actTime = new Date(c.activatedAt).getTime();
    const remaining = (actTime + CYCLE_MS) - now;
    const isRestricted = remaining > 0;

    let timeBadge = '';
    if (isRestricted) {
      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      timeBadge = `
        <span class="showcase-time-remaining restricted" id="timerBadge-${c.id}">
          ⏳ ڕێگەپێدراو نییە (ماوە: ${days} ڕ، ${hours} ک، ${minutes} خ)
        </span>
      `;
    } else {
      timeBadge = `
        <span class="showcase-time-remaining eligible">
          ✅ ئۆتۆمبێلەکە ڕێگەپێدراوە بۆ بەنزین
        </span>
      `;
    }

    // Image container: with Zoom hint
    const imageContainer = c.image ? `
      <div class="showcase-img-container" onclick="openImageLightbox('${escapeHtml(c.image)}', '${escapeHtml(c.name)}')">
        <img src="${c.image}" alt="${escapeHtml(c.name)}" loading="lazy">
        <div class="zoom-hint-badge">
          🔍 کلیک بکە بۆ گەورەکردن
        </div>
      </div>
    ` : `
      <div class="coupon-no-img-box" onclick="switchPage('addCouponPage')">
        <span>📸 هیچ وێنەیەک دانەنراوە - دەستکاری بکە بۆ دانانی وێنە</span>
      </div>
    `;

    return `
      <div class="showcase-coupon-card" id="couponCard-${c.id}">
        ${imageContainer}

        <div class="showcase-details-top">
          <div>
            <h3 class="showcase-coupon-title">${escapeHtml(c.name)}</h3>
            <span class="showcase-coupon-phone">📱 ${escapeHtml(c.phone)}</span>
          </div>
          <span class="refuel-code-badge">${escapeHtml(c.code || 'کۆد')}</span>
        </div>

        <div class="showcase-meta-strip">
          ${timeBadge}
          <span style="font-size:11px; color:#64748b;">⏱️ کات: ${formatDateDisplay(c.activatedAt)}</span>
        </div>

        ${c.notes ? `<p class="c-card-notes">${escapeHtml(c.notes)}</p>` : ''}

        <div class="showcase-actions">
          <button class="btn-quick-fuel-refuel" onclick="startFuelWithCoupon('${c.id}')">
            ⛽ تێکردنی بەنزین
          </button>
          <button class="btn-c-action renew" onclick="quickRenewCouponFromCard('${c.id}')" title="نوێکردنەوەی ٣ ڕۆژ">
            🔄 نوێکردنەوە
          </button>
          <button class="btn-c-action edit" onclick="editCoupon('${c.id}')" title="دەستکاری">
            ✏️
          </button>
          <button class="btn-c-action delete" onclick="deleteCoupon('${c.id}')" title="سڕینەوە">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function handleHomeCouponSearch(val) {
  renderHomeCoupons(val);
}

// Real-time tick for countdown timers on cards
function updateCouponsCountdownDisplay() {
  const now = Date.now();
  coupons.forEach(c => {
    const badge = document.getElementById(`timerBadge-${c.id}`);
    if (!badge) return;
    const actTime = new Date(c.activatedAt).getTime();
    const remaining = (actTime + CYCLE_MS) - now;
    if (remaining > 0) {
      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      badge.className = 'showcase-time-remaining restricted';
      badge.textContent = `⏳ ڕێگەپێدراو نییە (ماوە: ${days} ڕ، ${hours} ک، ${minutes} خ)`;
    } else {
      badge.className = 'showcase-time-remaining eligible';
      badge.textContent = '✅ ئۆتۆمبێلەکە ڕێگەپێدراوە بۆ بەنزین';
    }
  });
}

function quickRenewCouponFromCard(id) {
  const c = coupons.find(item => item.id === id);
  if (!c) return;
  c.activatedAt = new Date().toISOString();
  saveCoupons();
  renderHomeCoupons();
  renderCouponCycleCountdown();
  showToast(`خولی ٣ ڕۆژەی (${c.name}) نوێکرایەوە! ⏱️`);
}

// Quick action to start fuel refuel with selected coupon
function startFuelWithCoupon(id) {
  switchPage('fuelPage');
  const sel = document.getElementById('fInpCouponSelect');
  if (sel) {
    sel.value = id;
    onFuelCouponSelectChanged(id);
  }
}

// ========================================================
// IMAGE LIGHTBOX (FULLSCREEN ZOOM OF COUPON)
// ========================================================
function openImageLightbox(imgSrc, title) {
  const modal = document.getElementById('imageLightboxModal');
  const img = document.getElementById('lightboxImg');
  const t = document.getElementById('lightboxTitle');
  if (!modal || !img) return;

  img.src = imgSrc;
  if (t) t.textContent = title || 'وێنەی کۆبۆن';
  modal.classList.add('open');
}

function closeImageLightbox() {
  const modal = document.getElementById('imageLightboxModal');
  if (modal) modal.classList.remove('open');
}

// ========================================================
// PAGE 2: FUEL PURCHASE & TRADE (کڕینی بەنزین)
// ========================================================
function populateFuelCouponDropdown() {
  const sel = document.getElementById('fInpCouponSelect');
  if (!sel) return;

  if (coupons.length === 0) {
    sel.innerHTML = `<option value="">هیچ کۆبۆنێک تۆمار نەکراوە</option>`;
    return;
  }

  sel.innerHTML = coupons.map(c => `
    <option value="${c.id}">
      ${escapeHtml(c.name)} - (کۆد: ${c.code || c.password})
    </option>
  `).join('');

  onFuelCouponSelectChanged(sel.value);
}

function onFuelCouponSelectChanged(couponId) {
  const c = coupons.find(item => item.id === couponId);
  const pwdInp = document.getElementById('fInpCouponPassword');
  if (c && pwdInp) {
    pwdInp.value = c.password || '';
  }
}

function verifyAndSelectCouponByPassword() {
  const pwd = document.getElementById('fInpCouponPassword')?.value.trim();
  if (!pwd) {
    showToast('تکایە سەرەتا ووشەی نهێنی بنووسە');
    return;
  }

  const matched = coupons.find(c => 
    c.password.toLowerCase() === pwd.toLowerCase() ||
    c.code === pwd
  );

  if (matched) {
    const sel = document.getElementById('fInpCouponSelect');
    if (sel) sel.value = matched.id;
    showToast(`کۆبۆنەکە دۆزرایەوە: ${matched.name} ✅`);
  } else {
    showToast('هیچ کۆبۆنێک بەم ووشەی نهێنییە نەدۆزرایەوە! ❌');
  }
}

function recalculateLiveFuel() {
  const couponLiters = parseFloat(document.getElementById('fInpCouponLiters')?.value) || 0;
  const commLiters = parseFloat(document.getElementById('fInpCommLiters')?.value) || 0;
  
  const couponBuyPrice = parseFloat(document.getElementById('fInpCouponBuyPrice')?.value) || 0;
  const commBuyPrice = parseFloat(document.getElementById('fInpCommBuyPrice')?.value) || 0;
  
  const couponSellPrice = parseFloat(document.getElementById('fInpCouponSellPrice')?.value) || 0;
  const commSellPrice = parseFloat(document.getElementById('fInpCommSellPrice')?.value) || 0;

  const totalLiters = couponLiters + commLiters;
  
  // Total purchase cost = (coupon liters * coupon buy price) + (comm liters * comm buy price)
  const totalCost = (couponLiters * couponBuyPrice) + (commLiters * commBuyPrice);
  
  // Total sell revenue = (coupon liters * coupon sell price) + (comm liters * comm sell price)
  const totalRevenue = (couponLiters * couponSellPrice) + (commLiters * commSellPrice);
  
  // Net profit
  const netProfit = totalRevenue - totalCost;

  const pTotalLiters = document.getElementById('panelTotalLiters');
  const pTotalCost = document.getElementById('panelTotalCost');
  const pTotalRevenue = document.getElementById('panelTotalRevenue');
  const pNetProfit = document.getElementById('panelNetProfit');

  if (pTotalLiters) pTotalLiters.textContent = totalLiters.toLocaleString() + ' لیتر';
  if (pTotalCost) pTotalCost.textContent = totalCost.toLocaleString() + ' د.ع';
  if (pTotalRevenue) pTotalRevenue.textContent = totalRevenue.toLocaleString() + ' د.ع';
  if (pNetProfit) {
    const prefix = netProfit >= 0 ? '+' : '';
    pNetProfit.textContent = `${prefix}${netProfit.toLocaleString()} د.ع`;
    pNetProfit.style.color = netProfit >= 0 ? '#277947' : '#d93838';
  }
}

function renderFullFuelHistory() {
  const container = document.getElementById('fullFuelList');
  if (!container) return;

  if (fuelRecords.length === 0) {
    container.innerHTML = `
      <div style="background:#fff; border-radius:14px; padding:24px; text-align:center; color:#8c9b92;">
        هیچ مامەڵەیەکی بەنزین تۆمار نەکراوە
      </div>
    `;
    return;
  }

  container.innerHTML = fuelRecords.map(r => {
    const d = new Date(r.date);
    const dateFormatted = !isNaN(d) ? `${d.toLocaleDateString('ckb-IQ', { dateStyle: 'medium' })} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : r.date;
    return `
      <div class="refuel-item-card">
        <div class="refuel-card-header">
          <h4 class="refuel-car-name">${escapeHtml(r.vehicleName || 'ئۆتۆمبێل')}</h4>
          <span class="refuel-code-badge">${escapeHtml(r.code || '18490')}</span>
        </div>
        <div class="refuel-card-body">
          <div class="refuel-meta-col">
            <span class="meta-icon-lbl">📍 وێستگە:</span>
            <strong class="meta-val">${escapeHtml(r.station)}</strong>
          </div>
          <div class="refuel-meta-col">
            <span class="meta-icon-lbl">📅 کات:</span>
            <strong class="meta-val">${dateFormatted}</strong>
          </div>
        </div>
        <div class="refuel-stats-row">
          <span>کۆبۆن: <strong>${r.couponLiters}L</strong> (${(r.couponBuyPrice || 0).toLocaleString()}د.ع)</span>
          <span>توجاری: <strong>${r.commLiters}L</strong> (${(r.commBuyPrice || 0).toLocaleString()}د.ع)</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:8px; border-top:1px dashed #e6ebef; font-size:12px;">
          <span>کڕین: <strong>${(r.totalCost || 0).toLocaleString()}</strong> | فرۆشتن: <strong>${(r.totalRevenue || 0).toLocaleString()}</strong></span>
          <span class="profit-highlight">قازانج: +${(r.netProfit || 0).toLocaleString()} د.ع</span>
          <button class="btn-tool-mini" onclick="deleteFuelRecord('${r.id}')" title="سڕینەوە" style="color:#d93838; position:static;">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function deleteFuelRecord(id) {
  if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم مامەڵەیە؟')) return;
  fuelRecords = fuelRecords.filter(f => f.id !== id);
  saveFuels();
  renderFullFuelHistory();
  renderDashboardTotals();
  renderHomeSummary();
  showToast('مامەڵەکە سڕایەوە');
}

// ========================================================
// PAGE 3: DASHBOARD & BARCODE / TOTALS (داشبۆرد و بارکۆد)
// ========================================================
function renderDashboardTotals() {
  let totalCouponLiters = 0;
  let totalCommLiters = 0;
  let grandTotalLiters = 0;
  let totalCost = 0;
  let totalRevenue = 0;
  let totalNetProfit = 0;

  fuelRecords.forEach(f => {
    totalCouponLiters += Number(f.couponLiters) || 0;
    totalCommLiters += Number(f.commLiters) || 0;
    grandTotalLiters += Number(f.totalLiters) || ((Number(f.couponLiters) || 0) + (Number(f.commLiters) || 0));
    totalCost += Number(f.totalCost) || 0;
    totalRevenue += Number(f.totalRevenue) || 0;
    totalNetProfit += Number(f.netProfit) || 0;
  });

  const elCouponL = document.getElementById('dashTotalCouponLiters');
  const elCommL = document.getElementById('dashTotalCommLiters');
  const elGrandL = document.getElementById('dashGrandTotalLiters');
  const elCost = document.getElementById('dashTotalCost');
  const elRev = document.getElementById('dashTotalRevenue');
  const elProfit = document.getElementById('dashTotalNetProfit');

  if (elCouponL) elCouponL.textContent = totalCouponLiters.toLocaleString() + ' L';
  if (elCommL) elCommL.textContent = totalCommLiters.toLocaleString() + ' L';
  if (elGrandL) elGrandL.textContent = grandTotalLiters.toLocaleString() + ' L';
  if (elCost) elCost.textContent = totalCost.toLocaleString() + ' د.ع';
  if (elRev) elRev.textContent = totalRevenue.toLocaleString() + ' د.ع';
  if (elProfit) {
    const prefix = totalNetProfit >= 0 ? '+' : '';
    elProfit.textContent = `${prefix}${totalNetProfit.toLocaleString()} د.ع`;
  }
}

// ========================================================
// PAGE 4: ADD / EDIT COUPON
// ========================================================
function setCurrentDateTimeToInput() {
  const inp = document.getElementById('cInpDateTime');
  if (inp) {
    inp.value = formatToDatetimeLocal(new Date());
  }
}

function generateRandomCouponCode() {
  const pwdInp = document.getElementById('cInpPassword');
  if (pwdInp) {
    const randomCode = 'CPN-' + Math.floor(100000 + Math.random() * 900000);
    pwdInp.value = randomCode;
    pwdInp.type = 'text';
    showToast(`کۆدی نوێ دروستکرا: ${randomCode}`);
  }
}

function togglePasswordVisibility(inputId) {
  const inp = document.getElementById(inputId);
  if (inp) {
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }
}

function removeSelectedPhoto(e) {
  if (e) e.stopPropagation();
  document.getElementById('cPhotoInput').value = '';
  document.getElementById('cPhotoData').value = '';
  document.getElementById('cPhotoImg').src = '';
  document.getElementById('cPhotoPreviewBox').style.display = 'none';
  document.getElementById('cPhotoPlaceholder').style.display = 'flex';
}

function editCoupon(id) {
  const c = coupons.find(item => item.id === id);
  if (!c) return;

  document.getElementById('cEditId').value = c.id;
  document.getElementById('cInpName').value = c.name;
  document.getElementById('cInpPhone').value = c.phone;
  document.getElementById('cInpPassword').value = c.password;
  document.getElementById('cInpDateTime').value = formatToDatetimeLocal(c.activatedAt);
  document.getElementById('cInpNotes').value = c.notes || '';

  if (c.image) {
    document.getElementById('cPhotoData').value = c.image;
    document.getElementById('cPhotoImg').src = c.image;
    document.getElementById('cPhotoPreviewBox').style.display = 'block';
    document.getElementById('cPhotoPlaceholder').style.display = 'none';
  } else {
    removeSelectedPhoto();
  }

  document.getElementById('couponFormMainTitle').textContent = '✏️ دەستکاریکردنی کۆبۆن';
  document.getElementById('saveCouponSubmitBtn').textContent = '💾 پاشەکەوتکردنی گۆڕانکاری';

  switchPage('addCouponPage');
}

function cancelCouponEdit() {
  resetCouponForm();
  switchPage('homePage');
}

function resetCouponForm() {
  document.getElementById('mainCouponForm').reset();
  document.getElementById('cEditId').value = '';
  removeSelectedPhoto();
  setCurrentDateTimeToInput();
  document.getElementById('couponFormMainTitle').textContent = '➕ زیادکردنی کۆبۆنی نوێ';
  document.getElementById('saveCouponSubmitBtn').textContent = '💾 پاشەکەوتکردنی کۆبۆن';
}

function deleteCoupon(id) {
  if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم کۆبۆنە؟')) return;
  coupons = coupons.filter(c => c.id !== id);
  saveCoupons();
  renderHomeCoupons();
  showToast('کۆبۆنەکە سڕایەوە');
}

// ========================================================
// PAGE 5: 4-DIGIT SECURITY PIN LOCK SYSTEM
// ========================================================
function getStoredPinConfig() {
  const saved = localStorage.getItem(STORAGE_KEY_PIN);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return { enabled: false, pin: '1234' };
    }
  }
  return { enabled: false, pin: '1234' };
}

function savePinConfig(config) {
  localStorage.setItem(STORAGE_KEY_PIN, JSON.stringify(config));
}

function checkPinSecurityOnLaunch() {
  const config = getStoredPinConfig();
  const lockBtn = document.getElementById('btnQuickLock');
  if (config.enabled) {
    if (lockBtn) lockBtn.style.display = 'flex';
    // Show lock screen
    showPinLockOverlay();
  } else {
    if (lockBtn) lockBtn.style.display = 'none';
    hidePinLockOverlay();
  }
}

function showPinLockOverlay() {
  const overlay = document.getElementById('pinLockOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    currentEnteredPin = '';
    updatePinDotsUI();
    document.getElementById('pinErrorMsg').textContent = '';
  }
}

function hidePinLockOverlay() {
  const overlay = document.getElementById('pinLockOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function lockAppManually() {
  const config = getStoredPinConfig();
  if (!config.enabled) {
    showToast('سەرەتا قوفڵی ڕەمز لە بەشی هەژمار چالاک بکە');
    switchPage('settingsPage');
    return;
  }
  showPinLockOverlay();
}

function pressPinDigit(digit) {
  if (currentEnteredPin.length >= 4) return;
  currentEnteredPin += digit;
  updatePinDotsUI();

  if (currentEnteredPin.length === 4) {
    // Validate PIN
    setTimeout(validateEnteredPin, 150);
  }
}

function deletePinDigit() {
  if (currentEnteredPin.length > 0) {
    currentEnteredPin = currentEnteredPin.slice(0, -1);
    updatePinDotsUI();
    document.getElementById('pinErrorMsg').textContent = '';
  }
}

function clearPinInput() {
  currentEnteredPin = '';
  updatePinDotsUI();
  document.getElementById('pinErrorMsg').textContent = '';
}

function updatePinDotsUI() {
  const dots = document.querySelectorAll('#pinDotsRow .pin-dot');
  dots.forEach((dot, index) => {
    if (index < currentEnteredPin.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

function validateEnteredPin() {
  const config = getStoredPinConfig();
  const targetPin = config.pin || '1234';

  if (currentEnteredPin === targetPin) {
    hidePinLockOverlay();
    showToast('بەخێربێیتەوە! بەرنامەکە کرایەوە 🔓');
  } else {
    const errEl = document.getElementById('pinErrorMsg');
    if (errEl) errEl.textContent = 'ڕەمزەکە هەڵەیە! تکایە دووبارە هەوڵبدەرەوە.';
    
    // Shake effect
    const dotsRow = document.getElementById('pinDotsRow');
    if (dotsRow) {
      dotsRow.style.animation = 'none';
      dotsRow.offsetHeight; // trigger reflow
      dotsRow.style.animation = 'shake 0.3s ease-in-out';
    }

    setTimeout(() => {
      clearPinInput();
    }, 400);
  }
}

function syncPinSettingsUI() {
  const config = getStoredPinConfig();
  const toggle = document.getElementById('pinEnableToggle');
  const section = document.getElementById('pinChangeSection');
  const inpNew = document.getElementById('inpNewPin');

  if (toggle) toggle.checked = config.enabled;
  if (section) section.style.display = config.enabled ? 'block' : 'none';
  if (inpNew) inpNew.value = config.pin || '1234';
}

function togglePinSecurity(enabled) {
  const config = getStoredPinConfig();
  config.enabled = enabled;
  savePinConfig(config);

  const lockBtn = document.getElementById('btnQuickLock');
  if (lockBtn) lockBtn.style.display = enabled ? 'flex' : 'none';

  syncPinSettingsUI();
  showToast(enabled ? 'قوفڵی ڕەمزی ٤ ژمارەیی چالاککرا 🔒' : 'قوفڵی ڕەمز ناچالاککرا 🔓');
}

function saveNewPinCode() {
  const inp = document.getElementById('inpNewPin');
  const newPin = inp?.value.trim();

  if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
    showToast('تکایە بە تەواوی ٤ ژمارە بنووسە (وەک: 1234)');
    return;
  }

  const config = getStoredPinConfig();
  config.pin = newPin;
  config.enabled = true;
  savePinConfig(config);

  syncPinSettingsUI();
  showToast(`ڕەمزی نوێ بە سەرکەوتوویی پاشەکەوتکرا: ${newPin} 🔑`);
}

// ========================================================
// EVENT LISTENERS SETUP
// ========================================================
function setupEventListeners() {
  // Mobile photo file picker (camera/gallery)
  const photoInput = document.getElementById('cPhotoInput');
  if (photoInput) {
    photoInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const base64Data = evt.target.result;
        document.getElementById('cPhotoData').value = base64Data;
        document.getElementById('cPhotoImg').src = base64Data;
        document.getElementById('cPhotoPreviewBox').style.display = 'block';
        document.getElementById('cPhotoPlaceholder').style.display = 'none';
        showToast('وێنەی کۆبۆنەکە دیاریکرا 📷');
      };
      reader.readAsDataURL(file);
    });
  }

  // Coupon Form Submit
  const couponForm = document.getElementById('mainCouponForm');
  if (couponForm) {
    couponForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const editId = document.getElementById('cEditId').value;
      const name = document.getElementById('cInpName').value.trim();
      const phone = document.getElementById('cInpPhone').value.trim();
      const password = document.getElementById('cInpPassword').value.trim();
      const activatedAt = document.getElementById('cInpDateTime').value;
      const notes = document.getElementById('cInpNotes').value.trim();
      const image = document.getElementById('cPhotoData').value || null;

      if (!name || !phone || !password || !activatedAt) {
        showToast('تکایە خانە سەرەکییەکان پڕبکەرەوە');
        return;
      }

      if (editId) {
        const idx = coupons.findIndex(c => c.id === editId);
        if (idx !== -1) {
          coupons[idx] = {
            ...coupons[idx],
            name,
            phone,
            password,
            activatedAt: new Date(activatedAt).toISOString(),
            notes,
            image: image || coupons[idx].image
          };
          showToast('کۆبۆنەکە بە سەرکەوتوویی نوێکرایەوە ✨');
        }
      } else {
        const newCoupon = {
          id: 'cpn-' + Date.now(),
          name,
          phone,
          password,
          code: String(Math.floor(10000 + Math.random() * 90000)),
          activatedAt: new Date(activatedAt).toISOString(),
          notes,
          image
        };
        coupons.unshift(newCoupon);
        showToast('کۆبۆنی نوێ بە سەرکەوتوویی زیادکرا 🎉');
      }

      saveCoupons();
      resetCouponForm();
      switchPage('homePage');
    });
  }

  // Live calculation listeners for fuel form
  ['fInpCouponLiters', 'fInpCommLiters', 'fInpCouponBuyPrice', 'fInpCommBuyPrice', 'fInpCouponSellPrice', 'fInpCommSellPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalculateLiveFuel);
  });

  // Default datetime for fuel form
  const fDateInp = document.getElementById('fInpDate');
  if (fDateInp) {
    fDateInp.value = formatToDatetimeLocal(new Date());
  }

  // Fuel form submit
  const fuelForm = document.getElementById('cleanFuelForm');
  if (fuelForm) {
    fuelForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const couponId = document.getElementById('fInpCouponSelect').value;
      const couponLiters = parseFloat(document.getElementById('fInpCouponLiters').value) || 0;
      const commLiters = parseFloat(document.getElementById('fInpCommLiters').value) || 0;
      
      const couponBuyPrice = parseFloat(document.getElementById('fInpCouponBuyPrice').value) || 0;
      const commBuyPrice = parseFloat(document.getElementById('fInpCommBuyPrice').value) || 0;
      
      const couponSellPrice = parseFloat(document.getElementById('fInpCouponSellPrice').value) || 0;
      const commSellPrice = parseFloat(document.getElementById('fInpCommSellPrice').value) || 0;

      const station = document.getElementById('fInpStation').value.trim() || 'وێستگەی بەنزین';
      const date = document.getElementById('fInpDate').value || new Date().toISOString();

      const totalLiters = couponLiters + commLiters;
      const totalCost = (couponLiters * couponBuyPrice) + (commLiters * commBuyPrice);
      const totalRevenue = (couponLiters * couponSellPrice) + (commLiters * commSellPrice);
      const netProfit = totalRevenue - totalCost;

      const matchedCoupon = coupons.find(c => c.id === couponId);

      const newRecord = {
        id: 'fuel-' + Date.now(),
        couponId: couponId || null,
        vehicleName: matchedCoupon ? matchedCoupon.name : 'ئۆتۆمبێل',
        code: matchedCoupon ? matchedCoupon.code : 'کۆد',
        station,
        date,
        couponLiters,
        commLiters,
        couponBuyPrice,
        commBuyPrice,
        couponSellPrice,
        commSellPrice,
        totalLiters,
        totalCost,
        totalRevenue,
        netProfit
      };

      fuelRecords.unshift(newRecord);
      saveFuels();

      // AUTO-UPDATE REFUEL TIME ON THE COUPON: 3-Day renewal cycle restarts from this moment!
      if (matchedCoupon) {
        matchedCoupon.activatedAt = new Date(date).toISOString();
        saveCoupons();
      }

      showToast('مامەڵەی کڕینی بەنزین تۆمارکرا و خولی ٣ ڕۆژەی کۆبۆنەکە نوێبووەوە! ⛽');
      renderFullFuelHistory();
      renderDashboardTotals();
      renderHomeCoupons();
      renderHomeSummary();
    });
  }
}

function renderAll() {
  renderHomeCoupons();
  populateFuelCouponDropdown();
  populateHomeCouponDropdown();
  renderFullFuelHistory();
  renderDashboardTotals();
  renderHomeSummary();
  recalculateLiveFuel();
}

// ========================================================
// QUICK ACCOUNTING DASHBOARD
// ========================================================
function setupQuickDashboard() {
  const dateInput = document.getElementById('homeTxnDate');
  if (dateInput && !dateInput.value) dateInput.value = formatLocalDate(new Date());

  const savedPrices = localStorage.getItem(STORAGE_KEY_UNIT_PRICES);
  if (savedPrices) {
    try {
      const prices = JSON.parse(savedPrices);
      const buy = document.getElementById('homeUnitBuy');
      const sell = document.getElementById('homeUnitSell');
      if (buy && prices.buy !== undefined) buy.value = prices.buy;
      if (sell && prices.sell !== undefined) sell.value = prices.sell;
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY_UNIT_PRICES);
    }
  }

  ['homeCouponRate', 'homeCouponLiters', 'homeCommercialRate', 'homeCommercialLiters'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateQuickEntryTotals);
  });
  updateQuickEntryTotals();
  populateHomeCouponDropdown();
  renderHomeSummary();
}

function formatLocalDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function populateHomeCouponDropdown() {
  const select = document.getElementById('homeCouponSelect');
  const codeList = document.getElementById('homeCouponCodes');
  if (!select) return;
  const selected = select.value;
  select.innerHTML = '<option value="">بێ کۆپۆن</option>' + coupons.map(coupon =>
    `<option value="${escapeHtml(coupon.id)}">${escapeHtml(coupon.code || coupon.password || 'کۆپۆن')} — ${escapeHtml(coupon.name)}</option>`
  ).join('');
  if (codeList) {
    codeList.innerHTML = coupons.map(coupon => `<option value="${escapeHtml(coupon.code || coupon.password || '')}">${escapeHtml(coupon.name)}</option>`).join('');
  }
  if (coupons.some(coupon => coupon.id === selected)) select.value = selected;
}

function syncDashboardCouponCode() {
  const code = document.getElementById('homeCouponCode')?.value.trim().toLowerCase() || '';
  const select = document.getElementById('homeCouponSelect');
  const match = coupons.find(coupon =>
    String(coupon.code || '').toLowerCase() === code || String(coupon.password || '').toLowerCase() === code
  );
  if (select) select.value = match?.id || '';
  if (!match) lastDashboardCodeEntry = '';
  if (match && lastDashboardCodeEntry !== match.id) {
    match.activatedAt = new Date().toISOString();
    saveCoupons();
    lastDashboardCodeEntry = match.id;
    showToast(`کۆپۆنی ${match.code || match.name} چالاک کرا؛ کاتژمێری ٣ ڕۆژە دەستی پێکرد ⏱️`);
  }
  renderCouponCycleCountdown();
}

function syncDashboardCouponSelect() {
  const select = document.getElementById('homeCouponSelect');
  const coupon = coupons.find(item => item.id === select?.value);
  const codeInput = document.getElementById('homeCouponCode');
  if (codeInput) codeInput.value = coupon?.code || '';
  renderCouponCycleCountdown();
}

function updateQuickEntryTotals() {
  const couponRate = Number(document.getElementById('homeCouponRate')?.value) || 0;
  const couponLiters = Number(document.getElementById('homeCouponLiters')?.value) || 0;
  const commercialRate = Number(document.getElementById('homeCommercialRate')?.value) || 0;
  const commercialLiters = Number(document.getElementById('homeCommercialLiters')?.value) || 0;
  const couponTotal = document.getElementById('homeCouponTotal');
  const commercialTotal = document.getElementById('homeCommercialTotal');
  if (couponTotal) couponTotal.textContent = (couponRate * couponLiters).toLocaleString();
  if (commercialTotal) commercialTotal.textContent = (commercialRate * commercialLiters).toLocaleString();
}

function saveDashboardEntry(event, type) {
  event.preventDefault();
  const isCoupon = type === 'coupon';
  const liters = Number(document.getElementById(isCoupon ? 'homeCouponLiters' : 'homeCommercialLiters')?.value) || 0;
  const buyPrice = Number(document.getElementById(isCoupon ? 'homeCouponRate' : 'homeCommercialRate')?.value) || 0;
  if (liters <= 0 || buyPrice < 0) {
    showToast('تکایە بڕی لیتر و نرخ بە دروستی بنووسە');
    return;
  }

  const couponCode = document.getElementById('homeCouponCode')?.value.trim() || '';
  const couponId = isCoupon ? document.getElementById('homeCouponSelect')?.value : '';
  const matchedByCode = isCoupon && couponCode
    ? coupons.find(coupon => String(coupon.code || '').toLowerCase() === couponCode.toLowerCase() || String(coupon.password || '').toLowerCase() === couponCode.toLowerCase())
    : null;
  const matchedCoupon = matchedByCode || coupons.find(coupon => coupon.id === couponId);
  if (isCoupon && couponCode && !matchedByCode) {
    showToast('کۆدی کۆپۆنەکە نەدۆزرایەوە؛ کۆدێکی دروست هەڵبژێرە');
    return;
  }
  const sellPrice = Number(document.getElementById('homeUnitSell')?.value) || 0;
  const totalCost = liters * buyPrice;
  const totalRevenue = liters * sellPrice;
  const date = document.getElementById('homeTxnDate')?.value || formatLocalDate(new Date());
  const registeredAt = new Date();
  const time = registeredAt.toTimeString().slice(0, 5);
  const commercialCode = document.getElementById('homeCommercialCode')?.value.trim() || 'TR-001';

  fuelRecords.unshift({
    id: 'fuel-' + Date.now(),
    type,
    couponId: matchedCoupon?.id || null,
    vehicleName: matchedCoupon?.name || (isCoupon ? 'کۆپۆنی بێ ناونیشان' : `توجاری ${commercialCode}`),
    code: matchedCoupon?.code || (isCoupon ? 'کۆپۆن' : commercialCode),
    station: 'وێستگەی بەنزین',
    date: `${date}T${time}`,
    couponLiters: isCoupon ? liters : 0,
    commLiters: isCoupon ? 0 : liters,
    couponBuyPrice: isCoupon ? buyPrice : 0,
    commBuyPrice: isCoupon ? 0 : buyPrice,
    couponSellPrice: isCoupon ? sellPrice : 0,
    commSellPrice: isCoupon ? 0 : sellPrice,
    totalLiters: liters,
    totalCost,
    totalRevenue,
    netProfit: totalRevenue - totalCost
  });

  if (matchedCoupon) {
    matchedCoupon.activatedAt = registeredAt.toISOString();
    saveCoupons();
  }
  saveFuels();
  renderAll();
  showToast(isCoupon ? 'مامەڵەی کۆپۆن تۆمارکرا' : 'مامەڵەی توجاری تۆمارکرا');
}

function saveUnitPrices(event) {
  event.preventDefault();
  const prices = {
    buy: Number(document.getElementById('homeUnitBuy')?.value) || 0,
    sell: Number(document.getElementById('homeUnitSell')?.value) || 0
  };
  localStorage.setItem(STORAGE_KEY_UNIT_PRICES, JSON.stringify(prices));
  showToast('نرخی یەک لیتر پاشەکەوت کرا');
}

function renderHomeSummary() {
  const totals = fuelRecords.reduce((sum, record) => {
    sum.liters += Number(record.totalLiters) || (Number(record.couponLiters) || 0) + (Number(record.commLiters) || 0);
    sum.cost += Number(record.totalCost) || 0;
    sum.revenue += Number(record.totalRevenue) || 0;
    sum.profit += Number(record.netProfit) || 0;
    return sum;
  }, { liters: 0, cost: 0, revenue: 0, profit: 0 });
  const values = {
    homeTotalRevenue: totals.revenue,
    homeTotalLiters: totals.liters,
    homeTotalCost: totals.cost,
    homeTotalProfit: totals.profit
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value.toLocaleString();
  });
  renderCouponCycleCountdown();
  renderHomeRecentRefuels();
  renderDashboardTotals();
}

function getDashboardCoupon() {
  const typedCode = document.getElementById('homeCouponCode')?.value.trim().toLowerCase() || '';
  if (typedCode) {
    return coupons.find(coupon =>
      String(coupon.code || '').toLowerCase() === typedCode || String(coupon.password || '').toLowerCase() === typedCode
    ) || null;
  }
  const selectedId = document.getElementById('homeCouponSelect')?.value;
  const selectedCoupon = coupons.find(coupon => coupon.id === selectedId);
  if (selectedCoupon) return selectedCoupon;
  return [...coupons].sort((a, b) => new Date(b.activatedAt) - new Date(a.activatedAt))[0] || null;
}

function renderCouponCycleCountdown() {
  const coupon = getDashboardCoupon();
  const name = document.getElementById('cycleCouponName');
  const note = document.getElementById('cycleNote');
  const dot = document.getElementById('cycleStatusDot');
  const daysEl = document.getElementById('cycleDays');
  const hoursEl = document.getElementById('cycleHours');
  const minutesEl = document.getElementById('cycleMinutes');
  const secondsEl = document.getElementById('cycleSeconds');
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  if (!coupon) {
    if (name) name.textContent = 'هێشتا هیچ کۆپۆنێک تۆمار نەکراوە';
    if (note) note.textContent = 'بۆ دەستپێکردنی خولی ٣ ڕۆژە، کۆپۆنێک زیاد بکە.';
    if (dot) dot.classList.add('expired');
    daysEl.textContent = '0';
    hoursEl.textContent = '0';
    minutesEl.textContent = '0';
    secondsEl.textContent = '00';
    return;
  }

  const cycleStart = new Date(coupon.activatedAt).getTime();
  const now = Date.now();
  const elapsed = now - cycleStart;
  // Keep a repeating 72-hour dashboard cycle anchored to this coupon's last refill.
  // Saving a refill updates activatedAt, so the new cycle starts from that transaction.
  const remaining = elapsed < 0
    ? cycleStart - now
    : CYCLE_MS - (elapsed % CYCLE_MS);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  if (name) name.textContent = `${coupon.name} · ${coupon.code || 'کۆپۆن'}`;
  daysEl.textContent = String(days);
  hoursEl.textContent = String(hours);
  minutesEl.textContent = String(minutes);
  secondsEl.textContent = String(seconds).padStart(2, '0');
  if (dot) dot.classList.remove('expired');
  if (note) note.textContent = 'کاتژمێرەکە هەر ٣ ڕۆژ خۆکارانە دەچێتە خولی نوێ؛ تۆمارکردنی تێکردن کاتی خولەکە لە نوێوە دەست پێدەکات.';
}

function renderHomeRecentRefuels() {
  const container = document.getElementById('homeRecentRefuels');
  if (!container) return;
  const recent = [...fuelRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  if (recent.length === 0) {
    container.innerHTML = '<div class="home-recent-empty">هێشتا هیچ تێکردنێک تۆمار نەکراوە</div>';
    return;
  }

  container.innerHTML = recent.map(record => {
    const date = new Date(record.date);
    const validDate = !Number.isNaN(date.getTime());
    const dateText = validDate
      ? `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
      : escapeHtml(record.date || '—');
    const timeText = validDate
      ? date.toLocaleTimeString('ckb-IQ', { hour: 'numeric', minute: '2-digit' })
      : '—';
    return `
      <article class="home-recent-card">
        <div class="home-recent-top">
          <strong>${escapeHtml(record.vehicleName || 'تێکردنی بەنزین')}</strong>
          <span class="home-recent-code">${escapeHtml(record.code || 'کۆپۆن')}</span>
        </div>
        <div class="home-recent-meta">
          <div><span>شوێن</span><strong>${escapeHtml(record.station || 'وێستگەی بەنزین')}</strong></div>
          <div><span>بەروار و کات</span><strong dir="ltr">${dateText} · ${timeText}</strong></div>
        </div>
      </article>
    `;
  }).join('');
}

// ========================================================
// BACKUP & RESTORE
// ========================================================
function exportDataJSON() {
  const data = {
    app: 'Kurdish Fuel & Coupon App',
    version: '3.0',
    exportDate: new Date().toISOString(),
    coupons,
    fuelRecords,
    pinConfig: getStoredPinConfig()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kurdish_fuel_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('داتاکان دەرهێنران (Backup Exported) 📥');
}

function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.coupons && Array.isArray(data.coupons)) {
        coupons = data.coupons;
        saveCoupons();
      }
      if (data.fuelRecords && Array.isArray(data.fuelRecords)) {
        fuelRecords = data.fuelRecords;
        saveFuels();
      }
      if (data.pinConfig) {
        savePinConfig(data.pinConfig);
      }
      renderAll();
      showToast('داتاکان بە سەرکەوتوویی گەڕێندرانەوە! ✅');
    } catch (err) {
      alert('فایلی هەڵبژێردراو نادروستە!');
    }
  };
  reader.readAsText(file);
}

function clearAllDataPrompt() {
  if (confirm('ئاگاداری: ئایا دڵنیایت لە سڕینەوەی هەموو داتاکانی کۆبۆن و بەنزین؟ ئەم کردەیە ناگەڕێتەوە.')) {
    localStorage.removeItem(STORAGE_KEY_COUPONS);
    localStorage.removeItem(STORAGE_KEY_FUELS);
    coupons = [];
    fuelRecords = [];
    loadData();
    renderAll();
    showToast('هەموو داتاکان سڕانەوە');
  }
}

// ========================================================
// UTILITIES
// ========================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
  }, 2800);
}

function formatToDatetimeLocal(date) {
  const d = new Date(date);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
