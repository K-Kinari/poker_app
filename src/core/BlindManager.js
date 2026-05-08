// ── ブラインド管理 ──
// NLH Dead Button ルール準拠

import { ACTION_TYPES, PLAYER_STATUS } from '../utils/constants.js';

/**
 * BTN, SB, BBの座席インデックスを計算する（Dead Button ルール）
 *
 * NLHルール:
 * - BBは必ず1つ前のBBの左隣のアクティブプレイヤーに進む（飛ばされない）
 * - SBはBBの右隣のアクティブプレイヤー
 * - BTNはSBの右隣のアクティブプレイヤー（dead buttonになることもある）
 * - ヘッズアップ：BTN=SB（BTNが先にアクション）
 *
 * @param {Array} seats
 * @param {Array} players
 * @param {number} buttonSeatIndex - 前ハンドのBTN位置
 * @param {number|null} prevBBSeatIndex - 前ハンドのBB位置（初回はnull）
 * @returns {{ btnSeat: number, sbSeat: number, bbSeat: number }}
 */
export function calcBlindPositions(seats, players, dealerSeatIndex, isFirstHand) {
  // アクティブな座席を収集
  const activeSeatIndices = getActiveSeatIndices(seats, players);

  if (activeSeatIndices.length < 2) {
    throw new Error('ゲームを開始するには2人以上のプレイヤーが必要です');
  }

  const totalSeats = seats.length;

  // ── ヘッズアップ（2人）の場合 ──
  if (activeSeatIndices.length === 2) {
    let btnSeat;
    if (isFirstHand) {
      btnSeat = activeSeatIndices.includes(dealerSeatIndex) 
        ? dealerSeatIndex 
        : findNextActive(dealerSeatIndex, totalSeats, activeSeatIndices);
    } else {
      // 次のアクティブプレイヤーにBTNを移動
      btnSeat = findNextActive(dealerSeatIndex, totalSeats, activeSeatIndices);
    }
    const sbSeat = btnSeat; // ヘッズアップではBTN=SB
    const bbSeat = activeSeatIndices.find(idx => idx !== btnSeat);
    return { btnSeat, sbSeat, bbSeat };
  }

  // ── 3人以上の場合：物理的移動による Dead Button ルール ──
  let physicalBtn = dealerSeatIndex;

  if (!isFirstHand) {
    // 毎ハンド、ボタンは必ず物理的に1つ左（時計回り）に進む
    physicalBtn = (dealerSeatIndex + 1) % totalSeats;
  } else if (!activeSeatIndices.includes(physicalBtn)) {
    // 初回ハンドで指定されたBTNが空席の場合は、最初のアクティブな席まで進める
    physicalBtn = findNextActive(physicalBtn, totalSeats, activeSeatIndices);
  }

  // SBは物理的なBTNの1つ左の席。そこが空席なら Dead SB（null）
  const physicalSb = (physicalBtn + 1) % totalSeats;
  const sbSeat = activeSeatIndices.includes(physicalSb) ? physicalSb : null;

  // BBは物理的なSBの席から見て、最初に見つかるアクティブな席
  const bbSeat = findNextActive(physicalSb, totalSeats, activeSeatIndices);

  return { btnSeat: physicalBtn, sbSeat, bbSeat };
}

/**
 * アクティブな座席インデックスを取得
 */
function getActiveSeatIndices(seats, players) {
  const active = [];
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    if (!seat.playerId) continue;
    const player = players.find(p => p.id === seat.playerId);
    if (!player) continue;
    if ([PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT, PLAYER_STATUS.AWAY].includes(player.status)) continue;
    active.push(i);
  }
  return active;
}

/**
 * fromIndexの次のアクティブ座席を時計回りに探す
 */
function findNextActive(fromIndex, totalSeats, activeSeatIndices) {
  for (let i = 1; i <= totalSeats; i++) {
    const idx = (fromIndex + i) % totalSeats;
    if (activeSeatIndices.includes(idx)) return idx;
  }
  return activeSeatIndices[0]; // フォールバック
}

/**
 * fromIndexの前のアクティブ座席を反時計回りに探す
 */
function findPrevActive(fromIndex, totalSeats, activeSeatIndices) {
  for (let i = 1; i <= totalSeats; i++) {
    const idx = (fromIndex - i + totalSeats) % totalSeats;
    if (activeSeatIndices.includes(idx)) return idx;
  }
  return activeSeatIndices[0]; // フォールバック
}

/**
 * ブラインドを徴収する
 * @param {Array} players
 * @param {Array} seats
 * @param {number} sbSeat
 * @param {number} bbSeat
 * @param {number} sbAmount
 * @param {number} bbAmount
 * @param {Object} hand - Handオブジェクト
 * @returns {Array<Object>} 徴収イベントの配列
 */
