// ── 管理画面 ──

import { el, render, uid } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { gameStore } from '../store/GameStore.js';
import { eventLogger } from '../store/EventLogger.js';
import { PLAYER_STATUS, STREETS } from '../utils/constants.js';

/**
 * 管理画面を描画
 * @param {HTMLElement} container
 * @param {Function} onBack
 * @param {Function} onHistory - 操作履歴表示
 * @param {Function} onForceEndHand - ハンド強制終了
 * @param {Function} onEndGame - ゲーム終了
 */
export function renderAdminScreen(container, onBack, onHistory, onForceEndHand, onEndGame) {
  const state = gameStore.getState();
  if (!state) return;

  const { players, settings, handNumber, currentHand } = state;
  const screen = el('div', { className: 'screen admin-screen animate-fade' });

  screen.appendChild(el('div', { className: 'admin-screen__title', text: '⚙ 管理メニュー' }));

  // ── ゲーム情報 ──
  const infoSection = el('div', { className: 'admin-section' });
  infoSection.appendChild(el('div', { className: 'admin-section__title', text: 'ゲーム情報' }));
  infoSection.appendChild(el('div', {
    className: 'text-sm text-muted',
    text: `Hand #${handNumber} | SB:${settings.smallBlind} BB:${settings.bigBlind} | Street: ${currentHand?.street || '-'}`,
    style: { padding: '4px 0' },
  }));
  screen.appendChild(infoSection);

  // ── プレイヤー管理 ──
  const stackSection = el('div', { className: 'admin-section' });
  stackSection.appendChild(el('div', { className: 'admin-section__title', text: 'プレイヤー管理' }));
  
  const canManagePlayers = 
    !currentHand || 
    (currentHand.street === STREETS.PREFLOP && Object.keys(currentHand.actedThisRound || {}).length === 0) ||
    currentHand.street === STREETS.SETTLED;

  if (!canManagePlayers) {
    stackSection.appendChild(el('div', {
      className: 'text-sm',
      text: '※ハンド進行中のため、プレイヤー管理操作は非活性となっています。（次ハンド開始時に操作可能です）',
      style: { color: 'var(--accent)', marginBottom: '12px', fontWeight: '500' },
    }));
  } else {
    stackSection.appendChild(el('div', {
      className: 'text-sm text-muted',
      text: '※プレイヤーの追加や離席、退出、バイイン等の操作は、プリフロップで最初のアクションが行われるまでの間のみ可能です。',
      style: { marginBottom: '12px' },
    }));
  }

  const refreshAdmin = () => {
    renderAdminScreen(container, onBack, onHistory, onForceEndHand, onEndGame);
  };

  for (const player of players) {
    if (player.status === PLAYER_STATUS.LEFT) continue;

    const row = el('div', { className: 'admin-player-row' });
    row.appendChild(el('span', { className: 'admin-player-row__name', text: player.name }));
    row.appendChild(el('span', { className: 'admin-player-row__stack', text: formatChips(player.stack) }));

    const isAway = player.status === PLAYER_STATUS.AWAY;
    const isOut = player.status === PLAYER_STATUS.OUT;

    const actions = el('div', { className: 'admin-player-row__actions' });

    // 離席/復帰ボタン
    if (!isOut) {
      actions.appendChild(el('button', {
        className: `admin-btn-small ${isAway ? 'btn--primary' : 'btn--ghost'}`,
        text: isAway ? '復帰' : '離席',
        attrs: canManagePlayers ? {} : { disabled: 'disabled' },
        onClick: () => {
          gameStore.update(s => {
            const p = s.players.find(pp => pp.id === player.id);
            if (p) p.status = isAway ? PLAYER_STATUS.ACTIVE : PLAYER_STATUS.AWAY;
          });
          refreshAdmin();
        },
      }));
    }

    // 追加バイインボタン
    actions.appendChild(el('button', {
      className: 'admin-btn-small btn--green',
      text: '追加',
      attrs: canManagePlayers ? {} : { disabled: 'disabled' },
      onClick: () => showAddBuyInModal(container, player, refreshAdmin),
    }));

    // 修正ボタン
    actions.appendChild(el('button', {
      className: 'admin-btn-small',
      text: '修正',
      attrs: canManagePlayers ? {} : { disabled: 'disabled' },
      onClick: () => showStackEditModal(container, player, refreshAdmin),
    }));

    // 退出ボタン
    actions.appendChild(el('button', {
      className: 'admin-btn-small btn--red',
      text: '退出',
      attrs: canManagePlayers ? {} : { disabled: 'disabled' },
      onClick: () => {
        showConfirmModal(`${player.name} をゲームから退出させますか？\n（現在のスタックが最終成績として記録されます）`, () => {
          gameStore.update(s => {
            const p = s.players.find(pp => pp.id === player.id);
            if (p) p.status = PLAYER_STATUS.LEFT;
            
            // 席を空ける
            const seat = s.seats.find(st => st.playerId === player.id);
            if (seat) seat.playerId = null;
          });
          refreshAdmin();
        });
      },
    }));
    row.appendChild(actions);
    stackSection.appendChild(row);
  }

  // アクティブな（退出していない）プレイヤーの数をカウント
  const currentPlayersCount = players.filter(p => p.status !== PLAYER_STATUS.LEFT).length;
  const isMaxPlayers = currentPlayersCount >= 9;

  // 新規プレイヤー追加ボタン
  stackSection.appendChild(el('button', {
    className: 'btn btn--ghost btn--block',
    text: '＋ 新規プレイヤーを追加',
    attrs: (canManagePlayers && !isMaxPlayers) ? {} : { disabled: 'disabled' },
    style: { marginTop: '12px' },
    onClick: () => showAddPlayerModal(container, refreshAdmin),
  }));

  if (isMaxPlayers) {
    stackSection.appendChild(el('div', {
      className: 'text-xs text-center',
      text: '※最大9名までです',
      style: { color: 'var(--text-muted)', marginTop: '4px' },
    }));
  }

  screen.appendChild(stackSection);

  // ── アクション ──
  const actionSection = el('div', { className: 'admin-section' });
  actionSection.appendChild(el('div', { className: 'admin-section__title', text: 'アクション' }));

  actionSection.appendChild(el('button', {
    className: 'btn btn--ghost btn--block',
    text: '📋 操作履歴',
    style: { marginBottom: '8px' },
    onClick: onHistory,
  }));

  if (currentHand && currentHand.street !== STREETS.SETTLED) {
    actionSection.appendChild(el('button', {
      className: 'btn btn--red btn--block',
      text: '⚠ ハンド強制終了',
      style: { marginBottom: '8px' },
      onClick: () => {
        showConfirmModal(
          '現在のハンドを強制終了しますか？\nこのハンドで投入されたチップは全て返却されます。',
          () => onForceEndHand()
        );
      },
    }));
  }

  actionSection.appendChild(el('button', {
    className: 'btn btn--red btn--block',
    text: '🏁 ゲーム終了',
    onClick: () => {
      showConfirmModal(
        'ゲームを終了して最終清算画面に移行しますか？',
        () => onEndGame()
      );
    },
  }));

  screen.appendChild(actionSection);

  // 戻るボタン
  screen.appendChild(el('button', {
    className: 'btn btn--primary btn--block',
    text: 'テーブルに戻る',
    style: { marginTop: '12px', marginBottom: '32px' },
    onClick: onBack,
  }));

  render(container, screen);
}

