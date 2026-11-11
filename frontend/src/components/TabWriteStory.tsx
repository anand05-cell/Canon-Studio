import { useState, useEffect, useRef, type FormEvent } from 'react';
import { api } from '../api';
import type { WizardQuestion } from '../types';
import {
  ArrowRight,
  ArrowLeft,
  Shuffle,
  Copy,
  Check,
  Download,
  RotateCcw,
  Compass,
  PenTool,
  Square,
  AlertCircle,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { VoiceNarratorButton } from './VoiceNarratorButton';
import { StoryAudio } from './StoryAudio';
import { TTS_ENABLED } from '../featureFlags';
import { StudioDeepDive } from './StudioDeepDive';
import { Newsletter2 } from './ui/newsletter-2';

interface TabWriteStoryProps {
  onPlayBranching: (premise: { idea: string; genre: string; realism: string; language: string }) => void;
  onSaveToWriter: (story: { title: string; genre: string; content: string; imageUrl?: string; imagePrompt?: string }) => void;
  onStepChange?: (step: number) => void;
  onNavigateTab?: (tab: 'wizard' | 'branching' | 'writer' | 'books') => void;
  onOpenAuth?: () => void;
  currentUser?: { displayName: string } | null;
}

const GENRES = [
  'Horror', 'Romantic', 'Delulu', 'Comedy', 'Thriller', 'Mystery',
  'Fantasy', 'Sci-fi', 'Adventure', 'Family drama', 'Crime',
  'Revenge', 'Mythology', 'Friendship', 'Inspiring', 'Dark twist'
];

const REALISM_OPTIONS = [
  { label: 'Real life', sub: 'Grounded human stakes, natural physics, everyday authenticity' },
  { label: 'Imaginary', sub: 'High fantasy, speculative worlds, magic systems and wonder' },
  { label: 'Real life with a twist', sub: 'Ordinary world until one impossible element bends the rules' },
  { label: 'Feels like a true story', sub: 'Gritty documentary realism, true-crime style pacing' }
];

const LANGUAGE_OPTIONS = [
  { label: 'English', sub: 'Classic, evocative literary English prose' },
  { label: 'Hinglish (Hindi in Roman letters)', sub: 'Conversational Hindi written in English script (e.g., "Arre yaar...")' },
  { label: 'Hindi (Devanagari)', sub: 'Rich literary Hindi in standard Devanagari script' }
];

const LENGTH_OPTIONS = [
  { label: 'About 400 words', value: '400', sub: 'A punchy, fast micro-story (~2 min read)' },
  { label: 'About 800 words', value: '800', sub: 'A rich episodic chapter with deep dialogue (~4 min read)' },
  { label: 'About 1,400 words', value: '1400', sub: 'An expansive short story with full world-building (~7 min read)' }
];

const KEYWORD_EXAMPLES = [
  'A chai stall undercover spy',
  'Cyberpunk courier with amnesia',
  'A ghost who forgets they died',
  'Two rival astronauts in an escape pod',
  'An antique mirror reflecting tomorrow',
  'A chef who can taste human emotions'
];

export function TabWriteStory({ onPlayBranching, onSaveToWriter }: TabWriteStoryProps) {
  // Wizard state: 0 to 7, or 'generating', or 'completed'
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  // Stored answers
  const [keywords, setKeywords] = useState('');
  const [customKeywordInput, setCustomKeywordInput] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedRealism, setSelectedRealism] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [step4Answer, setStep4Answer] = useState('');
  const [step5Answer, setStep5Answer] = useState('');
  const [step6Answer, setStep6Answer] = useState('');
  const [selectedLength, setSelectedLength] = useState('800');

  // "Or type your own" input state per step
  const [customInputText, setCustomInputText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Dynamic AI Questions for Steps 4, 5, 6
  const [aiQuestion, setAiQuestion] = useState<WizardQuestion | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Story generation & streaming state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<{
    title: string;
    content: string;
    wordCount: number;
    readingTimeMinutes: number;
  } | null>(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [storyArt, setStoryArt] = useState<{ imageUrl: string; imagePrompt: string } | null>(null);
  const [isIllustrating, setIsIllustrating] = useState(false);

  // Abort controller / stop ref
  const abortRef = useRef<boolean>(false);

  // Fetch AI Question when navigating to step 4, 5, 6
  useEffect(() => {
    if (currentStep >= 4 && currentStep <= 6) {
      loadAiQuestion(currentStep);
    }
    setShowCustomInput(false);
    setCustomInputText('');
  }, [currentStep]);

  const loadAiQuestion = async (step: number) => {
    setLoadingQuestion(true);
    setQuestionError(null);
    try {
      const answersPayload = {
        keywords,
        genre: selectedGenre,
        realism: selectedRealism,
        language: selectedLanguage,
        step4Answer,
        step5Answer,
        step6Answer
      };
      const data = await api.getNextWizardQuestion(step, answersPayload);
      setAiQuestion(data);
    } catch (err: any) {
      setQuestionError(err.message || 'Failed to fetch question from AI.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  // Step 0 handlers
  const handleKeywordSelect = (kw: string) => {
    setKeywords(kw);
    setCurrentStep(1);
  };

  const handleKeywordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (customKeywordInput.trim()) {
      setKeywords(customKeywordInput.trim());
      setCurrentStep(1);
    }
  };

  const handleNoIdea = () => {
    const randomSeed = KEYWORD_EXAMPLES[Math.floor(Math.random() * KEYWORD_EXAMPLES.length)];
    setKeywords(randomSeed);
    setCurrentStep(1);
  };

  // Surprise me handlers
  const handleSurpriseMe = () => {
    if (currentStep === 1) {
      const g = GENRES[Math.floor(Math.random() * GENRES.length)];
      setSelectedGenre(g);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const r = REALISM_OPTIONS[Math.floor(Math.random() * REALISM_OPTIONS.length)].label;
      setSelectedRealism(r);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const l = LANGUAGE_OPTIONS[Math.floor(Math.random() * LANGUAGE_OPTIONS.length)].label;
      setSelectedLanguage(l);
      setCurrentStep(4);
    } else if (currentStep >= 4 && currentStep <= 6 && aiQuestion) {
      const opt = aiQuestion.options[Math.floor(Math.random() * aiQuestion.options.length)];
      handleSelectOption(`${opt.label}: ${opt.sub}`);
    } else if (currentStep === 7) {
      setSelectedLength('800');
      triggerStoryGeneration();
    }
  };

  const handleSelectOption = (value: string) => {
    if (currentStep === 1) {
      setSelectedGenre(value);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setSelectedRealism(value);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setSelectedLanguage(value);
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setStep4Answer(value);
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setStep5Answer(value);
      setCurrentStep(6);
    } else if (currentStep === 6) {
      setStep6Answer(value);
      setCurrentStep(7);
    } else if (currentStep === 7) {
      setSelectedLength(value);
      triggerStoryGeneration();
    }
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (customInputText.trim()) {
      handleSelectOption(customInputText.trim());
    }
  };

  // Trigger Story Generation with simulated smooth streaming & Stop button
  const triggerStoryGeneration = async () => {
    setCurrentStep(8); // Generating view
    setIsGenerating(true);
    setIsThinking(true);
    setStreamedContent('');
    setGeneratedStory(null);
    abortRef.current = false;

    try {
      const answersPayload = {
        keywords,
        genre: selectedGenre,
        realism: selectedRealism,
        language: selectedLanguage,
        step4Answer,
        step5Answer,
        step6Answer,
        targetLength: selectedLength
      };

      const result = await api.generateWizardStory(answersPayload);
      setIsThinking(false);

      if (abortRef.current) return;

      setGeneratedStory(result);

      // Auto-trigger Gemini Visual Art Director in background
      handleIllustrateStory(result.content, result.title);

      // Smooth streaming effect
      const fullText = result.content;
      const chunks = fullText.split(/(?<=\s+)/);
      let accumulated = '';

      for (let i = 0; i < chunks.length; i++) {
        if (abortRef.current) break;
        accumulated += chunks[i];
        setStreamedContent(accumulated);
        // Realistic dynamic word pacing
        await new Promise((r) => setTimeout(r, 22));
      }

      setStreamedContent(fullText);
    } catch (err: any) {
      setIsThinking(false);
      setQuestionError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    setIsGenerating(false);
    setIsThinking(false);
  };

  const handleIllustrateStory = async (content?: string, title?: string) => {
    const textToUse = content || streamedContent || generatedStory?.content;
    const titleToUse = title || generatedStory?.title || keywords;
    if (!textToUse) return;

    setIsIllustrating(true);
    try {
      const art = await api.illustrateBranchScene(textToUse, titleToUse, selectedGenre);
      setStoryArt(art);
    } catch (err) {
      console.error('Failed to illustrate story:', err);
    } finally {
      setIsIllustrating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedStory) return;
    const full = `# ${generatedStory.title}\n\n${streamedContent || generatedStory.content}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedStory) return;
    const full = `# ${generatedStory.title}\n\n${streamedContent || generatedStory.content}`;
    const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedStory.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleStartOver = () => {
    setCurrentStep(0);
    setKeywords('');
    setCustomKeywordInput('');
    setSelectedGenre('');
    setSelectedRealism('');
    setSelectedLanguage('English');
    setStep4Answer('');
    setStep5Answer('');
    setStep6Answer('');
    setSelectedLength('800');
    setGeneratedStory(null);
    setStreamedContent('');
    setStoryArt(null);
    setQuestionError(null);
  };

  // Chips summary row of selections made so far
  const activeChips = [
    keywords && { label: `Seed: ${keywords}` },
    selectedGenre && { label: `Genre: ${selectedGenre}` },
    selectedRealism && { label: `World: ${selectedRealism}` },
    step4Answer && { label: `Lead: ${step4Answer.slice(0, 25)}...` },
    step5Answer && { label: `Arena: ${step5Answer.slice(0, 25)}...` },
    step6Answer && { label: `Twist: ${step6Answer.slice(0, 25)}...` },
  ].filter(Boolean) as Array<{ label: string }>;

  return (
    <div className={`w-full mx-auto px-4 ${currentStep === 0 ? 'max-w-6xl py-10 md:py-16' : 'max-w-4xl py-6 md:py-10'}`}>
      
      {/* Wizard Header Bar */}
      <div className={currentStep === 0 ? 'mb-3 md:mb-4' : 'mb-6'}>
        <div className="story-wizard-meta flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
          <span>Write a Story &bull; Guided AI Wizard</span>
          {currentStep <= 7 && <span>Step {currentStep} of 7</span>}
        </div>

        {/* Selected chips bar */}
        {activeChips.length > 0 && currentStep <= 7 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {activeChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded bg-studio-raised border border-studio-border text-xs text-studio-accent font-medium"
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {questionError && (
        <div className="mb-6 p-4 bg-red-950/40 border border-status-contradiction rounded flex items-center justify-between text-sm text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-contradiction flex-shrink-0" />
            <span>{questionError}</span>
          </div>
          <button
            onClick={() => currentStep >= 4 ? loadAiQuestion(currentStep) : triggerStoryGeneration()}
            className="px-3 py-1 bg-studio-raised border border-studio-border text-xs text-studio-text rounded hover:bg-studio-accent/20 min-h-[36px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* --- STEP 0: FREE-TEXT KEYWORDS --- */}
      {currentStep === 0 && (
        <div className="story-seed-card mt-1 md:mt-2 flex flex-col bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.10)] dark:shadow-2xl animate-in fade-in duration-200">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2">
            What story do you want to tell today?
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-6">
            Enter a few keywords, a premise, or click an idea chip below to get started.
          </p>

          <form onSubmit={handleKeywordSubmit} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={customKeywordInput}
                onChange={(e) => setCustomKeywordInput(e.target.value)}
                placeholder="e.g. A runaway clone seeking the architect of her memories"
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-sky-400 focus:ring-1 focus:ring-slate-900 dark:focus:ring-sky-400 shadow-xs min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!customKeywordInput.trim()}
                className="bg-slate-950 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-semibold text-sm px-7 py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] cursor-pointer active:scale-[0.98]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mb-0">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Or pick an idea to explore:
            </div>
            <div className="flex flex-wrap gap-2">
              {KEYWORD_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleKeywordSelect(example)}
                  className="px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200 font-medium rounded-lg transition-all text-left min-h-[44px] flex items-center shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="story-inspiration my-7 md:my-9 flex items-center gap-4 rounded-xl px-4 py-4 md:px-5 md:py-5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DCE1D0]/70 dark:bg-emerald-900/40 text-[#58745C] dark:text-emerald-200">
              <BookOpen className="h-6 w-6" strokeWidth={1.5} />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-[#B8954B]" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base sm:text-lg font-semibold text-[#263F35] dark:text-[#E9E2CE]">
                Every great world begins with an idea.
              </h3>
              <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-[#687563] dark:text-slate-300">
                Create vivid characters, imagine new worlds, and shape unforgettable stories—one small idea at a time.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={handleNoIdea}
              className="story-surprise-button px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 min-h-[44px] transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#B8954B]" strokeWidth={1.7} />
              <span>I have no idea yet (Surprise me)</span>
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 1: GENRE --- */}
      {currentStep === 1 && (
        <div className="bg-studio-card border border-studio-border rounded-lg p-6 md:p-8 animate-in fade-in duration-200">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-studio-text mb-2">
            Choose a Story Genre
          </h2>
          <p className="text-sm text-studio-muted mb-6">
            The genre shapes pacing, atmosphere, emotional stakes, and world logic.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-6">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleSelectOption(g)}
                className={`p-3 text-xs sm:text-sm font-medium rounded border transition-colors text-left min-h-[44px] flex items-center justify-between ${
                  selectedGenre === g
                    ? 'bg-studio-raised text-studio-accent border-studio-accent font-semibold'
                    : 'bg-studio-raised/50 hover:bg-studio-raised border-studio-border text-studio-text'
                }`}
              >
                <span>{g}</span>
                <ArrowRight className="w-3.5 h-3.5 text-studio-muted" />
              </button>
            ))}
          </div>

          <WizardBottomControls
            onBack={() => setCurrentStep(0)}
            onSurprise={handleSurpriseMe}
            onToggleCustom={() => setShowCustomInput(!showCustomInput)}
            showCustom={showCustomInput}
            customText={customInputText}
            onCustomTextChange={setCustomInputText}
            onCustomSubmit={handleCustomSubmit}
          />
        </div>
      )}

      {/* --- STEP 2: REALITY SETTING --- */}
      {currentStep === 2 && (
        <div className="bg-studio-card border border-studio-border rounded-lg p-6 md:p-8 animate-in fade-in duration-200">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-studio-text mb-2">
            Select World Tone & Realism
          </h2>
          <p className="text-sm text-studio-muted mb-6">
            How strictly does this universe obey real-world physical laws?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {REALISM_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleSelectOption(opt.label)}
                className="p-4 rounded border bg-studio-raised hover:bg-studio-raised/80 hover:border-studio-accent border-studio-border text-left transition-colors min-h-[64px]"
              >
                <div className="font-serif font-bold text-sm text-studio-text mb-1">{opt.label}</div>
                <div className="text-xs text-studio-muted">{opt.sub}</div>
              </button>
            ))}
          </div>

          <WizardBottomControls
            onBack={() => setCurrentStep(1)}
            onSurprise={handleSurpriseMe}
            onToggleCustom={() => setShowCustomInput(!showCustomInput)}
            showCustom={showCustomInput}
            customText={customInputText}
            onCustomTextChange={setCustomInputText}
            onCustomSubmit={handleCustomSubmit}
          />
        </div>
      )}

      {/* --- STEP 3: LANGUAGE --- */}
      {currentStep === 3 && (
        <div className="bg-studio-card border border-studio-border rounded-lg p-6 md:p-8 animate-in fade-in duration-200">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-studio-text mb-2">
            Choose Narration Language
          </h2>
          <p className="text-sm text-studio-muted mb-6">
            Select how dialogue and narrative prose should be expressed.
          </p>

          <div className="grid grid-cols-1 gap-3 mb-6">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleSelectOption(opt.label)}
                className="p-4 rounded border bg-studio-raised hover:bg-studio-raised/80 hover:border-studio-accent border-studio-border text-left transition-colors min-h-[56px]"
              >
                <div className="font-serif font-bold text-sm text-studio-accent mb-0.5">{opt.label}</div>
                <div className="text-xs text-studio-muted">{opt.sub}</div>
              </button>
            ))}
          </div>

          <WizardBottomControls
            onBack={() => setCurrentStep(2)}
            onSurprise={handleSurpriseMe}
            onToggleCustom={() => setShowCustomInput(!showCustomInput)}
            showCustom={showCustomInput}
            customText={customInputText}
            onCustomTextChange={setCustomInputText}
            onCustomSubmit={handleCustomSubmit}
          />
        </div>
      )}

      {/* --- STEPS 4, 5, 6: AI CONTEXTUAL QUESTIONS --- */}
      {currentStep >= 4 && currentStep <= 6 && (
        <div className="bg-studio-card border border-studio-border rounded-lg p-6 md:p-8 animate-in fade-in duration-200">
          {loadingQuestion ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-studio-accent border-t-transparent rounded-full animate-spin" />
              <div className="font-serif text-sm text-studio-muted">
                AI is generating custom options based on your {selectedGenre} world...
              </div>
            </div>
          ) : aiQuestion ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-studio-text mb-2">
                {aiQuestion.question}
              </h2>
              <p className="text-sm text-studio-muted mb-6">
                {aiQuestion.hint}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {aiQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(`${opt.label}: ${opt.sub}`)}
                    className="p-4 rounded border bg-studio-raised hover:bg-studio-raised/80 hover:border-studio-accent border-studio-border text-left transition-colors min-h-[64px]"
                  >
                    <div className="font-serif font-bold text-sm text-studio-text mb-1">
                      {opt.label}
                    </div>
                    <div className="text-xs text-studio-muted line-clamp-2">
                      {opt.sub}
                    </div>
                  </button>
                ))}
              </div>

              <WizardBottomControls
                onBack={() => setCurrentStep(currentStep - 1)}
                onSurprise={handleSurpriseMe}
                onToggleCustom={() => setShowCustomInput(!showCustomInput)}
                showCustom={showCustomInput}
                customText={customInputText}
                onCustomTextChange={setCustomInputText}
                onCustomSubmit={handleCustomSubmit}
              />
            </>
          ) : (
            <div className="py-8 text-center text-sm text-studio-muted">
              Unable to load question. Please click Back or Retry.
            </div>
          )}
        </div>
      )}

      {/* --- STEP 7: STORY LENGTH --- */}
      {currentStep === 7 && (
        <div className="bg-studio-card border border-studio-border rounded-lg p-6 md:p-8 animate-in fade-in duration-200">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-studio-text mb-2">
            Target Story Length
          </h2>
          <p className="text-sm text-studio-muted mb-6">
            Choose how detailed and expansive you want the AI to write this story.
          </p>

          <div className="grid grid-cols-1 gap-3 mb-6">
            {LENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOption(opt.value)}
                className="p-4 rounded border bg-studio-raised hover:bg-studio-raised/80 hover:border-studio-accent border-studio-border text-left transition-colors min-h-[60px]"
              >
                <div className="font-serif font-bold text-sm text-studio-accent mb-0.5">{opt.label}</div>
                <div className="text-xs text-studio-muted">{opt.sub}</div>
              </button>
            ))}
          </div>

          <WizardBottomControls
            onBack={() => setCurrentStep(6)}
            onSurprise={handleSurpriseMe}
            onToggleCustom={() => setShowCustomInput(!showCustomInput)}
            showCustom={showCustomInput}
            customText={customInputText}
            onCustomTextChange={setCustomInputText}
            onCustomSubmit={handleCustomSubmit}
          />
        </div>
      )}

      {/* --- STEP 8: STORY GENERATING & FULL OUTPUT --- */}
      {currentStep === 8 && (
        <div className="bg-studio-card border border-studio-border rounded-lg p-6 md:p-8 animate-in fade-in duration-200">
          
          {/* Top Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-studio-border pb-4 mb-6">
            <div>
              <span className="text-xs font-semibold text-studio-accent uppercase tracking-wider block">
                {selectedGenre} &bull; {selectedLanguage}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-studio-text">
                {generatedStory ? generatedStory.title : 'Drafting Narrative...'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {isGenerating ? (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-status-contradiction rounded text-xs font-semibold min-h-[44px]"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <>
                  {TTS_ENABLED && <VoiceNarratorButton />}
                  <button
                    onClick={() => handleIllustrateStory()}
                    disabled={isIllustrating}
                    className="flex items-center gap-1.5 px-3 py-2 bg-studio-raised hover:bg-studio-accent/20 border border-studio-border rounded text-xs font-semibold text-studio-accent min-h-[44px] transition-colors"
                    title="Generate 16:9 Concept Art with Gemini + FLUX"
                  >
                    {isIllustrating ? (
                      <div className="w-3.5 h-3.5 border-2 border-studio-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>🎨</span>
                    )}
                    <span>{isIllustrating ? 'Illustrating...' : storyArt ? 'Re-Illustrate' : 'Illustrate Scene'}</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 bg-studio-raised hover:bg-studio-raised/80 border border-studio-border rounded text-xs text-studio-text min-h-[44px]"
                    title="Copy full story to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-status-consistent" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-2 bg-studio-raised hover:bg-studio-raised/80 border border-studio-border rounded text-xs text-studio-text min-h-[44px]"
                    title="Save story as text file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save as text</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Web Speech Neural Story Audio Narrator */}
          {(generatedStory?.content || streamedContent) && !isGenerating && (
            <div className="mb-5">
              {TTS_ENABLED && <StoryAudio storyText={generatedStory?.content || streamedContent} />}
            </div>
          )}

          {/* Thinking State */}
          {isThinking && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-studio-muted">
              <div className="w-8 h-8 border-2 border-studio-accent border-t-transparent rounded-full animate-spin" />
              <div className="font-serif text-sm">
                Thinking and structuring narrative arc...
              </div>
            </div>
          )}

          {/* Clear story illustration leads the generated narrative. */}
          {storyArt && (
            <div className="mb-6 overflow-hidden rounded-lg border border-studio-border shadow-xl">
              <img
                src={storyArt.imageUrl}
                alt={generatedStory?.title || 'Generated story illustration'}
                className="block w-full h-auto"
                loading="lazy"
              />
            </div>
          )}

          {/* Story Body */}
          {streamedContent && (
            <div className="prose prose-invert max-w-none text-studio-text font-serif text-base sm:text-lg leading-relaxed whitespace-pre-line space-y-4 mb-8">
              {streamedContent}
            </div>
          )}


          {/* Post Generation Actions */}
          {!isGenerating && generatedStory && (
            <div className="border-t border-studio-border pt-6 mt-8 space-y-4">
              <div className="text-xs text-studio-muted flex items-center justify-between">
                <span>{generatedStory.wordCount} words &bull; ~{generatedStory.readingTimeMinutes} min read</span>
                <span className="text-status-consistent">Complete story generated</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <button
                  onClick={triggerStoryGeneration}
                  className="flex items-center justify-center gap-2 p-3 bg-studio-raised hover:bg-studio-raised/80 border border-studio-border text-xs font-semibold text-studio-text rounded min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4 text-studio-accent" />
                  <span>Write another version</span>
                </button>

                <button
                  onClick={handleStartOver}
                  className="flex items-center justify-center gap-2 p-3 bg-studio-raised hover:bg-studio-raised/80 border border-studio-border text-xs font-semibold text-studio-muted hover:text-studio-text rounded min-h-[44px]"
                >
                  <span>Start over</span>
                </button>

                <button
                  onClick={() => onPlayBranching({
                    idea: keywords || generatedStory.title,
                    genre: selectedGenre,
                    realism: selectedRealism,
                    language: selectedLanguage
                  })}
                  className="flex items-center justify-center gap-2 p-3 bg-studio-raised hover:bg-studio-accent/20 border border-studio-border hover:border-studio-accent text-xs font-semibold text-studio-accent rounded min-h-[44px]"
                >
                  <Compass className="w-4 h-4" />
                  <span>Play as Choose-Your-Path</span>
                </button>

                <button
                  onClick={() => onSaveToWriter({
                    title: generatedStory.title,
                    genre: selectedGenre,
                    content: streamedContent || generatedStory.content,
                    imageUrl: storyArt?.imageUrl,
                    imagePrompt: storyArt?.imagePrompt
                  })}
                  className="flex items-center justify-center gap-2 p-3 bg-studio-accent hover:bg-studio-accent/90 text-studio-bg text-xs font-bold rounded min-h-[44px]"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Save to Writer Mode</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          MIDDLE: 3 Professional Functional Layers (Lore, Branching, Auditor)
         ──────────────────────────────────────────────────────────── */}
      <div className="mt-64 md:mt-80">
        <StudioDeepDive />
      </div>

      {/* ────────────────────────────────────────────────────────────
          END: Creator Support & Narrative Dispatch Section
         ──────────────────────────────────────────────────────────── */}
      <div className="mt-8 mb-6">
        <Newsletter2 />
      </div>
    </div>
  );
}

