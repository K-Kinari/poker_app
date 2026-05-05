// ── ポット管理 ──

/**
 * サイドポットを計算する
 * 各プレイヤーのハンド内総投入額を昇順に分解し、ポット階層を作成
 *
 * @param {Array} players - 全プレイヤー
 * @param {Object} hand - 現在のハンド
 * @param {Array} seats - 座席配列
 * @returns {Array<Object>} ポット配列 [{ id, amount, eligiblePlayerIds, winnerPlayerIds }]
 */
export function calculatePots(players, hand, seats) {
  // ハンドに参加したプレイヤーの投入額を収集
  const contributions = [];
  for (const player of players) {
    const total = hand.playerTotalContributions[player.id] || 0;
    if (total > 0) {
      contributions.push({
        playerId: player.id,
        amount: total,
        isFolded: player.status === 'folded',
        isEligible: player.status !== 'folded',
      });
    }
  }

  if (contributions.length === 0) return [];

  // 投入額の昇順でユニークな閾値を取得
  const uniqueAmounts = [...new Set(contributions.map(c => c.amount))].sort((a, b) => a - b);

  const pots = [];
  let prevThreshold = 0;

  for (let i = 0; i < uniqueAmounts.length; i++) {
    const threshold = uniqueAmounts[i];
    const slice = threshold - prevThreshold;
    if (slice <= 0) continue;

    // この階層に投入したプレイヤー数
    const contributorsAtThisLevel = contributions.filter(c => c.amount >= threshold);
    const potAmount = slice * contributorsAtThisLevel.length;

    // 獲得対象はフォールドしていないプレイヤーのみ
    const eligiblePlayerIds = contributorsAtThisLevel
      .filter(c => c.isEligible)
      .map(c => c.playerId);

    if (potAmount > 0) {
      pots.push({
        id: `pot_${i}`,
        amount: potAmount,
        eligiblePlayerIds,
        winnerPlayerIds: [],
      });
    }

    prevThreshold = threshold;
  }

  // ポットをマージ：同じ獲得対象のポットは統合する
  const mergedPots = [];
  for (const pot of pots) {
    const eligibleKey = pot.eligiblePlayerIds.sort().join(',');
    const existing = mergedPots.find(p => p.eligiblePlayerIds.sort().join(',') === eligibleKey);
    if (existing) {
      existing.amount += pot.amount;
    } else {
      mergedPots.push({ ...pot });
    }
  }

  // IDを振り直す
  for (let i = 0; i < mergedPots.length; i++) {
    mergedPots[i].id = i === 0 ? 'main_pot' : `side_pot_${i}`;
  }

  return mergedPots;
}

/**
 * 現在の合計ポット額を計算
 * @param {Object} hand
 * @returns {number}
 */
export function getTotalPot(hand) {
  if (!hand) return 0;
  const bets = Object.values(hand.playerBets || {}).reduce((s, v) => s + v, 0);
  const collected = hand.collectedPot || 0;
  const prevPots = (hand.pots || []).reduce((s, p) => s + p.amount, 0);
  return bets + collected + prevPots;
}

/**
 * ベットラウンド終了時にベットをポットに集約する
 * @param {Object} hand
 */
export function collectBetsToPot(hand) {
  const totalBets = Object.values(hand.playerBets).reduce((s, v) => s + v, 0);
  if (totalBets > 0) {
    // 累積ポットに加算（ストリート間のPOT表示を維持するため）
    if (!hand.collectedPot) hand.collectedPot = 0;
    hand.collectedPot += totalBets;

    // 現在ベットをリセット
    for (const pid of Object.keys(hand.playerBets)) {
      hand.playerBets[pid] = 0;
    }
    hand.currentBetLine = 0;
    hand.lastRaiseSize = 0;
  }
}
