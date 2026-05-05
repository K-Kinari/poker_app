// ── アクションバリデーター ──

import { PLAYER_STATUS, ACTION_TYPES, STREETS } from '../utils/constants.js';
import { roundToUnit } from '../utils/formatters.js';

/**
 * 現在のプレイヤーが実行可能なアクション一覧を返す
 * @param {Object} player
 * @param {Object} hand
 * @param {Object} settings
 * @returns {Array<Object>} アクション配列
 */
export function getAvailableActions(player, hand, settings) {
  if (!player || player.status !== PLAYER_STATUS.ACTIVE) return [];

  const actions = [];
  const currentBet = hand.playerBets[player.id] || 0;
  const betLine = hand.currentBetLine || 0;
  const toCall = betLine - currentBet;
  const stack = player.stack;
  const { bigBlind, minChipUnit } = settings;
  const lastRaise = hand.lastRaiseSize || bigBlind;

  // ─── チェック ───
  if (toCall === 0) {
    actions.push({
      type: ACTION_TYPES.CHECK,
      amount: 0,
      label: 'CHECK',
    });
  }

  // ─── コール ───
  if (toCall > 0) {
    if (stack <= toCall) {
      // スタック不足でコール額に足りない → オールインのみ
      actions.push({
        type: ACTION_TYPES.ALLIN,
        amount: stack,
        label: `ALL-IN ${stack}`,
      });
    } else {
      actions.push({
        type: ACTION_TYPES.CALL,
        amount: toCall,
        label: `CALL ${toCall}`,
      });
    }
  }

  // ─── ベット（betLine === 0 の場合） ───
  if (betLine === 0 && toCall === 0) {
    const minBet = Math.max(bigBlind, minChipUnit);
    if (stack > 0) {
      if (stack <= minBet) {
        // ベットするにはスタック全額 = オールイン
        actions.push({
          type: ACTION_TYPES.ALLIN,
          amount: stack,
          label: `ALL-IN ${stack}`,
        });
      } else {
        actions.push({
          type: ACTION_TYPES.BET,
          amount: minBet,
          minAmount: minBet,
          maxAmount: stack,
          label: 'BET',
        });
      }
    }
  }

  // ─── レイズ（betLine > 0 の場合） ───
  // プリフロップでのBBオプション時（toCall === 0）も含めるため、toCall > 0の条件を外す
  if (betLine > 0 && stack > toCall) {
    const minRaiseTotal = betLine + lastRaise;
    const minRaiseFromPlayer = minRaiseTotal - currentBet;

    if (stack <= minRaiseFromPlayer) {
      // レイズするにはスタック全額 = オールイン（コール後に追加できない）
      // オールインは上で既に追加されない場合のみ
      if (!actions.find(a => a.type === ACTION_TYPES.ALLIN)) {
        actions.push({
          type: ACTION_TYPES.ALLIN,
          amount: stack,
          label: `ALL-IN ${stack}`,
        });
      }
    } else {
      actions.push({
        type: ACTION_TYPES.RAISE,
        amount: minRaiseFromPlayer,
        minAmount: minRaiseFromPlayer,
        maxAmount: stack,
        label: 'RAISE',
      });
    }
  }

  // ─── フォールド ───
  // チェック可能な場合もフォールドは表示する（仕様に従い）
  actions.push({
    type: ACTION_TYPES.FOLD,
    amount: 0,
    label: 'FOLD',
  });

  return actions;
}

/**
 * ベット/レイズのプリセット候補を計算
 * @param {Object} player
 * @param {Object} hand
 * @param {Object} settings
 * @param {string} actionType - 'bet' or 'raise'
 * @returns {Array<{label: string, amount: number}>}
 */
export function getBetPresets(player, hand, settings, actionType) {
  const currentBet = hand.playerBets[player.id] || 0;
  const betLine = hand.currentBetLine || 0;
  const stack = player.stack;
  const { bigBlind, minChipUnit } = settings;
  const lastRaise = hand.lastRaiseSize || bigBlind;

  // 現在のポット合計を計算
  const totalPot = Object.values(hand.playerBets).reduce((s, v) => s + v, 0) + (hand.collectedPot || 0);

  let minAmount, maxAmount;

  if (actionType === ACTION_TYPES.BET) {
    minAmount = Math.max(bigBlind, minChipUnit);
    maxAmount = stack;
  } else {
    // RAISE
    const minRaiseTotal = betLine + lastRaise;
    minAmount = minRaiseTotal - currentBet;
    maxAmount = stack;
  }

  if (minAmount >= maxAmount) {
    return [{ label: 'ALL-IN', amount: maxAmount }];
  }

  const presets = [];
  const seen = new Set();

  const addPreset = (label, amount) => {
    amount = roundToUnit(amount, minChipUnit) || amount;
    // 重複やMax超えのチェック
    if (amount > minAmount && amount < maxAmount && !seen.has(amount)) {
      seen.add(amount);
      presets.push({ label, amount });
    }
  };

  // 常にMinを含める
  presets.push({ label: 'Min', amount: roundToUnit(minAmount, minChipUnit) || minAmount });
  seen.add(presets[0].amount);

  if (hand.street === STREETS.PREFLOP && betLine === bigBlind && actionType === ACTION_TYPES.RAISE) {
    // パターン1: プリフロップでのオープンレイズ
    presets[0].label = `Min(${((minAmount + currentBet) / bigBlind).toFixed(1).replace(/\.0$/, '')}BB)`;
    addPreset('3BB', (bigBlind * 3) - currentBet);
    addPreset('4BB', (bigBlind * 4) - currentBet);
  } else if (actionType === ACTION_TYPES.BET) {
    // パターン2: フロップ以降の新規ベット
    // BETなので currentBet は通常 0 だが念のため引く
    addPreset('1/3 Pot', Math.floor(totalPot / 3) - currentBet);
    addPreset('1/2 Pot', Math.floor(totalPot / 2) - currentBet);
    addPreset('2/3 Pot', Math.floor((totalPot * 2) / 3) - currentBet);
    addPreset('Pot', totalPot - currentBet);
  } else {
    // パターン3: 3ベット以降（プリフロップのリレイズや、ポストフロップのレイズ）
    // 「相手の打った額（直前のベットライン額）のN倍をトータルで打ち返す」計算
    addPreset('x3', (betLine * 3) - currentBet);
    addPreset('x4', (betLine * 4) - currentBet);
    addPreset('x5', (betLine * 5) - currentBet);
  }

  // 常にALL-INを含める
  if (!seen.has(maxAmount)) {
    presets.push({ label: 'ALL-IN', amount: maxAmount });
  }

  // ソートして返す
  return presets.sort((a, b) => a.amount - b.amount);
}
