/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameType, GameEngineState, PlayerGameState, MahjongMeld, Room, RoomStatus } from '../types';
import { getWsClient } from './ws-client';

// Simple lists of Mahjong Tiles
const MAHJONG_TILES = [
  '1W', '2W', '3W', '4W', '5W', '6W', '7W', '8W', '9W',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B',
  '1T', '2T', '3T', '4T', '5T', '6T', '7T', '8T', '9T'
];

// Simple lists of Poker Cards (Suits: S = Spades, H = Hearts, D = Diamonds, C = Clubs)
const CARD_SUITS = ['S', 'H', 'D', 'C'];
const CARD_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// Helpers to shuffle arrays
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class GameSimulator {
  private static activeState: GameEngineState | null = null;
  private static botTimer: any = null;

  public static getActiveState() {
    return this.activeState;
  }

  public static startNewGame(room: Room, myNickname: string): GameEngineState {
    const isMahjong = room.gameType !== GameType.PAODEKUAI;
    const targetCount = isMahjong ? 4 : 3;

    // Guaranteed backfill vacant seats with high fidelity AI bots (prevents room creation / matching errors)
    const lobbyPlayers = [...room.players];
    const botNicks = ['Chongqing Dragon', 'Golden Emperor', 'Wind Chaser', 'Speed Dealer', 'Poker Pro Max'];
    while (lobbyPlayers.length < targetCount) {
      const idx = lobbyPlayers.length;
      lobbyPlayers.push({
        id: `usr_bot${idx}`,
        nickname: botNicks[idx % botNicks.length],
        points: 42000 + Math.floor(Math.random() * 48000),
        isReady: true,
        isOnline: true,
      });
    }

    const playerIds = lobbyPlayers.map((p) => p.id);
    const dealerId = lobbyPlayers[0].id; // first player is initial dealer

    console.log(`🎮 [GameSimulator] Starting state machine backend with ${lobbyPlayers.length} players for ${room.gameType}`);

    // Create Initial hands
    const playerStates: { [playerId: string]: PlayerGameState } = {};

    if (isMahjong) {
      // Build a Mahjong deck (4 of each tile)
      let deck: string[] = [];
      for (let i = 0; i < 4; i++) {
        deck.push(...MAHJONG_TILES);
      }
      deck = shuffle(deck);

      lobbyPlayers.forEach((p) => {
        const hand = deck.splice(0, 13); // standard 13 tiles hand
        // Sort hand tiles nicely
        hand.sort();
        playerStates[p.id] = {
          playerId: p.id,
          handTiles: hand,
          melds: [],
          discards: []
        };
      });

      // Provide dealer with the 14th tile
      const dealerHand = playerStates[dealerId].handTiles || [];
      dealerHand.push(deck.splice(0, 1)[0]);
      dealerHand.sort();
      playerStates[dealerId].handTiles = dealerHand;

      this.activeState = {
        roomId: room.id,
        gameType: room.gameType,
        status: 'discarding',
        activePlayerId: dealerId,
        dealerId,
        turnTimer: 15,
        wallCount: deck.length,
        playerStates,
      };
    } else {
      // Paodekuai poker setup
      let deck: string[] = [];
      CARD_SUITS.forEach((suit) => {
        CARD_RANKS.forEach((rank) => {
          deck.push(suit + rank);
        });
      });
      deck = shuffle(deck);

      lobbyPlayers.forEach((p) => {
        const hand = deck.splice(0, 16); // Deal 16 cards for Paodekuai
        // Sort by rank value
        hand.sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
        playerStates[p.id] = {
          playerId: p.id,
          handCards: hand,
          discards: []
        };
      });

      this.activeState = {
        roomId: room.id,
        gameType: room.gameType,
        status: 'discarding',
        activePlayerId: dealerId,
        dealerId,
        turnTimer: 15,
        disposedCards: [],
        playerStates,
      };
    }

    // Trigger state synchronization to listeners
    this.broadcastState();

    if (this.activeState.activePlayerId !== 'usr_me') {
      this.triggerBotDelay();
    }

    return this.activeState;
  }

  private static getCardValue(card: string): number {
    const rank = card.substring(1);
    const rankValues: { [key: string]: number } = {
      '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15
    };
    return rankValues[rank] || 0;
  }

  public static handleDiscardTile(tile: string) {
    if (!this.activeState) return;
    const myState = this.activeState.playerStates['usr_me'];
    if (!myState || !myState.handTiles) return;

    // Remove tile from my hand
    const tileIdx = myState.handTiles.indexOf(tile);
    if (tileIdx !== -1) {
      myState.handTiles.splice(tileIdx, 1);
    }
    myState.discards.push(tile);

    // Swap turn
    this.passTurn();
  }

  public static handlePlayPokerHand(cards: string[]) {
    if (!this.activeState) return;
    const myState = this.activeState.playerStates['usr_me'];
    if (!myState || !myState.handCards) return;

    // Filter cards out
    myState.handCards = myState.handCards.filter((c) => !cards.includes(c));
    myState.discards.push(...cards);
    this.activeState.disposedCards = cards;
    this.activeState.lastPlayPlayerId = 'usr_me';

    // Check win
    if (myState.handCards.length === 0) {
      this.triggerSettleGame('usr_me');
      return;
    }

    this.passTurn();
  }

  public static handlePassPoker() {
    if (!this.activeState) return;
    // Just pass turn to next player
    this.passTurn();
  }

  private static passTurn() {
    if (!this.activeState) return;
    const playerIds = Object.keys(this.activeState.playerStates);
    const currIdx = playerIds.indexOf(this.activeState.activePlayerId);
    const nextIdx = (currIdx + 1) % playerIds.length;
    const nextPlayerId = playerIds[nextIdx];

    this.activeState.activePlayerId = nextPlayerId;
    this.activeState.turnTimer = 15;

    // If mahjong, next player needs to draw a tile!
    const isMahjong = this.activeState.gameType !== GameType.PAODEKUAI;
    if (isMahjong && nextPlayerId !== 'usr_me') {
      // simulate Bot drawing a tile
      const botState = this.activeState.playerStates[nextPlayerId];
      if (botState && botState.handTiles) {
        const randomTile = MAHJONG_TILES[Math.floor(Math.random() * MAHJONG_TILES.length)];
        botState.handTiles.push(randomTile);
        botState.handTiles.sort();
        if (this.activeState.wallCount && this.activeState.wallCount > 0) {
          this.activeState.wallCount--;
        }
      }
    }

    this.broadcastState();

    if (nextPlayerId !== 'usr_me') {
      this.triggerBotDelay();
    }
  }

  private static triggerBotDelay() {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = setTimeout(() => {
      this.executeBotTurn();
    }, 1800);
  }

  private static executeBotTurn() {
    if (!this.activeState) return;
    const activeId = this.activeState.activePlayerId;
    if (activeId === 'usr_me') return;

    const botState = this.activeState.playerStates[activeId];
    if (!botState) return;

    const isMahjong = this.activeState.gameType !== GameType.PAODEKUAI;

    if (isMahjong) {
      if (botState.handTiles && botState.handTiles.length > 0) {
        // Simple bot discard rule: discard first tile in the list
        const discarded = botState.handTiles.splice(0, 1)[0];
        botState.discards.push(discarded);

        // Check if I can PENG! (if I have 2 of this tile)
        const myState = this.activeState.playerStates['usr_me'];
        if (myState && myState.handTiles) {
          const matchCount = myState.handTiles.filter((t) => t === discarded).length;
          if (matchCount >= 2) {
            // Trigger an "Action Confirm" overlay for user
            this.activeState.status = 'action_confirm';
            this.activeState.turnTimer = 10;
            // Temporarily store action suggestion details inside state
            this.activeState.disposedCards = [discarded];
            this.broadcastState();
            return;
          }
        }

        // Just swap turn if no response needed
        this.passTurn();
      }
    } else {
      // Paodekuai Poker Bot play
      if (botState.handCards && botState.handCards.length > 0) {
        // If there's pending cards in the center, try to beat them, or PASS
        const previousPlayed = this.activeState.disposedCards || [];
        if (previousPlayed.length > 0 && this.activeState.lastPlayPlayerId !== activeId) {
          // AI simple intelligence - 60% chance to beat, 40% chance of PASS
          const canBeat = Math.random() > 0.4;
          if (canBeat) {
            // Find a card higher rank
            const lastVal = this.getCardValue(previousPlayed[0]);
            const nextHigherIdx = botState.handCards.findIndex((c) => this.getCardValue(c) > lastVal);
            if (nextHigherIdx !== -1) {
              const botPlay = [botState.handCards.splice(nextHigherIdx, 1)[0]];
              botState.discards.push(...botPlay);
              this.activeState.disposedCards = botPlay;
              this.activeState.lastPlayPlayerId = activeId;

              if (botState.handCards.length === 0) {
                this.triggerSettleGame(activeId);
                return;
              }
            }
          }
        } else {
          // Play highest card
          const botPlay = [botState.handCards.splice(0, 1)[0]];
          botState.discards.push(...botPlay);
          this.activeState.disposedCards = botPlay;
          this.activeState.lastPlayPlayerId = activeId;

          if (botState.handCards.length === 0) {
            this.triggerSettleGame(activeId);
            return;
          }
        }

        this.passTurn();
      }
    }
  }

  // Handle Peng choice from player
  public static handlePengAction() {
    if (!this.activeState || this.activeState.status !== 'action_confirm') return;
    const targetTile = this.activeState.disposedCards?.[0];
    if (!targetTile) return;

    const myState = this.activeState.playerStates['usr_me'];
    if (myState && myState.handTiles) {
      // Remove 2 copies from hand
      let removedCount = 0;
      myState.handTiles = myState.handTiles.filter((t) => {
        if (t === targetTile && removedCount < 2) {
          removedCount++;
          return false;
        }
        return true;
      });

      // Add to melds
      if (!myState.melds) myState.melds = [];
      myState.melds.push({
        type: 'peng',
        tile: targetTile,
        fromPlayerId: this.activeState.activePlayerId,
      });

      // Now it's my turn
      this.activeState.status = 'discarding';
      this.activeState.activePlayerId = 'usr_me';
      this.activeState.turnTimer = 15;
      this.activeState.disposedCards = [];

      this.broadcastState();
    }
  }

  public static handleIgnoreAction() {
    if (!this.activeState || this.activeState.status !== 'action_confirm') return;
    this.activeState.status = 'discarding';
    this.activeState.disposedCards = [];
    this.passTurn();
  }

  // Win current Mahjong or Pokere game
  public static handleHuAction() {
    this.triggerSettleGame('usr_me');
  }

  // Admit defeat / surrender current match round
  public static handleAdmitDefeat() {
    if (!this.activeState) return;

    this.activeState.status = 'ended';

    // Seize first active bot to award victory points
    const activeKeys = Object.keys(this.activeState.playerStates);
    const botWinnerId = activeKeys.find((id) => id !== 'usr_me') || 'usr_bot1';

    const roundPlayers = activeKeys.map((id) => {
      let scoreChange = 0;
      let displayNick = id === 'usr_me' ? 'ImperialMaster' : 'BotPlayer';

      if (id === 'usr_bot1') displayNick = 'Chongqing Dragon';
      if (id === 'usr_bot2') displayNick = 'Golden Emperor';
      if (id === 'usr_bot3') displayNick = 'Wind Chaser';
      if (id === 'usr_bot4') displayNick = 'Speed Dealer';
      if (id === 'usr_bot5') displayNick = 'Poker Pro Max';

      if (id === 'usr_me') {
        scoreChange = -3000; // Defeat / Surrender Penalty
      } else if (id === botWinnerId) {
        scoreChange = 3000; // Receives the forfeit coins
      } else {
        scoreChange = 0;
      }

      return {
        nickname: displayNick,
        scoreChange,
        points: 88800 + scoreChange,
        isWinner: id === botWinnerId,
      };
    });

    const mockHistoryObj = {
      id: 'mock_settle_' + Math.random().toString(36).substr(2, 6),
      gameType: this.activeState.gameType,
      roomId: this.activeState.roomId,
      roomNo: '881682',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      players: roundPlayers,
      roundNum: 1,
    };

    this.activeState.settlement = mockHistoryObj;
    this.broadcastState();
  }

  private static triggerSettleGame(winnerId: string) {
    if (!this.activeState) return;
    this.activeState.status = 'ended';

    // Calculate score change
    const isWeWinner = winnerId === 'usr_me';
    const totalPlayersCount = Object.keys(this.activeState.playerStates).length;
    const baseWinAmount = 3600;

    const roundPlayers = Object.keys(this.activeState.playerStates).map((id) => {
      let scoreChange = 0;
      let displayNick = id === 'usr_me' ? 'ImperialMaster' : 'BotPlayer';

      if (id === 'usr_me') {
        scoreChange = isWeWinner ? baseWinAmount : -1200;
      } else {
        scoreChange = (id === winnerId) ? baseWinAmount : -1200;
        // Check bot nicknames for historical accuracy
        if (id === 'usr_bot1') displayNick = 'Chongqing Dragon';
        if (id === 'usr_bot2') displayNick = 'Golden Emperor';
        if (id === 'usr_bot3') displayNick = 'Wind Chaser';
        if (id === 'usr_bot4') displayNick = 'Speed Dealer';
        if (id === 'usr_bot5') displayNick = 'Poker Pro Max';
      }

      return {
        nickname: displayNick,
        scoreChange,
        points: 88800 + scoreChange,
        isWinner: id === winnerId,
      };
    });

    const mockHistoryObj = {
      id: 'mock_settle_' + Math.random().toString(36).substr(2, 6),
      gameType: this.activeState.gameType,
      roomId: this.activeState.roomId,
      roomNo: '881682',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      players: roundPlayers,
      roundNum: 1,
    };

    this.activeState.settlement = mockHistoryObj;
    this.broadcastState();
  }

  public static terminateGame() {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.activeState = null;
  }

  private static broadcastState() {
    if (!this.activeState) return;
    getWsClient().triggerMockPush('room.sync', { roomState: this.activeState });
  }
}
