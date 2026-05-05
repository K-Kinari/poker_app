// ── 初期設定画面 ──

import { el, render, $ } from '../utils/dom.js';
import { DEFAULT_SETTINGS, MIN_PLAYERS, MAX_PLAYERS } from '../utils/constants.js';

/**
 * 初期設定画面を描画
 * @param {HTMLElement} container
 * @param {Function} onStart - (config) => void
 */
export function renderSetupScreen(container, onStart) {
  const screen = el('div', { className: 'screen setup animate-fade' });

  // ヘッダー
  const header = el('div', { className: 'setup__header' });
  header.appendChild(el('div', { className: 'setup__title', text: '♠ Poker Chips' }));
  header.appendChild(el('div', { className: 'setup__subtitle', text: '1台完結型ポーカーチップカウンター' }));
  screen.appendChild(header);

  // 人数選択
  const numSection = el('div', { className: 'setup__section' });
  numSection.appendChild(el('div', { className: 'setup__section-title', text: 'プレイヤー人数' }));

  const numRow = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });
  for (let i = MIN_PLAYERS; i <= MAX_PLAYERS; i++) {
    const btn = el('button', {
      className: `btn btn--ghost ${i === 4 ? 'btn--primary' : ''}`,
      text: `${i}人`,
      id: `num-${i}`,
      style: { flex: '1', minWidth: '52px', padding: '10px 4px', fontSize: '0.95rem' },
      onClick: () => setPlayerCount(i),
    });
    numRow.appendChild(btn);
  }
  numSection.appendChild(numRow);
  screen.appendChild(numSection);

  // プレイヤー名入力
  const nameSection = el('div', { className: 'setup__section', id: 'name-section' });
  nameSection.appendChild(el('div', { className: 'setup__section-title', text: 'プレイヤー名' }));
  const nameInputs = el('div', { className: 'player-name-inputs', id: 'name-inputs' });
  nameSection.appendChild(nameInputs);
  screen.appendChild(nameSection);

  // ゲーム設定
  const settingsSection = el('div', { className: 'setup__section' });
  settingsSection.appendChild(el('div', { className: 'setup__section-title', text: 'ゲーム設定' }));

  const createField = (label, id, value, placeholder) => {
    const group = el('div', { className: 'form-group' });
    group.appendChild(el('label', { className: 'form-label', text: label, attrs: { for: id } }));
    group.appendChild(el('input', {
      className: 'input', id, attrs: { type: 'number', value: String(value), placeholder, inputmode: 'numeric' },
    }));
    return group;
  };

  settingsSection.appendChild(createField('初期スタック', 'input-stack', DEFAULT_SETTINGS.initialStack, '5000'));

  const blindRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } });
  blindRow.appendChild(createField('SB', 'input-sb', DEFAULT_SETTINGS.smallBlind, '50'));
  blindRow.appendChild(createField('BB', 'input-bb', DEFAULT_SETTINGS.bigBlind, '100'));
  settingsSection.appendChild(blindRow);

  screen.appendChild(settingsSection);

  // BTN選択
  const btnSection = el('div', { className: 'setup__section' });
  btnSection.appendChild(el('div', { className: 'setup__section-title', text: 'ディーラーボタン（BTN）' }));
  const btnSelect = el('div', { id: 'btn-select', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });
  btnSection.appendChild(btnSelect);
  screen.appendChild(btnSection);

  // 開始ボタン
  screen.appendChild(el('button', {
    className: 'btn btn--primary btn--large btn--block',
    text: 'ゲーム開始',
    id: 'btn-start-game',
    style: { marginTop: '8px' },
    onClick: () => handleStart(onStart),
  }));

  // 余白
  screen.appendChild(el('div', { style: { height: '40px' } }));

  render(container, screen);

  // 初期状態
  let playerCount = 4;
  let selectedBtn = 0;

  function setPlayerCount(n) {
    playerCount = n;
    // ボタンハイライト更新
    for (let i = MIN_PLAYERS; i <= MAX_PLAYERS; i++) {
      const b = $(`num-${i}`);
      if (b) b.className = `btn ${i === n ? 'btn--primary' : 'btn--ghost'}`;
      if (b) Object.assign(b.style, { flex: '1', minWidth: '52px', padding: '10px 4px', fontSize: '0.95rem' });
    }
    renderNameInputs(n);
    renderBtnSelect(n);
  }

  function renderNameInputs(n) {
    const c = $('name-inputs');
    if (!c) return;
    c.innerHTML = '';
    const defaultNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    for (let i = 0; i < n; i++) {
      const row = el('div', { className: 'player-name-row' });
      row.appendChild(el('span', { className: 'player-name-row__label', text: `${i + 1}` }));
      row.appendChild(el('input', {
        className: 'input',
        id: `pname-${i}`,
        attrs: { type: 'text', value: defaultNames[i], placeholder: `プレイヤー${i + 1}`, maxlength: '10' },
      }));
      c.appendChild(row);
    }
  }

  function renderBtnSelect(n) {
    const c = $('btn-select');
    if (!c) return;
    c.innerHTML = '';
    selectedBtn = 0;
    for (let i = 0; i < n; i++) {
      const btn = el('button', {
        className: `btn ${i === 0 ? 'btn--amber' : 'btn--ghost'}`,
        text: `P${i + 1}`,
        id: `btn-pos-${i}`,
        style: { padding: '8px 14px', fontSize: '0.9rem' },
        onClick: () => {
          selectedBtn = i;
          for (let j = 0; j < n; j++) {
            const b = $(`btn-pos-${j}`);
            if (b) {
              b.className = `btn ${j === i ? 'btn--amber' : 'btn--ghost'}`;
              Object.assign(b.style, { padding: '8px 14px', fontSize: '0.9rem' });
            }
          }
        },
      });
      c.appendChild(btn);
    }
  }

  function handleStart(callback) {
    const names = [];
    for (let i = 0; i < playerCount; i++) {
      const input = $(`pname-${i}`);
      const name = input ? input.value.trim() : `P${i + 1}`;
      names.push(name || `P${i + 1}`);
    }

    const stack = parseInt($('input-stack')?.value) || DEFAULT_SETTINGS.initialStack;
    const sb = parseInt($('input-sb')?.value) || DEFAULT_SETTINGS.smallBlind;
    const bb = parseInt($('input-bb')?.value) || DEFAULT_SETTINGS.bigBlind;

    callback({
      playerNames: names,
      initialStack: stack,
      smallBlind: sb,
      bigBlind: bb,
      ante: 0,
      minChipUnit: sb,
      buttonIndex: selectedBtn,
    });
  }

  // 初期描画
  setPlayerCount(4);
}
