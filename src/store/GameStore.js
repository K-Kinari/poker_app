// ── ゲーム状態ストア ──
// シンプルなPub/Subパターンの状態管理

import { saveGameState, loadGameState, clearGameState } from '../utils/storage.js';

class GameStore {
  constructor() {
    this._state = null;
    this._listeners = [];
  }

  /**
   * 状態を初期化
   * @param {Object} initialState
   */
  init(initialState) {
    this._state = structuredClone(initialState);
    this._persist();
    this._notify();
  }

  /**
   * 現在の状態を取得（読み取り専用コピー）
   * @returns {Object}
   */
  getState() {
    return this._state;
  }

  /**
   * 状態を更新
   * @param {Function} updater - (state) => void  stateを直接変更する関数
   */
  update(updater) {
    if (!this._state) return;
    updater(this._state);
    this._persist();
    this._notify();
  }

  /**
   * リスナー登録
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /**
   * 保存済み状態を復元
   * @returns {boolean} 復元成功かどうか
   */
  restore() {
    const saved = loadGameState();
    if (saved) {
      this._state = saved;
      this._notify();
      return true;
    }
    return false;
  }

  /**
   * 状態をクリア
   */
  clear() {
    this._state = null;
    clearGameState();
    this._notify();
  }

  /** @private */
  _persist() {
    if (this._state) {
      saveGameState(this._state);
    }
  }

  /** @private */
  _notify() {
    for (const listener of this._listeners) {
      try {
        listener(this._state);
      } catch (e) {
        console.error('Store listener error:', e);
      }
    }
  }
}

// シングルトンインスタンス
export const gameStore = new GameStore();
