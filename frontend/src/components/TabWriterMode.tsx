import { useState, useEffect } from 'react';
import { api, triggerDownload } from '../api';
import type { Draft, Episode, CanonFact, CanonCheckResult, User } from '../types';
import {
  PenTool,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Volume2,
  FileText,
  RefreshCw,
  Globe,
  Download
} from 'lucide-react';
import { VoiceNarratorButton } from './VoiceNarratorButton';
import { TTS_ENABLED } from '../featureFlags';

interface TabWriterModeProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  preloadedDraft?: { title: string; genre: string; content: string; imageUrl?: string; imagePrompt?: string } | null;
  onNavigateTab?: (tab: 'wizard' | 'branching' | 'writer' | 'books') => void;
}

export function TabWriterMode({ currentUser, onOpenAuth, preloadedDraft }: TabWriterModeProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState<number>(0);
  const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);

  // Active editor fields
  const [activeTitle, setActiveTitle] = useState('');
  const [activeGenre, setActiveGenre] = useState('Sci-fi');
  const [activeBlurb, setActiveBlurb] = useState('');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [canonFacts, setCanonFacts] = useState<CanonFact[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<Array<{ character: string; style: string }>>([]);
  const [publishedBookId, setPublishedBookId] = useState<string | null | undefined>(null);

  // Canon Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<CanonCheckResult | null>(null);
  const [hasFreshCheck, setHasFreshCheck] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // AI Draft Modal State
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  // Confirm delete states (requires second click)
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState(false);
  const [confirmDeleteEpisode, setConfirmDeleteEpisode] = useState(false);

  // Load user drafts on auth
  useEffect(() => {
    if (currentUser) {
      loadDrafts();
    }
  }, [currentUser]);

  // Handle preloaded draft from Tab 1
  useEffect(() => {
    if (currentUser && preloadedDraft && preloadedDraft.title) {
      handleCreatePreloadedDraft(preloadedDraft);
    }
  }, [preloadedDraft, currentUser]);

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const data = await api.getDrafts();
      setDrafts(data);
      if (data.length > 0 && !selectedDraftId) {
        selectDraft(data[0]);
      }
    } catch (err) {
      console.error('Failed to load drafts:', err);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const selectDraft = (d: Draft) => {
    setSelectedDraftId(d.id);
    setActiveTitle(d.title);
    setActiveGenre(d.genre);
    setActiveBlurb(d.blurb || '');
    setEpisodes(d.episodes || []);
    setCanonFacts(d.canonFacts || []);
    setVoiceNotes(d.voiceNotes || []);
    setPublishedBookId(d.publishedBookId);
    setSelectedEpisodeIndex(0);
    setAuditResult(null);
    setHasFreshCheck(false);
    setSaveNotice(null);
    setConfirmDeleteDraft(false);
    setConfirmDeleteEpisode(false);
  };

  const handleCreatePreloadedDraft = async (preload: { title: string; genre: string; content: string; imageUrl?: string; imagePrompt?: string }) => {
    try {
      const newDraft = await api.createDraft({
        title: preload.title,
        genre: preload.genre,
        blurb: preload.content.slice(0, 160) + '...',
        episodes: [
          {
            id: `ep-${Date.now()}`,
            order: 1,
            title: 'Episode 1: The Inciting Incident',
            content: preload.content,
            imageUrl: preload.imageUrl,
            imagePrompt: preload.imagePrompt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        canonFacts: [],
        voiceNotes: []
      });
      setDrafts(prev => [newDraft, ...prev]);
      selectDraft(newDraft);
    } catch (err) {
      console.error('Failed to create preloaded draft:', err);
    }
  };

  const handleNewDraft = async () => {
    try {
      const newDraft = await api.createDraft({
        title: 'Untitled Saga',
        genre: 'Sci-fi',
        blurb: '',
        episodes: [
          {
            id: `ep-${Date.now()}`,
            order: 1,
            title: 'Episode 1: Opening Beat',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        canonFacts: [],
        voiceNotes: []
      });
      setDrafts(prev => [newDraft, ...prev]);
      selectDraft(newDraft);
    } catch (err) {
      console.error('Failed to create draft:', err);
    }
  };

  const currentEpisode = episodes[selectedEpisodeIndex] || {
    id: 'temp',
    order: 1,
    title: 'Episode 1',
    content: ''
  };

  const handleEpisodeContentChange = (val: string) => {
    const updated = [...episodes];
    if (updated[selectedEpisodeIndex]) {
      updated[selectedEpisodeIndex] = {
        ...updated[selectedEpisodeIndex],
        content: val,
        updatedAt: new Date().toISOString()
      };
      setEpisodes(updated);
      setHasFreshCheck(false); // Text changed, invalidate fresh check
    }
  };

  const handleEpisodeTitleChange = (val: string) => {
    const updated = [...episodes];
    if (updated[selectedEpisodeIndex]) {
      updated[selectedEpisodeIndex] = {
        ...updated[selectedEpisodeIndex],
        title: val,
        updatedAt: new Date().toISOString()
      };
      setEpisodes(updated);
    }
  };

  const handleAddEpisode = () => {
    const nextOrder = episodes.length + 1;
    const newEp: Episode = {
      id: `ep-${Date.now()}`,
      order: nextOrder,
      title: `Episode ${nextOrder}: New Chapter`,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...episodes, newEp];
    setEpisodes(updated);
    setSelectedEpisodeIndex(updated.length - 1);
    setAuditResult(null);
    setHasFreshCheck(false);
  };

  // Delete Episode (Requires 2nd confirm click)
  const handleDeleteEpisode = () => {
    if (!confirmDeleteEpisode) {
      setConfirmDeleteEpisode(true);
      return;
    }
    if (episodes.length <= 1) {
      return; // Keep at least one episode
    }
    const updated = episodes.filter((_, idx) => idx !== selectedEpisodeIndex);
    const reordered = updated.map((ep, i) => ({ ...ep, order: i + 1 }));
    setEpisodes(reordered);
    setSelectedEpisodeIndex(Math.max(0, selectedEpisodeIndex - 1));
    setConfirmDeleteEpisode(false);
    setAuditResult(null);
  };

  // Delete Story Draft (Requires 2nd confirm click)
  const handleDeleteDraft = async () => {
    if (!selectedDraftId) return;
    if (!confirmDeleteDraft) {
      setConfirmDeleteDraft(true);
      return;
    }

    try {
      await api.deleteDraft(selectedDraftId);
      const remaining = drafts.filter(d => d.id !== selectedDraftId);
      setDrafts(remaining);
      if (remaining.length > 0) {
        selectDraft(remaining[0]);
      } else {
        setSelectedDraftId(null);
      }
    } catch (err) {
      console.error('Failed to delete draft:', err);
    } finally {
      setConfirmDeleteDraft(false);
    }
  };

  // Canon Audit ("Check against canon")
  const handleCheckCanon = async () => {
    if (!selectedDraftId || !currentEpisode.content.trim()) return;
    setIsAuditing(true);
    setSaveNotice(null);

    try {
      const result = await api.checkCanon(
        selectedDraftId,
        selectedEpisodeIndex,
        currentEpisode.title,
        currentEpisode.content
      );
      setAuditResult(result);
      setHasFreshCheck(true);
    } catch (err: any) {
      console.error('Canon audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Save Episode
  const handleSaveDraft = async () => {
    if (!selectedDraftId) return;
    setSavingDraft(true);
    setSaveNotice(null);

    try {
      let updatedFacts = [...canonFacts];
      let updatedVoiceNotes = [...voiceNotes];

      if (hasFreshCheck && auditResult) {
        // Add new facts from fresh check
        const newFacts = auditResult.facts;
        // Replace facts for current episode number
        const currentEpNum = selectedEpisodeIndex + 1;
        const remainingFacts = updatedFacts.filter(f => f.episodeNumber !== currentEpNum);
        updatedFacts = [...remainingFacts, ...newFacts];

        // Merge voice notes
        if (auditResult.voiceNotes) {
          auditResult.voiceNotes.forEach(vn => {
            const idx = updatedVoiceNotes.findIndex(v => v.character.toLowerCase() === vn.character.toLowerCase());
            if (idx >= 0) {
              updatedVoiceNotes[idx] = vn;
            } else {
              updatedVoiceNotes.push(vn);
            }
          });
        }
        setCanonFacts(updatedFacts);
        setVoiceNotes(updatedVoiceNotes);
        setSaveNotice('Episode saved! New canon facts added to story memory.');
      } else {
        setSaveNotice('Episode saved without fresh canon check. Story canon remains unchanged.');
      }

      await api.updateDraft(selectedDraftId, {
        title: activeTitle,
        genre: activeGenre,
        blurb: activeBlurb,
        episodes,
        canonFacts: updatedFacts,
        voiceNotes: updatedVoiceNotes
      });

      // Update in drafts list
      setDrafts(prev =>
        prev.map(d =>
          d.id === selectedDraftId
            ? {
                ...d,
                title: activeTitle,
                genre: activeGenre,
                blurb: activeBlurb,
                episodes,
                canonFacts: updatedFacts,
                voiceNotes: updatedVoiceNotes
              }
            : d
        )
      );
    } catch (err) {
      console.error('Failed to save draft:', err);
      setSaveNotice('Failed to save episode. Please retry.');
    } finally {
      setSavingDraft(false);
    }
  };

  // 1-Click Fix for conflict
  const handleApplyFix = (conflict: any) => {
    if (conflict.fixSuggestion && currentEpisode.content.includes(conflict.currentQuote)) {
      const fixed = currentEpisode.content.replace(conflict.currentQuote, conflict.fixSuggestion);
      handleEpisodeContentChange(fixed);
      if (auditResult) {
        setAuditResult({
          ...auditResult,
          conflicts: auditResult.conflicts.filter(c => c.id !== conflict.id)
        });
      }
    }
  };

  // 1-Click Dialogue Voice Rewrite
  const handleApplyVoiceRewrite = (voiceIssue: any) => {
    if (voiceIssue.rewrite && currentEpisode.content.includes(voiceIssue.originalLine)) {
      const replaced = currentEpisode.content.replace(voiceIssue.originalLine, voiceIssue.rewrite);
      handleEpisodeContentChange(replaced);
      if (auditResult) {
        setAuditResult({
          ...auditResult,
          voice: auditResult.voice.filter(v => v.id !== voiceIssue.id)
        });
      }
    }
  };

  // Remove individual canon fact
  const handleRemoveFact = (factId: string) => {
    const updated = canonFacts.filter(f => f.id !== factId);
    setCanonFacts(updated);
    if (selectedDraftId) {
      api.updateDraft(selectedDraftId, { canonFacts: updated });
    }
  };

  // AI Draft Episode Modal Trigger
  const handleTriggerAiDraft = async () => {
    if (!selectedDraftId) return;
    setIsAiDrafting(true);
    try {
      const res = await api.draftEpisodeWithAI(selectedDraftId, selectedEpisodeIndex, aiDraftPrompt);
      if (res && res.content) {
        handleEpisodeContentChange(res.content);
        setShowAiDraftModal(false);
        setAiDraftPrompt('');
      }
    } catch (err) {
      console.error('AI Draft failed:', err);
    } finally {
      setIsAiDrafting(false);
    }
  };

  // Publish / Unpublish
  const handlePublish = async () => {
    if (!selectedDraftId) return;
    try {
      const res = await api.publishDraft(selectedDraftId);
      setPublishedBookId(res.book.id);
      setSaveNotice('Published to Books successfully! Readers can now discover your serialized saga.');
    } catch (err: any) {
      setSaveNotice(err.message || 'Failed to publish');
    }
  };

  const handleUnpublish = async () => {
    if (!selectedDraftId) return;
    try {
      await api.unpublishDraft(selectedDraftId);
      setPublishedBookId(null);
      setSaveNotice('Unpublished from Books. The story is now private to your workspace.');
    } catch (err: any) {
      setSaveNotice(err.message || 'Failed to unpublish');
    }
  };

  // Export Draft (Fountain Screenplay / Markdown Bible / TXT)
  const [isExporting, setIsExporting] = useState(false);
  const handleExportDraft = async (fmt: 'fountain' | 'markdown' | 'txt') => {
    if (!selectedDraftId) return;
    setIsExporting(true);
    try {
      const data = await api.exportDraft(selectedDraftId, fmt);
      triggerDownload(data.content, data.filename, data.mimeType);
      setSaveNotice(`Exported as ${data.filename}!`);
    } catch (err: any) {
      setSaveNotice(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Illustrate Episode (Gemini Scene Art Director + FLUX Engine)
  const [isIllustrating, setIsIllustrating] = useState(false);
  const handleIllustrateEpisode = async () => {
    if (!selectedDraftId) return;
    setIsIllustrating(true);
    setSaveNotice(null);
    try {
      const res = await api.illustrateEpisode(selectedDraftId, selectedEpisodeIndex);
      if (res && res.imageUrl) {
        const updated = [...episodes];
        updated[selectedEpisodeIndex] = {
          ...updated[selectedEpisodeIndex],
          imageUrl: res.imageUrl,
          imagePrompt: res.imagePrompt
        };
        setEpisodes(updated);
        setSaveNotice('Scene concept art generated by Gemini & FLUX!');
      }
    } catch (err: any) {
      setSaveNotice(`Illustration failed: ${err.message || 'Please retry'}`);
    } finally {
      setIsIllustrating(false);
    }
  };

  const handleRemoveIllustration = () => {
    const updated = [...episodes];
    updated[selectedEpisodeIndex] = {
      ...updated[selectedEpisodeIndex],
      imageUrl: undefined,
      imagePrompt: undefined
    };
    setEpisodes(updated);
    if (selectedDraftId) {
      api.updateDraft(selectedDraftId, { episodes: updated });
    }
  };

  // --- NON-AUTHENTICATED GATE (Enchanted Forest) ---
  if (!currentUser) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#FAF9F3] dark:bg-slate-900 border border-[#D7C397] dark:border-slate-700 rounded-2xl p-8 shadow-xl">
          <div className="w-14 h-14 bg-[#F4F0E5] dark:bg-slate-800 border border-[#D7C397] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#101C19] dark:text-sky-400">
            <PenTool className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#101C19] dark:text-white mb-2">
            Sign In to Writer Mode
          </h2>
          <p className="text-sm text-[#263F35] dark:text-slate-300 mb-6 leading-relaxed">
            Writer Mode provides private workspace drafts, multi-episode serialization, and deep AI-powered canon continuity checking. Sign in or pick a demo profile to start writing.
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full bg-[#101C19] hover:bg-[#263F35] text-[#E9E2CE] font-bold py-3 px-6 rounded-xl transition-all text-sm min-h-[44px] cursor-pointer shadow-md"
          >
            Sign in to Write
          </button>
        </div>
      </div>
    );
  }

  // --- EMPTY STATE: NO DRAFTS ---
  if (drafts.length === 0 && !loadingDrafts) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#FAF9F3] dark:bg-slate-900 border border-[#D7C397] dark:border-slate-700 rounded-2xl p-8 shadow-md">
          <FileText className="w-12 h-12 text-[#87977A] mx-auto mb-3" />
          <h2 className="text-xl font-serif font-bold text-[#101C19] dark:text-white mb-1">
            No Story Drafts Yet
          </h2>
          <p className="text-sm text-[#263F35] dark:text-slate-300 mb-5">
            Create your first serialized fiction draft or transfer a story from the wizard.
          </p>
          <button
            onClick={handleNewDraft}
            className="bg-[#101C19] hover:bg-[#263F35] text-[#E9E2CE] font-bold py-2.5 px-6 rounded-xl text-sm min-h-[44px] inline-flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Saga</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Top Workspace Header (Enchanted Forest) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D7C397]/60 pb-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedDraftId || ''}
            onChange={(e) => {
              const d = drafts.find(x => x.id === e.target.value);
              if (d) selectDraft(d);
            }}
            className="bg-[#FAF9F3] dark:bg-slate-900 border border-[#D7C397] dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-serif font-bold text-[#101C19] dark:text-white focus:border-[#101C19] min-h-[44px] max-w-[240px] truncate shadow-xs"
          >
            {drafts.map(d => (
              <option key={d.id} value={d.id}>
                {d.title || 'Untitled Saga'}
              </option>
            ))}
          </select>

          <button
            onClick={handleNewDraft}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF9F3] hover:bg-[#F4F0E5] border border-[#D7C397] text-xs text-[#101C19] rounded-xl font-bold min-h-[44px] transition-all shadow-xs cursor-pointer"
            title="Create a new serialized saga draft"
          >
            <Plus className="w-3.5 h-3.5 text-[#58745C]" />
            <span className="hidden sm:inline">New Draft</span>
          </button>
        </div>

        {/* Publishing & Delete Draft Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {TTS_ENABLED && <VoiceNarratorButton />}
          {/* Screenplay & Bible Export Group */}
          <div className="flex items-center gap-1 bg-studio-raised border border-studio-border rounded p-1">
            <span className="text-[11px] text-studio-muted font-medium px-1.5 flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-studio-accent" />
              <span className="hidden sm:inline">Export:</span>
            </span>
            <button
              onClick={() => handleExportDraft('fountain')}
              disabled={isExporting}
              title="Export as Industry Standard Screenplay (.fountain)"
              className="px-2 py-1 text-[11px] bg-studio-card hover:bg-studio-accent hover:text-studio-bg text-studio-text rounded font-mono font-medium transition-colors min-h-[36px]"
            >
              .fountain
            </button>
            <button
              onClick={() => handleExportDraft('markdown')}
              disabled={isExporting}
              title="Export Story Bible, Episodes & Canon Facts (.md)"
              className="px-2 py-1 text-[11px] bg-studio-card hover:bg-studio-accent hover:text-studio-bg text-studio-text rounded font-mono font-medium transition-colors min-h-[36px]"
            >
              .md
            </button>
            <button
              onClick={() => handleExportDraft('txt')}
              disabled={isExporting}
              title="Export Plain Text (.txt)"
              className="px-2 py-1 text-[11px] bg-studio-card hover:bg-studio-accent hover:text-studio-bg text-studio-text rounded font-mono font-medium transition-colors min-h-[36px]"
            >
              .txt
            </button>
          </div>

          {publishedBookId ? (
            <>
              <span className="text-xs text-status-consistent font-medium flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Published</span>
              </span>
              <button
                onClick={handlePublish}
                className="px-3 py-1.5 bg-studio-raised border border-studio-border text-xs text-studio-text rounded min-h-[44px]"
              >
                Update Published
              </button>
              <button
                onClick={handleUnpublish}
                className="px-3 py-1.5 bg-studio-raised border border-studio-border text-xs text-studio-muted hover:text-red-400 rounded min-h-[44px]"
              >
                Unpublish
              </button>
            </>
          ) : (
            <button
              onClick={handlePublish}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-studio-accent hover:bg-studio-accent/90 text-studio-bg font-bold text-xs rounded min-h-[44px]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Publish to Books</span>
            </button>
          )}

          {/* Delete Story Draft (2 clicks) */}
          <button
            onClick={handleDeleteDraft}
            className={`flex items-center gap-1 px-3 py-2 text-xs rounded border transition-colors min-h-[44px] ${
              confirmDeleteDraft
                ? 'bg-status-contradiction text-white border-status-contradiction font-bold'
                : 'bg-studio-raised border-studio-border text-studio-muted hover:text-red-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmDeleteDraft ? 'Confirm Delete Story?' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Save Notice Banner */}
      {saveNotice && (
        <div className="p-3 bg-studio-card border border-studio-border rounded-md text-xs text-studio-accent flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-studio-accent flex-shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Story Metadata Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-studio-card border border-studio-border rounded-lg p-4">
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold text-studio-muted uppercase tracking-wider mb-1">
            Story Title
          </label>
          <input
            type="text"
            value={activeTitle}
            onChange={(e) => setActiveTitle(e.target.value)}
            placeholder="e.g. The Rain of Lower Veridia"
            className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2 text-sm font-serif font-bold text-studio-text focus:border-studio-accent min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-studio-muted uppercase tracking-wider mb-1">
            Genre
          </label>
          <select
            value={activeGenre}
            onChange={(e) => setActiveGenre(e.target.value)}
            className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2 text-sm text-studio-text focus:border-studio-accent min-h-[44px]"
          >
            <option value="Sci-fi">Sci-fi</option>
            <option value="Thriller">Thriller</option>
            <option value="Horror">Horror</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Romantic">Romantic</option>
            <option value="Delulu">Delulu</option>
            <option value="Mystery">Mystery</option>
            <option value="Crime">Crime</option>
            <option value="Dark twist">Dark twist</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-studio-muted uppercase tracking-wider mb-1">
            Story Blurb / Logline
          </label>
          <input
            type="text"
            value={activeBlurb}
            onChange={(e) => setActiveBlurb(e.target.value)}
            placeholder="Short engaging hook displayed in Books library..."
            className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2 text-xs text-studio-text focus:border-studio-accent min-h-[44px]"
          />
        </div>
      </div>

      {/* Episodes Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-studio-border overflow-x-auto gap-2 pb-1">
        <div className="flex items-center gap-1.5">
          {episodes.map((ep, idx) => (
            <button
              key={ep.id}
              onClick={() => {
                setSelectedEpisodeIndex(idx);
                setAuditResult(null);
                setHasFreshCheck(false);
              }}
              className={`px-3 py-2 text-xs font-medium rounded transition-colors min-h-[44px] whitespace-nowrap ${
                selectedEpisodeIndex === idx
                  ? 'bg-studio-raised text-studio-accent font-bold border border-studio-border shadow-xs'
                  : 'text-studio-muted hover:text-studio-text'
              }`}
            >
              Episode {idx + 1}
            </button>
          ))}
          <button
            onClick={handleAddEpisode}
            className="p-2 text-studio-accent hover:bg-studio-raised rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Add new episode"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {episodes.length > 1 && (
          <button
            onClick={handleDeleteEpisode}
            className={`text-xs px-2.5 py-1.5 rounded border transition-colors min-h-[38px] ${
              confirmDeleteEpisode
                ? 'bg-status-contradiction text-white border-status-contradiction font-bold'
                : 'text-studio-muted hover:text-red-400 border-studio-border'
            }`}
          >
            {confirmDeleteEpisode ? 'Confirm Delete Episode?' : 'Delete Episode'}
          </button>
        )}
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE: EPISODE EDITOR + CANON CONTINUITY PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: EPISODE EDITOR (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-studio-card border border-studio-border rounded-lg p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <input
                type="text"
                value={currentEpisode.title}
                onChange={(e) => handleEpisodeTitleChange(e.target.value)}
                placeholder="Episode Title (e.g. Episode 1: Acid on Carbon)"
                className="flex-1 bg-studio-bg border border-studio-border rounded px-3 py-2 text-sm font-serif font-bold text-studio-text focus:border-studio-accent min-h-[44px]"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isIllustrating || !currentEpisode.content?.trim()}
                  onClick={handleIllustrateEpisode}
                  className="flex items-center gap-1.5 px-3 py-2 bg-studio-raised hover:bg-studio-accent/20 border border-studio-border text-xs font-semibold text-studio-accent rounded min-h-[44px] disabled:opacity-50 transition-colors"
                  title="Generate 16:9 Concept Art with Gemini Art Director + FLUX"
                >
                  {isIllustrating ? (
                    <div className="w-3.5 h-3.5 border-2 border-studio-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  )}
                  <span>{isIllustrating ? 'Illustrating...' : currentEpisode.imageUrl ? 'Re-Illustrate' : '🎨 Illustrate Scene'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAiDraftModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-studio-raised hover:bg-studio-accent/20 border border-studio-border text-xs font-semibold text-studio-accent rounded min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Draft with AI</span>
                </button>
              </div>
            </div>

            {/* 16:9 Cinematic Concept Art Banner */}
            {currentEpisode.imageUrl && (
              <div className="relative mb-4 rounded-lg overflow-hidden border border-studio-border group bg-black/40">
                <img
                  src={currentEpisode.imageUrl}
                  alt={currentEpisode.imagePrompt || currentEpisode.title}
                  className="w-full h-52 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-101"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between text-xs text-white/90">
                    <span className="font-semibold flex items-center gap-1.5 text-[11px] text-studio-accent">
                      <span>🎬 Gemini Art Director</span>
                      <span className="text-white/60">&bull; 16:9 Cinematic Visual Art</span>
                    </span>
                  </div>
                  {currentEpisode.imagePrompt && (
                    <p className="text-[11px] text-white/80 italic line-clamp-2 mt-1">
                      &ldquo;{currentEpisode.imagePrompt}&rdquo;
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRemoveIllustration}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-900/80 text-white/80 hover:text-white rounded text-xs transition-colors"
                  title="Remove artwork"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <textarea
              rows={16}
              value={currentEpisode.content}
              onChange={(e) => handleEpisodeContentChange(e.target.value)}
              placeholder="Write or paste your episode prose here. Include dialogue and action..."
              className="w-full bg-studio-bg border border-studio-border rounded p-4 font-serif text-base text-studio-text leading-relaxed focus:border-studio-accent focus:ring-1 focus:ring-studio-accent"
            />

            {/* Editor Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-studio-border">
              <div className="text-xs text-studio-muted">
                {currentEpisode.content.split(/\s+/).filter(Boolean).length} words
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isAuditing || !currentEpisode.content.trim()}
                  onClick={handleCheckCanon}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-studio-raised hover:bg-studio-raised/80 disabled:opacity-50 border border-studio-border text-xs font-bold text-studio-text rounded transition-colors min-h-[44px] cursor-pointer"
                >
                  {isAuditing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-studio-accent" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-studio-accent" />
                  )}
                  <span>Check against canon</span>
                </button>

                <button
                  type="button"
                  disabled={savingDraft}
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-studio-accent hover:bg-studio-accent/90 disabled:opacity-50 text-studio-bg font-bold text-xs rounded transition-colors min-h-[44px] cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingDraft ? 'Saving...' : 'Save Episode'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: CONTINUITY & CANON PANEL (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* AUDIT RESULTS BOX */}
          {auditResult && (
            <div className="bg-studio-card border border-studio-border rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-studio-border">
                <div className="font-serif font-bold text-sm text-studio-text flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-studio-accent" />
                  <span>Continuity & Voice Audit</span>
                </div>

                {/* Status Indicator: ALWAYS Paired with Icon and Text Label */}
                {auditResult.status === 'contradiction' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/60 border border-status-contradiction text-status-contradiction text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Contradiction</span>
                  </span>
                )}
                {auditResult.status === 'consistent' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-950/60 border border-status-consistent text-status-consistent text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Consistent</span>
                  </span>
                )}
                {auditResult.status === 'warning' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-status-warning text-status-warning text-xs font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Warning / Changed</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-studio-muted">
                {auditResult.summary}
              </p>

              {/* Contradictions / Conflicts */}
              {auditResult.conflicts.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-status-contradiction uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Plot Hole Contradictions ({auditResult.conflicts.length})</span>
                  </div>

                  {auditResult.conflicts.map(conf => (
                    <div key={conf.id} className="p-3 bg-red-950/20 border border-status-contradiction/40 rounded text-xs space-y-2">
                      <div className="text-red-200 font-medium">
                        {conf.explanation}
                      </div>
                      <div className="text-[11px] text-studio-muted">
                        Earlier quote (Ep {conf.earlierEpisode}): &ldquo;{conf.earlierQuote}&rdquo;
                      </div>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-studio-accent italic">
                          Fix: &ldquo;{conf.fixSuggestion}&rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyFix(conf)}
                          className="px-2.5 py-1 bg-studio-accent text-studio-bg font-bold rounded text-[11px] min-h-[36px]"
                        >
                          Apply Fix
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dialogue Voice Drift */}
              {auditResult.voice.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold text-status-warning uppercase tracking-wider flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Character Voice Drift ({auditResult.voice.length})</span>
                  </div>

                  {auditResult.voice.map(v => (
                    <div key={v.id} className="p-3 bg-amber-950/20 border border-status-warning/40 rounded text-xs space-y-2">
                      <div className="font-semibold text-studio-accent">
                        Character: {v.character}
                      </div>
                      <div className="text-[11px] text-studio-muted">
                        Flagged line: &ldquo;{v.originalLine}&rdquo;
                      </div>
                      <div className="text-[11px] text-amber-200">
                        {v.issue}
                      </div>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-studio-text italic">
                          Rewrite: &ldquo;{v.rewrite}&rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyVoiceRewrite(v)}
                          className="px-2.5 py-1 bg-studio-accent text-studio-bg font-bold rounded text-[11px] min-h-[36px]"
                        >
                          Use this rewrite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STORED STORY CANON BIBLE PANEL */}
          <div className="bg-studio-card border border-studio-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-studio-border">
              <div className="font-serif font-bold text-sm text-studio-text flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-studio-accent" />
                <span>Story Canon Memory</span>
              </div>
              <span className="text-xs text-studio-muted">
                {canonFacts.length} facts registered
              </span>
            </div>

            <p className="text-xs text-studio-muted">
              Lasting facts established in episodes (who is alive, ownership, physical states, secrets). Grouped by subject and tagged with episode.
            </p>

            {canonFacts.length === 0 ? (
              <div className="py-6 text-center text-xs text-studio-muted">
                No canon facts established yet. Run &ldquo;Check against canon&rdquo; on an episode and click Save.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {canonFacts.map(fact => (
                  <div
                    key={fact.id}
                    className="p-3 bg-studio-raised border border-studio-border rounded text-xs space-y-1 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-studio-accent">
                          {fact.subject}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-card border border-studio-border text-studio-muted">
                          Ep {fact.episodeNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFact(fact.id)}
                        className="text-studio-muted hover:text-red-400 p-1 rounded min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Remove fact from canon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-studio-text text-xs">
                      {fact.text}
                    </div>

                    {fact.quote && (
                      <div className="text-[11px] text-studio-muted italic">
                        &ldquo;{fact.quote}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Character Voice Fingerprints */}
            {voiceNotes.length > 0 && (
              <div className="pt-3 border-t border-studio-border space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-studio-muted">
                  Character Voice Notes
                </div>
                {voiceNotes.map((vn, i) => (
                  <div key={i} className="p-2.5 bg-studio-raised border border-studio-border rounded text-xs">
                    <span className="font-bold text-studio-accent">{vn.character}: </span>
                    <span className="text-studio-muted">{vn.style}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: DRAFT WITH AI */}
      {showAiDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-studio-card border border-studio-border rounded-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-serif font-bold text-studio-text">
              Draft Episode {selectedEpisodeIndex + 1} with AI
            </h3>
            <p className="text-xs text-studio-muted">
              Describe what happens in this episode. The AI streams the narrative while strictly maintaining established canon facts and character voice styles.
            </p>

            <textarea
              rows={4}
              value={aiDraftPrompt}
              onChange={(e) => setAiDraftPrompt(e.target.value)}
              placeholder="e.g. Jack investigates the flooded conduit while Aria decrypts the second partition of the Chimera core..."
              className="w-full bg-studio-bg border border-studio-border rounded p-3 text-sm text-studio-text focus:border-studio-accent"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAiDraftModal(false)}
                className="px-4 py-2 bg-studio-raised border border-studio-border text-xs text-studio-muted hover:text-studio-text rounded min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAiDrafting || !aiDraftPrompt.trim()}
                onClick={handleTriggerAiDraft}
                className="px-5 py-2 bg-studio-accent hover:bg-studio-accent/90 disabled:opacity-50 text-studio-bg font-bold text-xs rounded min-h-[44px]"
              >
                {isAiDrafting ? 'Writing Episode...' : 'Generate Episode Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
