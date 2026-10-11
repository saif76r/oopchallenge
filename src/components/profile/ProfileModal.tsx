import React, { useState, useEffect } from 'react';
import { UserProgress } from '../../types';
import { 
  X, User, RotateCcw, CheckCircle2, AlertCircle 
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
}

const AVATAR_OPTIONS = [
  { id: 'mage', name: 'Code Mage', icon: '🧙‍♂️', color: 'from-indigo-600 to-purple-600' },
  { id: 'knight', name: 'Cyber Knight', icon: '⚔️', color: 'from-amber-600 to-orange-600' },
  { id: 'rogue', name: 'Shadow Rogue', icon: '🗡️', color: 'from-emerald-600 to-teal-600' },
  { id: 'architect', name: 'OOP Architect', icon: '🛡️', color: 'from-cyan-600 to-blue-600' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  progress,
  onUpdateProgress,
}) => {
  const [name, setName] = useState<string>(progress.displayName || 'Arcane Scholar');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(progress.avatarId || 'mage');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setName(progress.displayName || 'Arcane Scholar');
      setSelectedAvatar(progress.avatarId || 'mage');
      setFeedbackMessage(null);
      setIsConfirmingReset(false);
    }
  }, [isOpen, progress.displayName, progress.avatarId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated = {
      ...progress,
      displayName: name.trim() || 'Arcane Scholar',
      avatarId: selectedAvatar,
    };
    onUpdateProgress(updated);
    setFeedbackMessage('Profile settings saved successfully!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleExecuteReset = () => {
    const defaultUnlocked = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const updated: UserProgress = {
      ...progress,
      currentXP: 0,
      level: 1,
      completedMissionIds: [],
      completedLevelIds: [],
      unlockedLevelIds: defaultUnlocked,
      achievements: [],
      campaignCheckpoint: {
        stage: 1,
        completedStages: [],
        dragonDefeated: false,
        bossHealthRemaining: 1500,
        savedCodeByStage: {},
      },
    };
    onUpdateProgress(updated);
    setIsConfirmingReset(false);
    setFeedbackMessage('Progress successfully reset to Level 1 initial state.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#090c16] border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-display font-bold text-white tracking-wide uppercase">
              Player Profile & Settings
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Feedback Banner */}
        {feedbackMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Display Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="Enter hero title..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Avatar Archetype Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Hero Class / Avatar</label>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_OPTIONS.map((av) => {
              const isSelected = selectedAvatar === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xl">{av.icon}</span>
                  <span className="text-[10px] text-slate-300 truncate w-full">{av.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg">
            <span className="text-slate-500 block text-[11px]">Current Rank</span>
            <span className="font-semibold text-white text-sm">Level {progress.level} Scholar</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg">
            <span className="text-slate-500 block text-[11px]">Total Experience</span>
            <span className="font-semibold text-indigo-400 text-sm font-mono">{progress.currentXP} XP</span>
          </div>
        </div>

        {/* Reset Progress Controls */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Reset Progress
          </span>

          {!isConfirmingReset ? (
            <button
              type="button"
              onClick={() => setIsConfirmingReset(true)}
              className="w-full py-2 bg-red-950/30 hover:bg-red-950/60 border border-red-900/50 text-red-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Progress to Level 1</span>
            </button>
          ) : (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-600/70 space-y-2">
              <div className="flex items-center gap-1.5 text-red-200 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>Reset all completed missions and XP?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer shadow-md shadow-indigo-950"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
