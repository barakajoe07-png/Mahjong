/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getWsBaseUrl, isDemoMode } from './runtime-config';

export interface WsEnvelope<T = any> {
  v?: string;
  traceId: string;
  ts: number;
  route: string;
  payload: T;
  auth?: string;
}

type WsSubscription = (envelope: WsEnvelope) => void;

class WsClient {
  private socket: WebSocket | null = null;
  private pendingRequests = new Map<string, { resolve: (res: any) => void; reject: (err: any) => void; timer: any }>();
  private subscribers = new Set<WsSubscription>();
  private reconnectTimer: any = null;
  private autoReconnect = true;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    if (isDemoMode()) {
      console.log('🔌 WsClient operating in [Local Simulator] mode.');
      return;
    }

    try {
      const url = getWsBaseUrl();
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('📡 Imperial Game Server Connected.');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const envelope: WsEnvelope = JSON.parse(event.data);
          // Handle direct response
          if (envelope.traceId && this.pendingRequests.has(envelope.traceId)) {
            const req = this.pendingRequests.get(envelope.traceId);
            if (req) {
              clearTimeout(req.timer);
              this.pendingRequests.delete(envelope.traceId);
              req.resolve(envelope);
            }
          }
          // Broadcast to subscribers
          this.subscribers.forEach((sub) => sub(envelope));
        } catch (e) {
          console.error('Failed to parse incoming WebSocket message:', e);
        }
      };

      this.socket.onclose = () => {
        console.warn('❌ Imperial WS Connection Closed.');
        if (this.autoReconnect) {
          this.reconnectTimer = setTimeout(() => this.init(), 5000);
        }
      };

      this.socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
      };
    } catch (e) {
      console.error('Failed to initialize WebSocket:', e);
    }
  }

  public reconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.init();
  }

  public subscribe(handler: WsSubscription): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  public request<T = any>(route: string, payload: any, token?: string): Promise<WsEnvelope<T>> {
    const traceId = 'tr_' + Math.random().toString(36).substr(2, 9);
    const envelope: WsEnvelope = {
      v: '1.0',
      traceId,
      ts: Date.now(),
      route,
      payload,
      auth: token,
    };

    if (isDemoMode() || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return new Promise((resolve) => {
        // Mock async routing delay
        setTimeout(() => {
          // Send request payload to the local simulator engine if mock routes exist
          const mockResponse = getMockEngineResponse(route, payload);
          resolve({
            traceId,
            ts: Date.now(),
            route,
            payload: mockResponse,
          });
        }, 80);
      });
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(traceId)) {
          this.pendingRequests.delete(traceId);
          reject(new Error(`WS Request Timeout on route [${route}]`));
        }
      }, 10000);

      this.pendingRequests.set(traceId, { resolve, reject, timer });
      this.socket!.send(JSON.stringify(envelope));
    });
  }

  // Allow trigger mock event simulation downwards (pushed events)
  public triggerMockPush(route: string, payload: any) {
    const envelope: WsEnvelope = {
      traceId: 'mock_push_' + Math.random().toString(36).substr(2, 9),
      ts: Date.now(),
      route,
      payload,
    };
    this.subscribers.forEach((sub) => sub(envelope));
  }
}

// Global WsClient Singleton
let _wsClient: WsClient | null = null;
export function getWsClient(): WsClient {
  if (!_wsClient) {
    _wsClient = new WsClient();
  }
  return _wsClient;
}

/**
 * MOCK LOCAL SIMULATOR SYSTEM
 * Inside developer preview or when the real server is offline, this system runs locally,
 * simulating perfect, delightful interactive game flow.
 */
