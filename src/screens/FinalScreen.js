// ── 最終清算画面 ──

import { el, render } from '../utils/dom.js';
import { formatChips, formatChipsDelta } from '../utils/formatters.js';

/**
 * 最終清算画面を描画
 * @param {HTMLElement} container
 * @param {Array} settlement - calculateFinalSettlement の結果
 * @param {Function} onNewGame
 */
export function renderFinalScreen(container, settlement, onNewGame) {
  const screen = el('div', { className: 'screen animate-fade', style: { padding: '24px 16px' } });

  const inner = el('div', { className: 'final-settlement' });
  inner.appendChild(el('div', { className: 'final-settlement__title', text: 'ゲーム終了' }));

  // ヘッダー行
  const headerRow = el('div', {
    className: 'final-row',
    style: { borderBottom: '2px solid var(--border)', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-secondary)' },
  });
  headerRow.appendChild(el('span', { text: '名前' }));
  headerRow.appendChild(el('span', { text: '初期', className: 'final-row__detail' }));
  headerRow.appendChild(el('span', { text: '最終', className: 'final-row__detail' }));
  headerRow.appendChild(el('span', { text: '損益', className: 'final-row__detail' }));
  inner.appendChild(headerRow);

  let totalProfit = 0;

  for (const p of settlement) {
    totalProfit += p.profit;
    const row = el('div', { className: 'final-row' });
    row.appendChild(el('span', { className: 'final-row__name', text: p.name }));
    row.appendChild(el('span', { className: 'final-row__detail', text: formatChips(p.initialBuyIn + p.additionalBuyIn) }));
    row.appendChild(el('span', { className: 'final-row__detail', text: formatChips(p.finalStack) }));

    const profitEl = el('span', {
      className: 'final-row__profit',
      text: formatChipsDelta(p.profit),
    });
    profitEl.style.color = p.profit > 0 ? 'var(--green)' : p.profit < 0 ? 'var(--red)' : 'var(--text-secondary)';
    row.appendChild(profitEl);
    inner.appendChild(row);
  }

  // （合計行の表示を削除）

  screen.appendChild(inner);

  screen.appendChild(el('button', {
    className: 'btn btn--primary btn--large btn--block',
    text: '新しいゲームを始める',
    style: { maxWidth: '420px', margin: '24px auto 0' },
    onClick: onNewGame,
  }));

  render(container, screen);
}
