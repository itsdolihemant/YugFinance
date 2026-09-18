import React, { useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Globe,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  KeyRound,
  Download,
  Upload,
  Copy,
  Check,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
  FileCode
} from 'lucide-react';
import { DatabaseSchema, SoundType } from '../../types/finance';
import { sound } from '../../services/soundEngine';
import { exportToJsonFile, parseAndValidateBackup, defaultDatabase } from '../../services/storage';

interface SettingsModuleProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  onResetData: () => void;
  t: (key: string) => string;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  db,
  onUpdateDb,
  onResetData,
  t
}) => {
  // Theme & Language
  const isDark = db.settings.theme === 'dark';
  const isHindi = db.settings.language === 'hi';

  // Raw JSON state
  const [rawJson, setRawJson] = useState<string>(() => JSON.stringify(db, null, 2));
  const [jsonCopySuccess, setJsonCopySuccess] = useState<boolean>(false);
  const [jsonError, setJsonError] = useState<string>('');

  // Passcode setup state
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [securityQuestion, setSecurityQuestion] = useState<string>(db.settings.securityQuestion || 'pet');
  const [securityAnswer, setSecurityAnswer] = useState<string>(db.settings.securityAnswer || '');
  const [pinMessage, setPinMessage] = useState<string>('');

  // Sounds test buttons
  const soundTypes: SoundType[] = ['button', 'save', 'delete', 'tab', 'success', 'error', 'pin'];

  const handleToggleTheme = () => {
    sound.play('button');
    const newTheme = isDark ? 'light' : 'dark';
    const newDb = { ...db, settings: { ...db.settings, theme: newTheme as 'light' | 'dark' } };
    onUpdateDb(newDb);
  };

  const handleToggleLanguage = () => {
    sound.play('button');
    const newLang = isHindi ? 'en' : 'hi';
    const newDb = { ...db, settings: { ...db.settings, language: newLang as 'hi' | 'en' } };
    onUpdateDb(newDb);
  };

  const handleToggleSound = () => {
    const newSoundVal = !db.settings.soundEnabled;
    sound.setEnabled(newSoundVal);
    if (newSoundVal) sound.play('button');
    const newDb = { ...db, settings: { ...db.settings, soundEnabled: newSoundVal } };
    onUpdateDb(newDb);
  };

  const handleVolumeChange = (newVol: number) => {
    sound.setVolume(newVol);
    const newDb = { ...db, settings: { ...db.settings, volume: newVol, soundVolume: newVol } };
    onUpdateDb(newDb);
  };

  const handleModuleToggle = (moduleKey: keyof DatabaseSchema['settings']['modules']) => {
    sound.play('button');
    const newDb = {
      ...db,
      settings: {
        ...db.settings,
        modules: {
          ...db.settings.modules,
          [moduleKey]: !db.settings.modules[moduleKey]
        }
      }
    };
    onUpdateDb(newDb);
  };

  const handleSetPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMessage('PIN must be exactly 4 digits!');
      sound.play('error');
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage('PINs do not match!');
      sound.play('error');
      return;
    }
    if (!securityAnswer.trim()) {
      setPinMessage('Please enter a security answer for offline recovery!');
      sound.play('error');
      return;
    }

    sound.play('success');
    const newDb = {
      ...db,
      settings: {
        ...db.settings,
        passcode: newPin,
        securityQuestion,
        securityAnswer: securityAnswer.trim()
      }
    };
    onUpdateDb(newDb);
    setNewPin('');
    setConfirmPin('');
    setPinMessage('Passcode successfully set!');
  };

  const handleRemovePasscode = () => {
    if (!window.confirm('Remove passcode lock? Anyone opening this browser can view your finances.')) return;
    sound.play('delete');
    const newDb = {
      ...db,
      settings: {
        ...db.settings,
        passcode: null
      }
    };
    onUpdateDb(newDb);
    setPinMessage('Passcode removed.');
  };

  // Raw JSON Handlers
  const handleCopyJson = () => {
    sound.play('button');
    navigator.clipboard.writeText(rawJson);
    setJsonCopySuccess(true);
    setTimeout(() => setJsonCopySuccess(false), 2000);
  };

  const handleApplyJson = () => {
    sound.play('button');
    const parsed = parseAndValidateBackup(rawJson);
    if (!parsed) {
      sound.play('error');
      setJsonError('Invalid JSON structure! Please check the syntax.');
      return;
    }
    sound.play('success');
    setJsonError('');
    onUpdateDb(parsed);
    alert('JSON data successfully updated and saved!');
  };

  const handleExportFile = () => {
    sound.play('button');
    exportToJsonFile(db);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseAndValidateBackup(text);
        if (parsed) {
          sound.play('success');
          onUpdateDb(parsed);
          setRawJson(JSON.stringify(parsed, null, 2));
          alert('Backup restored successfully!');
        } else {
          sound.play('error');
          alert('Failed to restore: Invalid JSON structure or incompatible version.');
        }
      } catch (err) {
        sound.play('error');
        alert('File reading failed.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="page-settings" className="space-y-5 animate-in fade-in duration-300">
      <div className="glass-card p-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          <span>{t('settings')}</span>
        </h3>
        <p className="text-xs text-slate-400">
          Preferences, audio synthesizer, PIN security, and offline JSON backups
        </p>
      </div>

      {/* 1. Appearance & Language */}
      <div className="glass-card p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Appearance & Language
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center gap-2.5">
              {isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('theme')}</p>
                <p className="text-xs text-slate-400">{isDark ? t('darkMode') : t('lightMode')}</p>
              </div>
            </div>
            <button
              onClick={handleToggleTheme}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              Toggle
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('language')}</p>
                <p className="text-xs text-slate-400">{isHindi ? 'Hindi (हिंदी)' : 'English'}</p>
              </div>
            </div>
            <button
              onClick={handleToggleLanguage}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              Switch to {isHindi ? 'English' : 'हिंदी'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Web Audio Synthesizer */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sound Effects (Web Audio API)
            </h4>
            <p className="text-xs text-slate-400">100% offline, zero audio file dependencies</p>
          </div>
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl transition-all ${
              db.settings.soundEnabled
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
            }`}
          >
            {db.settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {db.settings.soundEnabled && (
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Volume</span>
                <span>{Math.round((db.settings.soundVolume ?? db.settings.volume ?? 0.5) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={db.settings.soundVolume ?? db.settings.volume ?? 0.5}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1.5">Interactive Sound Test</span>
              <div className="flex flex-wrap gap-1.5">
                {soundTypes.map((st) => (
                  <button
                    key={st}
                    onClick={() => sound.play(st)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 capitalize flex items-center gap-1 active:scale-95"
                  >
                    <Play className="w-3 h-3" />
                    <span>{st}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Passcode PIN Security */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {db.settings.passcode ? (
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Lock className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Unlock className="w-5 h-5" />
              </div>
            )}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('passcode')}
              </h4>
              <p className="text-xs text-slate-400">
                {db.settings.passcode ? 'PIN Protection Active' : 'No PIN configured'}
              </p>
            </div>
          </div>

          {db.settings.passcode && (
            <button
              onClick={handleRemovePasscode}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold"
            >
              Remove PIN
            </button>
          )}
        </div>

        {pinMessage && (
          <p className="text-xs font-medium text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl">
            {pinMessage}
          </p>
        )}

        {/* Set / Change PIN Form */}
        <form onSubmit={handleSetPasscode} className="space-y-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
            {db.settings.passcode ? 'Change 4-Digit PIN' : 'Set New 4-Digit PIN'}
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">New 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center text-base"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Confirm PIN</label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Offline Recovery Question</label>
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="pet">What is your first pet's name?</option>
                <option value="birthplace">What is your mother's birthplace?</option>
                <option value="teacher">What is your favorite teacher's name?</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Recovery Answer</label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Answer for PIN recovery"
                required
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
          >
            Save PIN
          </button>
        </form>
      </div>

      {/* 4. Modules Toggle */}
      <div className="glass-card p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Module Visibility & Features
        </h4>
        <p className="text-xs text-slate-400 mb-2">Enable or disable optional modules as per your workflow</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(db.settings.modules).map(([modKey, isEnabled]) => (
            <button
              key={modKey}
              onClick={() => handleModuleToggle(modKey as any)}
              className={`p-2.5 rounded-xl border font-semibold flex items-center justify-between transition-all ${
                isEnabled
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
            >
              <span className="capitalize">{modKey}</span>
              <span>{isEnabled ? 'ON' : 'OFF'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. JSON Backup & Restore */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('backupRestore')}
            </h4>
            <p className="text-xs text-slate-400">
              Export or import your full database as offline JSON
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFile}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON File</span>
            </button>

            <label className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON File</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Raw JSON Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              Raw LocalStorage JSON
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
              >
                {jsonCopySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{jsonCopySuccess ? 'Copied!' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={handleApplyJson}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
              >
                Save & Apply JSON
              </button>
            </div>
          </div>

          {jsonError && (
            <p className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/30 p-2 rounded-xl">
              {jsonError}
            </p>
          )}

          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            rows={8}
            className="w-full p-3 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs border border-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 6. Danger Zone */}
      <div className="glass-card p-5 border border-rose-500/30 bg-rose-500/5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('dangerZone')}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanently wipe all offline transactions, accounts, and data
            </p>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Are you ABSOLUTELY sure? This will delete all your local financial records permanently!')) {
                if (window.confirm('Final warning: Did you take a JSON backup? Click OK to reset.')) {
                  onResetData();
                }
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
          >
            {t('clearAllData')}
          </button>
        </div>
      </div>
    </div>
  );
};
