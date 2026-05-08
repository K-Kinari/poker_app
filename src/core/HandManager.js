// ── ハンド進行管理 ──

import { STREETS, STREET_ORDER, PLAYER_STATUS, ACTION_TYPES } from '../utils/constants.js';
import { getNextActiveSeat, getActionablePlayers, getActivePlayers } from './SeatManager.js';
import { calcBlindPositions, postBlinds, postAntes, getFirstActorPreflop, getFirstActorPostflop } from './BlindManager.js';
import { collectBetsToPot, calculatePots, getTotalPot } from './PotManager.js';
import { uid } from '../utils/dom.js';

/**
 * 新しいハンドを開始する
 * @param {Object} gameState
 * @returns {Array<Object>} 発生したイベント
 */
export function startNewHand(gameState) {
  const events = [];
  const { players, seats, settings } = gameState;

  // ハンド番号を更新
  gameState.handNumber += 1;

  // ── ステータスリセット（ブラインド計算より先に実行する） ──
  for (const player of players) {
    if (player.status === PLAYER_STATUS.FOLDED || player.status === PLAYER_STATUS.ALLIN) {
      if (player.stack > 0) {
        player.status = PLAYER_STATUS.ACTIVE;
      } else {
        player.status = PLAYER_STATUS.OUT;
      }
    }
  }

  // ── 次ハンドから参加するプレイヤーの処理 ──
  for (const p of players) {
    if (p.joinNextHand) {
      p.status = PLAYER_STATUS.ACTIVE;
      delete p.joinNextHand;
    }
  }

  // ── ブラインドポジション計算（Dead Button ルール） ──
  const activePlayers = players.filter(p =>
    ![PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT, PLAYER_STATUS.AWAY].includes(p.status)
  );
  const isHeadsUp = activePlayers.length === 2;

  // 前ハンドの情報は不要。毎ハンド物理的にボタンを1つ進める
  const isFirstHand = gameState.handNumber === 1;

  const { btnSeat, sbSeat, bbSeat } = calcBlindPositions(
    seats, players, gameState.dealerSeatIndex, isFirstHand
  );

  // ゲーム状態を更新
  gameState.dealerSeatIndex = btnSeat;

  // ハンドオブジェクト作成
  const hand = {
    handNumber: gameState.handNumber,
    street: STREETS.PREFLOP,
    buttonSeatIndex: btnSeat,
    smallBlindSeatIndex: sbSeat,
    bigBlindSeatIndex: bbSeat,
    currentTurnSeatIndex: null,
    currentBetLine: 0,
    lastRaiseSize: settings.bigBlind,
    playerBets: {},
    playerBetTypes: {},
    playerTotalContributions: {},
    pots: [],
    collectedPot: 0,
    actionHistory: [],
    actedThisRound: {},
  };

  // 全プレイヤーのベットを初期化
  for (const player of players) {
    hand.playerBets[player.id] = 0;
    hand.playerBetTypes[player.id] = null;
    hand.playerTotalContributions[player.id] = 0;
  }

  gameState.currentHand = hand;

  // ハンド開始イベント
  events.push({
    type: 'hand_started',
    handNumber: hand.handNumber,
    payload: { btnSeat, sbSeat, bbSeat },
  });

  // アンティ徴収
  if (settings.ante > 0) {
    const anteEvents = postAntes(players, seats, settings.ante, hand);
    events.push(...anteEvents);
  }

  // ブラインド徴収
  const blindEvents = postBlinds(
    players, seats, sbSeat, bbSeat,
    settings.smallBlind, settings.bigBlind, hand
  );
  events.push(...blindEvents);

  // 最初のアクション者を決定
  const firstActor = getFirstActorPreflop(seats, players, bbSeat, btnSeat, isHeadsUp);
  hand.currentTurnSeatIndex = firstActor;

  return events;
}

/**
 * アクションを実行する
 * @param {Object} gameState
 * @param {string} actionType
 * @param {number} amount - ベット/レイズ時の総額（プレイヤーが追加で出す額）
 * @returns {{ events: Array, nextAction: string }}
 */
