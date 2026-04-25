import type { JSX } from 'preact';
import type { AppState } from '../types';

interface StatusBarProps {
  isValid: boolean;
  errorCount: number;
  saveStatus: AppState['saveStatus'];
  supportsFS: boolean;
  isModified: boolean;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onReset: () => void;
}

const btnBase = 'px-3 py-1.5 rounded text-xs font-medium transition-colors select-none';

export function StatusBar({
  isValid, errorCount, supportsFS, isModified, onOpen, onSave, onSaveAs, onReset,
}: StatusBarProps): JSX.Element {
  return (
    <footer class="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-900 shrink-0 gap-4">
      <div class="flex items-center gap-2">
        {isValid ? (
          <span class="flex items-center gap-1.5 text-xs font-medium text-green-500">
            <span>✓</span> Valid
          </span>
        ) : (
          <span class="flex items-center gap-1.5 text-xs font-medium text-red-400">
            <span>✗</span> {errorCount} {errorCount === 1 ? 'error' : 'errors'}
          </span>
        )}
        {!supportsFS && (
          <span class="text-xs text-zinc-500 ml-2 border border-zinc-700 rounded px-2 py-0.5">
            Firefox: save = download
          </span>
        )}
      </div>

      <div class="flex items-center gap-2">
        <button
          onClick={onReset}
          disabled={!isModified}
          class={`${btnBase} ${
            isModified
              ? 'bg-zinc-700 text-zinc-400 hover:bg-red-900 hover:text-red-300'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          Reset
        </button>
        <button
          onClick={onOpen}
          class={`${btnBase} bg-zinc-700 text-zinc-200 hover:bg-zinc-600`}
        >
          Open
        </button>
        <button
          onClick={onSave}
          disabled={!isValid}
          class={`${btnBase} ${
            isValid
              ? 'bg-amber-600 text-zinc-950 hover:bg-amber-500'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          Save
        </button>
        <button
          onClick={onSaveAs}
          disabled={!isValid}
          class={`${btnBase} ${
            isValid
              ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          Save As
        </button>
      </div>
    </footer>
  );
}
