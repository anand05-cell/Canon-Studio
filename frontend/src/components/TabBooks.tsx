import { useState, useEffect } from 'react';
import { api, triggerDownload } from '../api';
import type { Book, User } from '../types';
import {
  BookOpen,
  Search,
  Star,
  Heart,
  Award,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  Download
} from 'lucide-react';
import { VoiceNarratorButton } from './VoiceNarratorButton';
import { TTS_ENABLED } from '../featureFlags';

interface TabBooksProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onNavigateTab?: (tab: 'wizard' | 'branching' | 'writer' | 'books') => void;
}

export function TabBooks({ currentUser, onOpenAuth }: TabBooksProps) {
  const [viewMode, setViewMode] = useState<'browse' | 'best'>('browse');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [minRating, setMinRating] = useState('any');
  const [sortOption, setSortOption] = useState('newest');

  // Active Reader Modal
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number>(0);
  const [readerFeedback, setReaderFeedback] = useState<string | null>(null);

  const loadBrowseBooks = async () => {
    setLoading(true);
    try {
      const data = await api.getBooks({
        search: searchQuery,
        genre: selectedGenre,
        minRating,
        sort: sortOption
      });
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBestBooks = async () => {
    setLoading(true);
    try {
      const data = await api.getBestBooks();
      setBooks(data.books);
    } catch (err) {
      console.error('Failed to load best books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'browse') {
      loadBrowseBooks();
    } else {
      loadBestBooks();
    }
  }, [viewMode, searchQuery, selectedGenre, minRating, sortOption, currentUser]);

  // Open Reader Modal
  const handleOpenReader = (book: Book) => {
    setReadingBook(book);
    setActiveEpisodeIndex(0);
    setReaderFeedback(null);
  };

  // Like Toggle
  const handleToggleLike = async (bookId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setReaderFeedback(null);

    try {
      const res = await api.toggleLike(bookId);
      // Update locally
      setBooks(prev =>
        prev.map(b =>
          b.id === bookId
            ? { ...b, userHasLiked: res.liked, likesCount: res.totalLikes }
            : b
        )
      );
      if (readingBook && readingBook.id === bookId) {
        setReadingBook({
          ...readingBook,
          userHasLiked: res.liked,
          likesCount: res.totalLikes
        });
      }
    } catch (err: any) {
      setReaderFeedback(err.message || 'Failed to update like');
    }
  };

  // Rate Book (1-5)
  const handleRateBook = async (bookId: string, score: number) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setReaderFeedback(null);

    try {
      const res = await api.rateBook(bookId, score);
      setBooks(prev =>
        prev.map(b =>
          b.id === bookId
            ? {
                ...b,
                avgRating: res.avgRating,
                ratingCount: res.totalRatings,
                userRating: res.userRating
              }
            : b
        )
      );
      if (readingBook && readingBook.id === bookId) {
        setReadingBook({
          ...readingBook,
          avgRating: res.avgRating,
          ratingCount: res.totalRatings,
          userRating: res.userRating
        });
      }
      setReaderFeedback(`Your ${score}-star rating has been recorded.`);
    } catch (err: any) {
      setReaderFeedback(err.message || 'Failed to record rating');
    }
  };

  // Export Book
  const [isExporting, setIsExporting] = useState(false);
  const handleExportBook = async (bookId: string, format: 'fountain' | 'markdown' | 'txt') => {
    setIsExporting(true);
    try {
      const data = await api.exportBook(bookId, format);
      triggerDownload(data.content, data.filename, data.mimeType);
      setReaderFeedback(`Exported as ${data.filename}!`);
    } catch (err: any) {
      setReaderFeedback(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const genresList = [
    'all', 'Sci-fi', 'Thriller', 'Horror', 'Fantasy', 'Delulu',
    'Romantic', 'Mystery', 'Crime', 'Comedy', 'Adventure'
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 md:py-10 space-y-6">
      
      {/* Top Header & Sub-Navigation */}
      {/* Top Header & Sub-Navigation in Enchanted Forest */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D7C397]/60 pb-4">
        <div>
          <div className="text-xs font-semibold text-[#58745C] dark:text-sky-400 uppercase tracking-widest">
            The Grand Archive &bull; Serialized Sagas
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#101C19] dark:text-white mt-0.5">
            Canon Library
          </h1>
        </div>

        {/* View Switcher: Browse vs Best Books Top 20 */}
        <div className="flex items-center gap-1 bg-[#F4F0E5] dark:bg-slate-900 border border-[#D7C397] dark:border-slate-700 rounded-xl p-1">
          <button
            onClick={() => setViewMode('browse')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[44px] cursor-pointer ${
              viewMode === 'browse'
                ? 'bg-[#101C19] text-[#E9E2CE] dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                : 'text-[#263F35] dark:text-slate-300 hover:text-[#101C19]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Stories</span>
          </button>
          <button
            onClick={() => setViewMode('best')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[44px] cursor-pointer ${
              viewMode === 'best'
                ? 'bg-[#101C19] text-[#E9E2CE] dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                : 'text-[#263F35] dark:text-slate-300 hover:text-[#101C19]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#C1A66B]" />
            <span>Best Books (Top 20)</span>
          </button>
        </div>
      </div>

      {/* --- BEST BOOKS VIEW: FORMULA EXPLANATION CARD --- */}
      {viewMode === 'best' && (
        <div className="bg-[#FAF9F3] dark:bg-slate-900 border border-[#D7C397] dark:border-slate-700 rounded-2xl p-5 md:p-6 space-y-3 shadow-md">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#C1A66B]" />
            <h2 className="text-lg font-serif font-bold text-[#101C19] dark:text-white">
              The Bayesian Ranking Formula
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#263F35] dark:text-slate-300 leading-relaxed">
            Unlike crude arithmetic averages where a story with a single 5-star vote ranks above classics with hundreds of fans, Canon Studio uses an equilibrium formula:
          </p>

          <div className="p-3 bg-[#F4F0E5] dark:bg-slate-800 border border-[#D7C397] dark:border-slate-700 rounded-xl font-mono text-xs sm:text-sm text-[#101C19] dark:text-sky-300 space-y-1">
            <div>score = weighted rating + 0.5 &times; log10(1 + likes)</div>
            <div className="text-xs text-[#87977A]">where weighted rating = (n &times; avg + 3 &times; globalMean) / (n + 3)</div>
          </div>

          <p className="text-xs text-[#87977A] dark:text-slate-400">
            The prior parameter (3 reviews anchored at the library global average) prevents vote manipulation, while the logarithmic likes bonus rewards sustained audience engagement without drowning out critical quality.
          </p>
        </div>
      )}

      {/* --- BROWSE CONTROLS: SEARCH, GENRE, MIN RATING, SORT --- */}
      {viewMode === 'browse' && (
        <div className="bg-[#FAF9F3] dark:bg-slate-900 border border-[#D7C397] dark:border-slate-700 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#87977A] absolute left-3 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, blurb, author..."
                className="w-full bg-[#F4F0E5] dark:bg-slate-800 border border-[#D7C397] dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-[#101C19] dark:text-white placeholder:text-[#87977A] focus:border-[#101C19] min-h-[44px]"
              />
            </div>

            {/* Genre Select */}
            <div>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#F4F0E5] dark:bg-slate-800 border border-[#D7C397] dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-[#101C19] dark:text-white focus:border-[#101C19] min-h-[44px]"
              >
                {genresList.map(g => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'All Genres' : g}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Rating Filter */}
            <div>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2 text-xs text-studio-text focus:border-studio-accent min-h-[44px]"
              >
                <option value="any">Rating: Any</option>
                <option value="3">Rating: 3+ Stars</option>
                <option value="4">Rating: 4+ Stars</option>
              </select>
            </div>

            {/* Sort Select */}
            <div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2 text-xs text-studio-text focus:border-studio-accent min-h-[44px]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="likes">Sort: Most Liked</option>
                <option value="rating">Sort: Highest Rated</option>
                <option value="episodes">Sort: Most Episodes</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* --- STORIES LISTING GRID --- */}
      {loading ? (
        <div className="py-16 text-center text-studio-muted space-y-3">
          <div className="w-8 h-8 border-2 border-studio-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="font-serif text-sm">Browsing library catalog...</div>
        </div>
      ) : books.length === 0 ? (
        /* Empty State */
        <div className="bg-studio-card border border-studio-border rounded-lg p-12 text-center max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-studio-muted mx-auto mb-3" />
          <h3 className="font-serif font-bold text-lg text-studio-text mb-1">
            No Stories Found
          </h3>
          <p className="text-xs text-studio-muted mb-4">
            {searchQuery
              ? `No published sagas matched "${searchQuery}". Try adjusting your filters.`
              : 'There are currently no published stories in this category.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedGenre('all'); setMinRating('any'); }}
              className="px-4 py-2 bg-studio-raised border border-studio-border text-xs text-studio-accent rounded min-h-[44px]"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((book) => {
            return (
              <div
                key={book.id}
                className="bg-[#FAF9F3] dark:bg-slate-900 border border-[#D7C397] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-[#C1A66B] transition-all shadow-sm hover:shadow-md relative group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E9E2CE] dark:bg-slate-800 border border-[#D7C397]/70 text-[#101C19] dark:text-white font-bold text-[11px]">
                      {book.genre}
                    </span>

                    {/* Rank Badge for Best Books */}
                    {book.rank && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#C1A66B] text-[#101C19] font-serif font-extrabold text-xs shadow-xs">
                        #{book.rank}
                      </span>
                    )}

                    <span className="text-[#87977A] text-[11px] flex items-center gap-1 font-medium">
                      <Layers className="w-3 h-3" />
                      <span>{book.episodeCount} eps</span>
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-lg text-[#101C19] dark:text-white mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <div className="text-xs text-[#87977A] mb-3">
                    by <span className="text-[#58745C] dark:text-sky-300 font-semibold">{book.authorName}</span>
                  </div>

                  <p className="text-xs text-[#263F35] dark:text-slate-300 line-clamp-3 leading-relaxed mb-4">
                    {book.blurb || 'No blurb provided.'}
                  </p>
                </div>

                {/* Card Footer: Rating, Likes & Read Button */}
                <div className="pt-3 border-t border-[#D7C397]/50 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    {/* Stars & Count */}
                    <div className="flex items-center gap-1.5 text-[#101C19] dark:text-white">
                      <Star className="w-3.5 h-3.5 fill-[#C1A66B] text-[#C1A66B]" />
                      <span className="font-bold">{book.avgRating > 0 ? book.avgRating : '—'}</span>
                      <span className="text-[11px] text-[#87977A]">({book.ratingCount})</span>
                    </div>

                    {/* Likes Count */}
                    <div className="flex items-center gap-1.5 text-[#87977A]">
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          book.userHasLiked ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                      <span>{book.likesCount}</span>
                    </div>

                    {book.bestRankScore && (
                      <span className="text-[10px] text-[#C1A66B] font-mono font-bold">
                        Score: {book.bestRankScore}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenReader(book)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#101C19] hover:bg-[#263F35] text-[#E9E2CE] text-xs font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] min-h-[44px] cursor-pointer"
                  >
                    <span>Read Story</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C1A66B]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- READER MODAL --- */}
      {readingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-studio-card border border-studio-border rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-studio-text relative">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-studio-border flex items-center justify-between">
              <div>
                <span className="text-xs text-studio-accent uppercase tracking-wider font-semibold">
                  {readingBook.genre} &bull; Episode {activeEpisodeIndex + 1} of {readingBook.episodes.length}
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-studio-text">
                  {readingBook.title}
                </h2>
                <div className="text-xs text-studio-muted">
                  Written by {readingBook.authorName}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {TTS_ENABLED && <VoiceNarratorButton />}
                {/* Export Options for Reader */}
                <div className="flex items-center gap-1 bg-studio-bg border border-studio-border rounded p-1">
                  <span className="text-[11px] text-studio-muted font-medium px-1.5 flex items-center gap-1">
                    <Download className="w-3.5 h-3.5 text-studio-accent" />
                    <span className="hidden sm:inline">Export:</span>
                  </span>
                  <button
                    onClick={() => handleExportBook(readingBook.id, 'fountain')}
                    disabled={isExporting}
                    title="Export Screenplay (.fountain)"
                    className="px-2 py-1 text-[11px] bg-studio-raised hover:bg-studio-accent hover:text-studio-bg text-studio-text rounded font-mono font-medium transition-colors min-h-[36px]"
                  >
                    .fountain
                  </button>
                  <button
                    onClick={() => handleExportBook(readingBook.id, 'markdown')}
                    disabled={isExporting}
                    title="Export Markdown (.md)"
                    className="px-2 py-1 text-[11px] bg-studio-raised hover:bg-studio-accent hover:text-studio-bg text-studio-text rounded font-mono font-medium transition-colors min-h-[36px]"
                  >
                    .md
                  </button>
                  <button
                    onClick={() => handleExportBook(readingBook.id, 'txt')}
                    disabled={isExporting}
                    title="Export Plain Text (.txt)"
                    className="px-2 py-1 text-[11px] bg-studio-raised hover:bg-studio-accent hover:text-studio-bg text-studio-text rounded font-mono font-medium transition-colors min-h-[36px]"
                  >
                    .txt
                  </button>
                </div>

                <button
                  onClick={() => setReadingBook(null)}
                  className="p-2 text-studio-muted hover:text-studio-text rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close reader"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4 font-serif text-base sm:text-lg leading-relaxed text-studio-text">
              {/* Cinematic Scene Concept Art */}
              {readingBook.episodes[activeEpisodeIndex]?.imageUrl && (
                <div className="relative rounded-lg overflow-hidden border border-studio-border mb-6 bg-black/40 shadow-xl">
                  <img
                    src={readingBook.episodes[activeEpisodeIndex].imageUrl}
                    alt={readingBook.episodes[activeEpisodeIndex].imagePrompt || readingBook.title}
                    className="w-full h-56 sm:h-72 object-cover"
                    loading="lazy"
                  />
                  {readingBook.episodes[activeEpisodeIndex].imagePrompt && (
                    <div className="p-3 bg-studio-raised border-t border-studio-border text-xs text-studio-muted italic font-sans flex items-center justify-between gap-2">
                      <span className="line-clamp-1">🎬 Concept Art: &ldquo;{readingBook.episodes[activeEpisodeIndex].imagePrompt}&rdquo;</span>
                      <span className="text-[10px] uppercase font-bold text-studio-accent px-1.5 py-0.5 rounded bg-studio-bg shrink-0">16:9 HD</span>
                    </div>
                  )}
                </div>
              )}

              <h3 className="font-serif font-bold text-xl text-studio-accent border-b border-studio-border/50 pb-2">
                {readingBook.episodes[activeEpisodeIndex]?.title || `Episode ${activeEpisodeIndex + 1}`}
              </h3>

              <div className="whitespace-pre-line">
                {readingBook.episodes[activeEpisodeIndex]?.content || 'This episode has no text yet.'}
              </div>
            </div>

            {/* Reader Footer Controls: Episode Pagination, Like, Rating */}
            <div className="p-4 sm:p-5 border-t border-studio-border bg-studio-raised space-y-3">
              {readerFeedback && (
                <div className="text-xs text-studio-accent text-center font-medium">
                  {readerFeedback}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Episode Pagination */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={activeEpisodeIndex === 0}
                    onClick={() => setActiveEpisodeIndex(prev => Math.max(0, prev - 1))}
                    className="flex items-center gap-1.5 px-3 py-2 bg-studio-card disabled:opacity-40 border border-studio-border text-xs rounded min-h-[44px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-studio-muted px-2">
                    {activeEpisodeIndex + 1} / {readingBook.episodes.length}
                  </span>

                  <button
                    disabled={activeEpisodeIndex >= readingBook.episodes.length - 1}
                    onClick={() => setActiveEpisodeIndex(prev => Math.min(readingBook.episodes.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-3 py-2 bg-studio-card disabled:opacity-40 border border-studio-border text-xs rounded min-h-[44px]"
                  >
                    <span>Next Episode</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Social Actions: Like & Rate */}
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  {currentUser && readingBook.authorId === currentUser.id ? (
                    <span className="text-[11px] text-studio-muted italic" title="Authors cannot like their own story">
                      Own story
                    </span>
                  ) : (
                    <button
                      onClick={() => handleToggleLike(readingBook.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded border text-xs font-semibold transition-colors min-h-[44px] ${
                        readingBook.userHasLiked
                          ? 'bg-red-950/40 border-red-500 text-red-400'
                          : 'bg-studio-card border-studio-border text-studio-text hover:border-red-500'
                      }`}
                      title={currentUser ? 'Toggle like' : 'Sign in to like'}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          readingBook.userHasLiked ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                      <span>{readingBook.likesCount}</span>
                    </button>
                  )}

                  {/* 1-5 Star Rating */}
                  {currentUser && readingBook.authorId === currentUser.id ? null : (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-studio-muted mr-1 hidden sm:inline">Rate:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRateBook(readingBook.id, star)}
                          className="p-1.5 text-studio-muted hover:text-studio-accent transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title={currentUser ? `Rate ${star} stars` : 'Sign in to rate'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              (readingBook.userRating || 0) >= star
                                ? 'fill-studio-accent text-studio-accent'
                                : ''
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
