// ── ゲームエンジン ──
// 全体のゲーム進行を制御するオーケストレーター

import { GAME_STATUS, PLAYER_STATUS, STREETS } from '../utils/constants.js';
import { uid } from '../utils/dom.js';
import { gameStore } from '../store/GameStore.js';
import { eventLogger } from '../store/EventLogger.js';
import { startNewHand, executeAction, moveToNextPlayer, advanceStreet, goToShowdown, handleWinByFold } from './HandManager.js';
import { calculatePots } from './PotManager.js';
import { distributePots, applyDistributions, calculateFinalSettlement } from './SettlementManager.js';

/**
 * ゲームを作成・初期化する
 * @param {Object} config
 * @returns {Object} gameState
 */
export function createGame(config) {
  const { playerNames, initialStack, smallBlind, bigBlind, ante, minChipUnit, buttonIndex } = config;

  // プレイヤー作成
  const players = playerNames.map((name, i) => ({
    id: uid(),
    name,
    stack: initialStack,
    initialBuyIn: initialStack,
    additionalBuyIn: 0,
    status: PLAYER_STATUS.ACTIVE,
  }));

  // 座席作成
  const seats = players.map((p, i) => ({
    index: i,
    playerId: p.id,
  }));

  const gameState = {
    id: uid(),
    mode: 'ring',
    players,
    seats,
    settings: {
      smallBlind,
      bigBlind,
      ante: ante || 0,
      minChipUnit: minChipUnit || smallBlind,
      maxPlayers: 9,
      oddChipRule: 'nearest_left_of_button',
    },
    currentHand: null,
    handNumber: 0,
    dealerSeatIndex: buttonIndex || 0,
    status: GAME_STATUS.PLAYING,
    history: [],
  };

  // ストアに保存
  gameStore.init(gameState);
  eventLogger.clear();
  eventLogger.log({
    type: 'game_started',
    handNumber: 0,
    payload: { playerCount: players.length, initialStack, smallBlind, bigBlind },
  });

  return gameState;
}

/**
 * 新しいハンドを開始
 * @returns {{ events: Array }}
 */
export function beginHand() {
  const state = gameStore.getState();
  let events = [];

  gameStore.update(s => {
    events = startNewHand(s);
  });

  for (const evt of events) {
    eventLogger.log(evt);
  }

  return { events };
}

/**
 * プレイヤーアクションを実行
 * @param {string} actionType
 * @param {number} amount
 * @returns {{ events: Array, nextAction: string, nextPlayerName: string|null }}
 */
export function performAction(actionType, amount = 0) {
  const state = gameStore.getState();
  let result = {};

  gameStore.update(s => {
    result = executeAction(s, actionType, amount);
  });

  for (const evt of result.events) {
    eventLogger.log(evt);
  }

  const updatedState = gameStore.getState();
  let nextPlayerName = null;

  // 結果に応じた処理
  switch (result.nextAction) {
    case 'next_player': {
      let nextSeat = null;
      gameStore.update(s => {
        nextSeat = moveToNextPlayer(s);
      });
      if (nextSeat !== null) {
        const ns = gameStore.getState();
        const seat = ns.seats[nextSeat];
        const player = ns.players.find(p => p.id === seat.playerId);
        nextPlayerName = player?.name || null;
      } else {
        // ラウンド完了
        result.nextAction = updatedState.currentHand.street === 'river' ? 'showdown' : 'next_street';
        return handlePostRound(result.nextAction, result.events);
      }
      break;
    }
    case 'next_street': {
      return handlePostRound('next_street', result.events);
    }
    case 'showdown': {
      return handlePostRound('showdown', result.events);
    }
    case 'win_by_fold': {
      return handleWinByFoldAction(result.events);
    }
  }

  return {
    events: result.events,
    nextAction: result.nextAction,
    nextPlayerName,
  };
}

/**
 * ラウンド後の処理
 */
