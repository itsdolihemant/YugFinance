import React, { useState } from 'react';
import { Lock, Delete, HelpCircle, KeyRound, ShieldAlert } from 'lucide-react';
import { sound } from '../services/soundEngine';

interface PasscodeScreenProps {
  correctPasscode: string;
  securityQuestion: string | null;
  securityAnswer: string | null;
  onUnlocked: () => void;
  onClearPasscode?: () => void;
  t: (key: string) => string;
}

export const PasscodeScreen: React.FC<PasscodeScreenProps> = ({
  correctPasscode,
  securityQuestion,
  securityAnswer,
  onUnlocked,
  onClearPasscode,
  t
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isForgotOpen, setIsForgotOpen] = useState<boolean>(false);
  const [recoverAnswerInput, setRecoverAnswerInput] = useState<string>('');
  const [recoveredPin, setRecoveredPin] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string>('');

  const handleDigit = (digit: string) => {
    if (enteredPin.length >= 4) return;
    sound.play('pin');
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setErrorMessage('');

    if (newPin.length === 4) {
      // Validate
      if (newPin === correctPasscode) {
        sound.play('success');
        onUnlocked();
      } else {
        sound.play('error');
        setErrorMessage(t('wrongPasscode') || 'Wrong passcode! Try again.');
        setTimeout(() => {
          setEnteredPin('');
          setErrorMessage('');
        }, 800);
      }
    }
  };

  const handleBackspace = () => {
    sound.play('button');
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer) {
      setRecoveryError(t('securityNotSet') || 'Security question is not set!');
      return;
    }

    if (recoverAnswerInput.trim().toLowerCase() === securityAnswer.trim().toLowerCase()) {
      sound.play('success');
      setRecoveredPin(correctPasscode);
      setRecoveryError('');
    } else {
      sound.play('error');
      setRecoveryError(t('wrongAnswer') || 'Wrong answer!');
    }
  };

  const getQuestionLabel = (qKey: string | null) => {
    if (!qKey) return '';
    const map: Record<string, string> = {
      pet: "What is your first pet's name?",
      birthplace: "What is your mother's birthplace?",
      teacher: "What is your favorite teacher's name?"
    };
    return map[qKey] || qKey;
  };

  return (
    <div
      id="passcode-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900/90 to-slate-950/95 backdrop-blur-xl text-white"
    >
      <div className="w-full max-w-xs text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/20">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold mb-1 tracking-tight">{t('enterPasscode')}</h2>
        <p className="text-sm text-slate-400 mb-6">{t('enterToUnlock')}</p>

        {/* Pin Dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < enteredPin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-blue-500 scale-110 shadow-md shadow-blue-500/50'
                    : 'bg-slate-700/60 border border-slate-600'
                }`}
              />
            );
          })}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <p className="text-rose-400 text-sm font-medium mb-3 animate-pulse flex items-center justify-center gap-1">
            <ShieldAlert className="w-4 h-4" />
            {errorMessage}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="passcode-btn h-14 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:scale-95 text-xl font-semibold border border-slate-700/50 shadow-md transition-all flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit('0')}
            className="passcode-btn h-14 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:scale-95 text-xl font-semibold border border-slate-700/50 shadow-md transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="passcode-btn h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-700/60 active:scale-95 text-slate-300 border border-slate-700/40 shadow-md transition-all flex items-center justify-center"
            aria-label="Backspace"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Forgot PIN button */}
        <button
          id="forgot-pin-btn"
          onClick={() => {
            sound.play('button');
            setIsForgotOpen(true);
            setRecoveryError('');
            setRecoveredPin(null);
            setRecoverAnswerInput('');
          }}
          className="mt-6 text-sm text-slate-400 hover:text-blue-400 flex items-center gap-1.5 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t('forgotPin')}</span>
        </button>
      </div>

      {/* Forgot PIN Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card bg-slate-900 border border-slate-700 p-5 rounded-2xl shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              {t('recoverPin')}
            </h3>

            {securityQuestion ? (
              <form onSubmit={handleRecover} className="space-y-3 mt-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t('securityQuestion')}</label>
                  <p className="text-sm font-medium text-slate-200 bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    {getQuestionLabel(securityQuestion)}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t('securityAnswer')}</label>
                  <input
                    type="text"
                    value={recoverAnswerInput}
                    onChange={(e) => setRecoverAnswerInput(e.target.value)}
                    placeholder="Enter security answer..."
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {recoveryError && <p className="text-xs text-rose-400 font-medium">{recoveryError}</p>}

                {recoveredPin && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                    <p className="text-xs text-emerald-300 mb-0.5">{t('pinIs') || 'Your PIN is:'}</p>
                    <p className="text-xl font-mono font-bold tracking-widest text-emerald-400">{recoveredPin}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700"
                  >
                    {t('close')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
                  >
                    {t('recover') || 'Verify'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-slate-400">
                  {t('securityNotSet') || 'No security question is configured.'}
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsForgotOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-200 hover:bg-slate-700"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            )}

            {onClearPasscode && (
              <div className="border-t border-slate-800 pt-3 mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    sound.play('delete');
                    onClearPasscode();
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                >
                  Reset Passcode & Unlock Offline
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
