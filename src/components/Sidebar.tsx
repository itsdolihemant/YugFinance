import React from 'react';
import {
  X,
  Home,
  Wallet,
  ShoppingBag,
  Package,
  Target,
  PieChart,
  Repeat,
  BarChart3,
  Settings,
  Info,
  ShieldCheck,
  AlertCircle,
  FileText,
  Mail,
  Heart
} from 'lucide-react';
import { sound } from '../services/soundEngine';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeNav: string;
  onNavigate: (section: string) => void;
  onOpenInfo: (infoType: 'about' | 'privacy' | 'disclaimer' | 'terms') => void;
  t: (key: string) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeNav,
  onNavigate,
  onOpenInfo,
  t
}) => {
  if (!isOpen) return null;

  const handleNavClick = (section: string) => {
    sound.play('tab');
    onNavigate(section);
    onClose();
  };

  const handleInfoClick = (type: 'about' | 'privacy' | 'disclaimer' | 'terms') => {
    sound.play('button');
    onOpenInfo(type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        id="side-menu-overlay"
        onClick={() => {
          sound.play('button');
          onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <aside
        id="side-menu"
        className="relative w-72 max-w-[85vw] h-full glass-panel bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-blue-600 dark:text-sky-400">
              {t('appName')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">v2.0 • Offline Manager</p>
          </div>
          <button
            id="close-menu-btn"
            onClick={() => {
              sound.play('button');
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'home'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{t('dashboard')}</span>
          </button>

          <button
            onClick={() => handleNavClick('money')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'money'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{t('money')}</span>
          </button>

          <button
            onClick={() => handleNavClick('household')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'household'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('household')}</span>
          </button>

          <button
            onClick={() => handleNavClick('inventory')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'inventory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{t('inventory')}</span>
          </button>

          <button
            onClick={() => handleNavClick('goals')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'goals'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>{t('goals')}</span>
          </button>

          <button
            onClick={() => handleNavClick('budget')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'budget'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>{t('budget')}</span>
          </button>

          <button
            onClick={() => handleNavClick('recurring')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'recurring'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>{t('recurring')}</span>
          </button>

          <button
            onClick={() => handleNavClick('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'reports'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('reports')}</span>
          </button>

          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{t('settings')}</span>
          </button>

          <div className="pt-3 pb-1">
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />
          </div>

          <button
            onClick={() => handleInfoClick('about')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Info className="w-4 h-4 text-blue-500" />
            <span>{t('aboutUs')}</span>
          </button>

          <button
            onClick={() => handleInfoClick('privacy')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{t('privacyPolicy')}</span>
          </button>

          <button
            onClick={() => handleInfoClick('disclaimer')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>{t('disclaimer')}</span>
          </button>

          <button
            onClick={() => handleInfoClick('terms')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FileText className="w-4 h-4 text-purple-500" />
            <span>{t('termsOfUse')}</span>
          </button>

          <a
            href="mailto:itsdolihemant@gmail.com"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Mail className="w-4 h-4 text-rose-500" />
            <span>{t('contactSupport')}</span>
          </a>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
          <p className="flex items-center justify-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 inline fill-red-500" /> in India
          </p>
          <p className="text-[10px] mt-0.5">100% Offline • Private & Secure</p>
        </div>
      </aside>
    </div>
  );
};
