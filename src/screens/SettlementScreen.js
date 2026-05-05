// ── 清算結果画面 ──

import { el, render } from '../utils/dom.js';
import { formatChips, formatChipsDelta } from '../utils/formatters.js';
import { gameStore } from '../store/GameStore.js';

/**
 * 清算結果画面を描画
 * @param {HTMLElement} container
 * @param {Array} distributions - [{playerId, amount}]
 * @param {Function} onNextHand
 * @param {Function} onEndGame
 */
export function renderSettlementScreen(container, distributions, onNextHand, onEndGame) {
  const state = gameStore.getState();
  const { players } = state;

  const screen = el('div', { className: 'settlement animate-fade' });

  screen.appendChild(el('h2', {
    className: 'text-xl font-bold',
    text: `Hand #${state.handNumber} 清算完了`,
    style: { color: 'var(--gold)' },
  }));

  // 分配結果
  for (const dist of distributions) {
    const player = players.find(p => p.id === dist.playerId);
    if (!player) continue;

    const item = el('div', { className: 'settlement__item' });
    item.appendChild(el('span', { className: 'settlement__name', text: player.name }));

    const deltaClass = 'settlement__delta' + (dist.amount > 0 ? ' settlement__delta--positive' : '');
    item.appendChild(el('span', {
      className: deltaClass,
      text: `+${formatChips(dist.amount)}`,
    }));
    screen.appendChild(item);
  }

  // 全プレイヤーの現在スタック
  screen.appendChild(el('div', {
    className: 'text-sm text-muted text-center',
    text: '現在のスタック',
    style: { marginTop: '12px' },
  }));

  for (const player of players) {
    if (player.status === 'left') continue;
    const item = el('div', { className: 'settlement__item' });
    item.appendChild(el('span', { className: 'settlement__name', text: player.name }));
    item.appendChild(el('span', {
      className: 'settlement__delta',
      text: formatChips(player.stack),
      style: { color: 'var(--gold)' },
    }));
    screen.appendChild(item);
  }

  // ボタン
  screen.appendChild(el('button', {
    className: 'btn btn--primary btn--large btn--block',
    text: '次のハンドへ',
    style: { maxWidth: '360px', marginTop: '8px' },
    onClick: onNextHand,
  }));

  screen.appendChild(el('button', {
    className: 'btn btn--ghost btn--block',
    text: 'ゲーム終了',
    style: { maxWidth: '360px' },
    onClick: onEndGame,
  }));

  render(container, screen);
}

/**
 * フォールド勝利の清算結果画面
 * @param {HTMLElement} container
 * @param {string} winnerName
 * @param {number} potAmount
 * @param {Function} onNextHand
 * @param {Function} onEndGame
 */
export function renderFoldWinScreen(container, winnerName, potAmount, onNextHand, onEndGame) {
  const screen = el('div', { className: 'settlement animate-fade' });

  screen.appendChild(el('h2', {
    className: 'text-2xl font-bold',
    text: `${winnerName} WIN`,
    style: { color: 'var(--green)' },
  }));

  screen.appendChild(el('div', {
    className: 'text-lg tabular',
    text: `+${formatChips(potAmount)}`,
    style: { color: 'var(--gold)' },
  }));

  screen.appendChild(el('button', {
    className: 'btn btn--primary btn--large btn--block',
    text: '次のハンドへ',
    style: { maxWidth: '360px', marginTop: '20px' },
    onClick: onNextHand,
  }));

  screen.appendChild(el('button', {
    className: 'btn btn--ghost btn--block',
    text: 'ゲーム終了',
    style: { maxWidth: '360px' },
    onClick: onEndGame,
  }));

  render(container, screen);
}
