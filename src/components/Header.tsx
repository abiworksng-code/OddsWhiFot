import { Settings, Shield, LogIn, Sun, Moon, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthProvider';
import { useTheme } from '../lib/ThemeContext';

export function Header({ activePage, setActivePage }: { activePage: string, setActivePage: (page: string) => void }) {
  const { user, signIn, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = ['PRO DASHBOARD', 'ANALYZER', 'LIVE TRACKER', 'ANALYSIS HISTORY', 'SLIP BUILDER'];
  
  return (
    <header className="h-12 border-b border-[color:var(--color-border)] flex items-center justify-between px-3 bg-[color:var(--color-header)] technical-border relative z-50">
      <div className="flex items-center gap-2 cursor-pointer group shrink-0" onClick={() => setActivePage('PRO DASHBOARD')}>
        <div className="w-6 h-6 bg-emerald-500 rounded-sm flex items-center justify-center font-black text-black text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">W</div>
        <div className="flex flex-col -gap-1">
          <span className="text-[11px] font-black tracking-tighter text-[color:var(--color-text)] leading-none uppercase">Oddswhiz</span>
          <span className="text-emerald-400 text-[8px] font-bold tracking-[0.2em] leading-none uppercase">Pro AI</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <button 
          onClick={toggleTheme}
          className="p-1 hover:bg-[color:var(--color-border)] rounded transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-zinc-500" /> : <Moon className="w-4 h-4 text-zinc-500" />}
        </button>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-[color:var(--color-text)]"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <nav className="hidden md:flex gap-4 items-center h-full">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => setActivePage(item)}
            className={`text-[10px] font-bold tracking-widest uppercase h-full px-2 transition-all relative ${
              item === activePage 
                ? 'text-emerald-400' 
                : 'text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]'
            }`}
          >
            {item}
            {item === activePage && (
              <motion.div 
                layoutId="nav-line"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              />
            )}
          </button>
        ))}
        <div className="ml-2 pl-4 border-l border-[color:var(--color-border)] flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-1 hover:bg-[color:var(--color-border)] rounded transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-zinc-500" /> : <Moon className="w-3.5 h-3.5 text-zinc-500" />}
          </button>
          <Shield 
            className={`w-3.5 h-3.5 cursor-pointer transition-colors ${activePage === 'ADMIN' ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`} 
            onClick={() => setActivePage('ADMIN')}
          />
          <Settings className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors" />
          
          {user ? (
            <div 
              className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors"
              onClick={() => {
                if (window.confirm('Sign out?')) logout();
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[8px] text-zinc-500 font-bold uppercase">
                  {user.displayName?.substring(0, 2) || 'AV'}
                </span>
              )}
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[9px] font-bold uppercase transition-all"
            >
              <LogIn className="w-3 h-3" /> Login
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 left-0 right-0 bg-[color:var(--color-header)] border-b border-[color:var(--color-border)] p-4 flex flex-col gap-4 md:hidden z-40 shadow-2xl"
          >
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setActivePage(item);
                  setIsMenuOpen(false);
                }}
                className={`text-[12px] font-black tracking-[0.2em] uppercase text-left py-2 border-l-2 pl-3 transition-all ${
                  item === activePage 
                    ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5' 
                    : 'text-[color:var(--color-text-dim)] border-transparent hover:text-[color:var(--color-text)]'
                }`}
              >
                {item}
              </button>
            ))}
            <div className="pt-4 border-t border-[color:var(--color-border)] flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Controls</span>
                  <div className="flex gap-4">
                    <Shield 
                      className={`w-4 h-4 cursor-pointer ${activePage === 'ADMIN' ? 'text-emerald-400' : 'text-zinc-600'}`} 
                      onClick={() => {
                        setActivePage('ADMIN');
                        setIsMenuOpen(false);
                      }}
                    />
                    <Settings className="w-4 h-4 text-zinc-600" />
                  </div>
               </div>
               {user ? (
                 <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                          {user.photoURL ? (
                             <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                {user.displayName?.substring(0, 2) || 'AV'}
                             </div>
                          )}
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white uppercase">{user.displayName || 'Authorized User'}</span>
                          <span className="text-[8px] text-zinc-500 font-mono tracking-tighter">{user.email}</span>
                       </div>
                    </div>
                    <button 
                      onClick={logout}
                      className="text-[9px] font-black text-red-500 uppercase border border-red-500/30 px-2 py-1 rounded"
                    >
                      Logout
                    </button>
                 </div>
               ) : (
                 <button 
                   onClick={signIn}
                   className="flex items-center justify-center gap-2 bg-emerald-500 text-black py-3 rounded font-black text-[10px] uppercase tracking-[0.2em]"
                 >
                   <LogIn className="w-4 h-4" /> Initialize Account
                 </button>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