export function executeAction(gameState, actionType, amount = 0) {
  const { players, seats, settings, currentHand: hand } = gameState;
  const events = [];

  if (!hand || hand.currentTurnSeatIndex === null) {
    return { events: [], nextAction: 'error' };
  }

  const seat = seats[hand.currentTurnSeatIndex];
  const player = players.find(p => p.id === seat.playerId);
  if (!player) return { events: [], nextAction: 'error' };

  const currentBet = hand.playerBets[player.id] || 0;
  if (!hand.playerBetTypes) hand.playerBetTypes = {};

  switch (actionType) {
    case ACTION_TYPES.CHECK: {
      events.push({
        type: 'check',
        playerId: player.id,
        handNumber: hand.handNumber,
        amount: 0,
      });
      hand.actedThisRound[player.id] = true;
      break;
    }

    case ACTION_TYPES.CALL: {
      const toCall = hand.currentBetLine - currentBet;
      const actualCall = Math.min(toCall, player.stack);
      player.stack -= actualCall;
      hand.playerBets[player.id] = currentBet + actualCall;
      hand.playerTotalContributions[player.id] = (hand.playerTotalContributions[player.id] || 0) + actualCall;

      if (player.stack === 0) {
        player.status = PLAYER_STATUS.ALLIN;
        hand.playerBetTypes[player.id] = ACTION_TYPES.ALLIN;
        events.push({
          type: 'allin',
          playerId: player.id,
          handNumber: hand.handNumber,
          amount: actualCall,
        });
      } else {
        hand.playerBetTypes[player.id] = ACTION_TYPES.CALL;
        events.push({
          type: 'call',
          playerId: player.id,
          handNumber: hand.handNumber,
          amount: actualCall,
        });
      }
      hand.actedThisRound[player.id] = true;
      break;
    }

    case ACTION_TYPES.FOLD: {
      player.status = PLAYER_STATUS.FOLDED;
      events.push({
        type: 'fold',
        playerId: player.id,
        handNumber: hand.handNumber,
      });
      hand.actedThisRound[player.id] = true;
      break;
    }

    case ACTION_TYPES.BET: {
      const betAmount = amount;
      if (betAmount >= player.stack) {
        // オールイン
        const allinAmount = player.stack;
        player.stack = 0;
        hand.playerBets[player.id] = currentBet + allinAmount;
        hand.playerTotalContributions[player.id] = (hand.playerTotalContributions[player.id] || 0) + allinAmount;
        hand.lastRaiseSize = hand.playerBets[player.id]; // betLine=0からのベットなのでベット額=レイズサイズ
        hand.currentBetLine = hand.playerBets[player.id];
        player.status = PLAYER_STATUS.ALLIN;
        hand.playerBetTypes[player.id] = ACTION_TYPES.ALLIN;
        events.push({
          type: 'allin',
          playerId: player.id,
          handNumber: hand.handNumber,
          amount: allinAmount,
        });
      } else {
        player.stack -= betAmount;
        hand.playerBets[player.id] = currentBet + betAmount;
        hand.playerTotalContributions[player.id] = (hand.playerTotalContributions[player.id] || 0) + betAmount;
        hand.lastRaiseSize = hand.playerBets[player.id];
        hand.currentBetLine = hand.playerBets[player.id];
        hand.playerBetTypes[player.id] = ACTION_TYPES.BET;
        events.push({
          type: 'bet',
          playerId: player.id,
          handNumber: hand.handNumber,
          amount: betAmount,
        });
      }
      // ベット/レイズ後は全員のアクション済みフラグをリセット（自分以外）
      hand.actedThisRound = { [player.id]: true };
      break;
    }

    case ACTION_TYPES.RAISE: {
      const raiseAmount = amount; // プレイヤーが追加で出す総額
      if (raiseAmount >= player.stack) {
        // オールイン
        const allinAmount = player.stack;
        const newTotal = currentBet + allinAmount;
        const raiseSize = newTotal - hand.currentBetLine;
        player.stack = 0;
        hand.playerBets[player.id] = newTotal;
        hand.playerTotalContributions[player.id] = (hand.playerTotalContributions[player.id] || 0) + allinAmount;
        if (raiseSize >= hand.lastRaiseSize) {
          hand.lastRaiseSize = raiseSize;
        }
        hand.currentBetLine = Math.max(hand.currentBetLine, newTotal);
        player.status = PLAYER_STATUS.ALLIN;
        hand.playerBetTypes[player.id] = ACTION_TYPES.ALLIN;
        events.push({
          type: 'allin',
          playerId: player.id,
          handNumber: hand.handNumber,
          amount: allinAmount,
        });
      } else {
        const newTotal = currentBet + raiseAmount;
        const raiseSize = newTotal - hand.currentBetLine;
        player.stack -= raiseAmount;
        hand.playerBets[player.id] = newTotal;
        hand.playerTotalContributions[player.id] = (hand.playerTotalContributions[player.id] || 0) + raiseAmount;
        hand.lastRaiseSize = raiseSize;
        hand.currentBetLine = newTotal;
        hand.playerBetTypes[player.id] = ACTION_TYPES.RAISE;
        events.push({
          type: 'raise',
          playerId: player.id,
          handNumber: hand.handNumber,
          amount: raiseAmount,
        });
      }
      // レイズ後は全員のアクション済みフラグをリセット（自分以外）
      hand.actedThisRound = { [player.id]: true };
      break;
    }

    case ACTION_TYPES.ALLIN: {
      const allinAmount = player.stack;
      const newTotal = currentBet + allinAmount;
      const prevBetLine = hand.currentBetLine;
      player.stack = 0;
      hand.playerBets[player.id] = newTotal;
      hand.playerTotalContributions[player.id] = (hand.playerTotalContributions[player.id] || 0) + allinAmount;

      if (newTotal > prevBetLine) {
        const raiseSize = newTotal - prevBetLine;
        if (raiseSize >= hand.lastRaiseSize) {
          hand.lastRaiseSize = raiseSize;
          // フルレイズなので他のプレイヤーの再レイズ権復活
          hand.actedThisRound = { [player.id]: true };
        } else {
          // ショートオールイン：既にアクション済みのプレイヤーの再レイズ権は復活しない
          hand.actedThisRound[player.id] = true;
        }
        hand.currentBetLine = newTotal;
      } else {
        hand.actedThisRound[player.id] = true;
      }

      player.status = PLAYER_STATUS.ALLIN;
      hand.playerBetTypes[player.id] = ACTION_TYPES.ALLIN;
      events.push({
        type: 'allin',
        playerId: player.id,
        handNumber: hand.handNumber,
        amount: allinAmount,
      });
      break;
    }
  }

  // 次のアクションを決定
  const nextAction = determineNextAction(gameState);
  return { events, nextAction };
}

