// ── PlayerSeat コンポーネント ──

import { el } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { ACTION_TYPES, PLAYER_STATUS } from '../utils/constants.js';

/**
 * プレイヤー座席を描画
 * @param {Object} player
 * @param {Object} opts
 * @returns {HTMLElement}
 */
export function createPlayerSeat(player, opts = {}) {
  const { isCurrent, position, seatIndex } = opts;

  let seatClass = 'seat glass';
  if (isCurrent) seatClass += ' seat--current';
  else if (player.status === PLAYER_STATUS.ACTIVE) seatClass += ' seat--active';

  if (player.status === PLAYER_STATUS.FOLDED || player.status === PLAYER_STATUS.AWAY || player.joinNextHand) {
    seatClass += ' seat--folded';
  }
  if (player.status === PLAYER_STATUS.ALLIN) seatClass += ' seat--allin';
  if (player.status === PLAYER_STATUS.OUT || player.status === PLAYER_STATUS.LEFT) seatClass += ' seat--out';

  const container = el('div', { className: seatClass, dataset: { seat: seatIndex } });

  const badges = el('div', { className: 'seat__badges' });
  if (position) {
    const badgeClass = position === 'BTN' ? 'badge--btn' : position === 'SB' ? 'badge--sb' : 'badge--bb';
    badges.appendChild(el('span', { className: `badge ${badgeClass}`, text: position }));
  }
  if (player.status === PLAYER_STATUS.ALLIN) {
    badges.appendChild(el('span', { className: 'badge badge--allin', text: 'ALL-IN' }));
  }
  if (player.status === PLAYER_STATUS.FOLDED) {
    badges.appendChild(el('span', { className: 'badge badge--fold', text: 'FOLD' }));
  }
  if (player.status === PLAYER_STATUS.OUT) {
    badges.appendChild(el('span', { className: 'badge badge--out', text: 'OUT' }));
  }
  if (player.status === PLAYER_STATUS.AWAY) {
    badges.appendChild(el('span', { className: 'badge badge--away', text: 'AWAY' }));
  }
  container.appendChild(badges);

  container.appendChild(el('div', { className: 'seat__name', text: player.name }));
  container.appendChild(el('div', { className: 'seat__stack', text: formatChips(player.stack) }));

  return container;
}

export function createBetDisplay(amount, actionType) {
  if (!amount || amount <= 0) return null;

  let variant = 'raise';
  if (actionType === ACTION_TYPES.CALL) variant = 'call';
  if (actionType === ACTION_TYPES.ALLIN) variant = 'allin';

  return el('div', {
    className: `seat-bet seat-bet--${variant}`,
    text: formatChips(amount),
  });
}
