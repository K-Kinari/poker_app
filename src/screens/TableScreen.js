// ── メインテーブル画面 ──

import { el, render } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { PLAYER_STATUS, STREETS, ACTION_TYPES } from '../utils/constants.js';
import { gameStore } from '../store/GameStore.js';
import { getAvailableActions } from '../core/ActionValidator.js';
import { getPlayerBySeat } from '../core/SeatManager.js';
import { getTotalPot } from '../core/PotManager.js';
import { createPlayerSeat } from '../components/PlayerSeat.js';
import { createPotDisplay } from '../components/PotDisplay.js';
import { createActionButtons } from '../components/ActionButtons.js';
import { createSmartRaiseSlider } from '../components/SmartRaiseSlider.js';

/**
 * テーブル画面を描画
 * @param {HTMLElement} container
 * @param {Function} onAction - (actionType, amount) => void
 */
export function renderTableScreen(container, onAction, onAdminOpen) {
  const state = gameStore.getState();
  if (!state || !state.currentHand) return;

  const { players, seats, settings, currentHand: hand } = state;
  const totalSeats = seats.length;

  const screen = el('div', { className: 'screen screen--felt table-screen' });

  // プレイヤーの位置を決定
  const getPosition = (seatIdx) => {
    if (seatIdx === hand.buttonSeatIndex) return 'BTN';
    if (seatIdx === hand.smallBlindSeatIndex) return 'SB';
    if (seatIdx === hand.bigBlindSeatIndex) return 'BB';
    return null;
  };

  // レイアウトマッピング（座席人数に応じたA〜Iの割り当て）
  const LAYOUT_MAPS = {
    1: ['f'],
    2: ['b', 'g'],
    3: ['a', 'd', 'g'],
    4: ['b', 'd', 'f', 'i'],
    5: ['a', 'c', 'e', 'g', 'i'],
    6: ['a', 'b', 'd', 'e', 'g', 'i'],
    7: ['a', 'b', 'c', 'd', 'f', 'g', 'i'],
    8: ['a', 'b', 'c', 'd', 'e', 'f', 'h', 'i'],
    9: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
  };

  // 有効な（座っている）プレイヤーのシートを取得
  const activeSeatIndices = seats
    .filter(st => st.playerId)
    .sort((a, b) => a.index - b.index)
    .map(st => st.index);

  const n = activeSeatIndices.length;
  const layout = LAYOUT_MAPS[n] || LAYOUT_MAPS[9] || [];

  // プレイヤーを各スロットに描画
  activeSeatIndices.forEach((si, idx) => {
    const player = getPlayerBySeat(seats, players, si);
    if (!player) return;
    
    const slotClass = `slot-${layout[idx] || 'a'}`;
    const seatEl = createPlayerSeat(player, {
      isCurrent: si === hand.currentTurnSeatIndex,
      position: getPosition(si),
      currentBet: hand.playerBets[player.id] || 0,
      seatIndex: si,
    });
    // グリッドセル用のラッパーdivで包む
    const wrapper = el('div', { className: slotClass });
    wrapper.appendChild(seatEl);
    screen.appendChild(wrapper);
  });

  // ── 中央エリア ──
  const middle = el('div', { className: 'table-middle' });

  // ポット表示
  const totalPot = getTotalPot(hand);
  middle.appendChild(createPotDisplay(totalPot, hand.street));

  // 現在プレイヤー情報＋アクションボタン
  if (hand.currentTurnSeatIndex !== null && hand.street !== STREETS.SHOWDOWN && hand.street !== STREETS.SETTLED) {
    const currentPlayer = getPlayerBySeat(seats, players, hand.currentTurnSeatIndex);
    if (currentPlayer && currentPlayer.status === PLAYER_STATUS.ACTIVE) {
      // プレイヤー情報
      const info = el('div', { className: 'action-info animate-fade' });
      info.appendChild(el('div', { className: 'action-info__player', text: currentPlayer.name }));

      const betLine = hand.currentBetLine || 0;
      const currentBet = hand.playerBets[currentPlayer.id] || 0;
      const toCall = betLine - currentBet;

      const detailParts = [];
      if (toCall > 0) detailParts.push(`CALL: ${formatChips(toCall)}`);
      detailParts.push(`STACK: ${formatChips(currentPlayer.stack)}`);
      info.appendChild(el('div', { className: 'action-info__detail', text: detailParts.join(' / ') }));

      middle.appendChild(info);

      // アクションボタン
      const actions = getAvailableActions(currentPlayer, hand, settings);

      const actionBtns = createActionButtons(actions, onAction, currentPlayer, hand, settings, (betType) => {
        // スマートレイズスライダー表示
        const slider = createSmartRaiseSlider(currentPlayer, hand, settings, betType, (amount) => {
          if (amount >= currentPlayer.stack) {
            onAction(ACTION_TYPES.ALLIN, currentPlayer.stack);
          } else {
            onAction(betType, amount);
          }
        });
        if (slider) document.body.appendChild(slider);
      });
      middle.appendChild(actionBtns);
    }
  }

  screen.appendChild(middle);

  // ── 管理メニュートリガー ──
  if (onAdminOpen) {
    const adminWrapper = el('div', { className: 'slot-admin' });
    const trigger = el('button', {
      className: 'admin-trigger seat glass',
      html: '<div style="font-size: 1.2rem; margin-bottom: 2px;">⚙</div><div style="font-size: 0.75rem; font-weight: bold;">管理</div>',
      onClick: onAdminOpen,
    });
    adminWrapper.appendChild(trigger);
    screen.appendChild(adminWrapper);
  }

  render(container, screen);
}
