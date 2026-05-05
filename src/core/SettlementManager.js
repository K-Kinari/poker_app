// ── 清算管理 ──

/**
 * 勝者にポットを分配する
 * @param {Array} pots - ポット配列
 * @param {Array} players - プレイヤー配列
 * @param {Array} seats - 座席配列
 * @param {number} buttonSeatIndex - BTN座席インデックス
 * @param {number} minChipUnit - 最小チップ単位
 * @returns {Array<{playerId: string, amount: number}>} 各プレイヤーへの分配額
 */
export function distributePots(pots, players, seats, buttonSeatIndex, minChipUnit) {
  const distributions = {};

  for (const pot of pots) {
    const winners = pot.winnerPlayerIds;
    if (!winners || winners.length === 0) continue;

    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;

    for (const winnerId of winners) {
      distributions[winnerId] = (distributions[winnerId] || 0) + share;
    }

    // 端数処理：BTNの左隣に最も近い勝者に付与
    if (remainder > 0) {
      const closestWinner = findClosestWinnerToButtonLeft(winners, seats, buttonSeatIndex);
      if (closestWinner) {
        distributions[closestWinner] = (distributions[closestWinner] || 0) + remainder;
      }
    }
  }

  return Object.entries(distributions).map(([playerId, amount]) => ({
    playerId,
    amount,
  }));
}

/**
 * BTNの左隣に最も近い勝者を見つける
 * @param {Array<string>} winnerIds
 * @param {Array} seats
 * @param {number} buttonSeatIndex
 * @returns {string|null}
 */
function findClosestWinnerToButtonLeft(winnerIds, seats, buttonSeatIndex) {
  const totalSeats = seats.length;

  // BTNの左隣（時計回りの次）から順に探す
  for (let i = 1; i <= totalSeats; i++) {
    const idx = (buttonSeatIndex + i) % totalSeats;
    const seat = seats[idx];
    if (seat && seat.playerId && winnerIds.includes(seat.playerId)) {
      return seat.playerId;
    }
  }

  return winnerIds[0] || null;
}

/**
 * 清算を実行してスタックを更新する
 * @param {Array} distributions
 * @param {Array} players
 * @returns {Array<{playerId: string, playerName: string, delta: number}>}
 */
export function applyDistributions(distributions, players) {
  const results = [];

  for (const dist of distributions) {
    const player = players.find(p => p.id === dist.playerId);
    if (player) {
      player.stack += dist.amount;
      results.push({
        playerId: player.id,
        playerName: player.name,
        delta: dist.amount,
      });
    }
  }

  return results;
}

/**
 * 最終清算データを生成
 * @param {Array} players
 * @returns {Array<Object>}
 */
export function calculateFinalSettlement(players) {
  return players.map(p => {
    const totalBuyIn = p.initialBuyIn + (p.additionalBuyIn || 0);
    const profit = p.stack - totalBuyIn;
    return {
      playerId: p.id,
      name: p.name,
      initialBuyIn: p.initialBuyIn,
      additionalBuyIn: p.additionalBuyIn || 0,
      finalStack: p.stack,
      profit,
    };
  });
}