let simulatorRooms: any[] = [
  {
    id: 'room_1',
    roomNo: '881682',
    gameType: 'longquan_mahjong',
    ownerId: 'usr_bot1',
    players: [
      { id: 'usr_bot1', nickname: 'Chongqing Dragon', points: 42000, isReady: true, isOnline: true },
      { id: 'usr_bot2', nickname: 'Golden Emperor', points: 95000, isReady: true, isOnline: true },
      { id: 'usr_bot3', nickname: 'Wind Chaser', points: 12500, isReady: true, isOnline: true },
    ],
    status: 'waiting',
    maxPlayers: 4,
    rules: { diSufen: 100, isClubRoom: false },
    currentRound: 0,
    totalRounds: 8,
  },
  {
    id: 'room_2',
    roomNo: '662888',
    gameType: 'paodekuai',
    ownerId: 'usr_bot4',
    players: [
      { id: 'usr_bot4', nickname: 'Speed Dealer', points: 28000, isReady: true, isOnline: true },
      { id: 'usr_bot5', nickname: 'Poker Pro Max', points: 76000, isReady: true, isOnline: true },
    ],
    status: 'waiting',
    maxPlayers: 3,
    rules: { diSufen: 200, isClubRoom: true, clubId: 'club_lucky' },
    currentRound: 0,
    totalRounds: 10,
  },
];

let simulatorClubs: any[] = [
  {
    id: 'club_lucky',
    name: 'Lucky Club 888',
    code: 'LY8888',
    ownerId: 'usr_bot1',
    ownerNickname: 'Chongqing Dragon',
    memberCount: 24,
    roomsActive: 3,
    points: 800000,
    createdAt: '2026-05-01',
  },
  {
    id: 'club_phoenix',
    name: 'Royal Phoenix Guild',
    code: 'PX999',
    ownerId: 'usr_bot5',
    ownerNickname: 'Poker Pro Max',
    memberCount: 15,
    roomsActive: 1,
    points: 450000,
    createdAt: '2026-06-10',
  },
];

let simulatorTransactions: any[] = [
  { id: 'tx_1', amount: 50000, type: 'topup', timestamp: '2026-06-16 14:30', description: 'GCP Cloud Wallet Refill' },
  { id: 'tx_2', amount: -600, type: 'game_lose', timestamp: '2026-06-16 16:15', description: 'Longquan Mahjong Round 4 Loss' },
  { id: 'tx_3', amount: 2400, type: 'game_win', timestamp: '2026-06-16 18:44', description: 'Paodekuai Settle Win' },
];

let simulatorHistory: any[] = [
  {
    id: 'set_1',
    gameType: 'longquan_mahjong',
    roomId: 'room_1_settled',
    roomNo: '881682',
    timestamp: '2026-06-16 16:20',
    roundNum: 8,
    players: [
      { nickname: 'Chongqing Dragon', scoreChange: 3200, points: 45200, isWinner: true },
      { nickname: 'Golden Emperor', scoreChange: -1200, points: 93800 },
      { nickname: 'Wind Chaser', scoreChange: -2000, points: 10500 },
    ],
  },
  {
    id: 'set_2',
    gameType: 'paodekuai',
    roomId: 'room_2_settled',
    roomNo: '662888',
    timestamp: '2026-06-16 18:45',
    roundNum: 10,
    players: [
      { nickname: 'Speed Dealer', scoreChange: -2400, points: 25600 },
      { nickname: 'Poker Pro Max', scoreChange: 4800, points: 80800, isWinner: true },
    ],
  },
];

export function getMockRooms() { return simulatorRooms; }
export function getMockClubs() { return simulatorClubs; }
export function getMockTransactions() { return simulatorTransactions; }
export function getMockHistory() { return simulatorHistory; }

