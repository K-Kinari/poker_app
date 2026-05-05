// ── イベントロガー ──

import { saveEventHistory, loadEventHistory, clearEventHistory } from '../utils/storage.js';
import { uid } from '../utils/dom.js';

class EventLogger {
  constructor() {
    this._events = [];
  }

  /**
   * イベントを記録
   * @param {Object} event
   */
  log(event) {
    const entry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      ...event,
    };
    this._events.push(entry);
    this._persist();
    return entry;
  }

  /**
   * 全イベントを取得
   * @returns {Array}
   */
  getAll() {
    return [...this._events];
  }

  /**
   * 指定ハンド番号のイベントを取得
   * @param {number} handNumber
   * @returns {Array}
   */
  getByHand(handNumber) {
    return this._events.filter(e => e.handNumber === handNumber);
  }

  /**
   * 保存済み履歴を復元
   */
  restore() {
    const saved = loadEventHistory();
    if (saved && saved.length > 0) {
      this._events = saved;
    }
  }

  /**
   * 全履歴をクリア
   */
  clear() {
    this._events = [];
    clearEventHistory();
  }

  /** @private */
  _persist() {
    saveEventHistory(this._events);
  }
}

// シングルトンインスタンス
export const eventLogger = new EventLogger();
