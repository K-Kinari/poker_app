// ── 操作履歴画面 ──

import { el, render } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { eventLogger } from '../store/EventLogger.js';
import { gameStore } from '../store/GameStore.js';

/**
 * 操作履歴画面を描画
 * @param {HTMLElement} container
 * @param {Function} onBack
 */
export function renderHistoryScreen(container, onBack) {
  const state = gameStore.getState();
  const events = eventLogger.getAll();
  const players = state?.players || [];

  const screen = el('div', { className: 'screen history-screen animate-fade' });

  screen.appendChild(el('div', { className: 'history-screen__title', text: '操作履歴' }));

  // ハンド番号でグループ化
  const handGroups = {};
  for (const evt of events) {
    const hn = evt.handNumber || 0;
    if (!handGroups[hn]) handGroups[hn] = [];
    handGroups[hn].push(evt);
  }

  const handNumbers = Object.keys(handGroups).map(Number).sort((a, b) => b - a);

  if (handNumbers.length === 0) {
    screen.appendChild(el('div', { className: 'text-center text-muted', text: '履歴はありません', style: { padding: '40px 0' } }));
  }

  for (const hn of handNumbers) {
    const group = handGroups[hn];
    const handDiv = el('div', { className: 'history-hand' });

    const title = hn === 0 ? 'ゲーム情報' : `Hand #${hn}`;
    const header = el('div', { className: 'history-hand__header', text: title });
    const body = el('div', { className: 'history-hand__body' });

    // 最新ハンドは開いた状態
    if (hn === handNumbers[0]) {
      header.classList.add('open');
      body.classList.add('open');
    }

    header.addEventListener('click', () => {
      header.classList.toggle('open');
      body.classList.toggle('open');
    });

    for (const evt of group) {
      const entry = formatEvent(evt, players);
      if (entry) {
        body.appendChild(entry);
      }
    }

    handDiv.appendChild(header);
    handDiv.appendChild(body);
    screen.appendChild(handDiv);
  }

  // 戻るボタン
  screen.appendChild(el('button', {
    className: 'btn btn--ghost btn--block',
    text: '戻る',
    style: { margin: '16px 0 32px' },
    onClick: onBack,
  }));

  render(container, screen);
}

/**
 * イベントを表示用要素に変換
 */
function formatEvent(evt, players) {
  const playerName = evt.playerId
    ? (players.find(p => p.id === evt.playerId)?.name || '?')
    : '';

  let text = '';
  let className = 'history-entry';

  switch (evt.type) {
    case 'game_started':
      text = `ゲーム開始 (${evt.payload?.playerCount}人, Stack:${formatChips(evt.payload?.initialStack)}, ${evt.payload?.smallBlind}/${evt.payload?.bigBlind})`;
      break;
    case 'hand_started':
      text = `ハンド開始`;
      break;
    case 'blind_posted':
      text = `${playerName}: ${evt.payload?.position} ${formatChips(evt.amount)}`;
      break;
    case 'ante_posted':
      text = `${playerName}: Ante ${formatChips(evt.amount)}`;
      break;
    case 'check':
      text = `${playerName}: CHECK`;
      break;
    case 'call':
      text = `${playerName}: CALL ${formatChips(evt.amount)}`;
      break;
    case 'fold':
      text = `${playerName}: FOLD`;
      break;
    case 'bet':
      text = `${playerName}: BET ${formatChips(evt.amount)}`;
      break;
    case 'raise':
      text = `${playerName}: RAISE ${formatChips(evt.amount)}`;
      break;
    case 'allin':
      text = `${playerName}: ALL-IN ${formatChips(evt.amount)}`;
      break;
    case 'street_changed':
      text = evt.payload?.street?.toUpperCase() || '';
      className = 'history-entry history-entry--street';
      break;
    case 'pot_settled':
      text = `${playerName || evt.payload?.playerName}: WIN +${formatChips(evt.amount)}`;
      className = 'history-entry history-entry--win';
      break;
    case 'stack_adjusted':
      text = `${playerName}: スタック修正 → ${formatChips(evt.amount)}`;
      break;
    case 'game_ended':
      text = 'ゲーム終了';
      break;
    default:
      text = evt.type;
  }

  if (!text) return null;
  return el('div', { className, text });
}
