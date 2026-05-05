// ── 定数定義 ──

export const STREETS = {
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  SETTLED: 'settled',
};

export const STREET_ORDER = [
  STREETS.PREFLOP,
  STREETS.FLOP,
  STREETS.TURN,
  STREETS.RIVER,
  STREETS.SHOWDOWN,
];

export const PLAYER_STATUS = {
  ACTIVE: 'active',
  FOLDED: 'folded',
  ALLIN: 'allin',
  AWAY: 'away',
  OUT: 'out',
  LEFT: 'left',
};

export const GAME_STATUS = {
  SETUP: 'setup',
  PLAYING: 'playing',
  ENDED: 'ended',
};

export const ACTION_TYPES = {
  CHECK: 'check',
  CALL: 'call',
  FOLD: 'fold',
  BET: 'bet',
  RAISE: 'raise',
  ALLIN: 'allin',
};

export const EVENT_TYPES = {
  GAME_STARTED: 'game_started',
  HAND_STARTED: 'hand_started',
  BLIND_POSTED: 'blind_posted',
  ANTE_POSTED: 'ante_posted',
  CHECK: 'check',
  CALL: 'call',
  FOLD: 'fold',
  BET: 'bet',
  RAISE: 'raise',
  ALLIN: 'allin',
  STREET_CHANGED: 'street_changed',
  WINNER_SELECTED: 'winner_selected',
  POT_SETTLED: 'pot_settled',
  BUYIN_ADDED: 'buyin_added',
  STACK_ADJUSTED: 'stack_adjusted',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_AWAY: 'player_away',
  PLAYER_RETURNED: 'player_returned',
  HAND_FORCED_END: 'hand_forced_end',
  GAME_ENDED: 'game_ended',
};

export const POSITION_LABELS = {
  BTN: 'BTN',
  SB: 'SB',
  BB: 'BB',
};

export const MAX_PLAYERS = 9;
export const MIN_PLAYERS = 2;

export const DEFAULT_SETTINGS = {
  smallBlind: 50,
  bigBlind: 100,
  ante: 0,
  minChipUnit: 50,
  initialStack: 5000,
  maxPlayers: MAX_PLAYERS,
  oddChipRule: 'nearest_left_of_button',
};
