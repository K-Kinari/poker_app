// ── メインエントリポイント ──

import { gameStore } from './store/GameStore.js';
import { eventLogger } from './store/EventLogger.js';
import { createGame, beginHand, performAction, setWinners, endGame, restoreGame, canStartNextHand } from './core/GameEngine.js';
import { getPlayerBySeat } from './core/SeatManager.js';
import { STREETS, PLAYER_STATUS } from './utils/constants.js';
import { renderSetupScreen } from './screens/SetupScreen.js';
import { renderTableScreen } from './screens/TableScreen.js';
import { renderHandoffScreen } from './screens/HandoffScreen.js';
import { renderShowdownScreen } from './screens/ShowdownScreen.js';
import { renderSettlementScreen, renderFoldWinScreen } from './screens/SettlementScreen.js';
import { renderFinalScreen } from './screens/FinalScreen.js';
import { renderHistoryScreen } from './screens/HistoryScreen.js';
import { renderAdminScreen } from './screens/AdminScreen.js';
import { $ } from './utils/dom.js';

// ── アプリケーション ──
class PokerApp {
  constructor() {
    this.container = $('app');
    this.lastActionInfo = null;
  }

  start() {
    // 既存ゲームの復元を試みる
    if (restoreGame()) {
      const state = gameStore.getState();
      if (state && state.status === 'playing' && state.currentHand) {
        this.showTable();
        return;
      }
    }
    this.showSetup();
  }

  showSetup() {
    renderSetupScreen(this.container, (config) => {
      createGame(config);
      beginHand();
      this.showTable();
    });
  }

  showTable() {
    renderTableScreen(
      this.container,
      (actionType, amount) => this.handleAction(actionType, amount),
      () => this.showAdmin()
    );
  }

  handleAction(actionType, amount) {
    const state = gameStore.getState();
    const hand = state.currentHand;
    if (!hand) return;

    // アクション実行前のプレイヤー情報を保存
    const currentSeat = hand.currentTurnSeatIndex;
    const currentPlayer = getPlayerBySeat(state.seats, state.players, currentSeat);
    const actionPlayerName = currentPlayer?.name || '';

    // アクション実行
    const result = performAction(actionType, amount);

    // アクション結果の金額を取得（プレイヤーの実アクションのみ対象）
    const playerActionTypes = ['check', 'call', 'fold', 'bet', 'raise', 'allin'];
    const playerEvents = (result.events || []).filter(e => playerActionTypes.includes(e.type));
    let actionAmount = amount;
    let displayActionType = actionType;

    if (playerEvents.length > 0) {
      const lastPlayerEvt = playerEvents[playerEvents.length - 1];
      if (lastPlayerEvt.amount !== undefined) actionAmount = lastPlayerEvt.amount;
      displayActionType = lastPlayerEvt.type || actionType;
    }

    this.lastActionInfo = {
      actionPlayerName,
      actionType: displayActionType,
      actionAmount,
    };

    // 結果に応じた画面遷移
    switch (result.nextAction) {
      case 'next_player':
        this.showHandoff(result.nextPlayerName, false);
        break;

      case 'showdown':
        this.showHandoff(null, false);
        break;

      case 'win_by_fold': {
        const updatedState = gameStore.getState();
        const winnerPlayer = updatedState.players.find(p => p.id === result.winnerId);
        this.showHandoff(winnerPlayer?.name || '', true);
        break;
      }
    }
  }

  showHandoff(nextPlayerName, isWinByFold) {
    const info = this.lastActionInfo || {};
    renderHandoffScreen(this.container, {
      actionPlayerName: info.actionPlayerName || '',
      actionType: info.actionType || '',
      actionAmount: info.actionAmount || 0,
      nextPlayerName,
      isWinByFold,
    }, () => {
      if (isWinByFold) {
        const state = gameStore.getState();
        const winnerId = state.currentHand?.pots?.[0]?.winnerPlayerIds?.[0];
        const winner = state.players.find(p => p.id === winnerId);
        const potAmount = state.currentHand?.pots?.[0]?.amount || 0;
        this.showFoldWin(winner?.name || '', potAmount);
      } else if (!nextPlayerName) {
        this.showShowdown();
      } else {
        this.showTable();
      }
    });
  }

  showFoldWin(winnerName, potAmount) {
    renderFoldWinScreen(this.container, winnerName, potAmount,
      () => this.nextHand(),
      () => this.finishGame()
    );
  }

  showShowdown() {
    renderShowdownScreen(this.container, (potWinners) => {
      const { distributions } = setWinners(potWinners);
      this.showSettlement(distributions);
    });
  }

  showSettlement(distributions) {
    renderSettlementScreen(this.container, distributions,
      () => this.nextHand(),
      () => this.finishGame()
    );
  }

  nextHand() {
    if (canStartNextHand()) {
      beginHand();
      this.showTable();
    } else {
      this.finishGame();
    }
  }

  finishGame() {
    const settlement = endGame();
    renderFinalScreen(this.container, settlement, () => {
      gameStore.clear();
      eventLogger.clear();
      this.showSetup();
    });
  }

  // ── 管理画面 ──
  showAdmin() {
    renderAdminScreen(
      this.container,
      () => this.showTable(),         // 戻る
      () => this.showHistory(),       // 操作履歴
      () => this.forceEndHand(),      // ハンド強制終了
      () => this.finishGame()         // ゲーム終了
    );
  }

  // ── 操作履歴画面 ──
  showHistory() {
    renderHistoryScreen(this.container, () => this.showAdmin());
  }

  // ── ハンド強制終了 ──
  forceEndHand() {
    gameStore.update(s => {
      const hand = s.currentHand;
      if (!hand) return;

      // このハンドで投入した全チップを各プレイヤーに返却
      for (const player of s.players) {
        const totalContrib = hand.playerTotalContributions[player.id] || 0;
        if (totalContrib > 0) {
          player.stack += totalContrib;
          hand.playerTotalContributions[player.id] = 0;
          hand.playerBets[player.id] = 0;
        }
        // ステータスリセット
        if (player.status === PLAYER_STATUS.FOLDED || player.status === PLAYER_STATUS.ALLIN) {
          if (player.stack > 0) {
            player.status = PLAYER_STATUS.ACTIVE;
          } else {
            player.status = PLAYER_STATUS.OUT;
          }
        }
      }

      hand.street = STREETS.SETTLED;
      hand.currentTurnSeatIndex = null;
    });

    eventLogger.log({
      type: 'hand_forced_end',
      handNumber: gameStore.getState()?.handNumber || 0,
    });

    // 次のハンドへ
    if (canStartNextHand()) {
      beginHand();
      this.showTable();
    } else {
      this.finishGame();
    }
  }
}

// ── 起動 ──
document.addEventListener('DOMContentLoaded', () => {
  const app = new PokerApp();
  app.start();
});