/**
 * 次のアクション状態を決定する
 * @param {Object} gameState
 * @returns {string} 'next_player' | 'next_street' | 'showdown' | 'win_by_fold'
 */
function determineNextAction(gameState) {
  const { players, seats, currentHand: hand } = gameState;

  // アクティブプレイヤー（フォールドしていない）
  const activePlayers = getActivePlayers(seats, players);

  // フォールドで1人だけ残った場合
  if (activePlayers.length === 1) {
    return 'win_by_fold';
  }

  // アクション可能なプレイヤー（allin除く）
  const actionable = getActionablePlayers(seats, players);

  // アクション可能プレイヤーが0人または1人 → 全員allin or 1人だけ active
  if (actionable.length <= 1) {
    // 全員がアクション済みか、ベットが揃っているか確認
    const allMatched = actionable.every(({ player }) => {
      const bet = hand.playerBets[player.id] || 0;
      return bet === hand.currentBetLine || hand.actedThisRound[player.id];
    });

    if (allMatched || actionable.length === 0) {
      // 次のストリートへ、またはショーダウン
      if (hand.street === STREETS.RIVER || actionable.length === 0) {
        return 'showdown';
      }
      return 'next_street';
    }
  }

  // ベットラウンドが完了したかチェック
  const roundComplete = isRoundComplete(gameState);
  if (roundComplete) {
    if (hand.street === STREETS.RIVER) {
      return 'showdown';
    }
    return 'next_street';
  }

  // 次のプレイヤーへ
  return 'next_player';
}

/**
 * ベットラウンドが完了したかチェック
 * @param {Object} gameState
 * @returns {boolean}
 */
function isRoundComplete(gameState) {
  const { players, seats, currentHand: hand } = gameState;
  const actionable = getActionablePlayers(seats, players);

  if (actionable.length === 0) return true;

  for (const { player } of actionable) {
    const bet = hand.playerBets[player.id] || 0;
    const acted = hand.actedThisRound[player.id] || false;

    // まだアクションしていない or ベット額がベットラインに合っていない
    if (!acted) return false;
    if (bet < hand.currentBetLine && player.status !== PLAYER_STATUS.ALLIN) return false;
  }

  return true;
}

