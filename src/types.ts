/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameType {
  LONGQUAN_MAHJONG = 'longquan_mahjong',
  CHENGDU_BLOOD_BATTLE = 'chengdu_blood_battle',
  PAODEKUAI = 'paodekuai',
}

export enum RoomStatus {
  WAITING = 'waiting',
  IN_ROUND = 'in_round',
  SETTLED = 'settled',
}

export interface User {
  id: string;
  nickname: string;
  token: string;
  points: number;
}

export interface Player {
  id: string;
  nickname: string;
  points: number;
  isReady: boolean;
  isOnline: boolean;
  avatarSeed?: string;
}

export interface Room {
  id: string;
  roomNo: string;
  gameType: GameType;
  ownerId: string;
  players: Player[];
  status: RoomStatus;
  maxPlayers: number;
  rules: {
    diSufen: number; // Base point score value
    isClubRoom: boolean;
    clubId?: string;
    roundLimit?: number;
  };
  currentRound: number;
  totalRounds: number;
}

// Representing active Mahjong Tile Meld (Peng/Gang/Chi)
export interface MahjongMeld {
  type: 'peng' | 'gang' | 'chi';
  tile: string;
  fromPlayerId?: string;
}

export interface PlayerGameState {
  playerId: string;
  handTiles?: string[]; // Mahjong: [1W, 2W, 3W, ...]
  handCards?: string[]; // Paodekuai: [S3, H4, D10, ...]
  melds?: MahjongMeld[]; // Mahjong Peng/Gang
  discards: string[];
  isDealer?: boolean;
}

export interface GameEngineState {
  roomId: string;
  gameType: GameType;
  status: 'waiting' | 'deal' | 'discarding' | 'action_confirm' | 'ended';
  activePlayerId: string;
  dealerId: string;
  turnTimer: number; // in seconds
  wallCount?: number; // remaining tiles in mahjong wall (e.g., 108)
  disposedCards?: string[]; // Paodekuai middle table cards (last played pattern)
  lastPlayPlayerId?: string; // Paodekuai: who played the last hand
  playerStates: { [playerId: string]: PlayerGameState };
  settlement?: SettlementHistory;
}

export interface Club {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  ownerNickname: string;
  memberCount: number;
  roomsActive: number;
  points: number;
  createdAt: string;
}

export interface SettlementPlayer {
  nickname: string;
  scoreChange: number;
  points: number;
  isWinner?: boolean;
}

export interface SettlementHistory {
  id: string;
  gameType: GameType;
  roomId: string;
  roomNo: string;
  timestamp: string;
  players: SettlementPlayer[];
  roundNum: number;
}

export interface PointsTransaction {
  id: string;
  amount: number;
  type: 'topup' | 'game_win' | 'game_lose' | 'club_fee';
  timestamp: string;
  description: string;
}
