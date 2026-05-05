// ── ActionButtons コンポーネント ──

import { el } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { ACTION_TYPES } from '../utils/constants.js';

/**
 * アクションボタン群を描画
 * @param {Array} actions - getAvailableActions の結果
 * @param {Function} onAction - (actionType, amount) => void
 * @param {Object} player
 * @param {Object} hand
 * @param {Object} settings
 * @param {Function} onShowBetPresets - ベットプリセット表示コールバック
 * @returns {HTMLElement}
 */
export function createActionButtons(actions, onAction, player, hand, settings, onShowBetPresets) {
  const container = el('div', { className: 'action-buttons animate-slide' });

  // メインアクション行（CHECK/CALL + RAISE/BET）
  const mainRow = el('div', { className: 'action-buttons__row' });

  const check = actions.find(a => a.type === ACTION_TYPES.CHECK);
  const call = actions.find(a => a.type === ACTION_TYPES.CALL);
  const bet = actions.find(a => a.type === ACTION_TYPES.BET);
  const raise = actions.find(a => a.type === ACTION_TYPES.RAISE);
  const allin = actions.find(a => a.type === ACTION_TYPES.ALLIN);
  const fold = actions.find(a => a.type === ACTION_TYPES.FOLD);

  // 左側スロット: CHECK or CALL or (コールに満たない場合のALL-IN)
  if (check) {
    mainRow.appendChild(el('button', {
      className: 'btn btn--green btn--large',
      text: 'CHECK',
      id: 'btn-check',
      onClick: () => onAction(ACTION_TYPES.CHECK, 0),
    }));
  } else if (call) {
    mainRow.appendChild(el('button', {
      className: 'btn btn--green btn--large',
      text: `CALL ${formatChips(call.amount)}`,
      id: 'btn-call',
      onClick: () => onAction(ACTION_TYPES.CALL, call.amount),
    }));
  } else if (allin && !call && !check) {
    mainRow.appendChild(el('button', {
      className: 'btn btn--amber btn--large',
      text: `ALL-IN ${formatChips(allin.amount)}`,
      id: 'btn-allin',
      onClick: () => onAction(ACTION_TYPES.ALLIN, allin.amount),
    }));
  }

  // 右側スロット: BET or RAISE or (レイズ額に満たない場合のALL-IN)
  if (bet) {
    mainRow.appendChild(el('button', {
      className: 'btn btn--primary btn--large',
      text: 'BET',
      id: 'btn-bet',
      onClick: () => onShowBetPresets(ACTION_TYPES.BET),
    }));
  } else if (raise) {
    mainRow.appendChild(el('button', {
      className: 'btn btn--primary btn--large',
      text: 'RAISE',
      id: 'btn-raise',
      onClick: () => onShowBetPresets(ACTION_TYPES.RAISE),
    }));
  } else if (allin && (call || check)) {
    mainRow.appendChild(el('button', {
      className: 'btn btn--amber btn--large',
      text: `ALL-IN ${formatChips(allin.amount)}`,
      id: 'btn-allin-raise',
      onClick: () => onAction(ACTION_TYPES.ALLIN, allin.amount),
    }));
  }

  container.appendChild(mainRow);

  // FOLD（独立行、下部に配置）
  if (fold) {
    const foldRow = el('div', {
      className: 'action-buttons__row',
      style: { marginTop: '8px' },
    });
    foldRow.appendChild(el('button', {
      className: 'btn btn--red btn--block',
      text: 'FOLD',
      id: 'btn-fold',
      onClick: () => onAction(ACTION_TYPES.FOLD, 0),
    }));
    container.appendChild(foldRow);
  }

  return container;
}