/**
 * スタック修正モーダル
 */
function showStackEditModal(container, player, onDone) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal animate-slide' });

  modal.appendChild(el('div', { className: 'modal__title', text: `${player.name} のスタック修正` }));
  modal.appendChild(el('div', {
    className: 'text-sm text-muted',
    text: `現在: ${formatChips(player.stack)}`,
    style: { marginBottom: '12px' },
  }));

  const input = el('input', {
    className: 'input input--large',
    attrs: { type: 'number', value: String(player.stack), inputmode: 'numeric' },
  });
  modal.appendChild(input);

  const btnRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });

  btnRow.appendChild(el('button', {
    className: 'btn btn--ghost',
    text: 'キャンセル',
    style: { flex: '1' },
    onClick: () => overlay.remove(),
  }));

  btnRow.appendChild(el('button', {
    className: 'btn btn--primary',
    text: '確定',
    style: { flex: '1' },
    onClick: () => {
      const newStack = parseInt(input.value);
      if (isNaN(newStack) || newStack < 0) {
        alert('有効な数値を入力してください');
        return;
      }

      gameStore.update(s => {
        const p = s.players.find(pp => pp.id === player.id);
        if (p) {
          p.stack = newStack;
          if (newStack > 0 && p.status === PLAYER_STATUS.OUT) {
            p.status = PLAYER_STATUS.ACTIVE;
          }
        }
      });

      eventLogger.log({
        type: 'stack_adjusted',
        playerId: player.id,
        amount: newStack,
        handNumber: gameStore.getState()?.handNumber || 0,
        payload: { playerName: player.name },
      });

      overlay.remove();
      onDone();
    },
  }));

  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/**
 * 追加バイインモーダル
 */