export function postBlinds(players, seats, sbSeat, bbSeat, sbAmount, bbAmount, hand) {
  const events = [];

  // SB
  if (sbSeat !== null && sbSeat !== undefined) {
    const sbPlayer = players.find(p => p.id === seats[sbSeat].playerId);
    if (sbPlayer) {
      const actualSB = Math.min(sbAmount, sbPlayer.stack);
      sbPlayer.stack -= actualSB;
      hand.playerBets[sbPlayer.id] = (hand.playerBets[sbPlayer.id] || 0) + actualSB;
      hand.playerTotalContributions[sbPlayer.id] = (hand.playerTotalContributions[sbPlayer.id] || 0) + actualSB;
      if (sbPlayer.stack === 0) {
        sbPlayer.status = PLAYER_STATUS.ALLIN;
      }
      if (hand.playerBetTypes) {
        hand.playerBetTypes[sbPlayer.id] = sbPlayer.status === PLAYER_STATUS.ALLIN
          ? ACTION_TYPES.ALLIN
          : ACTION_TYPES.BET;
      }
      events.push({
        type: 'blind_posted',
        playerId: sbPlayer.id,
        amount: actualSB,
        handNumber: hand.handNumber,
        payload: { position: 'SB' },
      });
    }
  }

  // BB
  const bbPlayer = players.find(p => p.id === seats[bbSeat].playerId);
  if (bbPlayer) {
    const actualBB = Math.min(bbAmount, bbPlayer.stack);
    bbPlayer.stack -= actualBB;
    hand.playerBets[bbPlayer.id] = (hand.playerBets[bbPlayer.id] || 0) + actualBB;
    hand.playerTotalContributions[bbPlayer.id] = (hand.playerTotalContributions[bbPlayer.id] || 0) + actualBB;
    if (bbPlayer.stack === 0) {
      bbPlayer.status = PLAYER_STATUS.ALLIN;
    }
    if (hand.playerBetTypes) {
      hand.playerBetTypes[bbPlayer.id] = bbPlayer.status === PLAYER_STATUS.ALLIN
        ? ACTION_TYPES.ALLIN
        : ACTION_TYPES.BET;
    }
    events.push({
      type: 'blind_posted',
      playerId: bbPlayer.id,
      amount: actualBB,
      handNumber: hand.handNumber,
      payload: { position: 'BB' },
    });
  }

  // ベットラインを設定
  hand.currentBetLine = Math.max(...Object.values(hand.playerBets));

  return events;
}

/**
 * アンティを徴収する
 * @param {Array} players
 * @param {Array} seats
 * @param {number} anteAmount
 * @param {Object} hand
 * @returns {Array<Object>}
 */
export function postAntes(players, seats, anteAmount, hand) {
  if (anteAmount <= 0) return [];

  const events = [];
  for (const seat of seats) {
    if (!seat.playerId) continue;
    const player = players.find(p => p.id === seat.playerId);
    if (!player) continue;
    if ([PLAYER_STATUS.AWAY, PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT].includes(player.status)) continue;

    const actualAnte = Math.min(anteAmount, player.stack);
    player.stack -= actualAnte;
    hand.playerTotalContributions[player.id] = (hand.playerTotalContributions[player.id] || 0) + actualAnte;

    if (player.stack === 0 && player.status !== PLAYER_STATUS.ALLIN) {
      player.status = PLAYER_STATUS.ALLIN;
    }

    events.push({
      type: 'ante_posted',
      playerId: player.id,
      amount: actualAnte,
      handNumber: hand.handNumber,
    });
  }

  return events;
}

/**
 * プリフロップの最初のアクション者を決定
 * UTG = BBの左隣のアクティブプレイヤー
 * ヘッズアップ：BTN/SBが先
 */
export function getFirstActorPreflop(seats, players, bbSeat, btnSeat, isHeadsUp) {
  const totalSeats = seats.length;

  if (isHeadsUp) {
    // ヘッズアップ：SB/BTNから開始 → BTN座席
    return btnSeat;
  }

  // 通常：BBの左隣（次のアクティブ）
  for (let i = 1; i <= totalSeats; i++) {
    const idx = (bbSeat + i) % totalSeats;
    const seat = seats[idx];
    if (!seat.playerId) continue;
    const player = players.find(p => p.id === seat.playerId);
    if (!player) continue;
    if ([PLAYER_STATUS.FOLDED, PLAYER_STATUS.ALLIN, PLAYER_STATUS.AWAY, PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT].includes(player.status)) continue;
    return idx;
  }
  return null;
}

/**
 * ポストフロップの最初のアクション者を決定
 * BTNの左隣のアクティブプレイヤー（SBまたはそれに近い位置）
 */
export function getFirstActorPostflop(seats, players, btnSeat, sbSeat, bbSeat, isHeadsUp) {
  const totalSeats = seats.length;

  if (isHeadsUp) {
    // ヘッズアップ：BBから開始（BTNの相手）
    const bbPlayer = players.find(p => p.id === seats[bbSeat]?.playerId);
    if (bbPlayer && bbPlayer.status === PLAYER_STATUS.ACTIVE) {
      return bbSeat;
    }
    // BBがアクション不可なら次のアクティブ
    for (let i = 1; i <= totalSeats; i++) {
      const idx = (bbSeat + i) % totalSeats;
      const seat = seats[idx];
      if (!seat.playerId) continue;
      const player = players.find(p => p.id === seat.playerId);
      if (!player) continue;
      if (player.status === PLAYER_STATUS.ACTIVE) return idx;
    }
    return null;
  }

  // 通常：BTNの左隣から時計回りに最初のACTIVEプレイヤー
  for (let i = 1; i <= totalSeats; i++) {
    const idx = (btnSeat + i) % totalSeats;
    const seat = seats[idx];
    if (!seat.playerId) continue;
    const player = players.find(p => p.id === seat.playerId);
    if (!player) continue;
    if (player.status === PLAYER_STATUS.ACTIVE) return idx;
  }
  return null;
}
