// ── localStorage管理 ──

const STORAGE_KEY = 'poker_app_game_state';
const HISTORY_KEY = 'poker_app_event_history';

/**
 * ゲーム状態をlocalStorageに保存
 * @param {Object} state
 */
export function saveGameState(state) {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

/**
 * ゲーム状態をlocalStorageから読み込み
 * @returns {Object|null}
 */
export function loadGameState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized);
  } catch (e) {
    console.error('Failed to load game state:', e);
    return null;
  }
}

/**
 * ゲーム状態をlocalStorageから削除
 */
export function clearGameState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear game state:', e);
  }
}

/**
 * イベント履歴を保存
 * @param {Array} events
 */
export function saveEventHistory(events) {
  try {
    const serialized = JSON.stringify(events);
    localStorage.setItem(HISTORY_KEY, serialized);
  } catch (e) {
    console.error('Failed to save event history:', e);
  }
}

/**
 * イベント履歴を読み込み
 * @returns {Array}
 */
export function loadEventHistory() {
  try {
    const serialized = localStorage.getItem(HISTORY_KEY);
    if (!serialized) return [];
    return JSON.parse(serialized);
  } catch (e) {
    console.error('Failed to load event history:', e);
    return [];
  }
}

/**
 * イベント履歴をクリア
 */
export function clearEventHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Failed to clear event history:', e);
  }
}
