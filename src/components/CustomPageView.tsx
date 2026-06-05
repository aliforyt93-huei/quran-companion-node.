import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, User, Eye, Sparkles, AlertCircle, RefreshCw, 
  BookOpen, Globe, Link, Heart, ArrowRight, MessageSquareCode
} from 'lucide-react';
import { CMSPage } from '../types';
import { motion } from 'motion/react';

interface CustomPageViewProps {
  slug: string;
  onClose: () => void;
  theme: string;
  onOpenBot: () => void;
}

export function CustomPageView({ slug, onClose, theme, onOpenBot }: CustomPageViewProps) {
  const [page, setPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suggested Pages block
  const [suggestedPages, setSuggestedPages] = useState<CMSPage[]>([]);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pages/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`The requested page '/page/${slug}' was not found.`);
          }
          throw new Error('Could not synchronize text with the server.');
        }
        const data = await res.json();
        setPage(data);
        
        // Match head titles immediately
        document.title = data.seoTitle || data.title;

        // Fetch companion list for quick sidebar links
        const listRes = await fetch('/api/pages');
        if (listRes.ok) {
          const listData = await listRes.json();
          // Filter out current page and take published ones
          setSuggestedPages(listData.filter((p: CMSPage) => p.slug !== slug && p.status === 'published'));
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'An error occurred while loading this page.');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  // STYLES MATCHER
  const outerBg = theme === 'sepia' ? 'bg-[#f4ecd8]' : theme === 'oled' ? 'bg-black' : theme === 'emerald' ? 'bg-[#0b1412]' : 'bg-[#05020a]/80';
  const textPrimary = theme === 'sepia' ? 'text-[#2d1b0d]' : theme === 'emerald' ? 'text-[#ebf3f1]' : 'text-white';
  const textSecondary = theme === 'sepia' ? 'text-amber-900/60' : theme === 'emerald' ? 'text-[#a2b0ac]' : 'text-neutral-400';
  const cardBg = theme === 'sepia' ? 'bg-[#fcf8f2] border-amber-950/10' : theme === 'oled' ? 'bg-neutral-900/60 border-neutral-800' : theme === 'emerald' ? 'bg-[#13201d]/60 border-[#2d5048]/30' : 'bg-white/[0.02] border-white/5';
  const borderCol = theme === 'sepia' ? 'border-amber-950/15' : theme === 'emerald' ? 'border-[#2d5048]/25' : 'border-white/10';

  return (
    <div className={`min-h-screen ${outerBg} transition-all duration-500 py-24 pb-48 px-4 md:px-8 font-sans mb-10`}>
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Editorial Subnavigation */}
        <div className="flex items-center justify-between border-b pb-4 border-neutral-800">
          <button
            onClick={onClose}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-full border text-xs font-bold transition-all ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-amber-955 border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-900/20 text-[#caae7a] border-[#2d5048]/30 hover:bg-emerald-900/35'
                  : 'bg-white/5 text-white border-white/5 hover:bg-white/10'
            }`}
          >
            <ArrowLeft size={14} />
            <span>Back to Quran</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'}`}>
              Crawl-optimized Node
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <RefreshCw size={40} className={`animate-spin ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-500'}`} />
            <p className={`text-sm ${textSecondary}`}>Pre-rendering page structure...</p>
          </div>
        ) : error ? (
          <div className={`p-8 rounded-2xl border text-center space-y-4 max-w-lg mx-auto ${cardBg}`}>
            <AlertCircle size={40} className="text-red-400 mx-auto" />
            <div>
              <h3 className={`font-bold text-lg ${textPrimary}`}>Page Load failed</h3>
              <p className={`text-xs ${textSecondary} mt-1`}>{error}</p>
            </div>
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                theme === 'sepia'
                  ? 'bg-amber-800 hover:bg-amber-900 text-[#fcf8f2]'
                  : theme === 'emerald'
                    ? 'bg-[#caae7a] hover:bg-[#b09664] text-[#07130e]'
                    : 'bg-indigo-600 hover:bg-indigo-550 text-white'
              }`}
            >
              Back to Home
            </button>
          </div>
        ) : !page ? (
          <div className="text-center py-20">Page is empty.</div>
        ) : (
          <div className="grid md:grid-cols-4 gap-8 md:gap-12 items-start text-left">
            
            {/* Lf - MAIN WRITTEN SPREAD (PROSE COLUMNS: 3) */}
            <div className="md:col-span-3 space-y-8">
              
              {/* Header block with customized SEO H1 */}
              <header className="space-y-4">
                <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${textPrimary} leading-tight`}>
                  {page.seoH1 || page.title}
                </h1>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-neutral-500 font-sans border-b border-dashed pb-5 border-neutral-850">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    <span>Last Updated: {new Date(page.modified).toLocaleDateString()}</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <User size={13} />
                    <span>Author: Scholars Team</span>
                  </span>
                  <span>&bull;</span>
                  <span className={`flex items-center gap-1 font-mono ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'}`}>
                    <Link size={12} />
                    <span>/page/{page.slug}</span>
                  </span>
                </div>
              </header>

              {/* Page body content pre-parsing markdown */}
              <article className={`prose prose-invert max-w-none text-base md:text-lg leading-relaxed space-y-6 ${textPrimary}`}>
                {page.content ? (
                  page.content.split('\n\n').map((para, i) => {
                    const trimmed = para.trim();
                    if (trimmed.startsWith('# ')) {
                      return <h1 key={i} className="text-xl md:text-2xl font-extrabold tracking-tight mt-8 pb-1.5 border-b border-neutral-800">{trimmed.substring(2)}</h1>;
                    } else if (trimmed.startsWith('## ')) {
                      return <h2 key={i} className="text-lg md:text-xl font-bold mt-7 pb-1">{trimmed.substring(3)}</h2>;
                    } else if (trimmed.startsWith('### ')) {
                      return <h3 key={i} className="text-base md:text-lg font-bold mt-6">{trimmed.substring(4)}</h3>;
                    } else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
                      const checked = trimmed.startsWith('- [x] ');
                      return (
                        <div key={i} className="flex items-center gap-3 py-1 text-sm pl-2">
                          <input type="checkbox" checked={checked} disabled className={`rounded bg-transparent focus:ring-0 ${
                            theme === 'sepia'
                              ? 'border-amber-900/40 text-amber-800'
                              : theme === 'emerald'
                                ? 'border-[#caae7a]/40 text-[#caae7a]'
                                : 'border-neutral-700 text-indigo-600'
                          }`} />
                          <span>{trimmed.substring(6)}</span>
                        </div>
                      );
                    } else if (trimmed.startsWith('- ')) {
                      return (
                        <ul key={i} className="list-disc pl-6 space-y-1.5 text-sm md:text-base">
                          <li>{trimmed.substring(2)}</li>
                        </ul>
                      );
                    } else if (trimmed.startsWith('> ')) {
                      return (
                        <blockquote key={i} className={`border-l-4 pl-4 py-2 italic my-4 rounded-r-lg text-sm md:text-base ${
                          theme === 'sepia' 
                            ? 'border-amber-805 bg-amber-900/5' 
                            : theme === 'emerald'
                              ? 'border-[#caae7a] bg-[#1a2c28]/40'
                              : 'border-indigo-500 bg-indigo-500/5'
                        }`}>
                          {trimmed.substring(2)}
                        </blockquote>
                      );
                    }
                    return <p key={i} className="text-sm md:text-base text-justify" dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>') }} />;
                  })
                ) : (
                  <p className="text-neutral-500 italic">No content has been added to this page block.</p>
                )}
              </article>

              {/* Bot consultation booster widget */}
              <div className={`p-6 rounded-2xl border mt-8 space-y-4 ${cardBg}`}>
                <div className="flex gap-4">
                  <div className={`p-3 rounded-xl text-white self-start ${
                    theme === 'sepia'
                      ? 'bg-amber-805 text-white bg-amber-800'
                      : theme === 'emerald'
                        ? 'bg-[#caae7a] text-[#0a1210]'
                        : 'bg-indigo-600'
                  }`}>
                    <MessageSquareCode size={22} />
                  </div>
                  <div className="space-y-1 text-left">
                    <h4 className={`font-bold text-sm ${textPrimary}`}>Consult AI Al-Mualim</h4>
                    <p className={`text-xs leading-relaxed ${textSecondary}`}>
                      Have theological queries or specific layout requests regarding *&quot;{page.title}&quot;*? Launch Al-Mualim's scholarly intelligence hotline now.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onOpenBot}
                  className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                    theme === 'sepia'
                      ? 'bg-amber-800 hover:bg-amber-900 text-[#fcf8f2] shadow-amber-900/10'
                      : theme === 'emerald'
                        ? 'bg-[#caae7a] hover:bg-[#b09664] text-[#0a1210] shadow-emerald-950/20'
                        : 'bg-indigo-600 hover:bg-indigo-550 text-white shadow-indigo-650/20'
                  }`}
                >
                  <Sparkles size={14} className="animate-pulse" />
                  <span>Ask Al-Mualim about this</span>
                </button>
              </div>

            </div>

            {/* Rt - SIDEBAR FOR FURTHER PORTALS (PROSE COLUMNS: 1) */}
            <div className="space-y-6">
              
              {suggestedPages.length > 0 && (
                <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${textPrimary}`}>
                    <BookOpen size={14} className={theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} />
                    <span>Other Resources</span>
                  </h4>
                  
                  <div className="grid gap-3 text-left">
                    {suggestedPages.map((sp) => (
                      <button
                        key={sp.id}
                        onClick={() => {
                          const targetPath = `/page/${sp.slug}`;
                          try {
                            window.history.pushState({}, '', targetPath);
                          } catch (e) {
                            console.warn("Failed to pushState in sandbox:", e);
                            try {
                              window.location.hash = '#' + targetPath;
                            } catch (_) {}
                          }
                          window.dispatchEvent(new Event('popstate'));
                        }}
                        className={`p-3 rounded-lg border text-xs font-semibold leading-relaxed text-left transition-all block w-full ${borderCol} ${
                          theme === 'sepia'
                            ? 'hover:border-amber-800/40 hover:text-amber-850'
                            : theme === 'emerald'
                              ? 'hover:border-[#caae7a]/40 hover:text-[#caae7a]'
                              : 'hover:border-indigo-500/40 hover:text-indigo-400'
                        }`}
                      >
                        <div className={`font-bold ${textPrimary} truncate`}>{sp.title}</div>
                        <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                          <span>Read insights</span>
                          <ArrowRight size={10} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO Index Parameters */}
              <div className={`p-5 rounded-2xl border text-xs space-y-3.5 ${cardBg}`}>
                <h4 className={`font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 ${textPrimary}`}>
                  <Globe size={13} className="text-green-400" />
                  <span>Search Visibility</span>
                </h4>

                <div className="space-y-2 text-neutral-400">
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Index Status:</span>
                    <span className="text-green-400 font-bold">Crawled &amp; Active</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Canonical URL:</span>
                    <span className={`font-mono truncate max-w-[120px] ${theme === 'sepia' ? 'text-amber-805' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'}`} title={`/page/${page.slug}`}>/page/{page.slug}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Robots:</span>
                    <span className="text-neutral-300 font-bold">{page.seoRobots || 'index, follow'}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