// Intercepts simulated routes for interactive offline mode
function getMockEngineResponse(route: string, payload: any): any {
  console.log(`🔌 [Mock Engine] Routing: "${route}" with contents:`, payload);

  switch (route) {
    case 'auth.login': {
      return {
        token: 'mock_jwt_env_' + Math.random().toString(36).substr(2, 6),
        user: {
          id: 'usr_me',
          nickname: payload.nickname || 'GuestStar',
          points: 88800,
        },
      };
    }

    case 'lobby.list': {
      return {
        games: [
          { id: 'longquan_mahjong', name: 'Longquan Mahjong', activeRooms: simulatorRooms.filter((r) => r.gameType === 'longquan_mahjong').length },
          { id: 'chengdu_blood_battle', name: 'Chengdu Battle', activeRooms: simulatorRooms.filter((r) => r.gameType === 'chengdu_blood_battle').length },
          { id: 'paodekuai', name: 'Paodekuai', activeRooms: simulatorRooms.filter((r) => r.gameType === 'paodekuai').length },
        ],
        rooms: simulatorRooms,
      };
    }

    case 'room.create': {
      const roomNo = Math.floor(Math.random() * 900000 + 100000).toString();
      const newRoom = {
        id: 'room_' + Math.random().toString(36).substr(2, 9),
        roomNo,
        gameType: payload.gameType || 'longquan_mahjong',
        ownerId: 'usr_me',
        players: [
          { id: 'usr_me', nickname: payload.nickname || 'ImperialMaster', points: 88000, isReady: false, isOnline: true },
        ],
        status: 'waiting',
        maxPlayers: payload.gameType === 'paodekuai' ? 3 : 4,
        rules: {
          diSufen: payload.rules?.diSufen || 100,
          isClubRoom: !!payload.rules?.isClubRoom,
          clubId: payload.rules?.clubId,
        },
        currentRound: 0,
        totalRounds: payload.gameType === 'paodekuai' ? 10 : 8,
      };
      simulatorRooms.push(newRoom);
      return { room: newRoom };
    }

    case 'room.join': {
      const targetNo = payload.roomNo;
      const roomIndex = simulatorRooms.findIndex((r) => r.roomNo === targetNo);
      if (roomIndex === -1) {
        throw new Error('Room not found');
      }
      const room = simulatorRooms[roomIndex];
      // Check if user is already in players
      const hostIncluded = room.players.some((p: any) => p.id === 'usr_me');
      if (!hostIncluded && room.players.length < room.maxPlayers) {
        room.players.push({
          id: 'usr_me',
          nickname: payload.nickname || 'ImperialMaster',
          points: 88000,
          isReady: false,
          isOnline: true,
        });
      }
      return { room };
    }

    case 'room.leave': {
      const { roomId } = payload;
      const rIdx = simulatorRooms.findIndex((r) => r.id === roomId);
      if (rIdx !== -1) {
        const room = simulatorRooms[rIdx];
        room.players = room.players.filter((p: any) => p.id !== 'usr_me');
        if (room.players.length === 0) {
          simulatorRooms.splice(rIdx, 1);
        }
      }
      return { status: 'ok' };
    }

    case 'club.create': {
      const code = 'C' + Math.floor(Math.random() * 90000 + 10000).toString();
      const newClub = {
        id: 'club_' + Math.random().toString(36).substr(2, 9),
        name: payload.name || 'Unbranded Club',
        code,
        ownerId: 'usr_me',
        ownerNickname: payload.nickname || 'ImperialMaster',
        memberCount: 1,
        roomsActive: 0,
        points: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      simulatorClubs.push(newClub);
      return { club: newClub };
    }

    case 'club.join': {
      const clientClub = simulatorClubs.find((c) => c.code === payload.code);
      if (!clientClub) {
        throw new Error('Invalid club referral code');
      }
      clientClub.memberCount += 1;
      return { club: clientClub };
    }

    case 'wallet.topup': {
      const orderAmount = payload.amount;
      const newTx = {
        id: 'tx_new_' + Math.random().toString(36).substr(2, 6),
        amount: orderAmount,
        type: 'topup',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        description: 'Mock WeChat / Alipay instant deposit',
      };
      simulatorTransactions.unshift(newTx);
      return { transaction: newTx };
    }

    default:
      return { status: 'mocked_success', details: payload };
  }
}
