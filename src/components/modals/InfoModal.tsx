import React from 'react';
import { X, ShieldCheck, Info, AlertCircle, FileText, Heart } from 'lucide-react';
import { sound } from '../../services/soundEngine';

interface InfoModalProps {
  infoType: 'about' | 'privacy' | 'disclaimer' | 'terms' | null;
  onClose: () => void;
  t: (key: string) => string;
}

export const InfoModal: React.FC<InfoModalProps> = ({ infoType, onClose, t }) => {
  if (!infoType) return null;

  const renderContent = () => {
    switch (infoType) {
      case 'about':
        return (
          <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                YF
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Yug Finance Manager 2.0
                </h4>
                <p className="text-xs text-slate-500">
                  Offline-First Personal Finance & Household Operating System
                </p>
              </div>
            </div>

            <p>
              <strong>Yug Finance Manager 2.0</strong> is engineered for privacy, speed, and autonomy.
              It is designed to give you 100% control over your personal cash flow, bank accounts,
              investments, loans, and household inventory without any third-party clouds or external servers.
            </p>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white">Core Architectural Pillars:</h5>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>100% Offline:</strong> No APIs, no remote telemetry, no external databases.</li>
                <li><strong>Local Storage:</strong> All financial entries stay strictly inside your browser.</li>
                <li><strong>Glass Prism UI:</strong> Modern light/dark fintech interface with Web Audio synthesizer feedback.</li>
                <li><strong>Zero Double Counting:</strong> Centralized balance and net worth calculation engine.</li>
              </ul>
            </div>

            <p className="pt-2 text-center text-xs text-slate-400">
              Made with <Heart className="w-3 h-3 text-red-500 inline fill-red-500" /> for complete personal financial privacy.
            </p>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Your privacy is absolute. No data leaves your machine.</span>
            </div>

            <p>
              <strong>1. Data Storage:</strong> All transactions, bank balances, household logs, and security PINs are saved exclusively in your browser's local storage (LocalStorage).
            </p>
            <p>
              <strong>2. No Cloud or Servers:</strong> There are no servers, cloud functions, tracking scripts, or analytics beacons.
            </p>
            <p>
              <strong>3. Backups:</strong> You can export an unencrypted or secure JSON backup file anytime and save it safely to your physical computer or USB drive.
            </p>
            <p>
              <strong>4. Clearing Data:</strong> Clearing browser site data or cookies will remove local records unless exported via JSON backup.
            </p>
          </div>
        );

      case 'disclaimer':
        return (
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Financial Record-Keeping Notice</span>
            </div>

            <p>
              Yug Finance Manager is an offline personal budgeting tool intended solely for personal record-keeping, household budgeting, and informational tracking.
            </p>
            <p>
              It does not constitute financial, investment, legal, or tax advice. Market investment values entered manually do not automatically synchronize with live stock exchanges.
            </p>
            <p>
              Always maintain independent periodic JSON backups of your records. The creator is not liable for data loss caused by hardware failure or browser cache deletion.
            </p>
          </div>
        );

      case 'terms':
        return (
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600 shrink-0" />
              <span>Terms of Use</span>
            </div>

            <p>
              By using Yug Finance Manager 2.0, you agree that you are using this client-side software on an "as-is" basis for your own personal, household financial tracking.
            </p>
            <p>
              Because this application does not communicate with external servers, password or PIN recovery is performed solely via your locally stored security question and answer.
            </p>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (infoType) {
      case 'about':
        return t('aboutUs');
      case 'privacy':
        return t('privacyPolicy');
      case 'disclaimer':
        return t('disclaimer');
      case 'terms':
        return t('termsOfUse');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={() => {
          sound.play('button');
          onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      <div className="relative w-full max-w-lg glass-card bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {getTitle()}
          </h3>
          <button
            onClick={() => {
              sound.play('button');
              onClose();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">{renderContent()}</div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 flex justify-end">
          <button
            onClick={() => {
              sound.play('button');
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
