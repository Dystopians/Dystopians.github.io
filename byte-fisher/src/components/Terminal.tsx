import React, { useState, useEffect, useRef } from 'react';
import { LootItem, LootType, LeaderboardEntry } from '../types';
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

interface TerminalProps {
  inventory: LootItem[];
  playerName: string;
  setPlayerName: (name: string) => void;
  onClose: () => void;
  onSell: (item: LootItem) => void;
  onConsume: (items: LootItem[]) => void;
  lang: 'en' | 'zh';
}

const Terminal: React.FC<TerminalProps> = ({ inventory, playerName, setPlayerName, onClose, onSell, onConsume, lang }) => {
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'NETWORK'>('INVENTORY');
  const [composedMsg, setComposedMsg] = useState<LootItem[]>([]);
  const [serverLog, setServerLog] = useState<LeaderboardEntry[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileWidgetRef = useRef<HTMLDivElement | null>(null);
  const turnstileIdRef = useRef<string | null>(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const sessionIdRef = useRef<string>(getSessionId());
  const requiresTurnstile = Boolean(isSupabaseConfigured && turnstileSiteKey);
  const canUpload = !isValidating && composedMsg.length > 0 && !!playerName && (!requiresTurnstile || !!turnstileToken);
  
  const t = TEXT[lang];

  // Helper to get item name
  const getItemName = (item: LootItem) => {
    if (item.itemId) {
      // @ts-ignore
      const translation = t.items[item.itemId];
      if (translation) return translation.name;
    }
    return item.name;
  };

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
    const historyStr = localStorage.getItem('bytefisher_upload_history');
    const history = historyStr ? JSON.parse(historyStr) : {};
    
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
    const historyStr = localStorage.getItem('bytefisher_upload_history');
    const history = historyStr ? JSON.parse(historyStr) : {};
    
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

  const loadMessages = async () => {
    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem('bytefisher_logs');
      if (saved) {
        setServerLog(JSON.parse(saved));
      } else {
        setServerLog(MOCK_LEADERBOARD);
      }
      return;
    }

    if (!supabase) {
      setServerLog(MOCK_LEADERBOARD);
      return;
    }

    const { data, error } = await supabase
      .from('bytefisher_messages')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setServerLog(MOCK_LEADERBOARD);
      return;
    }

    setServerLog(data.map(toEntry));
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileWidgetRef.current) return;
    if (turnstileIdRef.current) return;
    const render = () => {
      // @ts-expect-error Turnstile is injected globally
      if (!window.turnstile) return;
      // @ts-expect-error Turnstile is injected globally
      turnstileIdRef.current = window.turnstile.render(turnstileWidgetRef.current, {
        sitekey: turnstileSiteKey,
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
  }, [turnstileSiteKey]);

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
       if (requiresTurnstile && turnstileIdRef.current) {
         // @ts-expect-error Turnstile is injected globally
         const response = window.turnstile?.getResponse(turnstileIdRef.current);
         if (!response) {
           setUploadStatus('ERROR: VERIFY BEFORE UPLOAD');
           // @ts-expect-error Turnstile is injected globally
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
    const text = composedMsg.map(c => c.char).join('');
    const sanitizedName = playerName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 12);

    if (isSupabaseConfigured) {
      let tokenToUse = turnstileToken;
      if (turnstileSiteKey && turnstileIdRef.current) {
        // @ts-expect-error Turnstile is injected globally
        const response = window.turnstile?.getResponse(turnstileIdRef.current);
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
        // @ts-expect-error Turnstile is injected globally
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
      
      const ip = getSimulatedIP();
      recordUpload(ip);
    }

    // 4. Success Actions
    onConsume(composedMsg); // Permanently remove items
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
  
  // Exclude characters that are currently in the composer to prevent reusing the same item instance
  const availableChars = allChars.filter(c => !composedMsg.find(m => m.id === c.id));
  
  const junk = inventory.filter(i => i.type !== LootType.CHAR);

  return (
    <div className="fixed inset-0 z-40 bg-cyber-black/95 flex flex-col p-4 md:p-10 font-mono text-cyber-green crt">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-cyber-green pb-4 mb-4">
        <h1 className="text-3xl font-bold glitch-text">TERMINAL_ACCESS</h1>
        <button onClick={onClose} className="text-cyber-pink hover:bg-cyber-pink hover:text-black px-4 py-1 border border-cyber-pink">
          [X] {t.disconnect}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('INVENTORY')}
          className={`px-6 py-2 border ${activeTab === 'INVENTORY' ? 'bg-cyber-green text-black' : 'border-cyber-green text-cyber-green hover:bg-cyber-green/20'}`}
        >
          {t.inventory}
        </button>
        <button 
          onClick={() => setActiveTab('NETWORK')}
          className={`px-6 py-2 border ${activeTab === 'NETWORK' ? 'bg-cyber-green text-black' : 'border-cyber-green text-cyber-green hover:bg-cyber-green/20'}`}
        >
          {t.network}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
        
        {activeTab === 'INVENTORY' && (
          <>
            {/* Loot List */}
            <div className="flex-1 border border-cyber-gray p-4 overflow-y-auto">
              <h3 className="text-xl mb-4 text-cyber-cyan">{'>'} TRASH_AND_DATA</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {junk.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-cyber-dark p-2 border border-cyber-gray hover:border-cyber-green group">
                    <span className={`${item.rarity === 'legendary' ? 'text-cyber-yellow' : 'text-white'}`}>{getItemName(item)}</span>
                    <button 
                      onClick={() => onSell(item)}
                      className="text-xs bg-cyber-gray px-2 py-1 text-white group-hover:bg-cyber-green group-hover:text-black"
                    >
                      {t.sell} ${item.value}
                    </button>
                  </div>
                ))}
                {junk.length === 0 && <div className="text-gray-500 italic">{t.noData}</div>}
              </div>
            </div>

            {/* Letter Grid & Composer */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="border border-cyber-gray p-4 flex-1 overflow-y-auto">
                 <h3 className="text-xl mb-4 text-cyber-cyan">{'>'} ASCII_CACHE</h3>
                 <div className="flex flex-wrap gap-2">
                   {availableChars.map(item => (
                     <button 
                       key={item.id}
                       onClick={() => addToCompose(item)}
                       className="w-10 h-10 border border-cyber-gray flex items-center justify-center text-xl hover:bg-cyber-green hover:text-black font-bold"
                     >
                       {item.char}
                     </button>
                   ))}
                   {availableChars.length === 0 && <div className="text-gray-500 italic">{t.noBytes}</div>}
                 </div>
              </div>

              {/* Composer */}
              <div className={`border p-4 min-h-[150px] flex flex-col transition-colors ${uploadStatus.includes('ERROR') ? 'border-red-600 bg-red-900/10' : 'border-cyber-pink'}`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`${uploadStatus.includes('ERROR') ? 'text-red-500' : 'text-cyber-pink'}`}>{uploadStatus.includes('ERROR') ? t.securityAlert : t.composer}</h3>
                  {uploadStatus && (
                    <span className={`text-xs px-2 py-1 font-bold animate-pulse ${uploadStatus.includes('FAILED') || uploadStatus.includes('ERROR') ? 'bg-red-900 text-white' : 'bg-cyber-green text-black'}`}>
                      {uploadStatus}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 bg-cyber-dark p-2 mb-2 flex flex-wrap gap-1 items-start content-start border border-dashed border-cyber-gray relative">
                   {isValidating && <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center text-cyber-green animate-pulse">{t.integrityCheck}</div>}
                   {composedMsg.map((item, idx) => (
                     <span 
                        key={idx} 
                        onClick={() => !isValidating && removeFromCompose(idx)}
                        className="cursor-pointer hover:text-red-500 select-none"
                     >
                       {item.char}
                     </span>
                   ))}
                   {composedMsg.length === 0 && <span className="text-gray-600 animate-pulse">{t.waitingInput}</span>}
                </div>
                {isSupabaseConfigured && turnstileSiteKey && (
                  <div className="mb-3 flex justify-center">
                    <div ref={turnstileWidgetRef} />
                  </div>
                )}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={t.enterId}
                    maxLength={12}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isValidating}
                    className="bg-transparent border border-cyber-green text-cyber-green px-2 py-1 flex-1 focus:outline-none focus:bg-cyber-green/10 disabled:opacity-50"
                  />
                  <button 
                    onClick={handlePublishClick}
                    disabled={!canUpload}
                    className="bg-cyber-pink text-black px-4 py-1 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                  >
                    {isValidating ? '...' : t.upload}
                  </button>
                </div>
                {requiresTurnstile && !turnstileToken && (
                  <div className="mt-2 text-xs text-cyber-pink">
                    VERIFY REQUIRED
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'NETWORK' && (
          <div className="w-full h-full border border-cyber-green p-4 overflow-y-auto font-mono">
             {serverLog.map(entry => (
               <div key={entry.id} className="mb-4 border-b border-cyber-gray pb-2">
                 <div className="flex justify-between text-xs text-cyber-gray mb-1">
                   <span>ID: {entry.name}</span>
                   <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                 </div>
                 <div className="text-lg text-white">
                   "{entry.message}"
                 </div>
               </div>
             ))}
          </div>
        )}

      </div>
      <div className="scanline"></div>
    </div>
  );
};

export default Terminal;
