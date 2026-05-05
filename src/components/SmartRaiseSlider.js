// ── スマートレイズスライダー ──
// タッチスライドで金額を選択する「すごいボタン」

import { el } from '../utils/dom.js';
import { formatChips } from '../utils/formatters.js';
import { ACTION_TYPES } from '../utils/constants.js';
import { getBetPresets } from '../core/ActionValidator.js';

/**
 * スマートレイズスライダーを表示
 * @param {Object} player
 * @param {Object} hand
 * @param {Object} settings
 * @param {string} actionType - 'bet' or 'raise'
 * @param {Function} onConfirm - (amount) => void
 * @param {Function} onCancel
 * @returns {HTMLElement}
 */
export function createSmartRaiseSlider(player, hand, settings, actionType, onConfirm, onCancel) {
  const { bigBlind, minChipUnit } = settings;
  const currentBet = hand.playerBets[player.id] || 0;
  const betLine = hand.currentBetLine || 0;
  const lastRaise = hand.lastRaiseSize || bigBlind;
  const totalPot = Object.values(hand.playerBets).reduce((s, v) => s + v, 0) + (hand.collectedPot || 0);
  const stack = player.stack;

  // Min / Max 計算
  let minAmount;
  if (actionType === ACTION_TYPES.BET) {
    minAmount = Math.max(bigBlind, minChipUnit);
  } else {
    const minRaiseTotal = betLine + lastRaise;
    minAmount = minRaiseTotal - currentBet;
  }
  const maxAmount = stack;

  if (minAmount >= maxAmount) {
    // All-in しかできない
    onConfirm(maxAmount);
    return null;
  }

  // スナップポイント（目盛り）を計算
  const snapPoints = buildSnapPoints(minAmount, maxAmount, totalPot, betLine, currentBet, actionType, minChipUnit);

  // 現在の選択額
  let selectedAmount = minAmount;
  const label = actionType === ACTION_TYPES.BET ? 'BET' : 'RAISE';

  // ── DOM構築 ──
  const overlay = el('div', { className: 'slider-overlay', id: 'smart-slider-overlay' });
  const container = el('div', { className: 'slider-container animate-slide' });

  // 選択額表示
  const amountDisplay = el('div', { className: 'slider-amount' });
  const amountLabel = el('div', { className: 'slider-amount__label', text: label });
  const amountValue = el('div', { className: 'slider-amount__value', text: formatChips(minAmount) });
  amountDisplay.appendChild(amountLabel);
  amountDisplay.appendChild(amountValue);
  container.appendChild(amountDisplay);

  // スライダートラック
  const trackWrap = el('div', { className: 'slider-track-wrap' });
  const track = el('div', { className: 'slider-track' });
  const fill = el('div', { className: 'slider-track__fill' });
  const thumb = el('div', { className: 'slider-track__thumb' });
  track.appendChild(fill);
  track.appendChild(thumb);
  trackWrap.appendChild(track);

  // スナップポイントマーカー
  const markers = el('div', { className: 'slider-markers' });
  for (const sp of snapPoints) {
    const ratio = (sp.amount - minAmount) / (maxAmount - minAmount);
    const marker = el('div', { className: 'slider-marker', style: { left: `${ratio * 100}%` } });
    const markerLabel = el('div', { className: 'slider-marker__label', text: sp.label });
    const markerAmount = el('div', { className: 'slider-marker__amount', text: formatChips(sp.amount) });
    marker.appendChild(markerLabel);
    marker.appendChild(markerAmount);

    // マーカータップで即選択
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedAmount = sp.amount;
      updateSlider(ratio);
      amountValue.textContent = formatChips(selectedAmount);
    });

    markers.appendChild(marker);
  }
  trackWrap.appendChild(markers);
  container.appendChild(trackWrap);

  // クイックプリセットボタン行
  const presetRow = el('div', { className: 'slider-presets' });
  const betPresets = getBetPresets(player, hand, settings, actionType);
  for (const bp of betPresets) {
    const btn = el('button', {
      className: 'slider-preset-btn',
      text: bp.label,
      onClick: () => {
        selectedAmount = bp.amount;
        const ratio = (bp.amount - minAmount) / (maxAmount - minAmount);
        updateSlider(ratio);
        amountValue.textContent = formatChips(selectedAmount);
      },
    });
    presetRow.appendChild(btn);
  }
  container.appendChild(presetRow);

  // 確定ボタン
  const confirmBtn = el('button', {
    className: 'btn btn--primary btn--large btn--block slider-confirm',
    text: `${label} ${formatChips(minAmount)}`,
    onClick: () => {
      overlay.remove();
      if (selectedAmount >= stack) {
        onConfirm(stack);
      } else {
        onConfirm(selectedAmount);
      }
    },
  });
  container.appendChild(confirmBtn);

  // キャンセルボタン
  container.appendChild(el('button', {
    className: 'btn btn--ghost btn--block',
    text: '戻る',
    style: { marginTop: '8px' },
    onClick: () => {
      overlay.remove();
      if (onCancel) onCancel();
    },
  }));

  overlay.appendChild(container);

  // ── スライダーロジック ──
  function updateSlider(ratio) {
    const clamped = Math.max(0, Math.min(1, ratio));
    fill.style.width = `${clamped * 100}%`;
    thumb.style.left = `${clamped * 100}%`;

    selectedAmount = Math.round(minAmount + (maxAmount - minAmount) * clamped);
    // 最小チップ単位に丸める
    selectedAmount = Math.floor(selectedAmount / minChipUnit) * minChipUnit;
    selectedAmount = Math.max(minAmount, Math.min(maxAmount, selectedAmount));

    amountValue.textContent = formatChips(selectedAmount);

    // ALL-IN判定
    const isAllin = selectedAmount >= stack;
    if (isAllin) {
      confirmBtn.textContent = `ALL-IN ${formatChips(stack)}`;
      confirmBtn.className = 'btn btn--amber btn--large btn--block slider-confirm';
      amountValue.textContent = formatChips(stack);
      amountLabel.textContent = 'ALL-IN';
      selectedAmount = stack;
    } else {
      confirmBtn.textContent = `${label} ${formatChips(selectedAmount)}`;
      confirmBtn.className = 'btn btn--primary btn--large btn--block slider-confirm';
      amountLabel.textContent = label;
    }
  }

  // タッチ/マウスイベント
  function getSliderRatio(clientX) {
    const rect = track.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  }

  let dragging = false;

  track.addEventListener('mousedown', (e) => { dragging = true; updateSlider(getSliderRatio(e.clientX)); });
  thumb.addEventListener('mousedown', (e) => { dragging = true; e.stopPropagation(); });
  document.addEventListener('mousemove', (e) => { if (dragging) updateSlider(getSliderRatio(e.clientX)); });
  document.addEventListener('mouseup', () => { dragging = false; });

  track.addEventListener('touchstart', (e) => { dragging = true; updateSlider(getSliderRatio(e.touches[0].clientX)); }, { passive: true });
  thumb.addEventListener('touchstart', (e) => { dragging = true; }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (dragging) updateSlider(getSliderRatio(e.touches[0].clientX)); }, { passive: true });
  document.addEventListener('touchend', () => { dragging = false; });

  // オーバーレイタップで閉じる
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });

  // 初期状態
  updateSlider(0);

  return overlay;
}

/**
 * スナップポイントを計算
 */
function buildSnapPoints(minAmount, maxAmount, totalPot, betLine, currentBet, actionType, minChipUnit) {
  const points = [];
  const seen = new Set();

  const addPoint = (label, amount) => {
    amount = Math.floor(amount / minChipUnit) * minChipUnit;
    amount = Math.max(minAmount, Math.min(maxAmount, amount));
    if (seen.has(amount)) return;
    seen.add(amount);
    points.push({ label, amount });
  };

  addPoint('Min', minAmount);
  addPoint('ALL-IN', maxAmount);

  return points.sort((a, b) => a.amount - b.amount);
}