// Reusable bottom control bar for Back, Surprise me, and "Or type your own"
interface WizardBottomControlsProps {
  onBack: () => void;
  onSurprise: () => void;
  onToggleCustom: () => void;
  showCustom: boolean;
  customText: string;
  onCustomTextChange: (text: string) => void;
  onCustomSubmit: (e: FormEvent) => void;
}

function WizardBottomControls({
  onBack,
  onSurprise,
  onToggleCustom,
  showCustom,
  customText,
  onCustomTextChange,
  onCustomSubmit
}: WizardBottomControlsProps) {
  return (
    <div className="border-t border-studio-border pt-4 space-y-3">
      {showCustom && (
        <form onSubmit={onCustomSubmit} className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="Type your custom answer here..."
            className="flex-1 bg-studio-bg border border-studio-border rounded px-3 py-2 text-sm text-studio-text focus:border-studio-accent focus:ring-1 focus:ring-studio-accent min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!customText.trim()}
            className="px-4 py-2 bg-studio-accent hover:bg-studio-accent/90 disabled:opacity-50 text-studio-bg text-xs font-bold rounded min-h-[44px]"
          >
            Apply
          </button>
        </form>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-studio-muted hover:text-studio-text bg-studio-raised border border-studio-border rounded min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCustom}
            className="px-3 py-2 text-xs font-semibold text-studio-muted hover:text-studio-text bg-studio-raised border border-studio-border rounded min-h-[44px]"
          >
            {showCustom ? 'Hide custom' : 'Or type your own'}
          </button>

          <button
            type="button"
            onClick={onSurprise}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-studio-accent bg-studio-raised hover:bg-studio-accent/15 border border-studio-border hover:border-studio-accent rounded min-h-[44px]"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Surprise me</span>
          </button>
        </div>
      </div>
    </div>
  );
}