/**
 * 次のプレイヤーに手番を移す
 * @param {Object} gameState
 * @returns {number|null} 次の手番の座席インデックス
 */
export function moveToNextPlayer(gameState) {
  const { players, seats, currentHand: hand } = gameState;

  const nextSeat = getNextActiveSeat(seats, players, hand.currentTurnSeatIndex);
  if (nextSeat === null) return null;

  // そのプレイヤーがこのラウンドでアクション済みかつベットラインに合っているか
  const seat = seats[nextSeat];
  const player = players.find(p => p.id === seat.playerId);
  if (player) {
    const bet = hand.playerBets[player.id] || 0;
    const acted = hand.actedThisRound[player.id] || false;
    if (acted && bet >= hand.currentBetLine) {
      // このプレイヤーはスキップ → ラウンド完了とみなす
      return null;
    }
  }

  hand.currentTurnSeatIndex = nextSeat;
  return nextSeat;
}

/**
 * 次のストリートへ進む
 * @param {Object} gameState
 * @returns {Array<Object>} イベント
 */
export function advanceStreet(gameState) {
  const { players, seats, currentHand: hand, settings } = gameState;
  const events = [];

  // ベットをポットに集約
  collectBetsToPot(hand);

  // ストリート進行
  const currentIdx = STREET_ORDER.indexOf(hand.street);
  if (currentIdx < 0 || currentIdx >= STREET_ORDER.length - 1) {
    hand.street = STREETS.SHOWDOWN;
  } else {
    hand.street = STREET_ORDER[currentIdx + 1];
  }

  events.push({
    type: 'street_changed',
    handNumber: hand.handNumber,
    payload: { street: hand.street },
  });

  // アクション済みフラグリセット
  hand.actedThisRound = {};
  hand.lastRaiseSize = settings.bigBlind;

  // 次のストリートの最初のアクション者を決定
  if (hand.street !== STREETS.SHOWDOWN) {
    const activePlayers = players.filter(p =>
      ![PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT, PLAYER_STATUS.AWAY].includes(p.status)
    );
    const isHeadsUp = activePlayers.filter(p =>
      p.status !== PLAYER_STATUS.FOLDED
    ).length === 2;

    const firstActor = getFirstActorPostflop(
      seats, players,
      hand.buttonSeatIndex, hand.smallBlindSeatIndex, hand.bigBlindSeatIndex,
      isHeadsUp
    );
    hand.currentTurnSeatIndex = firstActor;
  }

  return events;
}

/**
 * ショーダウン状態にする
 * @param {Object} gameState
 * @returns {Array<Object>} イベント
 */
export function goToShowdown(gameState) {
  const { currentHand: hand } = gameState;
  const events = [];

  collectBetsToPot(hand);
  hand.street = STREETS.SHOWDOWN;
  hand.currentTurnSeatIndex = null;

  events.push({
    type: 'street_changed',
    handNumber: hand.handNumber,
    payload: { street: STREETS.SHOWDOWN },
  });

  // ポット計算
  hand.pots = calculatePots(gameState.players, hand, gameState.seats);

  return events;
}

/**
 * フォールドで残り1人になった場合の処理
 * @param {Object} gameState
 * @returns {{ events: Array, winnerId: string }}
 */
export function handleWinByFold(gameState) {
  const { players, seats, currentHand: hand } = gameState;
  const events = [];

  collectBetsToPot(hand);

  // 残っているプレイヤー
  const activePlayers = getActivePlayers(seats, players);
  if (activePlayers.length !== 1) return { events, winnerId: null };

  const winner = activePlayers[0].player;

  // 全投入額を勝者に
  const totalPot = Object.values(hand.playerTotalContributions).reduce((s, v) => s + v, 0);
  winner.stack += totalPot;

  hand.street = STREETS.SETTLED;
  hand.currentTurnSeatIndex = null;
  hand.pots = [{
    id: 'main_pot',
    amount: totalPot,
    eligiblePlayerIds: [winner.id],
    winnerPlayerIds: [winner.id],
  }];

  events.push({
    type: 'pot_settled',
    handNumber: hand.handNumber,
    playerId: winner.id,
    amount: totalPot,
  });

  return { events, winnerId: winner.id };
}
