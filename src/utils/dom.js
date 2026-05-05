// ── DOM操作ヘルパー ──

/**
 * 要素を生成してクラスとテキストを設定
 * @param {string} tag
 * @param {Object} opts
 * @returns {HTMLElement}
 */
export function el(tag, opts = {}) {
  const element = document.createElement(tag);
  if (opts.className) element.className = opts.className;
  if (opts.id) element.id = opts.id;
  if (opts.text) element.textContent = opts.text;
  if (opts.html) element.innerHTML = opts.html;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      element.setAttribute(k, v);
    }
  }
  if (opts.style) {
    Object.assign(element.style, opts.style);
  }
  if (opts.children) {
    for (const child of opts.children) {
      if (child) element.appendChild(child);
    }
  }
  if (opts.onClick) {
    element.addEventListener('click', opts.onClick);
  }
  if (opts.dataset) {
    for (const [k, v] of Object.entries(opts.dataset)) {
      element.dataset[k] = v;
    }
  }
  return element;
}

/**
 * 指定コンテナの中身をクリアして子要素を追加
 * @param {HTMLElement} container
 * @param  {...HTMLElement} children
 */
export function render(container, ...children) {
  container.innerHTML = '';
  for (const child of children) {
    if (child) container.appendChild(child);
  }
}

/**
 * IDで要素を取得
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * CSSセレクタで最初の要素を取得
 * @param {string} selector
 * @param {HTMLElement} parent
 * @returns {HTMLElement|null}
 */
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * CSSセレクタで全要素を取得
 * @param {string} selector
 * @param {HTMLElement} parent
 * @returns {NodeList}
 */
export function qsa(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * 一意ID生成
 * @returns {string}
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
