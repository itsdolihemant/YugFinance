import React from 'react';
import { Menu, Eye, EyeOff, Globe, Sun, Moon, Search, Sparkles } from 'lucide-react';
import { sound } from '../services/soundEngine';

interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
  isBalanceHidden: boolean;
  onToggleBalanceVisibility: () => void;
  language: 'hi' | 'en';
  onToggleLanguage: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  t: (key: string) => string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  onOpenSearch,
  isBalanceHidden,
  onToggleBalanceVisibility,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  t
}) => {
  return (
    <header className="sticky top-0 z-30 px-4 py-3 glass-panel border-b transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-2.5">
          <button
            id="menu-toggle-btn"
            onClick={() => {
              sound.play('button');
              onOpenSidebar();
            }}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-all active:scale-95"
            title="Menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                {t('appName')}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none hidden sm:block">
                100% Offline • LocalStorage
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Global Search */}
          <button
            id="header-search-btn"
            onClick={() => {
              sound.play('button');
              onOpenSearch();
            }}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            title={t('search')}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Privacy Toggle (Hide/Show Balances) */}
          <button
            id="header-balance-toggle-btn"
            onClick={() => {
              sound.play('button');
              onToggleBalanceVisibility();
            }}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            title={isBalanceHidden ? 'Show Balances' : 'Hide Balances'}
          >
            {isBalanceHidden ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
          </button>

          {/* Language Toggle */}
          <button
            id="lang-toggle-btn"
            onClick={() => {
              sound.play('button');
              onToggleLanguage();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all active:scale-95"
            title="Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'EN' : 'HI'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={() => {
              sound.play('button');
              onToggleTheme();
            }}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
