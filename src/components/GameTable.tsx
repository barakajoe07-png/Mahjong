/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { GameType, GameEngineState, PlayerGameState, Room } from '../types';
import { MahjongTile } from './MahjongTile';
import { PlayingCard } from './PlayingCard';
import { PillButton } from './PillButton';
import { GlassCard } from './GlassCard';
import { GameSimulator } from '../services/game-simulator';
import { getWsClient } from '../services/ws-client';
import { useSession } from '../services/session';
import { motion, AnimatePresence } from 'motion/react';

interface GameTableProps {
  id?: string;
  gameType: GameType;
  room: Room;
  myNickname: string;
  onLeaveRoom: () => void;
  onRefreshRoomState?: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  id,
  gameType,
  room,
  myNickname,
  onLeaveRoom,
  onRefreshRoomState,
}) => {
  const { updatePoints } = useSession();
  const [gameState, setGameState] = useState<GameEngineState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [pointsAppliedForRound, setPointsAppliedForRound] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // Helper inside table for instant responsive toast notifications
  const triggerLocalMessage = (msg: string) => {
    setLocalMessage(msg);
    setTimeout(() => {
      setLocalMessage(null);
    }, 3200);
  };

  // Sync state & update points once per finished round
  useEffect(() => {
    if (gameState?.status === 'ended' && gameState.settlement) {
      const settlementId = gameState.settlement.id;
      if (pointsAppliedForRound !== settlementId) {
        const myItem = gameState.settlement.players.find(
          (p) => p.nickname === myNickname || p.nickname === 'ImperialMaster'
        );
        if (myItem) {
          updatePoints(myItem.scoreChange);
          setPointsAppliedForRound(settlementId);
        }
      }
    }
  }, [gameState, myNickname, pointsAppliedForRound, updatePoints]);

  // 加载状态，并通过 Websocket 同步模拟
  useEffect(() => {
    // 初始化模拟状态
    const initial = GameSimulator.startNewGame(room, myNickname);
    setGameState(initial);

    // 监听 WebSocket 同步事件
    const handleSync = (envelope: any) => {
      if (envelope.route === 'room.sync' && envelope.payload?.roomState) {
        setGameState({ ...envelope.payload.roomState });
      }
    };

    // 每秒倒计时器
    const timer = setInterval(() => {
      setGameState((prev) => {
        if (!prev || prev.status === 'ended') return prev;
        const nextTime = Math.max(0, prev.turnTimer - 1);
        if (nextTime === 0 && prev.activePlayerId === 'usr_me') {
          // 超时自动出牌
          if (gameType === GameType.PAODEKUAI) {
            GameSimulator.handlePassPoker();
          } else {
            const myState = prev.playerStates['usr_me'];
            if (myState && myState.handTiles && myState.handTiles.length > 0) {
              GameSimulator.handleDiscardTile(myState.handTiles[0]);
            }
          }
        }
        return { ...prev, turnTimer: nextTime };
      });
    }, 1000);

    const unsub = getWsClient().subscribe(handleSync);

    return () => {
      clearInterval(timer);
      unsub();
      GameSimulator.terminateGame();
    };
  }, [room, myNickname, gameType]);

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-brand-light-purple gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
        <span className="font-display tracking-widest text-sm text-brand-gold font-callic animate-pulse">
          正在加载皇家至尊牌局...
        </span>
      </div>
    );
  }

  // Seat orientation and opponent details
  const playersInRoom = room.players;
  const isMahjong = gameType !== GameType.PAODEKUAI;
  const activeTurnPlayer = gameState.activePlayerId;
  const statusMatch = gameState.status;

  // Dynamically map opponents from state, allowing real-time AI seats to visual properly
  const getOpponentsBySeat = () => {
    const activeIds = Object.keys(gameState.playerStates).filter((id) => id !== 'usr_me');
    const competitors = activeIds.map((id) => {
      const realPlayer = playersInRoom.find((p) => p.id === id);
      if (realPlayer) return realPlayer;

      const botNicks: { [key: string]: string } = {
        'usr_bot1': 'Chongqing Dragon',
        'usr_bot2': 'Golden Emperor',
        'usr_bot3': 'Wind Chaser',
        'usr_bot4': 'Speed Dealer',
        'usr_bot5': 'Poker Pro Max',
      };

      return {
        id,
        nickname: botNicks[id] || 'Elite Bot',
        points: 45000 + (parseInt(id.replace(/\D/g, '') || '0') * 3500) % 25000,
        isReady: true,
        isOnline: true,
      };
    });

    if (isMahjong) {
      return {
        east: competitors[0] || null,
        north: competitors[1] || null,
        west: competitors[2] || null,
      };
    } else {
      return {
        east: competitors[0] || null,
        north: null,
        west: competitors[1] || null,
      };
    }
  };

  const opponents = getOpponentsBySeat();

  // 扑克牌多选控制
  const toggleSelectCard = (card: string) => {
    setSelectedCards((prev) =>
      prev.includes(card) ? prev.filter((c) => c !== card) : [...prev, card]
    );
  };

  // 出扑克牌
  const playHandPoker = () => {
    if (selectedCards.length === 0) return;
    GameSimulator.handlePlayPokerHand(selectedCards);
    setSelectedCards([]);
  };

  // 打出麻将
  const playTileMahjong = (tile: string) => {
    GameSimulator.handleDiscardTile(tile);
    setSelectedTile(null);
  };

  // 下一局开始
  const handleReadyClick = () => {
    setSelectedCards([]);
    setSelectedTile(null);
    GameSimulator.startNewGame(room, myNickname);
  };

  return (
    <div id={id} className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-radial from-stone-950 via-slate-950 to-black select-none">
      
      {/* 1. 顶部状态栏和游戏基本信息 */}
      <div className="bg-black/60 border-b border-brand-purple/20 px-4 py-3 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-white font-gaming tracking-widest text-[16px] text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-yellow-200 to-amber-500">
            {gameType === GameType.PAODEKUAI
              ? '🏆 Paodekuai Poker Arena'
              : gameType === GameType.CHENGDU_BLOOD_BATTLE
              ? '🀄 Chengdu Blood Battle'
              : '🀄 Longquan Classic Mahjong'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] bg-red-950/40 text-amber-300 border border-red-500/10 px-1.5 rounded leading-normal font-bold">
              Room: <strong className="font-display">{room.roomNo}</strong>
            </span>
            <span className="text-[10px] text-brand-light-purple/70 leading-normal">
              Base: <strong className="text-brand-gold">{room.rules.diSufen}</strong>
            </span>
            {room.rules.isClubRoom && (
              <span className="text-[9px] bg-purple-950/60 text-brand-gold border border-brand-purple/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider leading-none">
                Club Code: {room.rules.clubId || 'VIP'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMahjong && (
            <div className="bg-emerald-950/60 border border-emerald-500/20 rounded-lg px-2 py-0.5 text-center font-display shadow-inner">
              <span className="block text-[8px] text-emerald-400 font-bold leading-none uppercase">Wall</span>
              <span className="text-[10px] font-bold text-gray-200">{gameState.wallCount} Left</span>
            </div>
          )}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 text-[11px] bg-red-950/50 text-red-200 border border-red-500/30 px-2.5 py-1.5 rounded-lg hover:bg-brand-danger hover:text-white transition-all cursor-pointer font-bold h-7 leading-none"
          >
            <LogOut size={11} />
            <span>Disband 🚪</span>
          </button>
        </div>
      </div>

      {/* 2. 核心 3D 拟真绿色呢面棋牌桌台 */}
      <div className="relative flex-1 p-3 flex flex-col items-center justify-between overflow-hidden">
        
        {/* 背景环绕星芒 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_75%)] pointer-events-none" />

        {/* =======================================================
            3D 绿色麻将呢面桌台 (Seated Players around physical felt table)
            ======================================================= */}
        <div className="relative w-full max-w-[340px] aspect-square my-auto flex items-center justify-center p-2">
          
          {/* 仿真呢绒呢面大圆盘 */}
          <div className="absolute w-[290px] h-[290px] md:w-[310px] md:h-[310px] rounded-full bg-gradient-to-b from-emerald-800 via-teal-900 to-emerald-950 border-[6px] border-amber-600 shadow-[0_15px_45px_rgba(0,0,0,0.85),inset_0_2px_10px_rgba(255,255,255,0.25)] flex items-center justify-center overflow-hidden">
            
            {/* 呢面定位标识圈 */}
            <div className="absolute inset-2.5 rounded-full border border-emerald-500/20 pointer-events-none" />
            <div className="absolute inset-7 rounded-full border border-dashed border-emerald-600/35 pointer-events-none" />

            {/* 八卦/太极精修尊贵金色桌心设计 */}
            <div className="absolute w-24 h-24 rounded-full bg-zinc-950/95 border-2 border-brand-gold/60 flex flex-col items-center justify-center shadow-2xl z-20">
              
              {/* 四个方位标记: 模拟真实座位方位，并在轮到当前座位时高亮闪烁 */}
              <div className="absolute top-1 text-[11px] font-bold transition-all text-stone-500">
                <span className={activeTurnPlayer === (opponents.north?.id || 'bot_top') ? 'text-brand-gold font-sans text-sm animate-pulse font-extrabold' : ''}>N</span>
              </div>
              <div className="absolute bottom-1 text-[11px] font-bold transition-all text-stone-500">
                <span className={activeTurnPlayer === 'usr_me' ? 'text-brand-gold font-sans text-sm animate-pulse font-extrabold' : ''}>S</span>
              </div>
              <div className="absolute left-1.5 text-[11px] font-bold transition-all text-stone-500 border-r border-transparent">
                <span className={activeTurnPlayer === opponents.west?.id ? 'text-brand-gold font-sans text-sm animate-pulse font-extrabold' : ''}>W</span>
              </div>
              <div className="absolute right-1.5 text-[11px] font-bold transition-all text-stone-500 pl-0.5">
                <span className={activeTurnPlayer === opponents.east?.id ? 'text-brand-gold font-sans text-sm animate-pulse font-extrabold' : ''}>E</span>
              </div>

              {/* 中央计时器 */}
              {statusMatch !== 'ended' && (
                <div className="flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-[8px] text-brand-gold/70 tracking-widest font-display">LIMIT</span>
                  <motion.span 
                    key={gameState.turnTimer}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-2xl font-display font-extrabold leading-none ${gameState.turnTimer <= 5 ? 'text-red-500 animate-pulse font-sans' : 'text-amber-400'}`}
                  >
                    {gameState.turnTimer}
                  </motion.span>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase mt-1">SEC</span>
                </div>
              )}
              
              {/* 中央庄家/局数标记 */}
              <div className="absolute inset-0 border border-brand-gold/10 rounded-full pointer-events-none" />
              <div className="absolute inset-2 border border-brand-gold/5 rounded-full pointer-events-none animate-ping opacity-10" />
            </div>

            {/* ==========================================
                出牌池 (Discards Central Pool area in table grid)
                ========================================== */}
            <div className="absolute inset-10 flex items-center justify-center z-10 pointer-events-none">
              
              <AnimatePresence mode="popLayout">
                {/* 1. 扑克出牌池 */}
                {!isMahjong && gameState.disposedCards && gameState.disposedCards.length > 0 && (
                  <motion.div 
                    initial={{ scale: 0.4, opacity: 0, y: 15 }}
                    animate={{ scale: 0.75, opacity: 1, y: 0 }}
                    exit={{ scale: 0.2, opacity: 0 }}
                    className="flex gap-1 justify-center origin-center max-w-[190px] drop-shadow-lg"
                  >
                    {gameState.disposedCards.map((poker, index) => (
                      <PlayingCard key={poker + index} card={poker} className="cursor-default -translate-y-0 shadow-lg" />
                    ))}
                  </motion.div>
                )}

                {/* 2. 麻将出牌池 (最新打出的牌在桌面上排开) */}
                {isMahjong && (
                  <div className="flex flex-wrap gap-1 justify-center items-center max-w-[140px] max-h-[140px] drop-shadow-md">
                    {Object.values(gameState.playerStates).flatMap((ps: any, pIdx) => {
                      const latestTwo = (ps as PlayerGameState).discards.slice(-2);
                      return latestTwo.map((tile, tIdx) => (
                        <motion.div
                          key={tile + pIdx + tIdx}
                          initial={{ scale: 0, rotate: -15 }}
                          animate={{ scale: 0.58, rotate: 0 }}
                          className="origin-center shadow-lg"
                        >
                          <MahjongTile tile={tile} className="cursor-default shadow-md" />
                        </motion.div>
                      ));
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* =======================================================
              桌台四周环绕的玩家席位
              ======================================================= */}
          
          {/* [方位: 北 - 对家 (Top opponent)] */}
          {opponents.north ? (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center">
              <motion.div 
                animate={activeTurnPlayer === opponents.north.id ? { scale: [1, 1.05, 1], borderColor: '#fbbf24' } : { scale: 1 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`p-1.5 px-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl bg-black/85 border ${
                  activeTurnPlayer === opponents.north.id ? 'border-brand-gold' : 'border-neutral-800'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-brand-gold flex items-center justify-center text-xs shadow-inner">👑</div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[10px] font-semibold text-stone-200 block truncate max-w-[70px]">{opponents.north.nickname}</span>
                  <span className="text-[9px] text-brand-gold mt-1 font-display">Chips:{opponents.north.points}</span>
                </div>
                <span className="text-[9px] px-1 bg-red-950/40 text-red-400 border border-red-500/20 rounded font-display leading-normal font-bold">
                  {(gameState.playerStates[opponents.north.id]?.handTiles?.length || gameState.playerStates[opponents.north.id]?.handCards?.length || 0)} Cards
                </span>
              </motion.div>
            </div>
          ) : (
            isMahjong && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30 text-stone-500/50 font-gaming text-xs tracking-wider uppercase">
                North Seat
              </div>
            )
          )}

          {/* [方位: 西 - 左边对家 (Left opponent)] */}
          {opponents.west && (
            <div className="absolute left-[-22px] top-1/2 transform -translate-y-1/2 z-30 w-[100px] flex justify-start">
              <motion.div 
                animate={activeTurnPlayer === opponents.west.id ? { scale: [1, 1.04, 1], borderColor: '#fbbf24' } : { scale: 1 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`p-1.5 rounded-2xl flex flex-col items-center text-center transition-all bg-black/85 border shadow-xl ${
                  activeTurnPlayer === opponents.west.id ? 'border-brand-gold shadow-[0_0_12px_rgba(251,191,36,0.25)]' : 'border-neutral-800'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-950 border border-brand-light-purple/30 flex items-center justify-center text-xs">🏹</div>
                <span className="text-[9px] font-semibold text-stone-200 mt-1 truncate max-w-[75px]">{opponents.west.nickname}</span>
                <span className="text-[8px] text-brand-gold font-display mt-0.5">Chips:{opponents.west.points}</span>
                <span className="text-[9px] font-display mt-1 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 text-brand-light-purple">
                  {(gameState.playerStates[opponents.west.id]?.handTiles?.length || gameState.playerStates[opponents.west.id]?.handCards?.length || 0)} Cards
                </span>
              </motion.div>
            </div>
          )}

          {/* [方位: 东 - 右边对家 (Right opponent)] */}
          {opponents.east && (
            <div className="absolute right-[-22px] top-1/2 transform -translate-y-1/2 z-30 w-[100px] flex justify-end">
              <motion.div 
                animate={activeTurnPlayer === opponents.east.id ? { scale: [1, 1.04, 1], borderColor: '#fbbf24' } : { scale: 1 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`p-1.5 rounded-2xl flex flex-col items-center text-center transition-all bg-black/85 border shadow-xl ${
                  activeTurnPlayer === opponents.east.id ? 'border-brand-gold shadow-[0_0_12px_rgba(251,191,36,0.25)]' : 'border-neutral-800'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-950 border border-brand-light-purple/30 flex items-center justify-center text-xs font-bold">🐉</div>
                <span className="text-[9px] font-semibold text-stone-200 mt-1 truncate max-w-[75px]">{opponents.east.nickname}</span>
                <span className="text-[8px] text-brand-gold font-display mt-0.5">Chips:{opponents.east.points}</span>
                <span className="text-[9px] font-display mt-1 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 text-brand-light-purple">
                  {(gameState.playerStates[opponents.east.id]?.handTiles?.length || gameState.playerStates[opponents.east.id]?.handCards?.length || 0)} Cards
                </span>
              </motion.div>
            </div>
          )}

          {/* [方位: 南 - 玩家您 (Bottom seated indicator)] */}
          <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center">
            <div className="flex justify-center items-center gap-1 bg-zinc-950/80 border border-brand-gold/30 px-3 py-1 rounded-full text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-zinc-300 font-sans">
                Main Seat: <strong className="text-brand-gold font-gaming">Seated (South)</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Floating Local Toast notifications inside game room */}
        <AnimatePresence>
          {localMessage && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10 }}
              className="absolute top-1/3 left-1/2 transform -translate-x-1/2 z-[100] bg-purple-950/95 border border-brand-gold text-brand-gold px-4 py-2 rounded-xl shadow-[0_4px_30px_rgba(251,191,36,0.4)] text-[11px] font-gaming font-semibold tracking-wider text-center flex items-center gap-2 min-w-[210px] justify-center"
            >
              <span>🔔</span> {localMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- 碰 / 胡 / 过 吃碰提示层 --- */}
        <div className="h-10 w-full flex items-center justify-center z-20">
          <AnimatePresence>
            {gameState.status === 'action_confirm' && activeTurnPlayer !== 'usr_me' && (
              <motion.div 
                initial={{ scale: 0.6, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.6, y: -15, opacity: 0 }}
                className="bg-slate-900 border border-brand-gold/40 rounded-full px-5 py-1.5 flex items-center gap-5 shadow-[0_4px_30px_rgba(251,191,36,0.3)] select-none"
              >
                <span className="text-[11px] font-bold text-brand-gold font-gaming animate-pulse">Opponent play offer triggered:</span>
                <button
                  onClick={() => {
                    GameSimulator.handlePengAction();
                    triggerLocalMessage("🀄 PENG Action Declared!");
                  }}
                  className="bg-brand-gold hover:bg-amber-600 active:scale-95 text-slate-950 font-gaming font-bold px-4 py-1.5 rounded-full text-[11px] cursor-pointer transition-all leading-none"
                >
                  PENG 🀄
                </button>
                <button
                  onClick={() => GameSimulator.handleIgnoreAction()}
                  className="text-stone-300 hover:text-white font-gaming text-xs cursor-pointer transition-colors"
                >
                  Pass ❌
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. 桌底下端：玩家手牌插槽区域 (Your seated view hand grid) */}
      <div className="bg-gradient-to-t from-[#0d0725] to-[#04010a]/98 border-t-2 border-brand-purple/20 p-4 pb-6 z-20 relative select-none shadow-[0_-15px_40px_rgba(0,0,0,0.8)]">
        
        {/* 手牌操作控制组件 */}
        <div className="w-full flex items-center justify-center gap-3 mb-3 flex-wrap">
          
          {/* A. 跑得快扑克牌操控机制 */}
          {!isMahjong && activeTurnPlayer === 'usr_me' && statusMatch !== 'ended' && (
            <div className="flex gap-2 flex-wrap justify-center">
              <PillButton
                variant="primary"
                onClick={playHandPoker}
                disabled={selectedCards.length === 0}
              >
                Play Hand 🃏 ({selectedCards.length})
              </PillButton>
              <PillButton
                variant="secondary"
                onClick={() => {
                  GameSimulator.handlePassPoker();
                  setSelectedCards([]);
                  triggerLocalMessage("Passed turn.");
                }}
              >
                Skip / Pass 🫸
              </PillButton>
              <PillButton
                variant="gold"
                onClick={() => {
                  const myState = gameState.playerStates['usr_me'];
                  if (!myState || !myState.handCards || myState.handCards.length === 0) {
                    triggerLocalMessage("❌ Hand is empty!");
                    return;
                  }
                  // Group by digit rank
                  const groups: { [key: string]: string[] } = {};
                  myState.handCards.forEach((c) => {
                    const rank = c.substring(1);
                    if (!groups[rank]) groups[rank] = [];
                    groups[rank].push(c);
                  });
                  const bombRank = Object.keys(groups).find((r) => groups[r].length === 4);
                  if (bombRank) {
                    const bombCards = groups[bombRank];
                    GameSimulator.handlePlayPokerHand(bombCards);
                    triggerLocalMessage("💥 4-CARD BOMB FIRED! BOOM!");
                  } else {
                    triggerLocalMessage("❌ No eligible 4-card Bomb found!");
                  }
                }}
              >
                Auto Bomb 💣
              </PillButton>
              <PillButton
                variant="danger"
                onClick={() => {
                  GameSimulator.handleAdmitDefeat();
                  triggerLocalMessage("🏳️ Surrendered! Defeat logged.");
                }}
              >
                Surrender 🏳️
              </PillButton>
            </div>
          )}

          {/* B. 经典麻将牌操控机制 */}
          {isMahjong && activeTurnPlayer === 'usr_me' && statusMatch !== 'ended' && (
            <div className="flex gap-2.5 flex-wrap justify-center">
              <PillButton
                variant="primary"
                onClick={() => {
                  if (selectedTile) {
                    playTileMahjong(selectedTile);
                  }
                }}
                disabled={!selectedTile}
              >
                Discard Selected 🀄
              </PillButton>
              <PillButton
                variant="danger"
                onClick={() => GameSimulator.handleHuAction()}
              >
                Declare HU win 🏆!
              </PillButton>
              <PillButton
                variant="secondary"
                onClick={() => {
                  GameSimulator.handleAdmitDefeat();
                  triggerLocalMessage("🏳️ Conceded round!");
                }}
              >
                Surrender 🏳️
              </PillButton>
            </div>
          )}

          {/* C. 对家回合等待中提示 */}
          {activeTurnPlayer !== 'usr_me' && statusMatch !== 'ended' && (
            <div className="flex gap-2 items-center">
              <div className="text-brand-light-purple/60 text-xs tracking-wider font-gaming flex items-center gap-2 animate-pulse py-1">
                <Loader2 className="animate-spin text-brand-light-purple/40" size={12} />
                <span>Opponents are contemplating their strategy...</span>
              </div>
              <PillButton
                variant="danger"
                className="scale-90"
                onClick={() => {
                  GameSimulator.handleAdmitDefeat();
                  triggerLocalMessage("🏳️ Surrendered! Conceded during opponent turn.");
                }}
              >
                Surrender 🏳️
              </PillButton>
            </div>
          )}
        </div>

        {/* 玩家当前拥有的手牌 (Animate and hold hand tiles/cards beautifully) */}
        <div className="w-full flex justify-center items-end py-1.5 px-0.5 gap-1.5 overflow-x-auto no-scrollbar max-w-lg mx-auto h-28">
          <AnimatePresence>
            {/* 扑克手牌渲染 */}
            {!isMahjong && gameState.playerStates['usr_me']?.handCards?.map((card, idx) => (
              <motion.div
                key={card}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="flex-shrink-0"
              >
                <PlayingCard
                  card={card}
                  selected={selectedCards.includes(card)}
                  onClick={() => toggleSelectCard(card)}
                />
              </motion.div>
            ))}

            {/* 麻将手牌渲染 */}
            {isMahjong && gameState.playerStates['usr_me']?.handTiles?.map((tile, i) => (
              <motion.div
                key={tile + i}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex-shrink-0"
              >
                <MahjongTile
                  tile={tile}
                  selected={selectedTile === tile}
                  onClick={() => setSelectedTile(selectedTile === tile ? null : tile)}
                />
              </motion.div>
            ))}

            {/* 空手落牌 fallback */}
            {(!isMahjong && (!gameState.playerStates['usr_me']?.handCards || gameState.playerStates['usr_me']?.handCards.length === 0)) && (
              <span className="text-brand-light-purple/30 text-xs py-5 font-gaming uppercase">No Cards Remaining</span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. 每局输赢总结战绩榜 Layer overlay */}
      {statusMatch === 'ended' && gameState.settlement && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col justify-center items-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="w-full max-w-sm"
          >
            <GlassCard className="border border-brand-gold/40 shadow-[0_0_35px_rgba(251,191,36,0.25)] relative overflow-hidden" padding="p-6">
              
              {/* 美化至尊竞技发光环绕 */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-gold via-yellow-200 to-amber-500" />
              
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-gold to-yellow-500 mx-auto flex items-center justify-center border-2 border-white/20 mb-2 shadow-lg animate-bounce">
                  <Trophy className="text-slate-950" size={20} />
                </div>
                <h2 className="font-sans font-extrabold text-2xl tracking-wide text-brand-gold">Round Results</h2>
                <span className="text-[10px] text-brand-light-purple/60 tracking-wider font-gaming block mt-1 uppercase">
                  Imperial Royale Hall • Scoreboard
                </span>
              </div>

              <div className="space-y-4 mb-6 border-t border-b border-white/5 py-3">
                {gameState.settlement.players.map((item, index) => {
                  const isWinner = item.scoreChange > 0;
                  return (
                    <div key={index} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono">#0{index + 1}</span>
                        <span className={`text-xs font-bold ${item.nickname === 'ImperialMaster' || item.nickname === myNickname ? 'text-brand-light-purple font-gaming' : 'text-stone-200'}`}>
                          {item.nickname} {item.nickname === 'ImperialMaster' && '(You)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-display font-extrabold tracking-wide ${isWinner ? 'text-emerald-400 font-bold' : 'text-red-400'}`}>
                          {isWinner ? `+${item.scoreChange.toLocaleString()}` : item.scoreChange.toLocaleString()} Chips
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReadyClick}
                  className="flex-1 bg-gradient-to-tr from-brand-gold to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 text-xs font-gaming font-bold py-2.5 rounded-xl cursor-pointer shadow-md active:scale-95 transition-all text-center"
                >
                  Next Deal 🎮
                </button>
                <button
                  onClick={onLeaveRoom}
                  className="bg-neutral-905 bg-black/50 border border-neutral-800 hover:text-white text-zinc-400 text-xs font-gaming py-2.5 px-4 rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  Leave Room 🚪
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  );
};
