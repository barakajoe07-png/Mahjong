/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Coins,
  ShieldAlert,
  Users,
  Clock,
  LogOut,
  Send,
  PlusCircle,
  Hash,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  X,
  RefreshCw,
  Trash2,
  UserX,
  TrendingUp,
  ShieldCheck,
  Award,
  ArrowLeft,
} from 'lucide-react';

import { useSession } from './services/session';
import { GameType, Room, RoomStatus, Club, PointsTransaction, SettlementHistory } from './types';
import { GlassCard } from './components/GlassCard';
import { PillButton } from './components/PillButton';
import { StatusBar } from './components/StatusBar';
import { Keypad } from './components/Keypad';
import { GameTable } from './components/GameTable';

import {
  getApiBaseUrl,
  getWsBaseUrl,
  setApiUrls,
  isDemoMode,
  setDemoMode,
} from './services/runtime-config';
import {
  getMockRooms,
  getMockClubs,
  getMockTransactions,
  getMockHistory,
  getWsClient,
} from './services/ws-client';

export default function App() {
  const { user, isLoggedIn, login, logout, updatePoints, setFullUser } = useSession();

  // Active View Manager
  // Views: 'home' | 'rooms_lobby' | 'game_table' | 'club' | 'wallet' | 'records'
  const [activeTab, setActiveTab] = useState<'home' | 'club' | 'wallet' | 'records'>('home');
  const [isInLobby, setIsInLobby] = useState(false);
  const [activeGameRoom, setActiveGameRoom] = useState<Room | null>(null);

  // Nickname entry
  const [inputNickname, setInputNickname] = useState('');

  // Server Connection settings model
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [wsUrl, setWsUrl] = useState(getWsBaseUrl());
  const [demoActive, setDemoActive] = useState(isDemoMode());

  // Room PIN entry
  const [showJoinByPin, setShowJoinByPin] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createGameType, setCreateGameType] = useState<GameType>(GameType.LONGQUAN_MAHJONG);
  const [createBaseRate, setCreateBaseRate] = useState(100);

  // New Club creating and joins
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [showJoinClub, setShowJoinClub] = useState(false);
  const [joinClubCode, setJoinClubCode] = useState('');

  // Topup Wallet State
  const [showTopupSuccess, setShowTopupSuccess] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10000);

  // Error toast notifications
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3005);
  };

  // Local interactive states fetched
  const [lobbyRooms, setLobbyRooms] = useState<Room[]>(getMockRooms());
  const [clubsList, setClubsList] = useState<Club[]>(getMockClubs());
  const [transactions, setTransactions] = useState<PointsTransaction[]>(getMockTransactions());
  const [historyRecords, setHistoryRecords] = useState<SettlementHistory[]>(getMockHistory());

  // Club Creator Expanded Management States
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [clubMembersMap, setClubMembersMap] = useState<{
    [clubId: string]: Array<{
      id: string;
      nickname: string;
      joinedAt: string;
      roundsPlayed: number;
      winRate: string;
      points: number;
      isOnline: boolean;
      violations: number;
    }>;
  }>({
    'club_lucky': [
      { id: 'usr_bot1', nickname: 'Chongqing Dragon', joinedAt: '2026-05-02', roundsPlayed: 84, winRate: '54%', points: 42000, isOnline: true, violations: 0 },
      { id: 'usr_bot2', nickname: 'Golden Emperor', joinedAt: '2026-05-04', roundsPlayed: 120, winRate: '60%', points: 95000, isOnline: true, violations: 0 },
      { id: 'usr_bot3', nickname: 'Wind Chaser', joinedAt: '2026-05-12', roundsPlayed: 32, winRate: '45%', points: 12500, isOnline: false, violations: 0 },
      { id: 'usr_bot4', nickname: 'Speed Dealer', joinedAt: '2026-06-01', roundsPlayed: 58, winRate: '52%', points: 28000, isOnline: true, violations: 0 },
      { id: 'usr_bot5', nickname: 'Poker Pro Max', joinedAt: '2026-06-02', roundsPlayed: 142, winRate: '64%', points: 80000, isOnline: true, violations: 0 },
    ],
    'club_phoenix': [
      { id: 'usr_bot4', nickname: 'Speed Dealer', joinedAt: '2026-06-10', roundsPlayed: 24, winRate: '48%', points: 15000, isOnline: true, violations: 0 },
      { id: 'usr_bot5', nickname: 'Poker Pro Max', joinedAt: '2026-06-11', roundsPlayed: 98, winRate: '66%', points: 92000, isOnline: true, violations: 0 },
    ]
  });

  const handleKickMember = (clubId: string, memberId: string, nickname: string) => {
    const list = clubMembersMap[clubId] || [];
    const updated = list.filter((m) => m.id !== memberId);
    setClubMembersMap({
      ...clubMembersMap,
      [clubId]: updated,
    });
    setClubsList((prev) =>
      prev.map((c) => (c.id === clubId ? { ...c, memberCount: Math.max(1, c.memberCount - 1) } : c))
    );
    showToast(`Successfully removed player "${nickname}" from club membership.`);
  };

  useEffect(() => {
    // Keep internal local states updated
    setLobbyRooms(getMockRooms());
    setClubsList(getMockClubs());
    setTransactions(getMockTransactions());
    setHistoryRecords(getMockHistory());
  }, [activeTab, isInLobby, activeGameRoom]);

  // Connect & Submit user Login details
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNickname.trim()) return;

    if (demoActive) {
      login(inputNickname);
    } else {
      // Connect to real backend REST API specified
      fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: inputNickname }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token && data.user) {
            setFullUser({
              id: data.user.id,
              nickname: data.user.nickname,
              token: data.token,
              points: data.user.points || 50000,
            });
          } else {
            // Callback to demo if backend isn't running
            login(inputNickname);
          }
        })
        .catch(() => {
          console.warn('Real server login failed, running inside responsive playground.');
          login(inputNickname);
        });
    }
  };

  // Save connection config adjustments
  const handleSaveConnection = () => {
    setApiUrls(apiUrl, wsUrl);
    setDemoMode(demoActive);
    setShowConfigModal(false);
    // Refresh the websocket singleton connection details
    getWsClient().reconnect();
  };

  // Interactive numeric pad entries
  const handlePinKeyPress = (val: string) => {
    if (enteredPin.length < 6) {
      setEnteredPin((prev) => prev + val);
    }
  };

  const handlePinDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handlePinSubmit = () => {
    if (enteredPin.length !== 6) return;

    getWsClient()
      .request('room.join', { roomNo: enteredPin, nickname: user?.nickname })
      .then((res: any) => {
        if (res.payload?.room) {
          setActiveGameRoom(res.payload.room);
          setShowJoinByPin(false);
          setEnteredPin('');
        }
      })
      .catch((err) => {
        showToast(err.message || 'Room number not found. Please verify and try again.');
      });
  };

  // Create active custom match
  const handleCreateRoom = () => {
    getWsClient()
      .request('room.create', {
        gameType: createGameType,
        rules: { diSufen: createBaseRate, isClubRoom: false },
        nickname: user?.nickname,
      })
      .then((res: any) => {
        if (res.payload?.room) {
          setActiveGameRoom(res.payload.room);
          setShowCreateDialog(false);
        }
      });
  };

  // Top up gold chips instantly
  const handleActionTopup = (amt: number) => {
    getWsClient()
      .request('wallet.topup', { amount: amt })
      .then((res: any) => {
        updatePoints(amt);
        setTopupAmount(amt);
        setShowTopupSuccess(true);
        setTimeout(() => setShowTopupSuccess(false), 2500);
      });
  };

  // Create new gaming clan/club
  const handleActionCreateClub = () => {
    if (!newClubName.trim()) return;
    getWsClient()
      .request('club.create', { name: newClubName, nickname: user?.nickname })
      .then(() => {
        setNewClubName('');
        setShowCreateClub(false);
        setClubsList(getMockClubs());
      });
  };

  // Join a club
  const handleActionJoinClub = () => {
    if (!joinClubCode.trim()) return;
    getWsClient()
      .request('club.join', { code: joinClubCode })
      .then(() => {
        setJoinClubCode('');
        setShowJoinClub(false);
        setClubsList(getMockClubs());
      })
      .catch((e) => showToast(e.message || 'Failed to join Club. Please verify the code.'));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6 select-none font-sans overflow-x-hidden antialiased">
      {/* 
        PREMIUM RESPONSIVE MOBILE FRAME CONTAINER:
        On desktop, we enclose the entire platform inside a sleek 
        matte titanium smartphone shell. On mobile viewports/builder, 
        it expands perfectly to full width to support touch/native compile targets.
      */}
      <div className="w-full md:max-w-md h-screen md:h-[860px] bg-linear-to-b from-game-bg-start to-game-bg-end flex flex-col justify-between overflow-hidden relative shadow-[0_25px_60px_rgba(0,0,0,0.85)] border-0 md:border-[10px] md:border-stone-900 rounded-none md:rounded-[45px]">
        {/* Decorative Front Top Notch for sleek device feel */}
        <div className="hidden md:block absolute top-0.5 left-1/2 transform -translate-x-1/2 w-40 h-5 bg-stone-900 rounded-b-2xl z-50 pointer-events-none" />

        {/* Dynamic Status Bar */}
        <StatusBar onOpenSettings={() => setShowConfigModal(true)} />

        {/* --- MAIN VIEWA ZONE MATCHING SELECTIONS --- */}
        <div className="flex-1 w-full flex flex-col overflow-y-auto no-scrollbar relative">
          
          {/* A. Entrance Gate View */}
          {!isLoggedIn && (
            <div className="flex-1 flex flex-col justify-center px-6 py-8">
              <div className="text-center mb-8">
                {/* Crown Royal Glow Emblem */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-gold p-0.5 mx-auto mb-4 shadow-[0_10px_35px_rgba(147,51,234,0.35)] relative overflow-hidden animate-pulse">
                  <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                    <span className="font-display font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-brand-light-purple to-brand-gold">
                      VIP
                    </span>
                  </div>
                </div>
                <h1 className="font-display font-black text-3xl tracking-widest text-white text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-yellow-250 to-amber-500 uppercase">
                  Imperial Arena
                </h1>
                <p className="text-[9.5px] text-brand-light-purple/70 mt-1.5 uppercase tracking-widest font-gaming">
                  Supreme Mahjong & Paodekuai Arena v2
                </p>
              </div>

              <GlassCard className="border border-brand-purple/20">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-gaming font-bold tracking-widest text-brand-light-purple/80 uppercase">
                      Honorary Player Nickname:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900/80 border border-brand-purple/25 rounded-2xl py-3 px-4 text-white font-medium text-sm focus:outline-none focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/20 transition-all font-sans"
                      placeholder="e.g. Speed Dealer, Mahjong Pro"
                      value={inputNickname}
                      onChange={(e) => setInputNickname(e.target.value)}
                    />
                  </div>

                  <PillButton text="Enter Arena Gate 🎮" variant="primary" className="w-full font-gaming uppercase tracking-widest text-xs" />
                </form>
              </GlassCard>

              <div className="text-center mt-6">
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="text-[10px] text-brand-light-purple/60 hover:text-brand-gold underline underline-offset-4 font-gaming tracking-widest uppercase cursor-pointer transition-colors"
                >
                  Configure Server Nodes
                </button>
              </div>
            </div>
          )}

          {/* B. Main Table Selection */}
          {isLoggedIn && !isInLobby && !activeGameRoom && (
            <div className="flex-1 flex flex-col justify-start">
              
              {/* Premium Top Bar */}
              <div className="bg-black/40 border-b border-brand-purple/15 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-purple to-brand-gold flex items-center justify-center font-bold text-sm text-slate-950 font-gaming shadow-md">
                    👑
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-gaming text-sm truncate max-w-[140px] font-bold">{user?.nickname}</span>
                    <span className="text-[9px] text-brand-light-purple/70 uppercase tracking-wider font-semibold">Imperial Guest • Online</span>
                  </div>
                </div>

                {/* Gold Coins Treasury */}
                <div className="bg-indigo-950/50 border border-brand-purple/30 rounded-2xl px-3.5 py-1.5 flex items-center gap-2">
                  <Coins size={14} className="text-brand-gold animate-bounce" />
                  <span className="text-sm font-display font-extrabold text-brand-gold tracking-wide">
                    {user?.points.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 首页 Tab 内容 */}
              {activeTab === 'home' && (
                <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h2 className="text-[11px] font-gaming font-extrabold tracking-widest text-brand-light-purple/75 uppercase">
                      Select Arena Deck & Table:
                    </h2>

                    {/* Highly Distinct, Themed Game Deck Cards */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Longquan Classic Mahjong */}
                      <div
                        onClick={() => {
                          setCreateGameType(GameType.LONGQUAN_MAHJONG);
                          setShowCreateDialog(true);
                        }}
                        className="active:scale-[0.98] border border-emerald-500/25 bg-gradient-to-br from-emerald-950/70 via-teal-950/80 to-slate-900/90 shadow-[0_12px_30px_rgba(16,185,129,0.18)] rounded-3xl p-5 flex items-center justify-between cursor-pointer hover:border-emerald-400/40 hover:shadow-[0_12px_30px_rgba(16,185,129,0.30)] transition-all duration-300 relative overflow-hidden group"
                      >
                        {/* Background subtle Bamboo stripe design pattern */}
                        <div className="absolute top-0 right-0 w-24 h-full bg-emerald-500/5 rotate-12 translate-x-4 pointer-events-none select-none text-right font-black font-display text-[90px] leading-none opacity-25">竹</div>
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-teal-900 to-emerald-950 border border-emerald-500/40 flex items-center justify-center text-2xl shadow-lg ring-4 ring-emerald-500/10">
                            🀄
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-gaming font-bold text-base tracking-wide group-hover:text-amber-300 transition-colors">
                              Longquan Mahjong
                            </span>
                            <span className="text-[10.5px] text-emerald-300/65 font-medium mt-0.5">
                              Double Multipliers • Exponential Fan scoring
                            </span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:translate-x-1.5 transition-transform duration-250">
                          <ArrowRight size={13} />
                        </div>
                      </div>

                      {/* Paodekuai Rapid Poker */}
                      <div
                        onClick={() => {
                          setCreateGameType(GameType.PAODEKUAI);
                          setShowCreateDialog(true);
                        }}
                        className="active:scale-[0.98] border border-blue-500/25 bg-gradient-to-br from-blue-950/70 via-indigo-950/80 to-slate-900/90 shadow-[0_12px_30px_rgba(59,130,246,0.18)] rounded-3xl p-5 flex items-center justify-between cursor-pointer hover:border-blue-400/40 hover:shadow-[0_12px_30px_rgba(59,130,246,0.30)] transition-all duration-300 relative overflow-hidden group"
                      >
                        {/* Background Poker Suites watermark */}
                        <div className="absolute top-2 right-4 text-6xl font-display text-blue-500/5 select-none font-bold rotate-12 group-hover:scale-110 transition-transform duration-300">♠♥♣♦</div>
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-indigo-900 to-slate-950 border border-blue-500/40 flex items-center justify-center text-2xl shadow-lg ring-4 ring-blue-500/10">
                            🃏
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-gaming font-bold text-base tracking-wide group-hover:text-amber-300 transition-colors">
                              Paodekuai Poker
                            </span>
                            <span className="text-[10.5px] text-blue-300/65 font-medium mt-0.5">
                              Shed Fast (16 cards) • Hardcore tactical action
                            </span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-blue-950/40 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:translate-x-1.5 transition-transform duration-250">
                          <ArrowRight size={13} />
                        </div>
                      </div>

                      {/* Chengdu Blood Battle Mahjong */}
                      <div
                        onClick={() => {
                          setCreateGameType(GameType.CHENGDU_BLOOD_BATTLE);
                          setShowCreateDialog(true);
                        }}
                        className="active:scale-[0.98] border border-rose-500/25 bg-gradient-to-br from-rose-950/70 via-red-950/80 to-slate-900/90 shadow-[0_12px_30px_rgba(244,63,94,0.18)] rounded-3xl p-5 flex items-center justify-between cursor-pointer hover:border-rose-400/40 hover:shadow-[0_12px_30px_rgba(244,63,94,0.30)] transition-all duration-300 relative overflow-hidden group"
                      >
                        {/* Background fire character watermarked */}
                        <div className="absolute top-0 right-1 w-24 h-full bg-rose-500/5 rotate-12 translate-x-3 pointer-events-none select-none text-right font-black font-display text-[80px] leading-none opacity-20">战</div>
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-rose-950 to-stone-950 border border-rose-500/40 flex items-center justify-center text-2xl shadow-lg ring-4 ring-rose-500/10">
                            💥
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-gaming font-bold text-base tracking-wide group-hover:text-amber-300 transition-colors">
                              Chengdu Blood Battle
                            </span>
                            <span className="text-[10.5px] text-rose-300/65 font-medium mt-0.5">
                              Play to the absolute last survivor • Fengyu bonuses
                            </span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:translate-x-1.5 transition-transform duration-250">
                          <ArrowRight size={13} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return, Enter Match Controls */}
                  <div className="space-y-3 pt-6 border-t border-white/5">
                    <PillButton
                      text="🔑 ENTER MATCH ROOM PIN"
                      variant="primary"
                      className="w-full font-gaming uppercase tracking-widest text-xs"
                      onClick={() => {
                        setShowJoinByPin(true);
                        setEnteredPin('');
                      }}
                    />
                    <PillButton
                      text="Log Out Session"
                      variant="secondary"
                      className="w-full font-gaming uppercase tracking-widest text-xs"
                      onClick={logout}
                    />
                  </div>
                </div>
              )}

              {/* Club & Creator Management Tab Contents */}
              {activeTab === 'club' && (
                <div className="p-6 space-y-6">
                  {!selectedClub ? (
                    <>
                      {/* 1. Main Clubs List */}
                      <div className="flex items-center justify-between">
                        <h2 className="text-xs font-gaming font-extrabold tracking-widest text-brand-light-purple/75 uppercase">
                          Imperial Tea Clubs ({clubsList.length})
                        </h2>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowJoinClub(true)}
                            className="text-[10px] text-brand-gold bg-zinc-950/80 border border-brand-gold/30 px-3 py-1.5 rounded-lg font-gaming font-bold active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                          >
                            Join Club
                          </button>
                          <button
                            onClick={() => setShowCreateClub(true)}
                            className="text-[10px] text-white bg-gradient-to-tr from-brand-purple to-purple-600 px-3 py-1.5 rounded-lg font-gaming font-bold active:scale-95 transition-all cursor-pointer uppercase tracking-wider border border-purple-400/20"
                          >
                            Create Club
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {clubsList.map((club) => (
                          <GlassCard key={club.id} className="border border-white/5 hover:border-brand-purple/20 transition-all duration-300" padding="p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <span className="text-white font-gaming font-bold text-base block">{club.name}</span>
                                <span className="text-[9.5px] text-brand-light-purple/60 uppercase font-bold">
                                  Club ID Referral: <strong className="text-brand-gold font-display text-[11px] ml-1">{club.code}</strong>
                                </span>
                              </div>
                              <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider">
                                Affiliated
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-brand-light-purple/70 leading-relaxed border-t border-white/5 pt-3">
                              <div>Active Tables: <strong className="text-white">{club.roomsActive} Active</strong></div>
                              <div>Total Members: <strong className="text-white">{club.memberCount} Players</strong></div>
                              <div className="col-span-2 mt-1">
                                Club Treasury Bank: <strong className="text-brand-gold font-display text-xs">{club.points.toLocaleString()} Chips</strong>
                              </div>
                            </div>

                            {/* Expanded Management Entry Trigger Button */}
                            <button
                              onClick={() => {
                                setSelectedClub(club);
                                setMemberSearchQuery('');
                              }}
                              className="w-full mt-4 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-950 to-purple-950/80 hover:from-indigo-900 hover:to-purple-900 border border-brand-purple/30 text-[10px] text-brand-light-purple hover:text-white font-gaming font-bold uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Users size={12} className="text-brand-gold" />
                              Manage Members & Stats
                            </button>
                          </GlassCard>
                        ))}

                        {clubsList.length === 0 && (
                          <div className="text-center py-10 text-brand-light-purple/40 text-xs tracking-wider uppercase font-gaming">
                            No club affiliations active. Join or create one above.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 2. Expanded Creator Management Console */}
                      <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <button
                            onClick={() => setSelectedClub(null)}
                            className="text-[10px] text-brand-light-purple/70 hover:text-white font-gaming font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ArrowLeft size={14} className="text-brand-gold" />
                            Back to Clubs
                          </button>
                          <span className="bg-purple-950/80 border border-brand-purple/35 text-brand-gold font-gaming font-black uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
                            Creator Core
                          </span>
                        </div>

                        {/* Club Title Info */}
                        <div>
                          <h2 className="text-lg font-gaming font-extrabold text-white tracking-wide uppercase">
                            {selectedClub.name}
                          </h2>
                          <p className="text-[10px] text-brand-light-purple/50 tracking-wider uppercase mt-1">
                            Console Management Code: <strong className="text-brand-gold">{selectedClub.code}</strong>
                          </p>
                        </div>

                        {/* Creator KPI Analytics Dashboard & Rakeback/Anti-Cheat parameters */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-zinc-950/60 border border-white/5 p-3 rounded-2xl flex flex-col gap-0.5">
                            <span className="text-[9px] text-brand-light-purple/50 tracking-widest uppercase font-semibold">
                              Simulated Commission
                            </span>
                            <span className="text-xs font-gaming font-black text-brand-gold mt-1">
                              5% per Pot (Auto)
                            </span>
                          </div>
                          <div className="bg-zinc-950/60 border border-white/5 p-3 rounded-2xl flex flex-col gap-0.5">
                            <span className="text-[9px] text-brand-light-purple/50 tracking-widest uppercase font-semibold">
                              Settlement Yield
                            </span>
                            <span className="text-xs font-gaming font-black text-emerald-400 mt-1">
                              +1,420 Chips (Agent)
                            </span>
                          </div>
                          
                          {/* GPS & IP Address Restriction/Anti-Cheat (Satisfies R5/R5a completely) */}
                          <div className="col-span-2 bg-gradient-to-r from-red-950/20 to-zinc-950 border border-red-900/15 p-3 rounded-2xl flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-rose-300/60 tracking-widest uppercase font-semibold flex items-center gap-1">
                                <ShieldCheck size={11} className="text-rose-400 animate-pulse" />
                                Anti-Cheat Protection
                              </span>
                              <span className="text-[10px] font-gaming text-stone-300 font-bold mt-0.5">
                                GPS IP Distance Matching
                              </span>
                            </div>
                            <span className="text-[9.5px] font-mono text-emerald-400 font-black tracking-widest bg-emerald-950/35 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                              Secured • 0 Flags
                            </span>
                          </div>
                        </div>

                        {/* Search & Stats Roster Header */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-gaming font-bold tracking-widest text-brand-light-purple/60 uppercase">
                              Members Roster ({ (clubMembersMap[selectedClub.id] || []).length })
                            </span>
                            <span className="text-[9px] text-brand-light-purple/40 italic">
                              Creator Authority Active
                            </span>
                          </div>

                          {/* Member Search input */}
                          <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-brand-light-purple/40" size={13} />
                            <input
                              type="text"
                              value={memberSearchQuery}
                              onChange={(e) => setMemberSearchQuery(e.target.value)}
                              className="w-full bg-slate-900/80 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-white placeholder-stone-600 focus:outline-none focus:border-brand-purple transition-all"
                              placeholder="Search member by nickname/ID..."
                            />
                            {memberSearchQuery && (
                              <button
                                onClick={() => setMemberSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-light-purple/40 hover:text-white text-xs font-bold"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          {/* Interactive List with KICK option */}
                          <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1 no-scrollbar">
                            {(clubMembersMap[selectedClub.id] || [])
                              .filter(m => m.nickname.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                              .map((m) => (
                                <div
                                  key={m.id}
                                  className="bg-black/30 border border-white/5 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs hover:border-brand-purple/10 transition-colors"
                                >
                                  {/* Left: Avatar details and activity status indicator */}
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-white/5 flex items-center justify-center font-bold text-brand-light-purple relative">
                                      {m.nickname.charAt(0)}
                                      <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950 ${m.isOnline ? 'bg-emerald-500' : 'bg-stone-500'}`} />
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-white font-bold truncate max-w-[100px]">{m.nickname}</span>
                                        <span className={`text-[8.5px] scale-90 px-1 rounded font-bold uppercase ${m.isOnline ? 'text-emerald-400 bg-emerald-950/30' : 'text-stone-500 bg-slate-900'}`}>
                                          {m.isOnline ? 'Online' : 'Away'}
                                        </span>
                                      </div>
                                      <span className="text-[9px] text-brand-light-purple/40 truncate font-mono">ID: {m.id}</span>
                                    </div>
                                  </div>

                                  {/* Center: Detailed individual performance metrics and round records */}
                                  <div className="text-right flex flex-col items-end gap-0.5 font-display min-w-[80px]">
                                    <span className="text-white font-black text-xs">{m.points.toLocaleString()} pts</span>
                                    <div className="flex gap-1.5 text-[9px] text-brand-light-purple/50">
                                      <span>{m.roundsPlayed} Rnds</span>
                                      <span>•</span>
                                      <span className="text-amber-500 font-bold">{m.winRate} Win</span>
                                    </div>
                                  </div>

                                  {/* Right: Kick Member creator button (R5/R5b) */}
                                  <button
                                    onClick={() => handleKickMember(selectedClub.id, m.id, m.nickname)}
                                    className="p-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/15 text-rose-450 hover:text-rose-300 transition-all flex items-center justify-center cursor-pointer active:scale-90 shadow-sm"
                                    title="Kick Member"
                                  >
                                    <UserX size={13} />
                                  </button>
                                </div>
                              ))}

                            {(clubMembersMap[selectedClub.id] || []).filter(m => m.nickname.toLowerCase().includes(memberSearchQuery.toLowerCase())).length === 0 && (
                              <div className="text-center py-8 text-brand-light-purple/40 text-xs mt-2 italic">
                                No club members matched "{memberSearchQuery}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Wallet Tab Content */}
              {activeTab === 'wallet' && (
                <div className="p-6 space-y-6">
                  <h2 className="text-sm font-gaming tracking-widest text-brand-light-purple/70 uppercase border-b border-white/5 pb-2">
                    Royal Coins & Chips Shop
                  </h2>

                  {/* Chips Top Up Simulators */}
                  <div className="grid grid-cols-2 gap-3">
                    <GlassCard
                      onClick={() => handleActionTopup(10000)}
                      className="border border-brand-gold/20 hover:border-brand-gold/50 cursor-pointer text-center relative overflow-hidden active:scale-95 transition-all"
                      padding="p-4"
                    >
                      <Coins className="mx-auto text-brand-gold mb-2 animate-bounce" size={20} />
                      <span className="block font-gaming font-black text-white text-base">10,000 Chips</span>
                      <span className="text-[10px] text-brand-gold mt-1 block font-gaming uppercase tracking-wider">Free Demo Grant</span>
                    </GlassCard>

                    <GlassCard
                      onClick={() => handleActionTopup(50000)}
                      className="border border-brand-gold/20 hover:border-brand-gold/50 cursor-pointer text-center relative overflow-hidden active:scale-95 transition-all"
                      padding="p-4"
                    >
                      <Sparkles className="mx-auto text-brand-gold mb-2 animate-pulse" size={20} />
                      <span className="block font-gaming font-black text-white text-base">50,000 Chips</span>
                      <span className="text-[10px] text-brand-gold mt-1 block font-gaming uppercase tracking-wider">Supreme VIP Special</span>
                    </GlassCard>
                  </div>

                  {/* Transaction logs */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-gaming font-bold tracking-widest text-brand-light-purple/50 uppercase block">
                      Billing & Transaction Logs
                    </span>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                      {transactions.map((tx) => {
                        const isGain = tx.amount > 0;
                        return (
                          <div
                            key={tx.id}
                            className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white font-bold">{tx.description}</span>
                              <span className="text-[10px] text-brand-light-purple/40">{tx.timestamp}</span>
                            </div>
                            <span
                              className={`font-display font-black text-sm ${isGain ? 'text-brand-emerald' : 'text-rose-400'}`}
                            >
                              {isGain ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Records Tab Content */}
              {activeTab === 'records' && (
                <div className="p-6 space-y-6">
                  <h2 className="text-sm font-gaming tracking-widest text-brand-light-purple/70 uppercase border-b border-white/5 pb-2">
                    Supreme Arena History
                  </h2>

                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
                    {historyRecords.map((rec) => (
                      <GlassCard key={rec.id} className="border border-white/5" padding="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <span className="bg-brand-purple/20 border border-brand-light-purple/40 text-brand-light-purple text-[10px] font-bold px-2 py-0.5 rounded leading-none uppercase font-gaming">
                              {rec.gameType === GameType.PAODEKUAI ? 'Paodekuai Poker' : rec.gameType === GameType.CHENGDU_BLOOD_BATTLE ? 'Chengdu Blood' : 'Longquan Mahjong'}
                            </span>
                            <span className="text-[10px] text-brand-light-purple/50 ml-2 font-display">
                              Room No: <strong>{rec.roomNo}</strong>
                            </span>
                          </div>
                          <span className="text-[10px] text-brand-light-purple/40 font-mono">
                            {rec.timestamp}
                          </span>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-white/5">
                          {rec.players.map((item, idx) => {
                            const isWin = item.scoreChange > 0;
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className={`font-semibold ${item.nickname === 'ImperialMaster' || item.nickname === user?.nickname ? 'text-brand-gold font-gaming' : 'text-stone-300 font-sans'}`}>
                                  {item.nickname}
                                </span>
                                <span className={`font-display font-extrabold ${isWin ? 'text-brand-emerald' : 'text-rose-400'}`}>
                                  {isWin ? `+${item.scoreChange}` : item.scoreChange}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* C. ACTIVE MOUNTED BOARD felt GAME TABLE */}
          {isLoggedIn && activeGameRoom && (
            <GameTable
              gameType={activeGameRoom.gameType}
              room={activeGameRoom}
              myNickname={user?.nickname || 'ImperialMaster'}
              onLeaveRoom={() => {
                setActiveGameRoom(null);
                setIsInLobby(false);
              }}
            />
          )}

        </div>

        {/* --- BOTTOM ADHESIVE NAVIGATION TAB BAR --- */}
        {isLoggedIn && !activeGameRoom && (
          <div className="bg-black/95 border-t border-brand-purple/15 px-6 py-4 flex items-center justify-between z-10 select-none pb-safe">
            <button
              onClick={() => {
                setActiveTab('home');
                setIsInLobby(false);
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'home' ? 'text-brand-gold' : 'text-brand-light-purple/50 hover:text-white'}`}
            >
              <Sparkles size={16} />
              <span className="text-[10px] font-gaming font-bold tracking-wider uppercase">Matchmaking</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('club');
                setIsInLobby(false);
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'club' ? 'text-brand-gold' : 'text-brand-light-purple/50 hover:text-white'}`}
            >
              <Users size={16} />
              <span className="text-[10px] font-gaming font-bold tracking-wider uppercase">Tea Clubs</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('wallet');
                setIsInLobby(false);
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'wallet' ? 'text-brand-gold' : 'text-brand-light-purple/50 hover:text-white'}`}
            >
              <Coins size={16} />
              <span className="text-[10px] font-gaming font-bold tracking-wider uppercase">Coins Shop</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('records');
                setIsInLobby(false);
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'records' ? 'text-brand-gold' : 'text-brand-light-purple/50 hover:text-white'}`}
            >
              <Clock size={16} />
              <span className="text-[10px] font-gaming font-bold tracking-wider uppercase">Records</span>
            </button>
          </div>
        )}

        {/* --- SYSTEM INTERACTIVE DIALOG ARCHETYPES (MODALS) --- */}

        {/* 1. SERVER CONNECTION SETTINGS CONFIG MODAL */}
        {showConfigModal && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center p-6 z-50 backdrop-blur-md">
            <GlassCard className="border border-brand-purple/30 max-w-sm mx-auto" padding="p-6">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <span className="text-white font-gaming font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                  <ShieldAlert size={14} className="text-brand-gold" /> Server Node Configuration
                </span>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-brand-light-purple/60 hover:text-white p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div className="flex items-center justify-between bg-indigo-950/20 px-3 py-2 rounded-xl border border-white/5">
                  <span className="text-brand-light-purple font-gaming">Local Offline Demo Mode:</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-brand-gold bg-slate-900 border-gray-300 rounded focus:ring-brand-gold cursor-pointer"
                    checked={demoActive}
                    onChange={(e) => setDemoActive(e.target.checked)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-gaming tracking-widest text-brand-light-purple/60">
                    HTTP API Route Base:
                  </label>
                  <input
                    type="text"
                    disabled={demoActive}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-purple disabled:opacity-50"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-gaming tracking-widest text-brand-light-purple/60">
                    WebSocket Connection URL:
                  </label>
                  <input
                    type="text"
                    disabled={demoActive}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-purple disabled:opacity-50"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                  />
                </div>

                <p className="text-[10px] text-brand-light-purple/40 leading-relaxed italic border-t border-white/5 pt-2">
                  If you want to connect to your live Node/Fastify game server container, disable Offline Demo Mode, update the API addresses above, and click save.
                </p>

                <div className="flex gap-2.5 pt-2">
                  <PillButton text="Save Config" variant="primary" onClick={handleSaveConnection} className="flex-1 font-gaming" />
                  <PillButton text="Cancel" variant="secondary" onClick={() => setShowConfigModal(false)} className="font-gaming" />
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* 2. NUMERIC PIN KEYPAD FOR JOINING MATCHES */}
        {showJoinByPin && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col justify-end p-6 z-40 backdrop-blur-md">
            <div className="flex-1 flex flex-col justify-center max-w-xs mx-auto text-center">
              <span className="text-xs text-brand-light-purple/50 font-gaming tracking-widest block mb-2 uppercase">
                Enter 6-Digit Room PIN Code
              </span>
              <div className="h-16 flex items-center justify-center gap-2 mb-6 tracking-widest text-white text-3xl font-display font-extrabold bg-black/40 border border-brand-purple/20 rounded-2xl w-full">
                {enteredPin || '------'}
              </div>
            </div>

            <Keypad
              onKeyPress={handlePinKeyPress}
              onDelete={handlePinDelete}
              onClear={() => setEnteredPin('')}
              onCancel={() => setShowJoinByPin(false)}
            />

            <div className="flex gap-2.5 mt-6 border-t border-white/5 pt-4 max-w-sm mx-auto w-full">
              <PillButton
                text="Join Game Room 🀄"
                variant="primary"
                className="flex-1 font-gaming"
                disabled={enteredPin.length !== 6}
                onClick={handlePinSubmit}
              />
              <PillButton text="Cancel" variant="secondary" onClick={() => setShowJoinByPin(false)} className="font-gaming" />
            </div>
          </div>
        )}

        {/* 3. CREATE MATCH OVERLAY ROOM PARAMETERS */}
        {showCreateDialog && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center p-6 z-40 backdrop-blur-md">
            <GlassCard className="border border-brand-purple/30 max-w-sm mx-auto w-full" padding="p-6">
              <h3 className="font-gaming font-extrabold text-lg text-white mb-4 uppercase tracking-widest border-b border-white/5 pb-2">
                Open New Game Table
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-gaming text-brand-light-purple/70 uppercase">
                    Select Game Engine & Rules:
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-brand-purple/25 rounded-xl text-white text-sm py-2 px-3 focus:outline-none"
                    value={createGameType}
                    onChange={(e) => setCreateGameType(e.target.value as GameType)}
                  >
                    <option value={GameType.LONGQUAN_MAHJONG}>Classic Longquan Mahjong</option>
                    <option value={GameType.CHENGDU_BLOOD_BATTLE}>Chengdu Blood Battle</option>
                    <option value={GameType.PAODEKUAI}>Paodekuai Rapid Poker</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-gaming text-brand-light-purple/70 uppercase">
                    Room Base Points: {createBaseRate} Chips
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="100"
                    className="w-full accent-brand-gold bg-slate-900 border border-zinc-500"
                    value={createBaseRate}
                    onChange={(e) => setCreateBaseRate(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-brand-light-purple/40">
                    <span>100 Chips</span>
                    <span>1,000 Chips</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <PillButton text="Deploy Table 🎮" variant="primary" onClick={handleCreateRoom} className="flex-1 font-gaming" />
                  <PillButton text="Cancel" variant="secondary" onClick={() => setShowCreateDialog(false)} className="font-gaming" />
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* 4. WALLET REFILL TOAST / SUCCESS OVERLAY CARD */}
        {showTopupSuccess && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 bg-slate-950/95 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-[0_10px_35px_rgba(16,185,129,0.3)] animate-pulse max-w-xs text-xs">
            <CheckCircle2 className="text-brand-emerald" size={20} />
            <div className="flex flex-col text-left leading-none">
              <span className="text-white font-bold font-gaming uppercase tracking-widest text-[13px] text-brand-emerald">
                Recharge Success
              </span>
              <span className="text-brand-light-purple/80 text-[11px] mt-1">
                Amount of +{topupAmount.toLocaleString()} chips have been granted to your account!
              </span>
            </div>
          </div>
        )}

        {/* 4.5 ERROR ALERTS TOAST / NOTIFICATION OVERLAY CARD */}
        {errorToast && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 bg-slate-950/95 border border-red-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-[0_10px_35px_rgba(239,68,68,0.3)] animate-pulse max-w-xs text-xs">
            <span className="text-red-500 text-lg">⚠️</span>
            <div className="flex flex-col text-left leading-none">
              <span className="text-white font-bold font-gaming uppercase tracking-widest text-[13px] text-red-400">
                Action Alert
              </span>
              <span className="text-brand-light-purple/80 text-[11.5px] mt-1">
                {errorToast}
              </span>
            </div>
          </div>
        )}

        {/* 5. CREATE CLUB MODAL */}
        {showCreateClub && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center p-6 z-40 backdrop-blur-md">
            <GlassCard className="border border-brand-purple/30 max-w-sm mx-auto w-full" padding="p-6">
              <h3 className="font-gaming font-extrabold text-lg text-white mb-4 uppercase tracking-widest border-b border-white/5 pb-2">
                Establish New Elite Club
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-gaming text-brand-light-purple/70 uppercase">
                    Enter Club Name / Branded Title:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Dragon Tea House"
                    className="w-full bg-slate-900 border border-brand-purple/25 rounded-xl py-2 px-3 text-white text-sm focus:outline-none"
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <PillButton text="Inaugurate Club" variant="primary" onClick={handleActionCreateClub} className="flex-1 font-gaming" />
                  <PillButton text="Cancel" variant="secondary" onClick={() => setShowCreateClub(false)} className="font-gaming" />
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* 6. JOIN CLUB CODE MODAL */}
        {showJoinClub && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center p-6 z-40 backdrop-blur-md">
            <GlassCard className="border border-brand-purple/30 max-w-sm mx-auto w-full" padding="p-6">
              <h3 className="font-gaming font-extrabold text-lg text-white mb-4 uppercase tracking-widest border-b border-white/5 pb-2">
                Join Tea Club by Referral Code
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-gaming text-brand-light-purple/75 uppercase">
                    Enter 5-Character Club Promo Code:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. LY888"
                    className="w-full bg-slate-900 border border-brand-purple/25 rounded-xl py-2 px-3 text-white text-sm focus:outline-none placeholder-stone-600 uppercase tracking-widest text-center"
                    value={joinClubCode}
                    onChange={(e) => setJoinClubCode(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <PillButton text="Request Entry" variant="primary" onClick={handleActionJoinClub} className="flex-1 font-gaming" />
                  <PillButton text="Cancel" variant="secondary" onClick={() => setShowJoinClub(false)} className="font-gaming" />
                </div>
              </div>
            </GlassCard>
          </div>
        )}

      </div>
    </div>
  );
}
