(function () {
  'use strict';
  var API = '/api'; // same server, so no CORS and nothing to configure
  var app = document.getElementById('app');
  var state = { user: null, tab: 'overview' };

  function h(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el; // text is always added as text nodes, so user data cannot inject HTML
  }

  function toast(text) {
    var t = h('div', { class: 'toast' }, text);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  function request(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var token = sessionStorage.getItem('adminToken');
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (res) {
      if (res.status === 204) return null;
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          if (res.status === 401 && token) logout();
          throw new Error(data.message || 'Request failed');
        }
        return data;
      });
    });
  }

  function logout() {
    sessionStorage.removeItem('adminToken');
    state.user = null;
    render();
  }

  function date(iso) { return new Date(iso).toLocaleDateString(); }

  function renderLogin(message) {
    var email = h('input', { type: 'email', id: 'email', autocomplete: 'username' });
    var pass = h('input', { type: 'password', id: 'password', autocomplete: 'current-password' });
    var err = h('div', { class: 'error', style: message ? '' : 'display:none' }, message || '');
    var btn = h('button', { type: 'submit' }, 'Log in');
    var form = h('form', { class: 'login', onsubmit: function (e) {
      e.preventDefault();
      err.style.display = 'none';
      if (!email.value || !pass.value) { err.textContent = 'Enter your email and password.'; err.style.display = 'block'; return; }
      btn.disabled = true;
      request('POST', '/auth/login', { email: email.value.trim(), password: pass.value }).then(function (data) {
        if (data.user.role !== 'admin') throw new Error('This account is not an admin.');
        sessionStorage.setItem('adminToken', data.token);
        state.user = data.user;
        state.tab = 'overview';
        render();
      }).catch(function (ex) {
        err.textContent = ex.message; err.style.display = 'block'; btn.disabled = false;
      });
    } },
      h('h1', {}, 'Fernhouse admin'),
      h('p', { class: 'sub' }, 'Log in with an admin account.'),
      h('label', { for: 'email' }, 'Email'), email,
      h('label', { for: 'password' }, 'Password'), pass,
      err,
      h('div', { style: 'margin-top:16px' }, btn)
    );
    app.replaceChildren(form);
    email.focus();
  }

  var TABS = [['overview', 'Overview'], ['users', 'Users'], ['products', 'Products'], ['messages', 'Messages']];

  function renderShell() {
    var content = h('main', {}, h('p', { class: 'muted' }, 'Loading...'));
    var nav = h('nav', {}, TABS.map(function (t) {
      return h('button', { class: state.tab === t[0] ? 'active' : '', onclick: function () { state.tab = t[0]; render(); } }, t[1]);
    }));
    var layout = h('div', { class: 'layout' },
      h('aside', {}, h('h2', {}, 'Fernhouse'), h('small', {}, state.user.name + ' (admin)'), nav,
        h('button', { class: 'out', onclick: logout }, 'Log out')),
      content);
    app.replaceChildren(layout);
    return content;
  }

  function showError(main, ex) {
    main.replaceChildren(h('div', { class: 'error' }, ex.message));
  }

  function viewOverview(main) {
    request('GET', '/stats').then(function (s) {
      var cats = s.byCategory.map(function (c) { return h('tr', {}, h('td', {}, c.category), h('td', {}, c.count)); });
      main.replaceChildren(
        h('h1', {}, 'Overview'),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('span', {}, 'Users'), h('strong', {}, s.users)),
          h('div', { class: 'stat' }, h('span', {}, 'Products'), h('strong', {}, s.products)),
          h('div', { class: 'stat' }, h('span', {}, 'Messages'), h('strong', {}, s.messages))),
        h('h2', {}, 'Products by category'),
        h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Category'), h('th', {}, 'Count'))), h('tbody', {}, cats)));
    }).catch(function (ex) { showError(main, ex); });
  }

  function viewUsers(main) {
    var search = h('input', { type: 'search', placeholder: 'Search name or email' });
    var holder = h('div', {});
    function load() {
      request('GET', '/users?search=' + encodeURIComponent(search.value.trim())).then(function (res) {
        var rows = res.data.map(function (u) {
          var self = u._id === state.user._id;
          var sel = h('select', { disabled: self ? 'disabled' : null, onchange: function () {
            request('PUT', '/users/' + u._id, { role: sel.value }).then(function () { toast(u.name + ' is now ' + sel.value); }).catch(function (ex) { toast(ex.message); load(); });
          } }, h('option', { value: 'user' }, 'user'), h('option', { value: 'admin' }, 'admin'));
          sel.value = u.role;
          if (self) sel.setAttribute('disabled', 'disabled'); else sel.removeAttribute('disabled');
          var del = h('button', { class: 'danger', onclick: function () {
            if (!confirm('Delete ' + u.name + ' and all of their products?')) return;
            request('DELETE', '/users/' + u._id).then(function () { toast('User deleted'); load(); }).catch(function (ex) { toast(ex.message); });
          } }, 'Delete');
          if (self) del.setAttribute('disabled', 'disabled');
          return h('tr', {}, h('td', {}, u.name), h('td', {}, u.email), h('td', {}, sel), h('td', {}, date(u.createdAt)), h('td', {}, del));
        });
        holder.replaceChildren(h('table', {}, h('thead', {}, h('tr', {}, ['Name', 'Email', 'Role', 'Joined', ''].map(function (t) { return h('th', {}, t); }))), h('tbody', {}, rows)));
      }).catch(function (ex) { showError(holder, ex); });
    }
    var timer;
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(load, 300); });
    main.replaceChildren(h('h1', {}, 'Users'), h('div', { class: 'toolbar' }, search), holder);
    load();
  }

  function viewProducts(main) {
    var search = h('input', { type: 'search', placeholder: 'Search products' });
    var holder = h('div', {});
    function load() {
      request('GET', '/products?limit=50&search=' + encodeURIComponent(search.value.trim())).then(function (res) {
        var rows = res.data.map(function (p) {
          var del = h('button', { class: 'danger', onclick: function () {
            if (!confirm('Delete "' + p.name + '"?')) return;
            request('DELETE', '/products/' + p._id).then(function () { toast('Product deleted'); load(); }).catch(function (ex) { toast(ex.message); });
          } }, 'Delete');
          return h('tr', {}, h('td', {}, p.name), h('td', {}, p.category), h('td', {}, '$' + Number(p.price).toFixed(2)), h('td', {}, p.stock), h('td', {}, p.owner && p.owner.name ? p.owner.name : '-'), h('td', {}, del));
        });
        holder.replaceChildren(
          h('p', { class: 'muted' }, res.total + ' product(s)' + (res.total > 50 ? ' (showing the first 50)' : '')),
          h('table', {}, h('thead', {}, h('tr', {}, ['Name', 'Category', 'Price', 'Stock', 'Owner', ''].map(function (t) { return h('th', {}, t); }))), h('tbody', {}, rows)));
      }).catch(function (ex) { showError(holder, ex); });
    }
    var timer;
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(load, 300); });
    main.replaceChildren(h('h1', {}, 'Products'), h('div', { class: 'toolbar' }, search), holder);
    load();
  }

  function viewMessages(main) {
    request('GET', '/messages').then(function (res) {
      if (!res.data.length) { main.replaceChildren(h('h1', {}, 'Messages'), h('p', { class: 'muted' }, 'No messages yet.')); return; }
      var items = res.data.map(function (m) {
        return h('div', { class: 'msg' },
          h('header', {}, h('div', {}, h('strong', {}, m.subject || '(no subject)'), h('div', { class: 'muted' }, m.name + ' <' + m.email + '> - ' + date(m.createdAt))),
            h('button', { class: 'ghost', onclick: function () {
              if (!confirm('Delete this message?')) return;
              request('DELETE', '/messages/' + m._id).then(function () { toast('Message deleted'); viewMessages(main); }).catch(function (ex) { toast(ex.message); });
            } }, 'Delete')),
          h('p', {}, m.message));
      });
      main.replaceChildren.apply(main, [h('h1', {}, 'Messages')].concat(items));
    }).catch(function (ex) { showError(main, ex); });
  }

  var VIEWS = { overview: viewOverview, users: viewUsers, products: viewProducts, messages: viewMessages };

  function render() {
    if (!state.user) return renderLogin();
    VIEWS[state.tab](renderShell());
  }

  // On page load: restore the session if the saved token is still valid and belongs to an admin
  if (sessionStorage.getItem('adminToken')) {
    request('GET', '/auth/me').then(function (res) {
      if (res.user.role === 'admin') state.user = res.user; else sessionStorage.removeItem('adminToken');
      render();
    }).catch(function () { render(); });
  } else {
    render();
  }
})();
