/**
 * Captive portal frontend logic.
 *
 * This talks ONLY to our own backend API (never to Omada directly, and never
 * to ClickPesa directly - no payment credentials exist anywhere near this
 * file). Flow:
 *
 *   packages -> phone -> POST /api/payments -> poll GET /api/payments/:id/status
 *     -> (once voucher CREATED) POST /api/portal/authenticate -> connected
 *
 * There is no SMS step: the customer is auto-authenticated here and shown the
 * voucher code on-screen to reconnect later.
 *
 * Omada's External Portal redirect appends context about the connecting
 * client as query params; we read them once on load and pass them straight
 * through to POST /api/payments so the backend can preserve them
 * (PortalSession) and eventually authorize this exact MAC - see
 * src/modules/portal/portal.service.ts.
 */
(function () {
  'use strict';

  var qs = new URLSearchParams(window.location.search);
  var context = {
    clientMac: qs.get('clientMac') || '',
    apMac: qs.get('apMac') || undefined,
    // Omada's own bundled portal template calls this "ssidName"; our API calls it "ssid".
    ssid: qs.get('ssidName') || qs.get('ssid') || undefined,
    siteId: qs.get('site') || qs.get('siteId') || undefined,
    redirectUrl: qs.get('originUrl') || qs.get('redirectUrl') || undefined,
  };

  var app = document.getElementById('app');
  var state = {
    packages: [],
    selectedPackage: null,
    paymentId: null,
    pollTimer: null,
    pollStartedAt: null,
    authenticated: false,
  };

  var POLL_INTERVAL_MS = 3000;
  // If a voucher hasn't been created ~2 minutes after payment SUCCESS, stop
  // polling and tell the customer their access is still activating instead of
  // spinning forever (spec: never claim success before the voucher exists).
  var POLL_GIVE_UP_MS = 2 * 60 * 1000;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'class') node.className = attrs[key];
      else if (key === 'html') node.innerHTML = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function render(children) {
    app.innerHTML = '';
    app.appendChild(el('img', { class: 'logo', src: '/logo.png', alt: '' }));
    children.forEach(function (c) {
      app.appendChild(c);
    });
  }

  function formatDuration(seconds) {
    if (seconds % 86400 === 0) {
      var days = seconds / 86400;
      return days === 1 ? '1 Day' : days + ' Days';
    }
    if (seconds % 3600 === 0) {
      var hours = seconds / 3600;
      return hours === 1 ? '1 Hour' : hours + ' Hours';
    }
    var minutes = Math.round(seconds / 60);
    return minutes + ' min';
  }

  function formatPrice(pkg) {
    return Number(pkg.price).toLocaleString() + ' ' + pkg.currency;
  }

  function apiFetch(path, options) {
    return fetch(path, options).then(function (res) {
      return res.json().then(
        function (body) {
          if (!res.ok) {
            var message = (body && body.error && body.error.message) || 'Something went wrong. Please try again.';
            throw new Error(message);
          }
          return body;
        },
        function () {
          throw new Error('Unexpected response from server.');
        },
      );
    });
  }

  // ---- Views ----------------------------------------------------------

  function showPackages() {
    apiFetch('/api/packages')
      .then(function (body) {
        state.packages = body.packages || [];
        if (state.packages.length === 0) {
          renderError('No packages are available right now. Please try again shortly.');
          return;
        }
        renderPackages();
      })
      .catch(function (err) {
        renderError(err.message);
      });
  }

  function renderPackages() {
    var list = el('div', { class: 'packages' });
    state.packages.forEach(function (pkg) {
      var item = el('button', { class: 'package', type: 'button' }, [
        el('span', {}, [
          el('span', { class: 'package-name' }, [pkg.name]),
          document.createElement('br'),
          el('span', { class: 'package-duration' }, [formatDuration(pkg.durationSeconds)]),
        ]),
        el('span', { class: 'package-price' }, [formatPrice(pkg)]),
      ]);
      item.addEventListener('click', function () {
        state.selectedPackage = pkg;
        renderPhoneEntry();
      });
      list.appendChild(item);
    });

    render([
      el('h1', {}, ['Choose your Internet package']),
      el('p', { class: 'subtitle' }, ['Pay by mobile money. Instant activation.']),
      list,
    ]);
  }

  function renderPhoneEntry(errorMessage) {
    var pkg = state.selectedPackage;

    var phoneInput = el('input', {
      type: 'tel',
      inputmode: 'numeric',
      autocomplete: 'tel-national',
      placeholder: '7XX XXX XXX',
      maxlength: '12',
    });

    var errorEl = errorMessage ? el('p', { class: 'error-msg' }, [errorMessage]) : null;

    var continueBtn = el('button', { class: 'primary', type: 'button' }, ['Continue']);
    continueBtn.addEventListener('click', function () {
      var digits = phoneInput.value.replace(/\D/g, '');
      if (digits.length < 9) {
        renderPhoneEntry('Please enter a valid phone number.');
        return;
      }
      continueBtn.disabled = true;
      continueBtn.textContent = 'Please wait…';
      submitPayment('+255' + digits.replace(/^0+/, ''));
    });

    var backBtn = el('button', { class: 'link', type: 'button' }, ['Choose a different package']);
    backBtn.addEventListener('click', renderPackages);

    var children = [
      el('h1', {}, ['Enter your phone number']),
      el(
        'div',
        { class: 'selected-summary' },
        [pkg.name + ' - ' + formatDuration(pkg.durationSeconds) + ' - ' + formatPrice(pkg)],
      ),
      el('div', { class: 'phone-row' }, [el('span', { class: 'country-code' }, ['+255']), phoneInput]),
    ];
    if (errorEl) children.push(errorEl);
    children.push(continueBtn, backBtn);

    render(children);
    phoneInput.focus();
  }

  function submitPayment(phoneNumber) {
    apiFetch('/api/payments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        packageId: state.selectedPackage.id,
        phoneNumber: phoneNumber,
        clientMac: context.clientMac,
        apMac: context.apMac,
        ssid: context.ssid,
        siteId: context.siteId,
        redirectUrl: context.redirectUrl,
      }),
    })
      .then(function (body) {
        state.paymentId = body.paymentId;
        if (body.status === 'FAILED' || body.status === 'CANCELLED' || body.status === 'EXPIRED') {
          renderPaymentFailed();
          return;
        }
        renderPending();
        startPolling();
      })
      .catch(function (err) {
        renderPhoneEntry(err.message);
      });
  }

  function renderPending() {
    render([
      el('div', { class: 'spinner' }),
      el('h1', {}, ['Check your phone']),
      el('p', { class: 'subtitle' }, ['Approve the mobile money payment request to activate your Internet access.']),
      el('p', { class: 'status-detail', id: 'status-detail' }, ['Waiting for payment confirmation…']),
    ]);
  }

  function startPolling() {
    state.pollStartedAt = Date.now();
    clearInterval(state.pollTimer);
    state.pollTimer = setInterval(pollStatus, POLL_INTERVAL_MS);
    pollStatus();
  }

  function pollStatus() {
    apiFetch('/api/payments/' + state.paymentId + '/status')
      .then(handleStatus)
      .catch(function () {
        // Transient network hiccup - keep polling, don't blow up the UI.
      });
  }

  function handleStatus(status) {
    var detail = document.getElementById('status-detail');

    if (status.paymentStatus === 'FAILED' || status.paymentStatus === 'CANCELLED' || status.paymentStatus === 'EXPIRED') {
      clearInterval(state.pollTimer);
      renderPaymentFailed();
      return;
    }

    if (status.paymentStatus === 'SUCCESS') {
      if (detail) detail.textContent = 'Payment received. Activating your Internet access…';

      if (status.voucherStatus === 'CREATED') {
        clearInterval(state.pollTimer);
        authenticateAndFinish(status.voucherCode);
        return;
      }

      if (status.voucherStatus === 'FAILED' || Date.now() - state.pollStartedAt > POLL_GIVE_UP_MS) {
        clearInterval(state.pollTimer);
        renderProvisioningDelayed();
      }
    }
  }

  function authenticateAndFinish(voucherCode) {
    if (state.authenticated) return;
    state.authenticated = true;

    apiFetch('/api/portal/authenticate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentId: state.paymentId }),
    })
      .then(function () {
        renderSuccess(voucherCode);
      })
      .catch(function () {
        // Voucher exists but auto-auth failed - the customer can still use
        // the voucher code manually on Omada's own login prompt as a fallback.
        renderSuccess(voucherCode, true);
      });
  }

  function renderSuccess(voucherCode, manualFallback) {
    var children = [
      el('div', { class: 'success-icon' }, ['✓']),
      el('h1', {}, ["You're connected!"]),
    ];

    if (manualFallback) {
      children.push(
        el('p', { class: 'subtitle' }, [
          "Your access is ready. If you're not automatically online, enter this code on the Wi-Fi login screen:",
        ]),
      );
    } else {
      children.push(el('p', { class: 'subtitle' }, ['Your Internet access is active. Enjoy!']));
    }

    if (voucherCode) {
      children.push(el('div', { class: 'voucher-code' }, [voucherCode]));
      children.push(
        el('p', { class: 'status-detail' }, ['Keep this code to reconnect this device later.']),
      );
    }

    if (context.redirectUrl) {
      var continueBtn = el('button', { class: 'primary', type: 'button' }, ['Continue browsing']);
      continueBtn.addEventListener('click', function () {
        window.location.href = context.redirectUrl;
      });
      children.push(continueBtn);
    }

    render(children);
  }

  function renderProvisioningDelayed() {
    render([
      el('div', { class: 'error-icon' }, ['!']),
      el('h1', {}, ['Payment received']),
      el('p', { class: 'subtitle' }, [
        "We're still activating your Internet access - this is taking longer than usual. " +
          'Please keep this page open; it will connect automatically once ready.',
      ]),
    ]);
  }

  function renderPaymentFailed() {
    var retryBtn = el('button', { class: 'primary', type: 'button' }, ['Try again']);
    retryBtn.addEventListener('click', renderPackages);

    render([
      el('div', { class: 'error-icon' }, ['✕']),
      el('h1', {}, ['Payment not completed']),
      el('p', { class: 'subtitle' }, ['The payment was not successful. No charge was made. Please try again.']),
      retryBtn,
    ]);
  }

  function renderError(message) {
    render([el('h1', {}, ['Something went wrong']), el('p', { class: 'subtitle' }, [message])]);
  }

  showPackages();
})();
