// ── BetPresets コンポーネント ──

import { el } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { ACTION_TYPES } from '../utils/constants.js';
import { getBetPresets } from '../core/ActionValidator.js';

/**
 * ベット/レイズのプリセット選択画面を描画
 * @param {Object} player
 * @param {Object} hand
 * @param {Object} settings
 * @param {string} actionType - 'bet' or 'raise'
 * @param {Function} onSelect - (amount) => void
 * @param {Function} onCancel
 * @returns {HTMLElement}
 */
export function createBetPresets(player, hand, settings, actionType, onSelect, onCancel) {
  const presets = getBetPresets(player, hand, settings, actionType);
  const label = actionType === ACTION_TYPES.BET ? 'BET' : 'RAISE';

  const overlay = el('div', { className: 'modal-overlay', id: 'bet-preset-overlay' });
  const modal = el('div', { className: 'modal animate-slide' });

  modal.appendChild(el('div', { className: 'modal__title', text: `${label} 金額を選択` }));

  const grid = el('div', { className: 'bet-presets' });

  for (const preset of presets) {
    const isAllin = preset.label === 'ALL-IN';
    const btn = el('button', {
      className: `bet-preset ${isAllin ? 'bet-preset--allin' : ''}`,
      onClick: () => {
        overlay.remove();
        if (isAllin) {
          onSelect(player.stack); // オールイン
        } else {
          onSelect(preset.amount);
        }
      },
    });

    if (isAllin) {
      btn.style.borderColor = 'var(--red)';
      btn.style.background = 'rgba(232,64,64,0.1)';
    }

    btn.appendChild(el('span', { className: 'bet-preset__label', text: preset.label }));
    btn.appendChild(el('span', { className: 'bet-preset__amount', text: formatChips(preset.amount) }));
    grid.appendChild(btn);
  }

  modal.appendChild(grid);

  // キャンセルボタン
  modal.appendChild(el('button', {
    className: 'btn btn--ghost btn--block',
    text: '戻る',
    style: { marginTop: '12px' },
    onClick: () => {
      overlay.remove();
      if (onCancel) onCancel();
    },
  }));

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });

  return overlay;
}
