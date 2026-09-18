import React from 'react';
import { Home, Wallet, ShoppingBag, BarChart3, MoreHorizontal, Plus } from 'lucide-react';
import { sound } from '../services/soundEngine';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenQuickAdd: () => void;
  t: (key: string) => string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickAdd,
  t
}) => {
  const tabs = [
    { id: 'home', label: t('dashboard'), icon: Home },
    { id: 'money', label: t('money'), icon: Wallet },
    { id: 'household', label: t('household'), icon: ShoppingBag },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'more', label: t('more'), icon: MoreHorizontal }
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="add-tx-btn"
        onClick={() => {
          sound.play('button');
          onOpenQuickAdd();
        }}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 border-2 border-white/20"
        title={t('quickAdd')}
        aria-label="Universal Quick Add"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 py-1.5 px-3">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.play('tab');
                  onTabChange(tab.id);
                }}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-sky-400 font-semibold scale-105'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-blue-50 dark:bg-sky-500/10' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] leading-tight truncate w-full text-center mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
