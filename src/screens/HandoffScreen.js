// ── 受け渡し画面 ──

import { el, render } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';

/**
 * スマホ受け渡し画面を描画
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {Function} onReceived - 受け取りボタン押下時
 */
export function renderHandoffScreen(container, opts, onReceived) {
  const { actionPlayerName, actionType, actionAmount, nextPlayerName, isWinByFold } = opts;

  const screen = el('div', { className: 'handoff animate-fade' });

  // 実行されたアクション
  let actionText = `${actionPlayerName}：`;
  switch (actionType) {
    case 'check': actionText += 'CHECK'; break;
    case 'call': actionText += `CALL ${formatChips(actionAmount)}`; break;
    case 'fold': actionText += 'FOLD'; break;
    case 'bet': actionText += `BET ${formatChips(actionAmount)}`; break;
    case 'raise': actionText += `RAISE ${formatChips(actionAmount)}`; break;
    case 'allin': actionText += `ALL-IN ${formatChips(actionAmount)}`; break;
    default: actionText += actionType;
  }

  screen.appendChild(el('div', { className: 'handoff__action', text: actionText }));

  if (isWinByFold) {
    screen.appendChild(el('div', { className: 'handoff__next-label', text: '全員フォールド' }));
    screen.appendChild(el('div', {
      className: 'handoff__next-name',
      text: `${nextPlayerName} WIN`,
    }));
    screen.appendChild(el('button', {
      className: 'btn btn--primary btn--large',
      text: '清算へ',
      onClick: onReceived,
    }));
  } else if (nextPlayerName) {
    screen.appendChild(el('div', { className: 'handoff__next-label', text: '次は' }));
    screen.appendChild(el('div', { className: 'handoff__next-name', text: `${nextPlayerName}さん` }));
    screen.appendChild(el('div', { className: 'handoff__instruction', text: 'スマホを渡してください' }));
    screen.appendChild(el('button', {
      className: 'btn btn--primary btn--large',
      text: `${nextPlayerName}さんが受け取った`,
      onClick: onReceived,
    }));
  } else {
    // ショーダウンへ
    screen.appendChild(el('div', { className: 'handoff__next-label', text: 'ベッティング終了' }));
    screen.appendChild(el('div', {
      className: 'handoff__next-name',
      text: 'SHOWDOWN',
      style: { color: 'var(--accent)' },
    }));
    screen.appendChild(el('button', {
      className: 'btn btn--primary btn--large',
      text: '勝者を選択する',
      onClick: onReceived,
    }));
  }

  render(container, screen);
}
