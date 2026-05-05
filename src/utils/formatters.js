// ── 数値フォーマットユーティリティ ──

/**
 * 数値をカンマ区切りで表示
 * @param {number} n
 * @returns {string}
 */
export function formatChips(n) {
  if (n == null || isNaN(n)) return '0';
  return n.toLocaleString('ja-JP');
}

/**
 * 符号付きチップ表示 (+1,000 / -500)
 * @param {number} n
 * @returns {string}
 */
export function formatChipsDelta(n) {
  if (n === 0) return '±0';
  const sign = n > 0 ? '+' : '';
  return `${sign}${formatChips(n)}`;
}

/**
 * ポット表示用フォーマット
 * @param {number} n
 * @returns {string}
 */
export function formatPot(n) {
  return `POT ${formatChips(n)}`;
}

/**
 * プレイヤー名を短縮表示（最大文字数）
 * @param {string} name
 * @param {number} maxLen
 * @returns {string}
 */
export function truncateName(name, maxLen = 6) {
  if (!name) return '';
  return name.length > maxLen ? name.slice(0, maxLen) + '…' : name;
}

/**
 * 金額を最小チップ単位に丸める
 * @param {number} amount
 * @param {number} unit
 * @returns {number}
 */
export function roundToUnit(amount, unit) {
  if (unit <= 0) return amount;
  return Math.floor(amount / unit) * unit;
}