function showAddBuyInModal(container, player, onDone) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal animate-slide' });

  modal.appendChild(el('div', { className: 'modal__title', text: `${player.name} の追加バイイン` }));
  modal.appendChild(el('div', {
    className: 'text-sm text-muted',
    text: `現在: ${formatChips(player.stack)}`,
    style: { marginBottom: '12px' },
  }));

  const input = el('input', {
    className: 'input input--large',
    attrs: { type: 'number', placeholder: '追加額を入力', inputmode: 'numeric' },
  });
  modal.appendChild(input);

  const btnRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });

  btnRow.appendChild(el('button', {
    className: 'btn btn--ghost',
    text: 'キャンセル',
    style: { flex: '1' },
    onClick: () => overlay.remove(),
  }));

  btnRow.appendChild(el('button', {
    className: 'btn btn--primary',
    text: '追加',
    style: { flex: '1' },
    onClick: () => {
      const amount = parseInt(input.value);
      if (isNaN(amount) || amount <= 0) {
        alert('有効な追加額を入力してください');
        return;
      }

      gameStore.update(s => {
        const p = s.players.find(pp => pp.id === player.id);
        if (p) {
          p.stack += amount;
          p.additionalBuyIn = (p.additionalBuyIn || 0) + amount;
          if (p.status === PLAYER_STATUS.OUT) {
            p.status = PLAYER_STATUS.ACTIVE;
          }
        }
      });

      eventLogger.log({
        type: 'buyin_added',
        playerId: player.id,
        amount: amount,
        handNumber: gameStore.getState()?.handNumber || 0,
        payload: { playerName: player.name },
      });

      overlay.remove();
      onDone();
    },
  }));

  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/**
 * プレイヤー追加モーダル
 */
function showAddPlayerModal(container, onDone) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal animate-slide' });

  modal.appendChild(el('div', { className: 'modal__title', text: '新規プレイヤー追加' }));

  const nameInput = el('input', {
    className: 'input input--large',
    attrs: { type: 'text', placeholder: 'プレイヤー名' },
    style: { marginBottom: '8px' },
  });
  modal.appendChild(nameInput);

  const settings = gameStore.getState()?.settings || {};
  const buyInInput = el('input', {
    className: 'input input--large',
    attrs: { type: 'number', placeholder: 'バイイン額', value: String(settings.initialStack || 100), inputmode: 'numeric' },
  });
  modal.appendChild(buyInInput);

  const btnRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });

  btnRow.appendChild(el('button', {
    className: 'btn btn--ghost',
    text: 'キャンセル',
    style: { flex: '1' },
    onClick: () => overlay.remove(),
  }));

  btnRow.appendChild(el('button', {
    className: 'btn btn--primary',
    text: '追加',
    style: { flex: '1' },
    onClick: () => {
      const name = nameInput.value.trim();
      const buyIn = parseInt(buyInInput.value);

      if (!name) {
        alert('プレイヤー名を入力してください');
        return;
      }
      if (isNaN(buyIn) || buyIn <= 0) {
        alert('有効なバイイン額を入力してください');
        return;
      }

      gameStore.update(s => {
        const id = uid();
        const newPlayer = {
          id,
          name,
          stack: buyIn,
          status: PLAYER_STATUS.AWAY,
          joinNextHand: true,
          initialBuyIn: buyIn,
          additionalBuyIn: 0,
        };
        s.players.push(newPlayer);

        // 空席を探すか、新しい席を追加する
        let seat = s.seats.find(st => !st.playerId);
        if (seat) {
          seat.playerId = id;
        } else {
          s.seats.push({
            index: s.seats.length,
            playerId: id,
          });
        }
      });

      eventLogger.log({
        type: 'player_joined',
        handNumber: gameStore.getState()?.handNumber || 0,
        payload: { playerName: name, buyIn },
      });

      overlay.remove();
      onDone();
    },
  }));

  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/**
 * カスタム確認モーダル（window.confirmの代替）
 */
function showConfirmModal(message, onConfirm) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal animate-slide' });

  modal.appendChild(el('div', { 
    className: 'modal__title', 
    text: '確認',
    style: { marginBottom: '16px' }
  }));
  
  const msgLines = message.split('\n');
  for (const line of msgLines) {
    modal.appendChild(el('div', {
      className: 'text-sm',
      text: line,
      style: { marginBottom: '8px' },
    }));
  }

  const btnRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });

  btnRow.appendChild(el('button', {
    className: 'btn btn--ghost',
    text: 'キャンセル',
    style: { flex: '1' },
    onClick: () => overlay.remove(),
  }));

  btnRow.appendChild(el('button', {
    className: 'btn btn--red',
    text: '実行する',
    style: { flex: '1' },
    onClick: () => {
      overlay.remove();
      onConfirm();
    },
  }));

  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}
