import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import type { AppState, BaseFields, PatternAFields, Variant, Version } from './types';
import { createEmptyState, createEmptyVariant, createEmptyVersion, loadFromText } from './load';
import { buildJson } from './output';
import { useValidation } from './hooks/useValidation';
import { useFileSystem } from './hooks/useFileSystem';
import { useDragDrop } from './hooks/useDragDrop';
import { Header } from './components/Header';
import { ProfileFields } from './components/ProfileFields';
import { VariantsPanel } from './components/VariantsPanel';
import { VersionsPanel } from './components/VersionsPanel';
import { StatusBar } from './components/StatusBar';
import { Toast } from './components/Toast';
import { DropZone } from './components/DropZone';

export function App() {
  const [state, setState] = useState<AppState>(createEmptyState());
  const baselineRef = useRef<AppState>(createEmptyState());
  const validation = useValidation(state);
  const fs = useFileSystem();

  const patch = (partial: Partial<AppState>) =>
    setState(s => ({ ...s, ...partial, isModified: true }));

  // --- File operations ---

  const handleLoad = useCallback((text: string, fileName: string) => {
    try {
      const loaded: AppState = { ...loadFromText(text, fileName), isModified: false, saveStatus: 'idle', isDragOver: false };
      baselineRef.current = loaded;
      setState(loaded);
    } catch {
      setState(s => ({ ...s, saveStatus: 'error', saveError: 'Could not parse JSON file' }));
    }
  }, []);

  const handleDrop = useCallback((file: File) => {
    fs.clearHandle();
    file.text().then(text => handleLoad(text, file.name));
  }, [fs, handleLoad]);

  const isDragOver = useDragDrop(handleDrop);

  const handleOpen = async () => {
    const result = await fs.openFile();
    if (result) handleLoad(result.text, result.fileName);
  };

  const handleSave = async () => {
    if (!validation.isValid) return;
    setState(s => ({ ...s, saveStatus: 'saving' }));
    try {
      const json = buildJson(state);
      const name = await fs.saveFile(json);
      setState(s => ({ ...s, saveStatus: 'saved', isModified: false, loadedFileName: name ?? s.loadedFileName }));
    } catch (e) {
      setState(s => ({ ...s, saveStatus: 'error', saveError: String(e) }));
    }
  };

  const handleSaveAs = async () => {
    if (!validation.isValid) return;
    setState(s => ({ ...s, saveStatus: 'saving' }));
    try {
      const json = buildJson(state);
      const name = await fs.saveAs(json);
      if (name) setState(s => ({ ...s, saveStatus: 'saved', isModified: false, loadedFileName: name }));
      else setState(s => ({ ...s, saveStatus: 'idle' }));
    } catch (e) {
      setState(s => ({ ...s, saveStatus: 'error', saveError: String(e) }));
    }
  };

  const handleReset = useCallback(() => {
    if (!window.confirm('Discard all changes and revert to the original state?')) return;
    setState({ ...baselineRef.current, saveStatus: 'idle', isDragOver: false });
  }, []);

  // --- Keyboard shortcuts ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 's') { e.preventDefault(); e.shiftKey ? handleSaveAs() : handleSave(); }
      if (mod && e.key === 'o') { e.preventDefault(); handleOpen(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, validation.isValid]);

  // --- State handlers ---

  const handlePatternChange = (pattern: AppState['pattern']) =>
    patch({ pattern, activeVariantIndex: 0, activeVersionIndex: 0 });

  const handleBaseChange = (base: BaseFields) => patch({ base });
  const handlePatternAChange = (patternA: PatternAFields) => patch({ patternA });

  const handleVariantChange = (i: number, variant: Variant) => {
    const variants = [...state.variants];
    variants[i] = variant;
    patch({ variants });
  };

  const handleAddVariant = () => {
    const variants = [...state.variants, createEmptyVariant()];
    patch({ variants, activeVariantIndex: variants.length - 1 });
  };

  const handleDeleteVariant = () => {
    if (state.variants.length <= 1) return;
    const variants = state.variants.filter((_, i) => i !== state.activeVariantIndex);
    patch({ variants, activeVariantIndex: Math.min(state.activeVariantIndex, variants.length - 1) });
  };

  const handleVersionChange = (i: number, version: Version) => {
    const versions = [...state.versions];
    versions[i] = version;
    patch({ versions });
  };

  const handleAddVersion = () => {
    const versions = [...state.versions, createEmptyVersion()];
    patch({ versions, activeVersionIndex: versions.length - 1, activeVariantIndex: 0 });
  };

  const handleDeleteVersion = () => {
    if (state.versions.length <= 1) return;
    const versions = state.versions.filter((_, i) => i !== state.activeVersionIndex);
    patch({ versions, activeVersionIndex: Math.min(state.activeVersionIndex, versions.length - 1), activeVariantIndex: 0 });
  };

  return (
    <div class="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <DropZone visible={isDragOver} />
      <Toast status={state.saveStatus} error={state.saveError} />

      <Header
        pattern={state.pattern}
        onPatternChange={handlePatternChange}
        loadedFileName={state.loadedFileName}
        isModified={state.isModified}
      />

      <main class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        <ProfileFields
          base={state.base}
          patternA={state.patternA}
          pattern={state.pattern}
          errors={validation.errors}
          onChangeBase={handleBaseChange}
          onChangePatternA={handlePatternAChange}
        />

        {state.pattern === 'B' && (
          <VariantsPanel
            variants={state.variants}
            activeIndex={state.activeVariantIndex}
            prefix="variants"
            errors={validation.errors}
            onChangeIndex={(i) => patch({ activeVariantIndex: i })}
            onAdd={handleAddVariant}
            onDelete={handleDeleteVariant}
            onChangeVariant={handleVariantChange}
          />
        )}

        {state.pattern === 'C' && (
          <VersionsPanel
            versions={state.versions}
            activeVersionIndex={state.activeVersionIndex}
            activeVariantIndex={state.activeVariantIndex}
            errors={validation.errors}
            onChangeVersionIndex={(i) => patch({ activeVersionIndex: i, activeVariantIndex: 0 })}
            onAddVersion={handleAddVersion}
            onDeleteVersion={handleDeleteVersion}
            onChangeVersion={handleVersionChange}
            onChangeVariantIndex={(i) => patch({ activeVariantIndex: i })}
          />
        )}
      </main>

      <StatusBar
        isValid={validation.isValid}
        errorCount={validation.errorCount}
        saveStatus={state.saveStatus}
        supportsFS={fs.supportsFS}
        isModified={state.isModified}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onReset={handleReset}
      />
    </div>
  );
}
