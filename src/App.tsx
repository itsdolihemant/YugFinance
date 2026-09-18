import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DatabaseSchema } from './types/finance';
import {
  loadDatabase,
  saveDatabase,
  processRecurringTransactions,
  defaultDatabase
} from './services/storage';
import { calculateFinancialSummary } from './services/calculations';
import { getTranslation } from './services/localization';
import { sound } from './services/soundEngine';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PasscodeScreen } from './components/PasscodeScreen';
import { BottomNav } from './components/BottomNav';
import { UniversalQuickAddModal, QuickAddType } from './components/UniversalQuickAddModal';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { MoneyModule } from './components/money/MoneyModule';
import { HouseholdModule } from './components/household/HouseholdModule';
import { InventoryModule } from './components/inventory/InventoryModule';
import { GoalsModule } from './components/goals/GoalsModule';
import { BudgetModule } from './components/budget/BudgetModule';
import { RecurringModule } from './components/recurring/RecurringModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { InfoModal } from './components/modals/InfoModal';

export default function App() {
  // 1. Database State
  const [db, setDb] = useState<DatabaseSchema>(() => {
    const loaded = loadDatabase();
    // Auto-process any due recurring transactions
    return processRecurringTransactions(loaded);
  });

  // 2. Authentication / Passcode State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !db.settings.passcode);

  // 3. UI States
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [infoModalType, setInfoModalType] = useState<'about' | 'privacy' | 'disclaimer' | 'terms' | null>(null);

  // Save database changes
  const handleUpdateDb = useCallback((updated: DatabaseSchema) => {
    setDb(updated);
    saveDatabase(updated);
  }, []);

  // Sync theme to root HTML
  useEffect(() => {
    const root = document.documentElement;
    if (db.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [db.settings.theme]);

  // Sync sound engine
  useEffect(() => {
    sound.setEnabled(db.settings.soundEnabled);
    sound.setVolume(db.settings.soundVolume ?? db.settings.volume ?? 0.5);
  }, [db.settings.soundEnabled, db.settings.soundVolume, db.settings.volume]);

  // Translation helper
  const t = useCallback(
    (key: string) => {
      return getTranslation(db.settings.language, key);
    },
    [db.settings.language]
  );

  // Financial summary recalculation
  const summary = useMemo(() => {
    return calculateFinancialSummary(db);
  }, [db]);

  // Reset database completely
  const handleResetData = useCallback(() => {
    const fresh = defaultDatabase();
    setDb(fresh);
    saveDatabase(fresh);
    setIsUnlocked(true);
    sound.play('delete');
  }, []);

  // Quick Add action handler
  const handleSelectQuickAddAction = (action: QuickAddType) => {
    if (action === 'income' || action === 'expense' || action === 'transfer' || action === 'lend' || action === 'borrow' || action === 'investment') {
      setActiveTab('money');
    } else if (action === 'grocery' || action === 'milk' || action === 'water') {
      setActiveTab('household');
    } else if (action === 'goal') {
      setActiveTab('goals');
    }
  };

  // If locked, render passcode screen
  if (!isUnlocked && db.settings.passcode) {
    return (
      <PasscodeScreen
        correctPasscode={db.settings.passcode}
        securityQuestion={db.settings.securityQuestion}
        securityAnswer={db.settings.securityAnswer}
        onUnlocked={() => setIsUnlocked(true)}
        onClearPasscode={() => {
          const updated = {
            ...db,
            settings: {
              ...db.settings,
              passcode: null
            }
          };
          handleUpdateDb(updated);
          setIsUnlocked(true);
        }}
        t={t}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* App Header */}
      <Header
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        isBalanceHidden={isBalanceHidden}
        onToggleBalanceVisibility={() => setIsBalanceHidden(!isBalanceHidden)}
        language={db.settings.language}
        onToggleLanguage={() => {
          const nextLang = db.settings.language === 'hi' ? 'en' : 'hi';
          handleUpdateDb({ ...db, settings: { ...db.settings, language: nextLang } });
        }}
        theme={db.settings.theme}
        onToggleTheme={() => {
          const nextTheme = db.settings.theme === 'dark' ? 'light' : 'dark';
          handleUpdateDb({ ...db, settings: { ...db.settings, theme: nextTheme } });
        }}
        t={t}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 pb-24 sm:pb-28">
        {/* Home Dashboard */}
        {activeTab === 'home' && (
          <HomeDashboard
            db={db}
            summary={summary}
            isBalanceHidden={isBalanceHidden}
            onOpenQuickAddAction={handleSelectQuickAddAction}
            onNavigate={(sec) => {
              sound.play('tab');
              setActiveTab(sec);
            }}
            t={t}
          />
        )}

        {/* Money Module */}
        {activeTab === 'money' && (
          <MoneyModule
            db={db}
            summary={summary}
            isBalanceHidden={isBalanceHidden}
            onUpdateDb={handleUpdateDb}
            t={t}
          />
        )}

        {/* Household Module */}
        {activeTab === 'household' && (
          <HouseholdModule
            db={db}
            isBalanceHidden={isBalanceHidden}
            onUpdateDb={handleUpdateDb}
            t={t}
          />
        )}

        {/* Inventory Module */}
        {activeTab === 'inventory' && (
          <InventoryModule db={db} onUpdateDb={handleUpdateDb} t={t} />
        )}

        {/* Goals Module */}
        {activeTab === 'goals' && (
          <GoalsModule
            db={db}
            summary={summary}
            isBalanceHidden={isBalanceHidden}
            onUpdateDb={handleUpdateDb}
            t={t}
          />
        )}

        {/* Budget Module */}
        {activeTab === 'budget' && (
          <BudgetModule
            db={db}
            isBalanceHidden={isBalanceHidden}
            onUpdateDb={handleUpdateDb}
            t={t}
          />
        )}

        {/* Recurring Module */}
        {activeTab === 'recurring' && (
          <RecurringModule
            db={db}
            isBalanceHidden={isBalanceHidden}
            onUpdateDb={handleUpdateDb}
            t={t}
          />
        )}

        {/* Reports Module */}
        {activeTab === 'reports' && (
          <ReportsModule
            db={db}
            summary={summary}
            isBalanceHidden={isBalanceHidden}
            t={t}
          />
        )}

        {/* Settings Module */}
        {activeTab === 'settings' && (
          <SettingsModule
            db={db}
            onUpdateDb={handleUpdateDb}
            onResetData={handleResetData}
            t={t}
          />
        )}

        {/* More Options Tab (Hub for Inventory, Goals, Budget, Recurring, Settings) */}
        {activeTab === 'more' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="glass-card p-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('more')} Modules & Tools
              </h3>
              <p className="text-xs text-slate-400">
                Access household inventory, milestones, budgets, and application settings
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'inventory', title: t('inventory'), desc: 'Pantry items, storage & low stock warnings', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { id: 'goals', title: t('goals'), desc: 'Net worth & asset target milestone tracking', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { id: 'budget', title: t('budget'), desc: 'Monthly category spending limits & alerts', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { id: 'recurring', title: t('recurring'), desc: 'Scheduled bills, salary & subscription automation', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { id: 'settings', title: t('settings'), desc: 'Theme, audio synthesizer, PIN lock & JSON backups', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    sound.play('tab');
                    setActiveTab(item.id);
                  }}
                  className="glass-card p-4 flex items-center justify-between text-left hover:border-blue-500/40 transition-all active:scale-[0.99] group"
                >
                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold ${item.color} group-hover:translate-x-0.5 transition-transform`}>
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                  <span className="text-slate-400 font-bold group-hover:text-blue-500">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          sound.play('tab');
          setActiveTab(tab);
        }}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        t={t}
      />

      {/* Sidebar Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeNav={activeTab}
        onNavigate={(sec) => {
          setActiveTab(sec);
          setIsSidebarOpen(false);
        }}
        onOpenInfo={(infoType) => setInfoModalType(infoType)}
        t={t}
      />

      {/* Universal Quick Add Modal */}
      <UniversalQuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSelectAction={handleSelectQuickAddAction}
        t={t}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        db={db}
        onNavigate={(sec) => {
          sound.play('tab');
          setActiveTab(sec);
        }}
        t={t}
      />

      {/* Info Modals (About, Privacy, Disclaimer, Terms) */}
      <InfoModal
        infoType={infoModalType}
        onClose={() => setInfoModalType(null)}
        t={t}
      />
    </div>
  );
}
