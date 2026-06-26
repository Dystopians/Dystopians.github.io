import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryEvent, LootItem, LootType, LeaderboardEntry } from '../types';
import { MOCK_LEADERBOARD } from '../constants';
import { TEXT } from '../locales';
import { createId } from '../utils/id';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type MessageRow = {
  id: string;
  name: string;
  message: string;
  created_at: string;
  session_id?: string | null;
};

const getSessionId = (): string => {
  const stored = localStorage.getItem('bytefisher_session_id');
  if (stored) return stored;
  const next = createId();
  localStorage.setItem('bytefisher_session_id', next);
  return next;
};

const readLocalJson = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

interface TerminalProps {
  inventory: LootItem[];
  history: HistoryEvent[];
  playerName: string;
  setPlayerName: (name: string) => void;
  onClose: () => void;
  onConsume: (items: LootItem[]) => void;
  onPublishLog: (message: string) => void;
  difficulty: 'simple' | 'hard' | 'hardcore';
  setDifficulty: (value: 'simple' | 'hard' | 'hardcore') => void;
  onReset: () => void;
  lang: 'en' | 'zh';
}

const Terminal: React.FC<TerminalProps> = ({ inventory, history, playerName, setPlayerName, onClose, onConsume, onPublishLog, difficulty, setDifficulty, onReset, lang }) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'COMPOSE' | 'NETWORK'>('INVENTORY');
  const [composedMsg, setComposedMsg] = useState<LootItem[]>([]);
  const [serverLog, setServerLog] = useState<LeaderboardEntry[]>([]);
  const [messageBoardStatus, setMessageBoardStatus] = useState<'idle' | 'loading' | 'local' | 'remote' | 'error'>('idle');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileWidgetRef = useRef<HTMLDivElement | null>(null);
  const turnstileIdRef = useRef<string | null>(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const sessionIdRef = useRef<string>(getSessionId());
  const requiresTurnstile = isSupabaseConfigured;
  const canUseRemoteUpload = !isSupabaseConfigured || Boolean(turnstileSiteKey);
  const canUpload = !isValidating && canUseRemoteUpload && composedMsg.length > 0 && !!playerName && (!requiresTurnstile || !!turnstileToken);
  
  const t = TEXT[lang];

  // Simulated IP Helper
  const getSimulatedIP = () => {
    let ip = localStorage.getItem('bytefisher_ip');
    if (!ip) {
      ip = `10.13.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
      localStorage.setItem('bytefisher_ip', ip);
    }
    return ip;
  };

  const checkRateLimit = (ip: string): { allowed: boolean; reason?: 'cooldown' | 'limit' } => {
    const history = readLocalJson<Record<string, { lastUpload: number; count: number; date: string }>>('bytefisher_upload_history', {});
    
    if (!history[ip]) return { allowed: true };

    const userData = history[ip];
    const now = Date.now();
    const today = new Date().toDateString();

    // 1. Check Interval (5 minutes = 300000 ms)
    if (now - userData.lastUpload < 300000) {
      return { allowed: false, reason: 'cooldown' };
    }

    // 2. Check Daily Limit
    if (userData.date !== today) {
      // Reset if new day
      userData.count = 0;
      userData.date = today;
      // We don't save here, we save on successful upload
    }
    
    if (userData.count >= 5) {
      return { allowed: false, reason: 'limit' };
    }

    return { allowed: true };
  };

  const recordUpload = (ip: string) => {
    const history = readLocalJson<Record<string, { lastUpload: number; count: number; date: string }>>('bytefisher_upload_history', {});
    
    const today = new Date().toDateString();
    
    if (!history[ip]) {
      history[ip] = { lastUpload: 0, count: 0, date: today };
    }

    const userData = history[ip];
    
    // Reset if previously different day
    if (userData.date !== today) {
      userData.date = today;
      userData.count = 0;
    }

    userData.lastUpload = Date.now();
    userData.count += 1;
    
    history[ip] = userData;
    localStorage.setItem('bytefisher_upload_history', JSON.stringify(history));
  };

  // Anti-Cheat Validation
  const validateIntegrity = (): boolean => {
    // 1. Check against inventory
    // Convert current live inventory to a Set of IDs for O(1) lookup
    const validIds = new Set(inventory.map(i => i.id));
    
    for (const char of composedMsg) {
        if (!validIds.has(char.id)) {
            console.error(`Forgery Detected: Item ID ${char.id} not found in inventory.`);
            return false;
        }
        if (char.type !== LootType.CHAR) {
            console.error(`Forgery Detected: Item ID ${char.id} is not a valid char type.`);
            return false;
        }
    }
    return true;
  };

  const toEntry = (row: MessageRow): LeaderboardEntry => ({
    id: row.id,
    name: row.name,
    message: row.message,
    timestamp: new Date(row.created_at).getTime(),
  });

  const readLocalMessages = useCallback(() => {
    return readLocalJson<LeaderboardEntry[]>('bytefisher_logs', MOCK_LEADERBOARD);
  }, []);

  const loadMessages = useCallback(async () => {
    setMessageBoardStatus('loading');

    if (!isSupabaseConfigured) {
      setServerLog(readLocalMessages());
      setMessageBoardStatus('local');
      return;
    }

    if (!supabase) {
      setServerLog(readLocalMessages());
      setMessageBoardStatus('error');
      return;
    }

    const { data, error } = await supabase
      .from('bytefisher_messages')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setServerLog(readLocalMessages());
      setMessageBoardStatus('error');
      return;
    }

    setServerLog(data.map(toEntry));
    setMessageBoardStatus('remote');
  }, [readLocalMessages]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!turnstileSiteKey) return;

    if (activeTab !== 'COMPOSE') {
      if (turnstileIdRef.current) {
        window.turnstile?.reset(turnstileIdRef.current);
        turnstileIdRef.current = null;
      }
      setTurnstileToken('');
      return;
    }

    if (!turnstileWidgetRef.current) return;
    if (turnstileIdRef.current) return;

    const render = () => {
      if (!window.turnstile) return;
      const size = window.innerWidth < 420 ? 'compact' : 'normal';
      turnstileIdRef.current = window.turnstile.render(turnstileWidgetRef.current as HTMLElement, {
        sitekey: turnstileSiteKey,
        size,
        appearance: 'always',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    };

    const timer = window.setInterval(() => {
      render();
      if (turnstileIdRef.current) window.clearInterval(timer);
    }, 200);

    return () => window.clearInterval(timer);
  }, [turnstileSiteKey, activeTab]);

  useEffect(() => {
    setConfirmReset(false);
  }, [activeTab]);

  const addToCompose = (charItem: LootItem) => {
    if (composedMsg.length >= 20) return; // limit length
    setComposedMsg([...composedMsg, charItem]);
    setUploadStatus(''); // Clear errors when interacting
  };

  const removeFromCompose = (index: number) => {
    const newMsg = [...composedMsg];
    newMsg.splice(index, 1);
    setComposedMsg(newMsg);
    setUploadStatus('');
  };

  const handlePublishClick = () => {
     if (!canUpload) {
       if (isSupabaseConfigured && !turnstileSiteKey) {
         setUploadStatus('ERROR: CAPTCHA NOT CONFIGURED');
         return;
       }
       if (requiresTurnstile && turnstileIdRef.current) {
         const response = window.turnstile?.getResponse(turnstileIdRef.current);
         if (!response) {
           setUploadStatus('ERROR: VERIFY BEFORE UPLOAD');
           window.turnstile?.reset(turnstileIdRef.current);
         }
       }
       return;
     }
     setIsValidating(true);
     setUploadStatus(t.integrityCheck);

     // Artificial delay for "processing" feel
     setTimeout(() => {
         void publishMessage().finally(() => setIsValidating(false));
     }, 1000);
  };

  const checkRateLimitRemote = async (sessionId: string): Promise<{ allowed: boolean; reason?: 'cooldown' | 'limit' }> => {
    if (!supabase) {
      return { allowed: false, reason: 'cooldown' };
    }

    const { data: lastData, error: lastError } = await supabase
      .from('bytefisher_messages')
      .select('created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!lastError && lastData && lastData[0]) {
      const lastAt = new Date(lastData[0].created_at).getTime();
      if (Date.now() - lastAt < 300000) {
        return { allowed: false, reason: 'cooldown' };
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('bytefisher_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('created_at', startOfDay.toISOString());

    if (!countError && (count ?? 0) >= 5) {
      return { allowed: false, reason: 'limit' };
    }

    return { allowed: true };
  };

  const publishMessage = async () => {
    // 1. Run Anti-Cheat Validation
    if (!validateIntegrity()) {
        setUploadStatus(t.tamperDetected);
        return;
    }

    // 2. Rate Limit Check
    const sessionId = sessionIdRef.current;
    const check = isSupabaseConfigured ? await checkRateLimitRemote(sessionId) : checkRateLimit(getSimulatedIP());
    
    if (!check.allowed) {
      setUploadStatus(check.reason === 'cooldown' ? t.uploadCooldown : t.uploadLimit);
      return;
    }
    
    // 3. Construct Message
    const text = composedMsg.map(c => c.char).filter(Boolean).join('');
    const sanitizedName = playerName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 12);

    if (!sanitizedName || !text) {
      setUploadStatus('ERROR: MISSING NAME OR MESSAGE');
      return;
    }

    if (isSupabaseConfigured) {
      if (!turnstileSiteKey) {
        setUploadStatus('ERROR: CAPTCHA NOT CONFIGURED');
        return;
      }

      let tokenToUse = turnstileToken;
      if (turnstileSiteKey) {
        const response =
          (turnstileIdRef.current ? window.turnstile?.getResponse(turnstileIdRef.current) : null) ||
          window.turnstile?.getResponse();
        if (response) tokenToUse = response;
      }

      if (turnstileSiteKey && !tokenToUse) {
        setUploadStatus('ERROR: VERIFY BEFORE UPLOAD');
        return;
      }

      if (!supabase) {
        setUploadStatus('ERROR: SERVER UNAVAILABLE');
        return;
      }

      const { data, error } = await supabase.functions.invoke('bytefisher-submit', {
        body: {
          name: sanitizedName,
          message: text,
          sessionId,
          token: tokenToUse,
        },
      });

      if (error || !data?.message) {
        setUploadStatus(data?.error || error?.message || 'ERROR: SERVER UNAVAILABLE');
        return;
      }

      setServerLog(prev => [toEntry(data.message), ...prev].slice(0, 50));
      setTurnstileToken('');
      if (turnstileIdRef.current) {
        window.turnstile?.reset(turnstileIdRef.current);
      }
    } else {
      const newEntry: LeaderboardEntry = {
        id: createId(),
        name: sanitizedName,
        message: text,
        timestamp: Date.now()
      };

      const newLog = [newEntry, ...serverLog].slice(0, 50); // Keep last 50
      setServerLog(newLog);
      localStorage.setItem('bytefisher_logs', JSON.stringify(newLog));
      setMessageBoardStatus('local');
      
      const ip = getSimulatedIP();
      recordUpload(ip);
    }

    // 4. Success Actions
    onConsume(composedMsg); // Permanently remove items
    onPublishLog(text);
    setComposedMsg([]);
    setUploadStatus(t.bytesConsumed);
    
    // Switch tab after short delay to show success msg
    setTimeout(() => {
        setActiveTab('NETWORK');
        setUploadStatus('');
    }, 1500);
  };

  // Filter items
  const allChars = inventory.filter(i => i.type === LootType.CHAR).sort((a,b) => (a.char || '').localeCompare(b.char || ''));
  const displayChar = (item: LootItem) => (item.char === ' ' ? (lang === 'zh' ? '空' : 'SP') : item.char);
  
  // Exclude characters that are currently in the composer to prevent reusing the same item instance
  const availableChars = allChars.filter(c => !composedMsg.find(m => m.id === c.id));
  
  const formatTemplate = (template: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((acc, [key, value]) => acc.replace(`{${key}}`, String(value)), template);

  const getEventItemName = (event: HistoryEvent) => {
    if (event.data.itemId && event.data.itemId !== 'char_byte') {
      const translation = (t.items as Record<string, { name: string; desc: string }>)[event.data.itemId];
      if (translation) return translation.name;
    }
    return event.data.itemName || t.unknown;
  };

  const formatEvent = (event: HistoryEvent) => {
    switch (event.type) {
      case 'catch':
        return formatTemplate(t.history.caught, {
          item: getEventItemName(event),
          value: event.data.value || 0
        });
      case 'sell':
        return formatTemplate(t.history.sold, {
          item: event.data.itemName || t.unknown,
          value: event.data.value || 0
        });
      case 'buy_upgrade':
        return formatTemplate(t.history.upgrade, {
          upgrade: t.upgrades[event.data.upgradeId || 'barSize']?.name || t.unknown,
          level: event.data.level || 1,
          value: event.data.value || 0
        });
      case 'buy_space':
        return formatTemplate(t.history.space, { value: event.data.value || 0 });
      case 'buy_byte':
        return formatTemplate(t.history.byte, {
          char: event.data.char || '?',
          value: event.data.value || 0
        });
      case 'publish':
        return formatTemplate(t.history.publish, { message: event.data.message || '' });
      default:
        return t.unknown;
    }
  };

  return (
    <div className="fixed inset-0 z-40 h-[100dvh] bg-[#05070d]/96 flex flex-col p-3 sm:p-4 md:p-10 font-sans text-cyber-cyan crt overflow-hidden">
      {/* Header */}
      <div className="ui-panel flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 mb-3 sm:mb-4 shrink-0">
        <h1 className="ui-section-title text-xl sm:text-3xl glitch-text break-words">{t.terminal}</h1>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:items-center">
          <button
            onClick={() =>
              setDifficulty(
                difficulty === 'simple'
                  ? 'hard'
                  : difficulty === 'hard'
                    ? 'hardcore'
                    : 'simple'
              )
            }
            className={`ui-button px-3 py-1 text-xs sm:text-sm ${
              difficulty === 'hardcore'
                ? 'ui-button-coral'
                : ''
            } whitespace-nowrap overflow-hidden text-ellipsis`}
          >
            {difficulty === 'simple' ? t.modeSimple : difficulty === 'hard' ? t.modeHard : t.modeHardcore}
          </button>
          <button
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              setConfirmReset(false);
              onReset();
            }}
            className={`ui-button px-3 py-1 text-xs sm:text-sm ${
              confirmReset
                ? 'ui-button-coral'
                : 'opacity-80'
            } whitespace-nowrap overflow-hidden text-ellipsis`}
          >
            {confirmReset ? t.resetConfirm : t.reset}
          </button>
          <button onClick={onClose} className="ui-button ui-button-coral col-span-2 sm:col-span-1 px-4 py-1 text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            {t.disconnect}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`ui-button px-3 sm:px-4 py-2 text-xs sm:text-base whitespace-nowrap overflow-hidden text-ellipsis ${activeTab === 'INVENTORY' ? 'ui-button-primary' : ''}`}
        >
          {t.inventory}
        </button>
        <button
          onClick={() => setActiveTab('COMPOSE')}
          className={`ui-button px-3 sm:px-4 py-2 text-xs sm:text-base whitespace-nowrap overflow-hidden text-ellipsis ${activeTab === 'COMPOSE' ? 'ui-button-primary' : ''}`}
        >
          {t.composer}
        </button>
        <button
          onClick={() => setActiveTab('NETWORK')}
          className={`ui-button px-3 sm:px-4 py-2 text-xs sm:text-base whitespace-nowrap overflow-hidden text-ellipsis ${activeTab === 'NETWORK' ? 'ui-button-primary' : ''}`}
        >
          {t.network}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-4 sm:gap-6">
        
        {activeTab === 'INVENTORY' && (
          <>
            {/* Loot List */}
            <div className="ui-panel flex-1 p-4 overflow-y-auto">
              <h3 className="text-lg sm:text-xl mb-4 text-cyber-yellow font-bold">{t.historyTitle}</h3>
              <div className="flex flex-col gap-2">
                {history.map(event => (
                  <div key={event.id} className="rounded-md border border-cyber-cyan/45 bg-cyber-cyan/8 p-2 sm:p-3">
                    <div className="flex justify-between text-xs text-cyber-cyan/55 mb-1">
                      <span>{new Date(event.at).toLocaleString()}</span>
                      <span>{t.history.tags[event.type]}</span>
                    </div>
                    <div className="text-sm sm:text-base text-cyber-cyan">
                      {formatEvent(event)}
                    </div>
                  </div>
                ))}
                {history.length === 0 && <div className="text-cyber-cyan/55 italic">{t.historyEmpty}</div>}
              </div>
            </div>
          </>
        )}

        {activeTab === 'COMPOSE' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="ui-panel p-4 flex-1 overflow-y-auto">
               <h3 className="text-lg sm:text-xl mb-4 text-cyber-yellow font-bold">{t.byteFish}</h3>
               <div className="flex flex-wrap gap-2">
                 {availableChars.map(item => (
                   <button 
                     key={item.id}
                     onClick={() => addToCompose(item)}
                     className="ui-button w-10 h-10 flex items-center justify-center text-xl font-bold"
                   >
                     {displayChar(item)}
                   </button>
                 ))}
                 {availableChars.length === 0 && <div className="text-cyber-cyan/55 italic">{t.noBytes}</div>}
               </div>
            </div>

            {/* Composer */}
            <div className={`ui-panel p-4 min-h-[160px] flex flex-col transition-colors ${uploadStatus.includes('ERROR') ? 'border-red-600 bg-red-900/10' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`font-bold ${uploadStatus.includes('ERROR') ? 'text-red-500' : 'text-cyber-yellow'}`}>{uploadStatus.includes('ERROR') ? t.securityAlert : t.composer}</h3>
                {uploadStatus && (
                  <span className={`rounded-full text-xs px-2 py-1 font-bold ${uploadStatus.includes('FAILED') || uploadStatus.includes('ERROR') ? 'bg-red-900 text-white' : 'bg-cyber-green text-black'}`}>
                    {uploadStatus}
                  </span>
                )}
              </div>
              
              <div className="flex-1 rounded-md bg-cyber-cyan/8 p-2 mb-2 flex flex-wrap gap-1 items-start content-start border border-dashed border-cyber-cyan/70 relative">
                 {isValidating && <div className="absolute inset-0 bg-[#05070d]/78 z-10 flex items-center justify-center text-cyber-yellow animate-pulse">{t.integrityCheck}</div>}
                 {composedMsg.map((item, idx) => (
                   <span 
                      key={idx} 
                      onClick={() => !isValidating && removeFromCompose(idx)}
                      className="cursor-pointer hover:text-red-500 select-none"
                   >
                     {displayChar(item)}
                   </span>
                 ))}
                 {composedMsg.length === 0 && <span className="text-cyber-cyan/45">{t.waitingInput}</span>}
              </div>
              {isSupabaseConfigured && turnstileSiteKey && (
                <div className="mb-3 flex justify-center">
                  <div ref={turnstileWidgetRef} className="w-full max-w-[320px] min-h-[65px]" />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  placeholder={t.enterId}
                  maxLength={12}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={isValidating}
                  className="rounded-md bg-[#05070d] border-2 border-cyber-cyan text-cyber-cyan px-3 py-2 flex-1 focus:outline-none focus:border-cyber-yellow disabled:opacity-50"
                />
                <button 
                  onClick={handlePublishClick}
                  disabled={!canUpload}
                  className="ui-button ui-button-coral px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? '...' : t.upload}
                </button>
              </div>
              {isSupabaseConfigured && !turnstileSiteKey && (
                <div className="mt-2 text-xs text-red-500">
                  CAPTCHA CONFIG REQUIRED
                </div>
              )}
              {requiresTurnstile && turnstileSiteKey && !turnstileToken && (
                <div className="mt-2 text-xs text-cyber-yellow">
                  VERIFY REQUIRED
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'NETWORK' && (
          <div className="ui-panel w-full h-full p-4 overflow-y-auto">
             <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
               <div>
                 <h3 className="text-lg sm:text-xl text-cyber-yellow font-bold">{t.network}</h3>
                 <div className={`text-xs ${
                   messageBoardStatus === 'error'
                     ? 'text-red-400'
                     : messageBoardStatus === 'remote'
                     ? 'text-cyber-green'
                     : 'text-cyber-cyan/65'
                 }`}>
                   {messageBoardStatus === 'loading'
                     ? t.boardLoading
                     : messageBoardStatus === 'remote'
                     ? t.boardOnline
                     : messageBoardStatus === 'error'
                     ? t.boardOffline
                     : t.boardLocal}
                 </div>
               </div>
               <button
                 onClick={() => void loadMessages()}
                 disabled={messageBoardStatus === 'loading'}
                 className="ui-button shrink-0 px-3 py-2 text-xs sm:text-sm disabled:opacity-50"
               >
                 {t.reloadBoard}
               </button>
             </div>
             {serverLog.map(entry => (
               <div key={entry.id} className="mb-4 rounded-md border border-cyber-cyan/45 bg-cyber-cyan/8 p-3">
                <div className="flex justify-between text-xs text-cyber-cyan/55 mb-1">
                  <span
                    className={
                      entry.name === 'Maple'
                        ? 'text-cyber-yellow font-bold'
                        : 'text-cyber-cyan/70'
                    }
                  >
                    ID: {entry.name}
                  </span>
                   <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                 </div>
                <div className="text-base sm:text-lg text-cyber-cyan">
                   "{entry.message}"
                 </div>
               </div>
             ))}
             {serverLog.length === 0 && <div className="text-cyber-cyan/55 italic">{t.noData}</div>}
          </div>
        )}

      </div>
      <div className="scanline"></div>
    </div>
  );
};

export default Terminal;
