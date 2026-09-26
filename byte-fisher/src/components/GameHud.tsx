import React from 'react';
import { Anchor, AudioLines, BookOpen, Fish, Languages, Radio, ShoppingBag, TerminalSquare, VolumeX, X } from 'lucide-react';
import { APP_VERSION } from '../constants';
import { GameState } from '../types';
import { TEXT } from '../locales';

interface Props {
  lang: 'en' | 'zh';
  state: GameState;
  credits: number;
  catches: number;
  muted: boolean;
  status: string;
  contract: React.ReactNode;
  onLanguage: () => void;
  onAudio: () => void;
  onNavigate: (state: GameState) => void;
  onCast: () => void;
  onCancel: () => void;
}

export default function GameHud({ lang, state, credits, catches, muted, status, contract, onLanguage, onAudio, onNavigate, onCast, onCancel }: Props) {
  const t = TEXT[lang];
  const idle = state === GameState.IDLE;
  const actions = [
    { state: GameState.SHOP, label: t.market, Icon: ShoppingBag },
    { state: GameState.TERMINAL, label: t.terminal, Icon: TerminalSquare },
    { state: GameState.CODEX, label: t.codex, Icon: Fish },
    { state: GameState.GUIDEBOOK, label: t.guidebook, Icon: BookOpen },
  ];
  return <div className="game-hud" data-state={state}>
    <header className="harbor-header">
      <div className="brand"><Anchor size={25} strokeWidth={1.5} /><div><h1>BYTE FISHER<span>.</span></h1><span className="brand-caption">{lang === 'zh' ? '霓虹港湾' : 'NEON HARBOR'}</span></div></div>
      <div className="header-tools">
        <div className="credit-balance"><span>{lang === 'zh' ? '信用点' : 'CREDITS'}</span><strong>{Math.round(credits).toLocaleString()}<small> cr</small></strong></div>
        <button className="icon-button" onClick={onLanguage} aria-label={lang === 'zh' ? 'Switch to English' : '切换中文'} title={lang === 'zh' ? 'English' : '中文'}><Languages size={19}/></button>
        <button className="icon-button" onClick={onAudio} aria-label={muted ? t.audioMuted : t.audioOn} title={muted ? t.audioMuted : t.audioOn} aria-pressed={muted}>{muted ? <VolumeX size={19}/> : <AudioLines size={19}/>}</button>
      </div>
    </header>
    <aside className="harbor-info"><div className="harbor-status"><Radio size={13}/><span>{status}</span><span className="connection-dot" /></div><div className="contract-line">{contract}</div></aside>
    <div className="harbor-location"><span>SECTOR 07</span><span>{lang === 'zh' ? '东岸 / 深夜' : 'EAST BANK / AFTER HOURS'}</span></div>
    <div className="cast-controls">
      {idle && <button data-testid="cast-button" className="cast-button" onClick={onCast}><Anchor size={21}/><span>{t.castLine}</span></button>}
      {(state === GameState.CASTING || state === GameState.WAITING) && <div className="cast-status"><Radio className="signal-pulse" size={18}/><span>{state === GameState.CASTING ? status : t.scanning}</span><button className="icon-button" onClick={onCancel} aria-label={lang === 'zh' ? '收竿' : 'Cancel cast'} title={lang === 'zh' ? '收竿' : 'Cancel cast'}><X size={17}/></button></div>}
    </div>
    <footer className="harbor-footer">
      <div className="session-stat"><Fish size={17}/><strong>{catches}</strong><span>{lang === 'zh' ? '已捕获' : 'CAUGHT'}</span></div>
      <nav className="harbor-nav" aria-label={lang === 'zh' ? '游戏菜单' : 'Game menu'}>{actions.map(({ state: destination, label, Icon }) => <button key={destination} data-testid={`nav-${destination.toLowerCase()}`} disabled={!idle} onClick={() => onNavigate(destination)}><Icon size={19} strokeWidth={1.5}/><span>{label}</span></button>)}</nav>
      <div className="build-label">{APP_VERSION}</div>
    </footer>
  </div>;
}
