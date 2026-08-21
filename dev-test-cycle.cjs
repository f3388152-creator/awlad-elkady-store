const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:3000';
const PRODUCT_TITLE = `اختبار تشغيلي ${Date.now()}`;
const PRODUCT_PRICE = '125';
const PRODUCT_ORIGINAL = '180';
const PRODUCT_STOCK = '7';
const CUSTOMER_NAME = `عميل اختبار ${Date.now()}`;
const CUSTOMER_PHONE = '01012345678';
const CUSTOMER_ADDRESS = 'شارع الاختبار، أسوان';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`console.${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    console.log(`pageerror: ${error.message}`);
  });

  await page.goto(`${BASE}/Admin/index.html`, { waitUntil: 'networkidle' });

  await page.locator('#managerLoginForm input[name="password"]').fill('@@');
  await page.locator('#pinInput').waitFor({ state: 'visible' });
  await page.locator('#pinInput').fill('500900');
  await page.locator('#pinForm').press('Enter');

  await page.evaluate(() => {
    document.querySelector('[data-section="products"]')?.click();
  });
  await page.locator('#productForm').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#productForm input[name="title"]').fill(PRODUCT_TITLE);
  await page.locator('#productForm input[name="price"]').fill(PRODUCT_PRICE);
  await page.locator('#productForm input[name="original_price"]').fill(PRODUCT_ORIGINAL);
  await page.locator('#productForm input[name="stock_qty"]').fill(PRODUCT_STOCK);
  await page.locator('#productForm select[name="bosta_weight"]').selectOption('small_medium');
  await page.locator('#productForm textarea[name="description"]').fill('منتج اختبار من دورة التحقق المحلية.');
  await page.locator('#productForm').evaluate((form) => form.requestSubmit());

  await page.getByText(PRODUCT_TITLE, { exact: false }).waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: 'admin-after-product.png', fullPage: true });

  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.getByText(PRODUCT_TITLE, { exact: false }).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('.product-card', { hasText: PRODUCT_TITLE }).locator('.js-trigger-checkout').click();

  await page.locator('#checkoutForm').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#checkoutForm input[name="fullName"]').fill(CUSTOMER_NAME);
  await page.locator('#checkoutForm input[name="phone"]').fill(CUSTOMER_PHONE);
  const altPhone = page.locator('#checkoutForm input[name="altPhone"]');
  if (await altPhone.count()) {
    await altPhone.fill('01000000000');
  }
  const governorateValue = await page.locator('#checkoutForm select[name="governorate"]').evaluate((select) => {
    const option = Array.from(select.options).find((opt) => opt.value);
    return option ? option.value : '';
  });
  if (!governorateValue) {
    throw new Error('No governorate option available in checkout form');
  }
  await page.locator('#checkoutForm select[name="governorate"]').selectOption(governorateValue);
  await page.locator('#checkoutForm textarea[name="address"]').fill(CUSTOMER_ADDRESS);
  const notes = page.locator('#checkoutForm textarea[name="notes"]');
  if (await notes.count()) {
    await notes.fill('طلب اختبار محلي.');
  }

  const createLabelResponse = page.waitForResponse((response) =>
    response.url().includes('/api/bosta-create-label') && response.request().method() === 'POST'
  );
  await page.locator('#checkoutForm').evaluate((form) => form.requestSubmit());
  const response = await createLabelResponse;
  const responseJson = await response.json();
  if (!response.ok() || !responseJson.ok) {
    throw new Error(`Order submission failed: ${JSON.stringify(responseJson)}`);
  }
  await page.screenshot({ path: 'landing-after-order.png', fullPage: true });

  await page.goto(`${BASE}/Admin/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.querySelector('[data-section="orders"]')?.click();
  });
  await page.locator('#ordersRoot').getByText(CUSTOMER_NAME, { exact: false }).waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: 'admin-after-order.png', fullPage: true });

  console.log(JSON.stringify({
    productTitle: PRODUCT_TITLE,
    orderResponse: responseJson,
    verified: true
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
