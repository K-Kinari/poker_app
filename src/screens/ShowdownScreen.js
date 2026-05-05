// ── ショーダウン画面（勝者選択） ──

import { el, render } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { gameStore } from '../store/GameStore.js';

/**
 * ショーダウン画面を描画
 * @param {HTMLElement} container
 * @param {Function} onSettle - (potWinners) => void
 */
export function renderShowdownScreen(container, onSettle) {
  const state = gameStore.getState();
  if (!state || !state.currentHand) return;

  const { players, currentHand: hand } = state;
  const pots = hand.pots || [];

  const screen = el('div', { className: 'screen showdown animate-fade' });

  screen.appendChild(el('h2', {
    className: 'text-xl font-bold text-center',
    text: '勝者を選択してください',
    style: { padding: '16px 0 8px', color: 'var(--gold)' },
  }));

  // 各ポットの選択状態を管理
  const selections = {};
  for (const pot of pots) {
    selections[pot.id] = [];
  }

  for (const pot of pots) {
    const potCard = el('div', { className: 'showdown__pot' });

    const title = pot.id === 'main_pot' ? 'Main Pot' : pot.id.replace('side_pot_', 'Side Pot ');
    potCard.appendChild(el('div', { className: 'showdown__pot-title', text: title }));
    potCard.appendChild(el('div', { className: 'showdown__pot-amount', text: formatChips(pot.amount) }));

    const eligibleNames = pot.eligiblePlayerIds.map(id => {
      const p = players.find(pl => pl.id === id);
      return p?.name || id;
    });
    potCard.appendChild(el('div', {
      className: 'showdown__eligible',
      text: `対象: ${eligibleNames.join(' / ')}`,
    }));

    const btnContainer = el('div', { className: 'showdown__players' });

    for (const pid of pot.eligiblePlayerIds) {
      const player = players.find(p => p.id === pid);
      if (!player) continue;

      const btn = el('button', {
        className: 'showdown__player-btn',
        text: player.name,
        dataset: { potId: pot.id, playerId: pid },
        onClick: () => {
          const idx = selections[pot.id].indexOf(pid);
          if (idx >= 0) {
            selections[pot.id].splice(idx, 1);
            btn.classList.remove('showdown__player-btn--selected');
          } else {
            selections[pot.id].push(pid);
            btn.classList.add('showdown__player-btn--selected');
          }
          updateSettleButton();
        },
      });
      btnContainer.appendChild(btn);
    }

    potCard.appendChild(btnContainer);
    screen.appendChild(potCard);
  }

  // 清算ボタン
  const settleBtn = el('button', {
    className: 'btn btn--green btn--large btn--block',
    text: '清算する',
    id: 'btn-settle',
    style: { margin: '8px 16px 32px' },
    attrs: { disabled: 'true' },
    onClick: () => {
      const potWinners = Object.entries(selections)
        .filter(([_, ids]) => ids.length > 0)
        .map(([potId, winnerIds]) => ({ potId, winnerIds }));
      onSettle(potWinners);
    },
  });
  screen.appendChild(settleBtn);

  function updateSettleButton() {
    const allSelected = pots.every(p => selections[p.id].length > 0);
    settleBtn.disabled = !allSelected;
  }

  render(container, screen);
}
