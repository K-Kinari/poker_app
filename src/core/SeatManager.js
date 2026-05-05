// ── 座席管理 ──

import { PLAYER_STATUS } from '../utils/constants.js';

/**
 * 指定座席インデックスの次の座席（アクティブプレイヤーのみ）を返す
 * @param {Array} seats - 座席配列
 * @param {Array} players - プレイヤー配列
 * @param {number} fromIndex - 起点座席
 * @param {Array<string>} excludeStatuses - 除外するステータス
 * @returns {number|null} 次の座席インデックス
 */
export function getNextActiveSeat(seats, players, fromIndex, excludeStatuses = []) {
  const totalSeats = seats.length;
  const defaultExclude = [PLAYER_STATUS.FOLDED, PLAYER_STATUS.ALLIN, PLAYER_STATUS.AWAY, PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT];
  const excluded = excludeStatuses.length > 0 ? excludeStatuses : defaultExclude;

  for (let i = 1; i <= totalSeats; i++) {
    const idx = (fromIndex + i) % totalSeats;
    const seat = seats[idx];
    if (!seat.playerId) continue;
    const player = players.find(p => p.id === seat.playerId);
    if (!player) continue;
    if (excluded.includes(player.status)) continue;
    return idx;
  }
  return null;
}

/**
 * アクション可能なプレイヤー（fold/allin/away/out/left以外）を取得
 * @param {Array} seats
 * @param {Array} players
 * @returns {Array<{seatIndex: number, player: Object}>}
 */
export function getActionablePlayers(seats, players) {
  const result = [];
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    if (!seat.playerId) continue;
    const player = players.find(p => p.id === seat.playerId);
    if (!player) continue;
    if ([PLAYER_STATUS.FOLDED, PLAYER_STATUS.ALLIN, PLAYER_STATUS.AWAY, PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT].includes(player.status)) continue;
    result.push({ seatIndex: i, player });
  }
  return result;
}

/**
 * ハンドに参加しているプレイヤー（fold以外で着席中）
 * @param {Array} seats
 * @param {Array} players
 * @returns {Array<{seatIndex: number, player: Object}>}
 */
export function getHandParticipants(seats, players) {
  const result = [];
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    if (!seat.playerId) continue;
    const player = players.find(p => p.id === seat.playerId);
    if (!player) continue;
    if ([PLAYER_STATUS.AWAY, PLAYER_STATUS.OUT, PLAYER_STATUS.LEFT].includes(player.status)) continue;
    result.push({ seatIndex: i, player });
  }
  return result;
}

/**
 * フォールドしていない参加者（allin含む）
 * @param {Array} seats
 * @param {Array} players
 * @returns {Array<{seatIndex: number, player: Object}>}
 */
export function getActivePlayers(seats, players) {
  return getHandParticipants(seats, players).filter(
    p => p.player.status !== PLAYER_STATUS.FOLDED
  );
}

/**
 * 座席に着席中のプレイヤーIDリストを返す
 * @param {Array} seats
 * @returns {Array<string>}
 */
export function getSeatedPlayerIds(seats) {
  return seats.filter(s => s.playerId).map(s => s.playerId);
}

/**
 * プレイヤーIDから座席インデックスを返す
 * @param {Array} seats
 * @param {string} playerId
 * @returns {number}
 */
export function getSeatIndexByPlayerId(seats, playerId) {
  return seats.findIndex(s => s.playerId === playerId);
}

/**
 * 座席インデックスからプレイヤーを取得
 * @param {Array} seats
 * @param {Array} players
 * @param {number} seatIndex
 * @returns {Object|null}
 */
export function getPlayerBySeat(seats, players, seatIndex) {
  const seat = seats[seatIndex];
  if (!seat || !seat.playerId) return null;
  return players.find(p => p.id === seat.playerId) || null;
}
