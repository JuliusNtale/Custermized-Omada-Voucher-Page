/**
 * Business dashboard for the Wi-Fi hotspot operator.
 *
 * Talks only to GET /api/admin/stats (guarded by the admin key). The key is
 * entered once, kept in sessionStorage for the tab, and sent as x-admin-key.
 * No external libraries - the trend chart is hand-drawn SVG.
 */
(function () {
  'use strict';

  var KEY_STORE = 'ntl_admin_key';
  var app = document.getElementById('app');

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) {
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }
  function clear() { app.innerHTML = ''; }

  function getKey() {
    try { return sessionStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; }
  }
  function setKey(v) {
    try { sessionStorage.setItem(KEY_STORE, v); } catch (e) { /* private mode */ }
  }
  function forgetKey() {
    try { sessionStorage.removeItem(KEY_STORE); } catch (e) { /* ignore */ }
  }

  // ---- formatting ----
  function money(n, ccy) {
    return (Number(n) || 0).toLocaleString('en-US') + ' ' + (ccy || 'TZS');
  }
  function num(n) { return (Number(n) || 0).toLocaleString('en-US'); }
  function shortDate(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  }
  function ago(iso) {
    if (!iso) return 'never';
    var s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  // ---- login ----
  function renderLogin(message) {
    clear();
    var input = el('input', { type: 'password', placeholder: 'Admin key', autocomplete: 'off' });
    var btn = el('button', { class: 'primary', type: 'button' }, ['Open dashboard']);
    var wrap = el('div', { class: 'login-wrap' }, [
      el('div', { class: 'login-card' }, [
        el('h1', {}, ['Business Dashboard']),
        el('p', {}, ['Enter the admin key to continue.']),
        message ? el('div', { class: 'err' }, [message]) : document.createTextNode(''),
        input,
        btn,
      ]),
    ]);
    app.appendChild(wrap);
    input.focus();
    function submit() {
      var v = input.value.trim();
      if (!v) return;
      setKey(v);
      load();
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

  // ---- data ----
  function load() {
    clear();
    app.appendChild(el('p', { class: 'loading' }, ['Crunching numbers…']));
    fetch('/api/admin/stats', { headers: { 'x-admin-key': getKey() } })
      .then(function (res) {
        if (res.status === 401) { forgetKey(); renderLogin('That key was not accepted.'); return null; }
        if (!res.ok) throw new Error('Server returned ' + res.status);
        return res.json();
      })
      .then(function (data) { if (data) render(data); })
      .catch(function (err) {
        clear();
        app.appendChild(el('div', { class: 'wrap' }, [
          el('div', { class: 'card' }, ['Could not load stats: ' + err.message]),
        ]));
      });
  }

  // ---- render ----
  function tile(label, value, sub, cls) {
    return el('div', { class: 'tile' + (cls ? ' ' + cls : '') }, [
      el('div', { class: 'label' }, [label]),
      el('div', { class: 'value' }, [String(value)]),
      sub ? el('div', { class: 'sub' }, [sub]) : document.createTextNode(''),
    ]);
  }

  function trendChart(trend, ccy) {
    var W = 900, H = 200, padL = 8, padR = 8, padT = 12, padB = 22;
    var max = Math.max(1, Math.max.apply(null, trend.map(function (d) { return d.revenue; })));
    var n = trend.length;
    var x = function (i) { return padL + (i * (W - padL - padR)) / Math.max(1, n - 1); };
    var y = function (v) { return padT + (1 - v / max) * (H - padT - padB); };

    var pts = trend.map(function (d, i) { return x(i) + ',' + y(d.revenue); });
    var line = 'M' + pts.join(' L');
    var area = 'M' + x(0) + ',' + y(0) + ' L' + pts.join(' L') + ' L' + x(n - 1) + ',' + y(0) + ' Z';

    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    // 3 gridlines
    [0.25, 0.5, 0.75].forEach(function (f) {
      var gy = padT + f * (H - padT - padB);
      svg += '<line class="grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" />';
    });
    svg += '<path class="area" d="' + area + '" />';
    svg += '<path class="line" d="' + line + '" />';
    // dots + labels on first, mid, last
    [0, Math.floor(n / 2), n - 1].forEach(function (i) {
      svg += '<circle class="dot" cx="' + x(i) + '" cy="' + y(trend[i].revenue) + '" r="3" />';
    });
    svg += '<text x="' + padL + '" y="' + (H - 6) + '" text-anchor="start">' + shortDate(trend[0].date) + '</text>';
    svg += '<text x="' + (W / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + shortDate(trend[Math.floor(n / 2)].date) + '</text>';
    svg += '<text x="' + (W - padR) + '" y="' + (H - 6) + '" text-anchor="end">' + shortDate(trend[n - 1].date) + '</text>';
    svg += '<text x="' + padL + '" y="' + (padT + 4) + '" text-anchor="start">peak ' + money(max, ccy) + '</text>';
    svg += '</svg>';

    var box = el('div', { class: 'card' });
    box.innerHTML = svg;
    return box;
  }

  function barList(rows, valueFmt) {
    var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.value; })));
    return el('div', { class: 'bars' }, rows.map(function (r) {
      return el('div', { class: 'bar-row' }, [
        el('div', {}, [r.label]),
        el('div', { class: 'bar-track' }, [
          el('div', { class: 'bar-fill', style: 'width:' + (r.value / max * 100).toFixed(1) + '%' }, []),
        ]),
        el('div', {}, [valueFmt(r)]),
      ]);
    }));
  }

  function table(headers, rows) {
    var thead = el('tr', {}, headers.map(function (h) {
      return el('th', { class: h.num ? 'num' : '' }, [h.label]);
    }));
    var body = rows.map(function (cells) {
      return el('tr', {}, cells.map(function (c) {
        return el('td', { class: c.num ? 'num' : '' }, [
          c.pill ? el('span', { class: 'pill ' + c.pill }, [String(c.text)]) : String(c.text),
        ]);
      }));
    });
    return el('table', {}, [el('thead', {}, [thead]), el('tbody', {}, body)]);
  }

  function render(d) {
    clear();
    var ccy = d.currency || 'TZS';
    var r = d.revenue, f = d.funnel, c = d.customers, o = d.operational;

    var refreshBtn = el('button', { class: 'ghost', type: 'button' }, ['Refresh']);
    refreshBtn.addEventListener('click', function () {
      fetch('/api/admin/stats?refresh=1', { headers: { 'x-admin-key': getKey() } })
        .then(function (x) { return x.json(); })
        .then(render)
        .catch(function () { load(); });
    });
    var logoutBtn = el('button', { class: 'ghost', type: 'button' }, ['Lock']);
    logoutBtn.addEventListener('click', function () { forgetKey(); renderLogin(); });

    var wrap = el('div', { class: 'wrap' }, [
      el('header', { class: 'bar' }, [
        el('h1', {}, ['Business Dashboard']),
        el('div', { class: 'meta' }, [
          (d.cached ? 'cached · ' : 'live · ') + 'updated ' + ago(d.generatedAt),
        ]),
        el('div', {}, [refreshBtn, ' ', logoutBtn]),
      ]),

      // Revenue
      el('section', {}, [
        el('h2', {}, ['Revenue']),
        el('div', { class: 'grid' }, [
          tile('Today', money(r.today, ccy), r.salesToday + ' sale' + (r.salesToday === 1 ? '' : 's')),
          tile('Last 7 days', money(r.last7d, ccy), r.salesLast7d + ' sales'),
          tile('Last 30 days', money(r.last30d, ccy), r.salesLast30d + ' sales'),
          tile('All time', money(r.allTime, ccy), r.salesAllTime + ' sales'),
        ]),
      ]),

      // Trend
      el('section', {}, [
        el('h2', {}, ['Revenue - last 30 days']),
        trendChart(r.dailyTrend, ccy),
      ]),

      el('div', { class: 'two-col' }, [
        // By package
        el('section', {}, [
          el('h2', {}, ['Sales by package']),
          el('div', { class: 'card' }, [
            r.byPackage.length
              ? barList(
                  r.byPackage.map(function (p) { return { label: p.name, value: p.revenue, sales: p.sales }; }),
                  function (row) { return money(row.value, ccy) + '  (' + row.sales + ')'; }
                )
              : el('div', { class: 'sub' }, ['No sales yet.']),
          ]),
        ]),

        // Funnel
        el('section', {}, [
          el('h2', {}, ['Conversion - last ' + f.windowDays + ' days']),
          el('div', { class: 'card' }, [
            el('div', { class: 'grid' }, [
              tile('Started', num(f.started)),
              tile('Paid', num(f.paid), f.successRatePct + '% success', 'good'),
              tile('Failed', num(f.failed)),
              tile('Abandoned', num(f.inFlight)),
            ]),
            f.failureReasons.length
              ? el('div', { style: 'margin-top:12px' }, [
                  el('h2', {}, ['Top failure reasons']),
                  table(
                    [{ label: 'Reason' }, { label: 'Count', num: true }],
                    f.failureReasons.map(function (x) { return [{ text: x.reason }, { text: num(x.count), num: true }]; })
                  ),
                ])
              : document.createTextNode(''),
          ]),
        ]),
      ]),

      el('div', { class: 'two-col' }, [
        // Customers
        el('section', {}, [
          el('h2', {}, ['Customers']),
          el('div', { class: 'card' }, [
            el('div', { class: 'grid' }, [
              tile('Total', num(c.total)),
              tile('Repeat buyers', num(c.repeat)),
              tile('New (7d)', num(c.newLast7d)),
            ]),
            c.topSpenders.length
              ? el('div', { style: 'margin-top:12px' }, [
                  el('h2', {}, ['Top spenders']),
                  table(
                    [{ label: 'Phone' }, { label: 'Sales', num: true }, { label: 'Spent', num: true }],
                    c.topSpenders.map(function (x) {
                      return [
                        { text: x.phoneNumber },
                        { text: num(x.sales), num: true },
                        { text: money(x.totalSpent, ccy), num: true },
                      ];
                    })
                  ),
                ])
              : document.createTextNode(''),
          ]),
        ]),

        // Operational
        el('section', {}, [
          el('h2', {}, ['Operations']),
          el('div', { class: 'card' }, [
            el('div', { class: 'grid' }, [
              tile('Active vouchers', num(o.activeVouchers)),
              tile('Failed jobs', num(o.failedJobs), o.failedJobs ? 'needs attention' : 'all clear', o.failedJobs ? 'alert' : 'good'),
              tile('Last sale', ago(o.lastSaleAt)),
            ]),
          ]),
        ]),
      ]),

      el('div', { class: 'foot' }, ['Figures from the payment database (source of truth). Days are East Africa Time.']),
    ]);

    app.appendChild(wrap);
  }

  // ---- boot ----
  if (getKey()) load();
  else renderLogin();
})();
