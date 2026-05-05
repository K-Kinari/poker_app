// ── PotDisplay コンポーネント ──

import { el } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';

/**
 * ポット表示を描画
 * @param {number} totalPot
 * @param {string} street
 * @returns {HTMLElement}
 */
export function createPotDisplay(totalPot, street) {
  const container = el('div', { className: 'pot-display' });
  container.appendChild(el('div', { className: 'pot-display__label', text: streetLabel(street) }));
  container.appendChild(el('div', { className: 'pot-display__amount', text: `POT ${formatChips(totalPot)}` }));
  return container;
}

function streetLabel(street) {
  const labels = {
    preflop: 'PREFLOP', flop: 'FLOP', turn: 'TURN',
    river: 'RIVER', showdown: 'SHOWDOWN', settled: 'SETTLED',
  };
  return labels[street] || '';
}
