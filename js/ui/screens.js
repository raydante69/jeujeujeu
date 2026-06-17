// Screen router + small DOM helpers shared by every UI module.

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

// Tiny hyperscript helper: el('div', {className, style:{}, dataset:{}, onClick, html}, ...children)
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null) continue;
    if (k === 'className') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in node && k !== 'list') {
      try { node[k] = v; } catch { node.setAttribute(k, v); }
    } else node.setAttribute(k, v);
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c)) : c);
  }
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

let current = null;
export function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  current = id;
  window.scrollTo(0, 0);
  document.body.dataset.screen = id;
  return id;
}
export function currentScreen() { return current; }

// Body flag: true while a run is in progress (drives the run menu / floating nav).
export function setInRun(inRun) {
  document.body.classList.toggle('run-menu-in-run', inRun);
}

// A brief full-screen transition message between phases.
export function transition(msg, sub = '', ms = 900) {
  return new Promise((resolve) => {
    $('#transition-msg').textContent = msg;
    $('#transition-sub').textContent = sub;
    showScreen('transition-screen');
    setTimeout(resolve, ms);
  });
}
