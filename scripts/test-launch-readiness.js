/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Comprehensive Launch Readiness & End-to-End Validation
 * Uses native Headless Chrome with Chrome DevTools Protocol (CDP)
 */

const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9399;
const tmpDir = path.join(os.tmpdir(), 'chrome-launch-audit-' + Date.now());

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${tmpDir}`,
  '--disable-extensions',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const listRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json`, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const page = listRes.find(t => t.type === 'page') || listRes[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise(res => {
        const id = msgId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            res(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onopen = async () => {
      const pageExceptions = [];
      const pageErrors = [];

      ws.addEventListener('message', (evt) => {
        const data = JSON.parse(evt.data);
        if (data.method === 'Runtime.exceptionThrown') {
          pageExceptions.push(data.params.exceptionDetails);
          console.error('❌ [PAGE EXCEPTION]:', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
        }
        if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
          pageErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
          console.error('⚠️ [CONSOLE ERROR]:', pageErrors[pageErrors.length - 1]);
        }
      });

      await send('Runtime.enable');
      await send('Page.enable');

      console.log('\n======================================================');
      console.log('PHASE 1: Customer Portal & Real Booking Lifecycle');
      console.log('======================================================');
      await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
      await new Promise(r => setTimeout(r, 2000));

      const customerCheck = await send('Runtime.evaluate', {
        expression: `(async () => {
          // 1. Initial elements
          const hasBranding = document.body.innerText.includes('OneWayTaxiBihar');
          const hasHelpline = document.body.innerText.includes('80021 41816');
          const hasWhatsApp = document.body.innerHTML.includes('7281851011') || document.body.innerText.includes('72818');

          // 2. Set route & mobile & check fare
          const pInput = document.getElementById('input-pickup');
          const dInput = document.getElementById('input-drop');
          if (pInput) {
            pInput.value = 'Patna';
            pInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (dInput) {
            dInput.value = 'Gaya';
            dInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (window.bookingManager) {
            const patna = (window.OTB_CITIES || []).find(c => c.name === 'Patna');
            const gaya = (window.OTB_CITIES || []).find(c => c.name === 'Gaya');
            if (patna) window.bookingManager.originCity = patna;
            if (gaya) window.bookingManager.destCity = gaya;
          }

          const phoneInput = document.getElementById('input-fare-phone') || document.getElementById('input-mobile');
          if (phoneInput) {
            phoneInput.value = '9876543210';
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          const checkBtn = document.getElementById('btn-check-fare');
          if (checkBtn) checkBtn.click();
          await new Promise(r => setTimeout(r, 1500));

          const cabCards = document.querySelectorAll('.cab-tier-card');
          const cabCount = cabCards.length;

          // 3. Select cab (Sedan)
          let authOpened = false;
          let checkoutOpened = false;
          let bookingConfirmed = false;
          let testBookingId = '';

          const sedanCard = cabCards[1] || cabCards[0];
          const selectBtn = sedanCard ? sedanCard.querySelector('.btn-select-cab') : null;
          if (selectBtn) {
            selectBtn.click();
            await new Promise(r => setTimeout(r, 600));

            const authModal = document.getElementById('modal-auth');
            if (authModal && authModal.classList.contains('open')) {
              authOpened = true;
              // Submit auth phone
              const authPhone = document.getElementById('auth-mobile-input') || document.getElementById('auth-phone-input');
              const authName = document.getElementById('auth-name-input');
              if (authPhone) {
                authPhone.value = '9876543210';
                authPhone.dispatchEvent(new Event('input', { bubbles: true }));
              }
              if (authName) {
                authName.value = 'Aditya Kumar';
                authName.dispatchEvent(new Event('input', { bubbles: true }));
              }

              if (typeof window.handleSendVerificationCode === 'function') {
                await window.handleSendVerificationCode();
                await new Promise(r => setTimeout(r, 1000));
                if (typeof window.handleVerifyOtpCode === 'function') {
                  await window.handleVerifyOtpCode();
                  await new Promise(r => setTimeout(r, 1200));
                }
              }
            }

            // Check if checkout modal is open
            const chkModal = document.getElementById('modal-checkout');
            if (chkModal && chkModal.classList.contains('open')) {
              checkoutOpened = true;
              // Step 1 to Step 2
              if (window.bookingManager && typeof window.bookingManager.goToCheckoutStep === 'function') {
                window.bookingManager.goToCheckoutStep(2);
                await new Promise(r => setTimeout(r, 600));
              }

              // Confirm booking
              if (window.bookingManager && typeof window.bookingManager.confirmBooking === 'function') {
                await window.bookingManager.confirmBooking();
                await new Promise(r => setTimeout(r, 1500));

                const confModal = document.getElementById('modal-confirmation');
                if (confModal && confModal.classList.contains('open')) {
                  bookingConfirmed = true;
                  const bodyText = document.getElementById('modal-confirmation-body')?.innerText || '';
                  const m = bodyText.match(/OTB-2026-\d+/);
                  if (m) testBookingId = m[0];
                }
              }
            }
          }

          return {
            hasBranding,
            hasHelpline,
            hasWhatsApp,
            cabCount,
            authOpened,
            checkoutOpened,
            bookingConfirmed,
            testBookingId
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Customer Portal Result:', JSON.stringify(customerCheck.result?.value, null, 2));

      console.log('\n======================================================');
      console.log('PHASE 2: Admin Dispatch Console & Live Ops');
      console.log('======================================================');
      await send('Page.navigate', { url: 'http://localhost:8080/admin.html' });
      await new Promise(r => setTimeout(r, 2000));

      const adminCheck = await send('Runtime.evaluate', {
        expression: `(async () => {
          // Direct admin login
          const userInput = document.getElementById('admin-user-input');
          const passInput = document.getElementById('admin-pass-input');
          if (userInput) userInput.value = 'admin';
          if (passInput) passInput.value = 'admin123';

          const loginBtn = document.getElementById('btn-admin-direct-login');
          if (loginBtn) {
            loginBtn.click();
            await new Promise(r => setTimeout(r, 1200));
          }

          const loginView = document.getElementById('admin-login-view');
          const dashView = document.getElementById('admin-dashboard-view');
          const isLoggedIn = (!loginView || loginView.style.display === 'none') && (dashView && dashView.style.display !== 'none');

          // Switch to Bookings Tab
          if (typeof window.switchMainTab === 'function') window.switchMainTab('bookings');
          await new Promise(r => setTimeout(r, 600));

          const bookingsTbody = document.getElementById('admin-bookings-tbody');
          const bookingsCount = bookingsTbody ? bookingsTbody.querySelectorAll('tr').length : 0;
          const hasWhatsAppPills = bookingsTbody ? bookingsTbody.innerHTML.includes('wa.me') : false;

          // Switch to Drivers Tab
          if (typeof window.switchMainTab === 'function') window.switchMainTab('drivers');
          await new Promise(r => setTimeout(r, 600));

          const driversGrid = document.getElementById('admin-drivers-grid') || document.getElementById('admin-drivers-tbody');
          const driversCount = driversGrid ? (driversGrid.querySelectorAll('div[style*="border-radius"]').length || (driversGrid.children ? driversGrid.children.length : 0)) : 0;

          // Switch to Leads Tab
          if (typeof window.switchMainTab === 'function') window.switchMainTab('leads');
          await new Promise(r => setTimeout(r, 600));
          const leadsTbody = document.getElementById('admin-leads-tbody');
          const leadsCount = leadsTbody ? leadsTbody.querySelectorAll('tr').length : 0;

          return {
            isLoggedIn,
            bookingsCount,
            hasWhatsAppPills,
            driversCount,
            leadsCount
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Admin Portal Result:', JSON.stringify(adminCheck.result?.value, null, 2));

      console.log('\n======================================================');
      console.log('PHASE 3: Driver Partner Console');
      console.log('======================================================');
      await send('Page.navigate', { url: 'http://localhost:8080/driver.html' });
      await new Promise(r => setTimeout(r, 2000));

      const driverCheck = await send('Runtime.evaluate', {
        expression: `(async () => {
          const phoneInput = document.getElementById('driver-phone-input');
          const pinInput = document.getElementById('driver-pin-input');
          if (phoneInput) phoneInput.value = '9431012345';
          if (pinInput) pinInput.value = '1234';

          if (typeof window.handleDriverLogin === 'function') {
            await window.handleDriverLogin();
            await new Promise(r => setTimeout(r, 1200));
          }

          const loginView = document.getElementById('driver-login-view');
          const dashView = document.getElementById('driver-dashboard-view');
          const isDriverLoggedIn = (!loginView || loginView.style.display === 'none') && (dashView && dashView.style.display !== 'none');
          const driverName = (document.getElementById('driver-name-display') || document.getElementById('driver-header-name'))?.textContent || '';

          return {
            isDriverLoggedIn,
            driverName: driverName.trim()
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Driver Portal Result:', JSON.stringify(driverCheck.result?.value, null, 2));

      console.log('\n======================================================');
      console.log('LAUNCH READINESS SUMMARY');
      console.log('Page Exceptions:', pageExceptions.length);
      console.log('Console Errors:', pageErrors.length);
      console.log('======================================================');

      chrome.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Launch test failed:', err);
    chrome.kill();
    process.exit(1);
  }
}, 1500);