function handlePostRound(action, prevEvents) {
  let events = [...prevEvents];
  let nextPlayerName = null;

  if (action === 'next_street') {
    let streetEvents = [];
    gameStore.update(s => {
      streetEvents = advanceStreet(s);
    });
    events.push(...streetEvents);
    for (const evt of streetEvents) {
      eventLogger.log(evt);
    }

    const state = gameStore.getState();
    const hand = state.currentHand;

    if (hand.street === STREETS.SHOWDOWN) {
      return {
        events,
        nextAction: 'showdown',
        nextPlayerName: null,
      };
    }

    // アクション可能なプレイヤーがいるか確認
    if (hand.currentTurnSeatIndex !== null) {
      const seat = state.seats[hand.currentTurnSeatIndex];
      const player = state.players.find(p => p.id === seat.playerId);
      nextPlayerName = player?.name || null;
    }

    // アクション可能プレイヤーが0-1人の場合、自動でショーダウンへ
    const actionable = state.players.filter(p => p.status === PLAYER_STATUS.ACTIVE);
    if (actionable.length <= 1) {
      // 全員allinまたは1人active → ショーダウンへ
      return handlePostRound('showdown', events);
    }

    return {
      events,
      nextAction: 'next_player',
      nextPlayerName,
    };
  }

  if (action === 'showdown') {
    let showdownEvents = [];
    gameStore.update(s => {
      showdownEvents = goToShowdown(s);
    });
    events.push(...showdownEvents);
    for (const evt of showdownEvents) {
      eventLogger.log(evt);
    }

    return {
      events,
      nextAction: 'showdown',
      nextPlayerName: null,
    };
  }

  return { events, nextAction: action, nextPlayerName };
}

/**
 * フォールド勝利の処理
 */
function handleWinByFoldAction(prevEvents) {
  let events = [...prevEvents];
  let result = {};

  gameStore.update(s => {
    result = handleWinByFold(s);
  });

  events.push(...result.events);
  for (const evt of result.events) {
    eventLogger.log(evt);
  }

  return {
    events,
    nextAction: 'win_by_fold',
    winnerId: result.winnerId,
    nextPlayerName: null,
  };
}

/**
 * ショーダウンで勝者を設定する
 * @param {Array<Object>} potWinners - [{potId, winnerIds: [playerId, ...]}]
 * @returns {{ distributions: Array }}
 */
export function setWinners(potWinners) {
  const state = gameStore.getState();
  let distributions = [];

  gameStore.update(s => {
    const hand = s.currentHand;
    if (!hand) return;

    // 勝者を設定
    for (const { potId, winnerIds } of potWinners) {
      const pot = hand.pots.find(p => p.id === potId);
      if (pot) {
        pot.winnerPlayerIds = winnerIds;
      }
    }

    // 分配計算
    distributions = distributePots(
      hand.pots, s.players, s.seats,
      hand.buttonSeatIndex, s.settings.minChipUnit
    );

    // スタックに反映
    applyDistributions(distributions, s.players);

    hand.street = STREETS.SETTLED;

    // イベント記録
    for (const dist of distributions) {
      const player = s.players.find(p => p.id === dist.playerId);
      eventLogger.log({
        type: 'pot_settled',
        handNumber: hand.handNumber,
        playerId: dist.playerId,
        amount: dist.amount,
        payload: { playerName: player?.name },
      });
    }
  });

  return { distributions };
}

/**
 * ゲームを終了して最終清算を行う
 * @returns {Array<Object>}
 */
export function endGame() {
  let settlement = [];

  gameStore.update(s => {
    s.status = GAME_STATUS.ENDED;
    settlement = calculateFinalSettlement(s.players);
  });

  eventLogger.log({
    type: 'game_ended',
    handNumber: gameStore.getState()?.handNumber || 0,
  });

  return settlement;
}

/**
 * ゲーム状態を復元する
 * @returns {boolean}
 */
export function restoreGame() {
  const restored = gameStore.restore();
  if (restored) {
    eventLogger.restore();
  }
  return restored;
}

/**
 * 次のハンドを開始できるか確認
 * @returns {boolean}
 */
export function canStartNextHand() {
  const state = gameStore.getState();
  if (!state || state.status !== GAME_STATUS.PLAYING) return false;

  const activePlayers = state.players.filter(p =>
    ![PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT, PLAYER_STATUS.AWAY].includes(p.status) && p.stack > 0
  );

  return activePlayers.length >= 2;
}
