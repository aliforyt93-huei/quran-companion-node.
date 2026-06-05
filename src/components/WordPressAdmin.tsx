import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit, Eye, Trash2, FileText, CheckCircle, AlertTriangle, 
  RefreshCw, ArrowLeft, ExternalLink, Globe, Layout, Search, BarChart3, 
  Save, Check, Link, Info, Sparkles, HelpCircle, FileCheck, CheckSquare, List,
  Settings, User, ChevronRight, LogOut, Menu, BookOpen, Send, MessageSquare
} from 'lucide-react';
import { CMSPage } from '../types';

interface WordPressAdminProps {
  onClose: () => void;
  theme: string;
  activeLanguage?: string;
  onPageCreated?: () => void;
}

export function WordPressAdmin({ onClose, theme, activeLanguage = 'en', onPageCreated }: WordPressAdminProps) {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WordPress Login Gateway state variables
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('al_mualim_admin_token'));
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Editorial modes: 'list' | 'edit' | 'create'
  const [mode, setMode] = useState<'list' | 'edit' | 'create'>('list');
  const [selectedPage, setSelectedPage] = useState<CMSPage | null>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  
  // SEO Form States
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoH1, setSeoH1] = useState('');
  const [seoRobots, setSeoRobots] = useState('index, follow');
  const [sitemapPriority, setSitemapPriority] = useState('0.6');
  
  // UI Tabs inside Page Editor
  const [editorTab, setEditorTab] = useState<'content' | 'seo' | 'preview' | 'verses'>('content');
  
  // Admin Navigation Tab
  const [activeAdminTab, setActiveAdminTab] = useState<'pages' | 'surah-pages' | 'sitemap' | 'tips' | 'knowledge-library' | 'profile'>('pages');

  // Customizable Surah Pages states
  const [editingType, setEditingType] = useState<'standard' | 'surah'>('standard');
  const [surahPages, setSurahPages] = useState<any[]>([]);
  const [surahPagesLoading, setSurahPagesLoading] = useState(false);
  const [surahSearchQuery, setSurahSearchQuery] = useState('');
  const [customIntro, setCustomIntro] = useState('');
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [translationOverrides, setTranslationOverrides] = useState<Record<string, string>>({});
  const [tafsirOverrides, setTafsirOverrides] = useState<Record<string, string>>({});
  const [surahAyahs, setSurahAyahs] = useState<any[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);

  // New Secure Profile, Registration & Setup Onboarding States
  const [siteInitialized, setSiteInitialized] = useState<boolean | null>(null);
  const [signupMode, setSignupMode] = useState(false);
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  // Profile field parameters state
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // RAG Admin States
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSource, setUploadSource] = useState('');
  const [uploadCategory, setUploadCategory] = useState('user-upload');
  const [uploadContent, setUploadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Hovered row ID for classic WP options list
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Submit username/email & password authenticate to secure endpoint
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }
      localStorage.setItem('al_mualim_admin_token', data.token);
      setAuthToken(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Error: Incorrect password. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('al_mualim_admin_token');
    setAuthToken(null);
    setLoginPassword('');
    setLoginError(null);
  };

  const checkLoginStatus = useCallback(async () => {
    try {
      const resInit = await fetch('/api/admin/status');
      if (resInit.ok) {
        const dataInit = await resInit.json();
        setSiteInitialized(dataInit.initialized);
        if (!dataInit.initialized) {
          setSignupMode(true);
        }
      }
    } catch (err) {
      console.error("Failed to query administration setup status:", err);
    }
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  useEffect(() => {
    if (authToken) {
      const fetchProfile = async () => {
        try {
          const res = await fetch('/api/admin/me', {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setProfileUsername(data.username);
            setProfileEmail(data.email);
            setLoginUsername(data.username);
          }
        } catch (err) {
          console.error("Failed to fetch admin profile:", err);
        }
      };
      fetchProfile();
    }
  }, [authToken]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const res = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          newUsername: profileUsername,
          newEmail: profileEmail,
          currentPassword: profileConfirmPassword,
          newPassword: profileNewPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Profile authentication and update failed.");
      }

      setProfileMessage("Your admin credentials have been successfully updated and saved safely!");
      setProfileNewPassword('');
      setProfileConfirmPassword('');
      setLoginUsername(profileUsername);
    } catch (err: any) {
      setProfileError(err.message || "An issue occurred updating credentials.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);

    try {
      const res = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUsername,
          email: signupEmail,
          password: signupPassword,
          setupCode: setupCode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Administrative registration failed.");
      }

      setSignupUsername('');
      setSignupEmail('');
      setSignupPassword('');
      setSetupCode('');
      setSignupMode(false);
      setSiteInitialized(true);
      setLoginUsername(signupUsername);
    } catch (err: any) {
      setSignupError(err.message || "An issue occurred registering administrator details.");
    } finally {
      setSignupLoading(false);
    }
  };

  const fetchRagDocs = async () => {
    try {
      const res = await fetch('/api/rag/documents');
      if (res.ok) {
        const data = await res.json();
        setRagDocs(data);
      }
    } catch (err) {
      console.error("Failed to fetch RAG documents:", err);
    }
  };

  const fetchRagSettings = async () => {
    try {
      const res = await fetch('/api/rag/settings');
      if (res.ok) {
        const data = await res.json();
        setRagEnabled(data.ragEnabled);
      }
    } catch (err) {
      console.error("Failed to fetch RAG status settings:", err);
    }
  };

  const handleToggleRagGlobal = async (newValue: boolean) => {
    try {
      const res = await fetch('/api/rag/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ragEnabled: newValue })
      });
      if (res.ok) {
        const data = await res.json();
        setRagEnabled(data.ragEnabled);
      }
    } catch (err) {
      console.error("Failed to set RAG status settings:", err);
    }
  };

  const handleCustomUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadSource || !uploadContent) return;

    setIsUploading(true);
    try {
      const res = await fetch('/api/rag/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          source: uploadSource,
          category: uploadCategory,
          content: uploadContent
        })
      });

      if (res.ok) {
        setUploadTitle('');
        setUploadSource('');
        setUploadCategory('user-upload');
        setUploadContent('');
        fetchRagDocs();
      }
    } catch (err) {
      console.error("Failed to upload custom scholarly text:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        const title = file.name.replace(/\.[^/.]+$/, "");
        const response = await fetch('/api/rag/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            source: "Uploaded File",
            category: "user-upload",
            content: text
          })
        });

        if (response.ok) {
          fetchRagDocs();
        }
      } catch (err) {
        console.error("Failed to upload file content:", err);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document from the library?")) return;
    try {
      const res = await fetch(`/api/rag/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRagDocs();
      }
    } catch (err) {
      console.error("Failed to delete custom document:", err);
    }
  };

  const handleToggleDoc = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/rag/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive })
      });
      if (res.ok) {
        setRagDocs(prev => prev.map(d => d.id === id ? { ...d, isActive } : d));
      }
    } catch (err) {
      console.error("Failed to toggle document:", err);
    }
  };

  // Load pages from server
  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pages');
      if (!res.ok) throw new Error('Failed to retrieve pages database.');
      const data = await res.json();
      setPages(data);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error syncing server files.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSurahPages = useCallback(async () => {
    setSurahPagesLoading(true);
    try {
      const res = await fetch('/api/surah-pages');
      if (res.ok) {
        const data = await res.json();
        setSurahPages(data);
      }
    } catch (e) {
      console.error("Failed to fetch surah pages:", e);
    } finally {
      setSurahPagesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
    fetchSurahPages();
    fetchRagDocs();
    fetchRagSettings();
  }, [fetchPages, fetchSurahPages]);

  // Sync slug automatically with title in Create mode
  useEffect(() => {
    if (mode === 'create') {
      const computedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setSlug(computedSlug);
      setSeoTitle(title ? `${title} - Al-Mualim Scholar Gateway` : '');
      setSeoH1(title);
    }
  }, [title, mode]);

  const handleStartCreate = () => {
    setEditingType('standard');
    setTitle('');
    setSlug('');
    setContent('');
    setStatus('draft');
    setSeoTitle('');
    setSeoDescription('');
    setSeoKeywords('');
    setSeoH1('');
    setSeoRobots('index, follow');
    setSitemapPriority('0.6');
    setSelectedPage(null);
    setEditorTab('content');
    setMode('create');
  };

  const handleStartEdit = (page: CMSPage) => {
    setEditingType('standard');
    setSelectedPage(page);
    setTitle(page.title);
    setSlug(page.slug);
    setContent(page.content);
    setStatus(page.status);
    setSeoTitle(page.seoTitle || page.title);
    setSeoDescription(page.seoDescription || '');
    setSeoKeywords(page.seoKeywords || '');
    setSeoH1(page.seoH1 || page.title);
    setSeoRobots(page.seoRobots || 'index, follow');
    setSitemapPriority(page.sitemapPriority || '0.6');
    setEditorTab('content');
    setMode('edit');
  };

  const handleStartEditSurah = async (page: any) => {
    setEditingType('surah');
    setSelectedPage(page);
    setTitle(page.title);
    setSlug(page.slug);
    setStatus(page.status || 'published');
    setSeoTitle(page.seoTitle || '');
    setSeoDescription(page.seoDescription || '');
    setSeoKeywords(page.seoKeywords || '');
    setSeoH1(page.seoH1 || page.title || '');
    setCustomIntro(page.customIntro || '');
    setCustomAudioUrl(page.customAudioUrl || '');
    setTranslationOverrides(page.translationOverrides || {});
    setTafsirOverrides(page.tafsirOverrides || {});
    setEditorTab('content');
    setMode('edit');

    // Fetch Ayahs of this Surah to show them in the Verse Customizer!
    setLoadingAyahs(true);
    setSurahAyahs([]);
    try {
      const url = `https://api.alquran.cloud/v1/surah/${page.surahNumber}/editions/quran-uthmani,en.sahih`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.status === "OK" && json.data && json.data.length >= 2) {
          // Format ayahs: zip Arabic with English
          const arabicList = json.data[0].ayahs;
          const englishList = json.data[1].ayahs;
          const zipped = arabicList.map((a: any, index: number) => ({
            numberInSurah: a.numberInSurah,
            arabicText: a.text,
            englishTranslation: englishList[index].text
          }));
          setSurahAyahs(zipped);
        }
      }
    } catch (err) {
      console.warn("Failed fetch original ayahs for editor preview:", err);
    } finally {
      setLoadingAyahs(false);
    }
  };

  const handleDelete = async (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (!window.confirm('Are you absolutely sure you want to delete this page? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/pages/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error('Deletion failed.');
      fetchPages();
      if (onPageCreated) onPageCreated();
    } catch (e: any) {
      alert(e.message || 'Failed to delete page.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      alert('Page Title and URL Permalink slug are required.');
      return;
    }

    if (editingType === 'surah') {
      const payload = {
        title,
        status,
        seoTitle,
        seoDescription,
        seoKeywords,
        seoH1,
        customIntro,
        customAudioUrl,
        translationOverrides,
        tafsirOverrides
      };

      try {
        const res = await fetch(`/api/surah-pages/${selectedPage?.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save Surah page.');
        }

        setMode('list');
        fetchSurahPages();
        if (onPageCreated) onPageCreated();
      } catch (e: any) {
        alert(e.message || 'Failed to persist Surah page data.');
      }
      return;
    }

    const payload = {
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"),
      content,
      status,
      seoTitle: seoTitle || title,
      seoDescription,
      seoKeywords,
      seoH1: seoH1 || title,
      seoRobots,
      sitemapPriority
    };

    try {
      const url = mode === 'create' ? '/api/pages' : `/api/pages/${selectedPage?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save page contents.');
      }

      setMode('list');
      fetchPages();
      if (onPageCreated) onPageCreated();
    } catch (e: any) {
      alert(e.message || 'Failed to persist pages data.');
    }
  };

  // Helper formatting for editor content textarea
  const insertMarkdown = (syntax: string) => {
    const textarea = document.getElementById('gutenberg-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    let replacement = '';
    if (syntax === 'h2') replacement = `\n## ${selection || 'Heading 2'}\n`;
    else if (syntax === 'h3') replacement = `\n### ${selection || 'Heading 3'}\n`;
    else if (syntax === 'bold') replacement = `**${selection || 'Bold Text'}**`;
    else if (syntax === 'italic') replacement = `*${selection || 'Italic Text'}*`;
    else if (syntax === 'list') replacement = `\n- ${selection || 'List item'}\n`;
    else if (syntax === 'block') replacement = `\n> ${selection || 'Noble Quran Quote Translation'}\n`;
    else if (syntax === 'check') replacement = `\n- [ ] ${selection || 'Action element'}\n`;

    const updatedText = text.substring(0, start) + replacement + text.substring(end);
    setContent(updatedText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // REAL-TIME SEO HEALTH SCANNER AND AUDIT
  const analyzeSeo = () => {
    const reports = [];
    let score = 100;

    // 1. Title test
    if (!seoTitle) {
      reports.push({ level: 'danger', msg: 'SEO Meta Title is completely missing!' });
      score -= 30;
    } else if (seoTitle.length < 30) {
      reports.push({ level: 'warning', msg: 'Title too short. Ideal length is 40-65 chars.' });
      score -= 10;
    } else if (seoTitle.length > 65) {
      reports.push({ level: 'warning', msg: 'Title too long (above 65 characters).' });
      score -= 10;
    } else {
      reports.push({ level: 'success', msg: 'SEO Title length matches best practices.' });
    }

    // 2. Meta description test
    if (!seoDescription) {
      reports.push({ level: 'danger', msg: 'Meta Description is missing for search bots.' });
      score -= 30;
    } else if (seoDescription.length < 100) {
      reports.push({ level: 'warning', msg: 'Description too brief (needs at least 100 chars).' });
      score -= 10;
    } else if (seoDescription.length > 165) {
      reports.push({ level: 'warning', msg: 'Description is too long (keep below 160 chars).' });
      score -= 10;
    } else {
      reports.push({ level: 'success', msg: 'Meta Description is perfectly optimized.' });
    }

    // 3. Header density
    if (!seoH1) {
      reports.push({ level: 'warning', msg: 'Custom H1 Heading is missing. Using default Title.' });
      score -= 5;
    }

    // 4. Keyword presence
    if (seoKeywords) {
      const keywordsList = seoKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      const textLower = content.toLowerCase();
      let keywordHits = 0;

      keywordsList.forEach(k => {
        if (textLower.includes(k)) {
          keywordHits++;
        }
      });

      if (keywordHits === 0 && keywordsList.length > 0) {
        reports.push({ level: 'warning', msg: 'None of your focus keywords are found inside the main content.' });
        score -= 15;
      } else if (keywordHits < Math.ceil(keywordsList.length / 2)) {
        reports.push({ level: 'info', msg: `Low density: ${keywordHits}/${keywordsList.length} keywords match page text.` });
      } else {
        reports.push({ level: 'success', msg: `Great Keyword presence! ${keywordHits} terms found.` });
      }
    } else {
      reports.push({ level: 'info', msg: 'Configure focus keywords/tags to analyze search alignment.' });
    }

    // 5. Word count check
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 100) {
      reports.push({ level: 'warning', msg: 'Page content is too brief (below 100 words).' });
      score -= 10;
    } else {
      reports.push({ level: 'success', msg: `Superb content depth! total: ${wordCount} words.` });
    }

    return { score: Math.max(score, 10), reports };
  };

  const seoHealth = analyzeSeo();

  // WordPress Clean Login Page (when not authenticated)
  if (!authToken) {
    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#f0f0f1] flex items-center justify-center font-sans select-none p-4">
        <div className="w-[320px] py-10">
          {/* Logo / Title Area */}
          <div className="text-center mb-6">
            <a href="https://wordpress.org/" target="_blank" rel="noopener noreferrer" className="inline-block transition-opacity hover:opacity-85">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-20 h-20 mx-auto text-[#1d2327] fill-current">
                <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm199.3 256c0 10.2-.7 20.3-2 30.2L327.9 116.1c25.4-32.5 38.1-43.1 38.1-64.4 0-14.4-6.8-21.2-13.6-21.2-7.6 0-16.1 4.2-24.6 13.6l-80.5 101.7-41.5 53.4 39 122.9L320.9 443C391.8 412.3 442 341.2 443 257.2l8.3-2.6c0 .4-.1.8-.1 1.4zm-199.3 194.5c-48.3 0-93.2-16.1-129.7-43.2l53.4-146.6 37.3 103.4 39-114zm-143.2-61.9C84.3 351.9 64 292.4 64 227.1c0-21.2 3.4-41.5 9.3-61l98.3 270.3zm142.4-332.2c7.6 0 14.4 6.8 14.4 14.4 0 7.6-6.8 13.6-14.4 13.6s-13.6-6-13.6-13.6c0-7.6 6-14.4 13.6-14.4zM256 469.3c-117.8 0-213.3-95.6-213.3-213.3 0-21.7 3.2-42.6 9.3-62.4l112.5 308.2 45.3-124.2-46.7-128c11.5-2.7 21.6-4.1 27.2-4.1 9.3 0 21.4 1.6 21.4 1.6l8.8-1 9-98.3-9-1.2h-36.8L227.1 289l50 137.2 46-126.1-23.9-65.7c-9.5-2.7-18.4-4.1-26.6-4.1-9.3 0-21.4 1.6-21.4 1.6l8.8-1 30-316.3c15.1-1.1 29.8-1.7 44.9-1.7 117.8 0 213.3 95.6 213.3 213.3 0 117.8-95.6 213.3-213.3 213.3z" fillRule="evenodd"/>
              </svg>
            </a>
          </div>

          {/* Onboarding Signup Card or Login Card */}
          {signupMode ? (
            <div className="bg-white p-6 border border-[#ccd0d4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4">
              <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-2.5 text-[11px] mb-3 leading-relaxed font-sans font-medium">
                {siteInitialized === false ? (
                  <span>⚠️ Setup Required: No administrator accounts exist. Please register your administrative account below to secure the platform.</span>
                ) : (
                  <span>🔒 New Admin setup requires authorization or dynamic registration keys. Enter the requested parameters.</span>
                )}
              </div>

              {signupError && (
                <div className="bg-[#fff] border-l-4 border-[#d63638] text-[#1d2327] p-3 mb-4 text-xs shadow-sm font-sans">
                  <strong>Error:</strong> {signupError}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                {siteInitialized === false && (
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-200 inline-block mb-1">
                      Setup Code / Temporary Password
                    </label>
                    <input
                      type="password"
                      required
                      value={setupCode}
                      onChange={(e) => setSetupCode(e.target.value)}
                      className="w-full p-2 text-sm border border-amber-300 bg-amber-50/10 text-[#2c3338] outline-none focus:border-amber-500 focus:ring-[1px] focus:ring-amber-500 rounded-sm transition-all"
                      placeholder="Enter the setup code"
                    />
                    <span className="text-[9.5px] text-[#646970] block mt-1">
                      Required for first-time installation security. Found in the server logs or <code>admin-setup-password.txt</code>.
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#2c3338] block">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                    placeholder="e.g. admin"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#2c3338] block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                    placeholder="e.g. email@yourdomain.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#2c3338] block">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                    placeholder="••••••••"
                  />
                  <span className="text-[9.5px] text-[#646970] block mt-1">Minimum 8 characters length standard.</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {siteInitialized !== false && (
                    <button
                      type="button"
                      onClick={() => setSignupMode(false)}
                      className="text-xs text-[#2271b1] hover:text-[#135e96] underline cursor-pointer"
                    >
                      Back to Login
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="px-3 py-1.5 bg-[#2271b1] hover:bg-[#135e96] active:bg-[#0a4b7c] text-white border border-[#2271b1] rounded-sm text-xs font-semibold cursor-pointer shadow-sm shadow-blue-100 transition-all ml-auto"
                  >
                    {signupLoading ? 'Registering...' : 'Setup Administrator'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 border border-[#ccd0d4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4">
              {loginError && (
                <div className="bg-[#fff] border-l-4 border-[#d63638] text-[#1d2327] p-3 mb-4 text-xs shadow-sm font-sans" id="login_error">
                  <strong>Error:</strong> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#2c3338]">
                    Username or Email Address
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                    placeholder="admin"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#2c3338]">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[#2c3338]">
                    <input type="checkbox" defaultChecked className="rounded-sm border-[#8c8f94] text-[#2271b1] focus:ring-[#2271b1] w-4 h-4" />
                    <span>Remember Me</span>
                  </label>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="px-3 py-1.5 bg-[#2271b1] hover:bg-[#135e96] active:bg-[#0a4b7c] text-white border border-[#2271b1] rounded-sm text-xs font-semibold cursor-pointer shadow-sm hover:shadow active:shadow-inner"
                  >
                    {loginLoading ? 'Logging in...' : 'Log In'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex justify-between text-[11.5px] text-[#2271b1] px-1 font-sans">
            {siteInitialized && !signupMode && (
              <button
                type="button"
                onClick={() => setSignupMode(true)}
                className="hover:text-[#135e96] cursor-pointer"
              >
                Register Admin
              </button>
            )}
            {!signupMode && (
              <button
                type="button"
                onClick={() => alert('Password recovery is disabled. Please contact the system administrator.')}
                className="hover:text-[#135e96] cursor-pointer"
              >
                Lost your password?
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="hover:text-[#135e96] cursor-pointer flex items-center gap-1 ml-auto"
            >
              <span>← Go to Gateway</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED WP-ADMIN DASHBOARD THEME
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#f0f0f1] text-[#2c3338] font-sans antialiased select-text overflow-hidden h-screen w-screen">
      
      {/* 1. TOP WP ADMIN BAR */}
      <div className="h-8 bg-[#1d2327] text-[#c3c4c7] text-[13px] flex items-center justify-between px-3 shrink-0 z-50 select-none">
        <div className="flex items-center gap-4">
          {/* WordPress logo with site-visitor switcher */}
          <div className="flex items-center gap-1.5 hover:bg-[#2c3338] hover:text-white h-8 px-2 cursor-pointer transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 text-[#c3c4c7] fill-current">
              <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256s256-114.6 256-256S397.4 0 256 0zm199.3 256c0 10.2-.7 20.3-2 30.2L327.9 116.1c25.4-32.5 38.1-43.1 38.1-64.4 0-14.4-6.8-21.2-13.6-21.2-7.6 0-16.1 4.2-24.6 13.6l-80.5 101.7-41.5 53.4 39 122.9L320.9 443C391.8 412.3 442 341.2 443 257.2l8.3-2.6c0 .4-.1.8-.1 1.4zm-199.3 194.5c-48.3 0-93.2-16.1-129.7-43.2l53.4-146.6 37.3 103.4 39-114zm-143.2-61.9C84.3 351.9 64 292.4 64 227.1c0-21.2 3.4-41.5 9.3-61l98.3 270.3zm142.4-332.2c7.6 0 14.4 6.8 14.4 14.4 0 7.6-6.8 13.6-14.4 13.6s-13.6-6-13.6-13.6c0-7.6 6-14.4 13.6-14.4zM256 469.3c-117.8 0-213.3-95.6-213.3-213.3 0-21.7 3.2-42.6 9.3-62.4l112.5 308.2 45.3-124.2-46.7-128c11.5-2.7 21.6-4.1 27.2-4.1 9.3 0 21.4 1.6 21.4 1.6l8.8-1 9-98.3-9-1.2h-36.8L227.1 289l50 137.2 46-126.1-23.9-65.7c-9.5-2.7-18.4-4.1-26.6-4.1-9.3 0-21.4 1.6-21.4 1.6l8.8-1 30-316.3c15.1-1.1 29.8-1.7 44.9-1.7 117.8 0 213.3 95.6 213.3 213.3 0 117.8-95.6 213.3-213.3 213.3z" fillRule="evenodd"/>
            </svg>
            <span className="font-semibold text-xs text-white">WordPress Scholar Portal</span>
          </div>

          <div 
            onClick={onClose}
            className="hidden sm:flex items-center gap-1 hover:bg-[#2c3338] hover:text-[#72aee6] h-8 px-2 cursor-pointer transition-all"
            title="Return to user client-side application"
          >
            <Globe size={13} />
            <span className="text-[12px]">Visit Site</span>
          </div>

          <div className="hidden md:flex items-center gap-1 hover:bg-[#2c3338] hover:text-white h-8 px-2 cursor-pointer transition-all">
            <Plus size={13} />
            <span className="text-[12px]" onClick={handleStartCreate}>New Page</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User profile dropdown mock */}
          <div className="flex items-center gap-1.5 hover:bg-[#2c3338] h-8 px-2 cursor-pointer select-none">
            <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              A
            </div>
            <span className="text-white text-[12px] hidden sm:inline">Howdy, admin</span>
          </div>

          {/* Quick Exit & Logout buttons */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 h-8 hover:bg-red-700 hover:text-white text-xs text-red-400 font-semibold transition-all transition-duration-100"
            title="Terminate administrator session"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Log Out</span>
          </button>
          
          <button 
            onClick={onClose}
            className="flex items-center gap-1 px-3.5 h-8 bg-indigo-650 text-white rounded-none hover:bg-indigo-700 text-xs font-bold transition-all"
          >
            <ArrowLeft size={13} />
            <span>Exit WP</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WP ADMIN HUB SPLIT CONTAINER */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        
        {/* 2.1 LEFT WP SIDEBAR */}
        <div className="w-14 sm:w-44 md:w-48 bg-[#1d2327] text-[#f0f0f1] font-sans flex flex-col shrink-0 select-none z-40 border-r border-[#2c3338]">
          
          <ul className="flex-1 py-2 space-y-0.5 overflow-y-auto">
            {/* Pages Section Header / Parent */}
            <li>
              <button
                onClick={() => {
                  setMode('list');
                  setActiveAdminTab('pages');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs sm:text-[13px] font-medium transition-all relative ${
                  activeAdminTab === 'pages' && mode === 'list'
                    ? 'bg-[#2271b1] text-white border-l-4 border-white'
                    : 'text-[#f0f0f1] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <FileText size={16} className="shrink-0" />
                <span className="hidden sm:inline">Pages</span>
                <span className="hidden sm:inline ml-auto bg-neutral-950/40 text-[10px] px-2 py-0.5 rounded-full text-white font-mono font-bold">
                  {pages.length}
                </span>
              </button>
            </li>

            {/* Sub Items under Pages */}
            <li className="hidden sm:block">
              <div className="bg-[#101416]/50 py-1 pl-7 space-y-0.5 text-xs text-dark-50">
                <button
                  onClick={() => {
                    setMode('list');
                    setActiveAdminTab('pages');
                  }}
                  className={`w-full text-left py-1 hover:text-[#72aee6] block select-none ${
                    mode === 'list' && activeAdminTab === 'pages' ? 'text-[#72aee6] font-semibold' : 'text-[#c3c4c7]'
                  }`}
                >
                  All Pages
                </button>
                <button
                  onClick={handleStartCreate}
                  className={`w-full text-left py-1 hover:text-[#72aee6] block select-none ${
                    mode === 'create' ? 'text-[#72aee6] font-semibold' : 'text-[#c3c4c7]'
                  }`}
                >
                  Add New Page
                </button>
              </div>
            </li>

            {/* Surah Pages Item */}
            <li>
              <button
                onClick={() => {
                  setMode('list');
                  setActiveAdminTab('surah-pages');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs sm:text-[13px] font-medium transition-all relative ${
                  activeAdminTab === 'surah-pages' && mode === 'list'
                    ? 'bg-[#2271b1] text-white border-l-4 border-white'
                    : 'text-[#f0f0f1] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <Layout size={16} className="shrink-0 text-amber-400" />
                <span className="hidden sm:inline">Surah Pages</span>
                <span className="hidden sm:inline ml-auto bg-amber-500 text-[10px] px-2 py-0.5 rounded-full text-white font-mono font-bold">
                  114
                </span>
              </button>
            </li>

            {/* XML Sitemap Item */}
            <li>
              <button
                onClick={() => {
                  setMode('list');
                  setActiveAdminTab('sitemap');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs sm:text-[13px] font-medium transition-all relative ${
                  activeAdminTab === 'sitemap' && mode === 'list'
                    ? 'bg-[#2271b1] text-white border-l-4 border-white'
                    : 'text-[#f0f0f1] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <Globe size={16} className="shrink-0" />
                <span className="hidden sm:inline">XML Sitemaps</span>
              </button>
            </li>

            {/* SEO Tips Item */}
            <li>
              <button
                onClick={() => {
                  setMode('list');
                  setActiveAdminTab('tips');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs sm:text-[13px] font-medium transition-all relative ${
                  activeAdminTab === 'tips' && mode === 'list'
                    ? 'bg-[#2271b1] text-white border-l-4 border-white'
                    : 'text-[#f0f0f1] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <Sparkles size={16} className="shrink-0" />
                <span className="hidden sm:inline">SEO Checklist</span>
              </button>
            </li>

            {/* RAG Knowledge Library */}
            <li>
              <button
                onClick={() => {
                  setMode('list');
                  setActiveAdminTab('knowledge-library');
                  fetchRagDocs();
                  fetchRagSettings();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs sm:text-[13px] font-medium transition-all relative ${
                  activeAdminTab === 'knowledge-library' && mode === 'list'
                    ? 'bg-[#2271b1] text-white border-l-4 border-white'
                    : 'text-[#f0f0f1] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <BookOpen size={16} className="shrink-0" />
                <span className="hidden sm:inline">Knowledge RAG</span>
                {ragDocs.filter(d => d.isActive).length > 0 && (
                  <span className="hidden sm:inline ml-auto bg-[#46b450] text-[9.5px] px-2 py-0.5 rounded-full text-white font-mono font-bold">
                    {ragDocs.filter(d => d.isActive).length}
                  </span>
                )}
              </button>
            </li>

            {/* Admin Profile Settings */}
            <li>
              <button
                onClick={() => {
                  setMode('list');
                  setActiveAdminTab('profile');
                  setProfileMessage(null);
                  setProfileError(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs sm:text-[13px] font-medium transition-all relative ${
                  activeAdminTab === 'profile' && mode === 'list'
                    ? 'bg-[#2271b1] text-white border-l-4 border-white'
                    : 'text-[#f0f0f1] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <Settings size={16} className="shrink-0" />
                <span className="hidden sm:inline">Admin Settings</span>
              </button>
            </li>
          </ul>

          {/* Quick Informational box with dark styling inside the Sidebar menu */}
          <div className="hidden sm:block p-4 border-t border-[#2c3338] bg-[#101416]/40 text-[11px] leading-relaxed text-[#8c8f94]">
            <p className="font-bold text-[#c3c4c7] mb-1">WordPress Storage</p>
            Authentic live dynamic page pre-rendering, sitemaps compiled dynamically in the web system structure.
          </div>
        </div>

        {/* 2.2 RIGHT MAIN WP-ADMIN WORKING VIEWPORT AREA */}
        <div className="flex-1 bg-[#f0f0f1] overflow-y-auto px-4 py-6 md:p-8 min-h-0 min-w-0">
          
          {/* LIST MODE VIEW */}
          {mode === 'list' && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {activeAdminTab === 'pages' && (
                <div className="space-y-4">
                  {/* WP Header with standard horizontal inline "Add New Page" classic anchor */}
                  <div className="flex items-center gap-3 border-b border-[#ccd0d4] pb-4">
                    <h1 className="text-2xl font-normal text-[#1d2327]">Pages</h1>
                    <button
                      onClick={handleStartCreate}
                      className="px-2 py-1 text-[12px] bg-white border border-[#2271b1] text-[#2271b1] hover:bg-[#f0f0f1] rounded-sm font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      Add New Page
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 bg-white border border-[#ccd0d4]">
                      <RefreshCw size={28} className="text-[#2271b1] animate-spin" />
                      <p className="text-sm text-[#646970]">Fetching page tree database...</p>
                    </div>
                  ) : pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-[#ccd0d4] rounded-sm gap-3 text-center p-6">
                      <FileText size={40} className="text-[#ccd0d4]" />
                      <div>
                        <p className="font-bold text-[#2c3338] text-sm">No Pages found yet</p>
                        <p className="text-xs text-[#646970] mt-1">Ready to render your website pages? Create one with the editor directly.</p>
                      </div>
                      <button
                        onClick={handleStartCreate}
                        className="px-4 py-2 bg-[#2271b1] text-white hover:bg-[#135e96] text-xs font-bold rounded-sm shadow-sm"
                      >
                        Create Your First Page
                      </button>
                    </div>
                  ) : (
                    /* THE CLASSIC WORDPRESS TABLE */
                    <div className="overflow-x-auto bg-white border border-[#ccd0d4] shadow-sm">
                      <table className="w-full text-left text-[13px] border-collapse font-sans text-[#2c3338]">
                        <thead>
                          <tr className="bg-[#fcfcfc] border-b border-[#ccd0d4] select-none text-[12px] text-[#2c3338] font-bold">
                            <th className="p-3 w-1/3">Title</th>
                            <th className="p-3">Slug (Permalink)</th>
                            <th className="p-3 w-32">Status</th>
                            <th className="p-3 w-36">Modified Date</th>
                            <th className="p-3 w-20 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pages.map((page) => (
                            <tr 
                              key={page.id}
                              onMouseEnter={() => setHoveredRowId(page.id)}
                              onMouseLeave={() => setHoveredRowId(null)}
                              className="border-b border-[#f0f0.1] hover:bg-[#f6f7f7] group transition-colors cursor-pointer"
                              onClick={() => handleStartEdit(page)}
                            >
                              {/* Title Column with action links hovering underneath */}
                              <td className="p-3 py-4 align-top">
                                <span className="font-semibold text-[#2271b1] hover:text-[#135e96] text-[13.5px]">
                                  {page.title}
                                </span>
                                {page.slug === 'about' || page.slug === 'study-guidelines' ? (
                                  <span className="ml-2 bg-[#f0f0f1] text-[#2c3338] border border-[#ccd0d4] text-[10px] px-1.5 py-0.5 rounded-sm font-semibold select-none">
                                    Core Base
                                  </span>
                                ) : null}

                                {/* Action Buttons hovering links (WordPress style) */}
                                <div className={`flex items-center gap-1.5 text-[11.5px] text-[#8c8f94] mt-1 transition-opacity ${
                                  hoveredRowId === page.id ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
                                }`}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStartEdit(page); }}
                                    className="text-[#2271b1] hover:text-[#135e96] font-medium"
                                  >
                                    Edit
                                  </button>
                                  <span>|</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/page/${page.slug}`, '_blank');
                                    }}
                                    className="text-[#2271b1] hover:text-[#135e96] font-medium"
                                  >
                                    Preview
                                  </button>
                                  <span>|</span>
                                  <button
                                    onClick={(e) => handleDelete(page.id, e)}
                                    className="text-[#b32d2e] hover:text-[#8b1112] font-medium"
                                  >
                                    Trash
                                  </button>
                                </div>
                              </td>

                              {/* Slug URL */}
                              <td className="p-3 py-4 align-top font-mono text-[11.5px] text-[#2c3338]">
                                <span className="text-[#646970]">/page/</span>
                                <strong className="text-[#1d2327]">{page.slug}</strong>
                              </td>

                              {/* Status badge */}
                              <td className="p-3 py-4 align-top">
                                <span className={`inline-block px-2 py-0.5 rounded-sm text-[11px] font-bold tracking-wider uppercase ${
                                  page.status === 'published'
                                    ? 'bg-green-150 text-green-700 border border-green-300'
                                    : 'bg-[#f0f0f1] text-[#646970] border border-[#ccd0d4]'
                                }`}>
                                  {page.status === 'published' ? 'Published' : 'Draft'}
                                </span>
                              </td>

                              {/* Last modified date */}
                              <td className="p-3 py-4 align-top text-xs text-[#646970]">
                                {new Date(page.modified).toLocaleDateString()} at{' '}
                                {new Date(page.modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>

                              {/* Right Icon Button triggers */}
                              <td className="p-3 py-4 align-top text-right select-none" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                                    className="p-1.5 hover:bg-[#f0f0f1] text-[#2c3338] rounded-sm transition-all"
                                    title="View dynamic live route pre-render page"
                                  >
                                    <ExternalLink size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(page)}
                                    className="p-1.5 hover:bg-[#f0f0f1] text-[#2c3338] rounded-sm transition-all"
                                    title="Open code editor Gutenberg workspace"
                                  >
                                    <Edit size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeAdminTab === 'surah-pages' && (
                <div className="space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#ccd0d4] pb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-normal text-[#1d2327]">Surah Pages (114 Quranic Chapters)</h1>
                    </div>
                    {/* Live Search Field */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-[#8c8f94]" />
                      <input
                        type="search"
                        placeholder="Search Surahs by name or number..."
                        value={surahSearchQuery}
                        onChange={(e) => setSurahSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-1.5 w-60 text-xs bg-white border border-[#ccd0d4] rounded-sm focus:outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] shadow-sm font-sans"
                      />
                    </div>
                  </div>

                  {surahPagesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 bg-white border border-[#ccd0d4]">
                      <RefreshCw size={28} className="text-[#2271b1] animate-spin" />
                      <p className="text-sm text-[#646970]">Syncing Surah-level pages database...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white border border-[#ccd0d4] shadow-sm">
                      <table className="w-full text-left text-[13px] border-collapse font-sans text-[#2c3338]">
                        <thead>
                          <tr className="bg-[#fcfcfc] border-b border-[#ccd0d4] select-none text-[12px] text-[#2c3338] font-bold">
                            <th className="p-3 w-[8%] text-center">No.</th>
                            <th className="p-3 w-[35%]">Surah Page Title</th>
                            <th className="p-3 w-[22%]">SEO Canonical URL</th>
                            <th className="p-3 w-[12%]">Status</th>
                            <th className="p-3 w-[18%]">Overrides Configured</th>
                            <th className="p-3 w-[5%] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {surahPages
                            .filter(p => {
                              const q = surahSearchQuery.toLowerCase();
                              return p.title.toLowerCase().includes(q) || 
                                     p.slug.toLowerCase().includes(q) || 
                                     String(p.surahNumber).includes(q);
                            })
                            .map((p) => {
                              const transCount = Object.keys(p.translationOverrides || {}).length;
                              const tafsirCount = Object.keys(p.tafsirOverrides || {}).length;
                              const hasAudio = !!p.customAudioUrl;
                              const hasIntro = !!p.customIntro && p.customIntro !== `Welcome to the customizable study page for **Surah ${p.title}**...`;
                              const hasAnyOverride = transCount > 0 || tafsirCount > 0 || hasAudio || hasIntro;

                              return (
                                <tr 
                                  key={p.id}
                                  onMouseEnter={() => setHoveredRowId(p.id)}
                                  onMouseLeave={() => setHoveredRowId(null)}
                                  className="border-b border-[#f0f0f1] hover:bg-[#f6f7f7] group transition-colors cursor-pointer"
                                  onClick={() => handleStartEditSurah(p)}
                                >
                                  {/* Surah Number */}
                                  <td className="p-3 text-center font-mono font-bold text-[#646970] border-r border-[#f0f0f1]">
                                    {p.surahNumber}
                                  </td>

                                  {/* Title Column with action links hovering underneath */}
                                  <td className="p-3 py-4 align-top">
                                    <span className="font-semibold text-[#2271b1] hover:text-[#135e96] text-[13.5px]">
                                      {p.title}
                                    </span>

                                    {/* Action Buttons hovering links (WordPress style) */}
                                    <div className={`flex items-center gap-1.5 text-[11.5px] text-[#8c8f94] mt-1 transition-opacity ${
                                      hoveredRowId === p.id ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
                                    }`}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleStartEditSurah(p); }}
                                        className="text-[#2271b1] hover:text-[#135e96] font-medium"
                                      >
                                        Edit / Customize
                                      </button>
                                      <span>|</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`/surah/${p.surahNumber}/ayah/1`, '_blank');
                                        }}
                                        className="text-[#2271b1] hover:text-[#135e96] font-medium"
                                      >
                                        Preview SEO Page
                                      </button>
                                    </div>
                                  </td>

                                  {/* URL Slug */}
                                  <td className="p-3 py-4 align-top font-mono text-[11.5px] text-[#2c3338]">
                                    <span className="text-[#646970]">/surah/{p.surahNumber}/ayah/1</span>
                                  </td>

                                  {/* Status */}
                                  <td className="p-3 py-4 align-top">
                                    <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase ${
                                      p.status === 'published'
                                        ? 'bg-green-150 text-green-700 border border-green-300'
                                        : 'bg-[#f0f0f1] text-[#646970] border border-[#ccd0d4]'
                                    }`}>
                                      {p.status === 'published' ? 'Published' : 'Draft'}
                                    </span>
                                  </td>

                                  {/* Overrides indicator */}
                                  <td className="p-3 py-4 align-top text-xs text-[#2c3338]">
                                    {hasAnyOverride ? (
                                      <div className="flex flex-wrap gap-1">
                                        {transCount > 0 && (
                                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded select-none border border-amber-200">
                                            {transCount} Translation{transCount > 1 ? 's' : ''}
                                          </span>
                                        )}
                                        {tafsirCount > 0 && (
                                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded select-none border border-blue-200">
                                            {tafsirCount} Tafsir{tafsirCount > 1 ? 's' : ''}
                                          </span>
                                        )}
                                        {hasAudio && (
                                          <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded select-none border border-green-200">
                                            Audio Override
                                          </span>
                                        )}
                                        {hasIntro && (
                                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded select-none border border-purple-200">
                                            Intro Text
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[#8c8f94] italic select-none">No custom overrides (Classic Quran Cloud)</span>
                                    )}
                                  </td>

                                  {/* Right Edit Action */}
                                  <td className="p-3 py-4 align-top text-right select-none" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end">
                                      <button
                                        onClick={() => handleStartEditSurah(p)}
                                        className="p-1.5 hover:bg-[#f0f0f1] text-[#2c3338] rounded-sm transition-all"
                                        title="Customize Surah translation metadata, audio & content overrides"
                                      >
                                        <Edit size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SITEMAP MONITOR VIEW */}
              {activeAdminTab === 'sitemap' && (
                <div className="bg-white border border-[#ccd0d4] p-6 space-y-6 rounded-sm shadow-sm">
                  <div className="space-y-1.5 border-b border-[#ccd0d4] pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#f0f0f1] text-[#2271b1] rounded-sm border border-[#ccd0d4]">
                        <Globe size={18} />
                      </div>
                      <h2 className="text-xl font-normal text-[#1d2327]">XML Sitemap Integrity Suite</h2>
                    </div>
                    <p className="text-xs text-[#646970]">
                      The system updates `/sitemap.xml` dynamically on the server upon content publication, promoting fast search crawl loops.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border border-[#ccd0d4] p-4 bg-[#fcfcfc] space-y-3 rounded-sm">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-[#646970] block">Crawler File Link</span>
                      <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                        <CheckCircle size={15} />
                        <span>Pre-compiled XML dynamically (Active)</span>
                      </div>
                      <p className="text-xs text-[#2c3338] leading-relaxed">
                        Static XML index nodes are configured dynamically whenever custom HTML templates are drafted, published, or discarded.
                      </p>
                      
                      <button 
                        onClick={() => window.open('/sitemap.xml', '_blank')}
                        className="text-xs font-semibold text-[#2271b1] hover:text-[#135e96] hover:underline flex items-center gap-1 pt-1.5"
                      >
                        <span>Open Raw XML Sitemap</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>

                    <div className="border border-[#ccd0d4] p-4 bg-[#fcfcfc] space-y-3 rounded-sm text-xs">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-[#646970] block">Search Engine Checklist</span>
                      <ul className="space-y-2 text-[#2c3338]">
                        <li className="flex items-center gap-2">
                          <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                          <span>Provides dynamic sitemap index priority configuration (0.4 - 1.0)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                          <span>Includes index schema records for all 114 Quranic Surahs</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                          <span>Presents Google index structural canonical schema support</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TIPS TAB */}
              {activeAdminTab === 'tips' && (
                <div className="space-y-5">
                  <div className="border-b border-[#ccd0d4] pb-3">
                    <h1 className="text-xl font-normal text-[#1d2327]">Search Engine Optimization Guidance</h1>
                  </div>

                  <div className="grid md:grid-cols-3 gap-5">
                    <div className="bg-white border border-[#ccd0d4] p-5 space-y-2.5 rounded-sm shadow-sm">
                      <div className="text-[#2271b1] font-bold text-sm flex items-center gap-1.5">
                        <CheckCircle size={15} />
                        <span>Google Search Title</span>
                      </div>
                      <p className="text-xs text-[#2c3338] leading-relaxed">
                        Formulate titles meticulously utilizing custom search inquiries. Ideal index title length range is under 65 characters to avoid desktop results clip filters.
                      </p>
                    </div>

                    <div className="bg-white border border-[#ccd0d4] p-5 space-y-2.5 rounded-sm shadow-sm">
                      <div className="text-green-700 font-bold text-sm flex items-center gap-1.5">
                        <Layout size={15} />
                        <span>Structural Headings (H1)</span>
                      </div>
                      <p className="text-xs text-[#2c3338] leading-relaxed">
                        Design specific, keyword-rich header tags on the page metadata cards. Custom layouts embed them automatically within high-impact semantic title elements.
                      </p>
                    </div>

                    <div className="bg-white border border-[#ccd0d4] p-5 space-y-2.5 rounded-sm shadow-sm">
                      <div className="text-[#2271b1] font-bold text-sm flex items-center gap-1.5">
                        <Sparkles size={15} />
                        <span>JSON-LD Schemas</span>
                      </div>
                      <p className="text-xs text-[#2c3338] leading-relaxed">
                        Pages render full structured schema modules natively on the backend, increasing the likelihood that Google will highlight page cards as search snippets.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* KNOWLEDGE LIBRARY TAB */}
              {activeAdminTab === 'knowledge-library' && (
                <div className="space-y-6 text-left font-sans">
                  <div className="space-y-1.5 border-b border-[#ccd0d4] pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white text-[#2271b1] rounded-sm border border-[#ccd0d4]">
                        <BookOpen size={18} />
                      </div>
                      <h2 className="text-xl font-normal text-[#1d2327]">Scholarly Knowledge Library (RAG)</h2>
                    </div>
                    <p className="text-xs text-[#646970]">
                      Configure the Retrieval-Augmented Generation (RAG) platform. The indexer lets you activate scholarly reference texts, upload raw logs, or write custom theologian comparative notes in seconds.
                    </p>
                  </div>

                  {/* 1. Global Grounding Switch */}
                  <div className="bg-white border border-[#ccd0d4] p-5 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <h3 className="text-sm font-bold text-[#1d2327] flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${ragEnabled ? 'bg-[#46b450] animate-pulse' : 'bg-red-500'}`} />
                        Global Conversation Grounding (RAG Search)
                      </h3>
                      <p className="text-xs text-[#646970]">
                        When enabled, Al-Mualim queries the indexes of all active theological materials listed below before providing answers to user questions. If disabled, conversations fall back to classic direct model inference.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRagGlobal(!ragEnabled)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border transition-all text-center shrink-0 ${
                        ragEnabled
                          ? 'bg-[#46b450] border-[#3ca043] text-white hover:bg-[#3ca043]'
                          : 'bg-white border-[#ccd0d4] text-[#2c3338] hover:bg-[#f6f7f7]'
                      }`}
                    >
                      Grounding Status: {ragEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="grid md:grid-cols-5 gap-6 items-start">
                    {/* LEFT SIDE: UPLOADER & NEW NOTES PANEL */}
                    <div className="md:col-span-2 space-y-6">
                      
                      {/* Drag-and-Drop Document Zone */}
                      <div className="bg-white border border-[#ccd0d4] p-5 rounded-sm shadow-sm space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#646970]">
                          Drag & Drop Reference Indexer
                        </h4>
                        <div className="border-2 border-dashed border-[#ccd0d4] hover:border-[#2271b1] rounded-sm p-6 text-center transition-all cursor-pointer relative group bg-[#fbfbfc]">
                          <input
                            type="file"
                            accept=".txt,.md,.json"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center gap-2">
                            <BookOpen size={24} className="text-[#646970] group-hover:scale-110 transition-all" />
                            <p className="text-xs font-bold text-[#2271b1]">
                              Upload Scholarly File (.txt, .md, .json)
                            </p>
                            <span className="text-[10px] text-[#646970] opacity-80">Supports standard browser FileReader parser</span>
                          </div>
                        </div>
                      </div>

                      {/* Custom Note Panel Form */}
                      <div className="bg-white border border-[#ccd0d4] p-5 rounded-sm shadow-sm space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#646970]">
                          Write Custom Scholarly Note
                        </h4>
                        
                        <form onSubmit={handleCustomUpload} className="space-y-3 text-xs">
                          <div className="space-y-1 text-left">
                            <label className="text-[11px] font-bold text-[#2c3338]">Document Title</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Tafsir Ibn Kathir of Surah Al-Kahf"
                              value={uploadTitle}
                              onChange={e => setUploadTitle(e.target.value)}
                              className="w-full p-2 border border-[#ccd0d4] text-[#2c3338] bg-white outline-none focus:border-[#2271b1] rounded-sm text-xs"
                            />
                          </div>

                          <div className="space-y-1 text-left">
                            <label className="text-[11px] font-bold text-[#2c3338]">Compiler / Theological Source</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Ibn Kathir al-Damashqi"
                              value={uploadSource}
                              onChange={e => setUploadSource(e.target.value)}
                              className="w-full p-2 border border-[#ccd0d4] text-[#2c3338] bg-white text-xs outline-none focus:border-[#2271b1] rounded-sm"
                            />
                          </div>

                          <div className="space-y-1 text-left">
                            <label className="text-[11px] font-bold text-[#2c3338]">Theology Category</label>
                            <select
                              value={uploadCategory}
                              onChange={e => setUploadCategory(e.target.value)}
                              className="w-full p-2 border border-[#ccd0d4] text-[#2c3338] bg-white outline-none focus:border-[#2271b1] rounded-sm text-xs"
                            >
                              <option value="tafsir">Tafseer (Exegesis)</option>
                              <option value="hadith">Hadith Collection</option>
                              <option value="jurisprudence">Jurisprudence (Fiqh)</option>
                              <option value="history">Islamic History</option>
                              <option value="user-upload">General Scholarly Notes</option>
                            </select>
                          </div>

                          <div className="space-y-1 text-left">
                            <label className="text-[11px] font-bold text-[#2c3338]">Note Content Excerpt</label>
                            <textarea
                              required
                              rows={4}
                              placeholder="Paste or write theological exegesis, comparative research notes, or rulings excerpts to index in the system..."
                              value={uploadContent}
                              onChange={e => setUploadContent(e.target.value)}
                              className="w-full p-2 border border-[#ccd0d4] text-[#2c3338] bg-white outline-none focus:border-[#2271b1] rounded-sm text-xs leading-relaxed"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isUploading}
                            className="w-full py-2 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-sm cursor-pointer"
                          >
                            {isUploading ? "Uploading..." : "Save Scholarly Note"}
                          </button>
                        </form>
                      </div>

                    </div>

                    {/* RIGHT SIDE: INDEX MATRIX TABLE */}
                    <div className="md:col-span-3 space-y-4">
                      
                      <div className="bg-white border border-[#ccd0d4] rounded-sm shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[#ccd0d4] bg-[#fcfcfc] flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#646970]">
                            Active Sourcing Materials Index ({ragDocs.length})
                          </h4>
                        </div>

                        {ragDocs.length === 0 ? (
                          <div className="p-8 text-center text-xs text-[#646970]">
                            No scholarly files registered in the library. Write or upload one to build Al-Mualim's context.
                          </div>
                        ) : (
                          <div className="divide-y divide-[#f0f0f1]">
                            {ragDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className={`p-4 flex items-center justify-between gap-4 transition-all ${
                                  doc.isActive ? 'bg-white' : 'bg-[#f6f7f7] opacity-65'
                                }`}
                              >
                                <div className="space-y-1 truncate text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {doc.category === 'hadith' ? '📜' : doc.category === 'tafsir' ? '📖' : doc.category === 'history' ? '🎓' : '📁'}
                                    </span>
                                    <h5 className="text-[13px] font-bold text-[#1d2327] truncate max-w-sm">{doc.title}</h5>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-[10px] text-[#646970]">
                                    <span className="font-semibold uppercase tracking-wider text-[#2271b1]">
                                      {doc.category}
                                    </span>
                                    <span>•</span>
                                    <span>Source: {doc.source}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDoc(doc.id, !doc.isActive)}
                                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-sm border transition-all cursor-pointer ${
                                      doc.isActive
                                        ? 'bg-[#e5f5fa] border-[#007cba] text-[#007cba]'
                                        : 'bg-white border-[#ccd0d4] text-[#646970]'
                                    }`}
                                  >
                                    {doc.isActive ? 'Active' : 'Muted'}
                                  </button>

                                  {!doc.isPreloaded && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoc(doc.id)}
                                      className="p-1 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-sm border border-transparent transition-all"
                                      title="Delete note"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PROFILE & CREDENTIALS TAB */}
              {activeAdminTab === 'profile' && (
                <div className="space-y-6 text-left font-sans">
                  <div className="space-y-1.5 border-b border-[#ccd0d4] pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white text-[#2271b1] rounded-sm border border-[#ccd0d4]">
                        <User size={18} />
                      </div>
                      <h2 className="text-xl font-normal text-[#1d2327]">Admin Profile & Credentials Management</h2>
                    </div>
                    <p className="text-xs text-[#646970]">
                      Configure your administrative credentials including email address, login username, and high-entropy password secure rotation.
                    </p>
                  </div>

                  <div className="bg-white border border-[#ccd0d4] p-5 sm:p-6 rounded-sm shadow-sm max-w-2xl">
                    <h3 className="text-sm font-bold text-[#1d2327] border-b border-neutral-100 pb-3 mb-4">
                      Modify Admin Profile
                    </h3>

                    {profileMessage && (
                      <div className="bg-[#f0f9eb] border-l-4 border-[#67c23a] text-[#2c3338] p-3 mb-4 text-xs font-sans">
                        <strong>Success:</strong> {profileMessage}
                      </div>
                    )}

                    {profileError && (
                      <div className="bg-[#fef0f0] border-l-4 border-[#f56c6c] text-[#2c3338] p-3 mb-4 text-xs font-sans">
                        <strong>Error:</strong> {profileError}
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[12px] font-medium text-[#2c3338] block">
                            Username
                          </label>
                          <input
                            type="text"
                            required
                            value={profileUsername}
                            onChange={(e) => setProfileUsername(e.target.value)}
                            className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                            placeholder="e.g. admin"
                          />
                          <span className="text-[10px] text-gray-500 block">Letters, numbers, underscores and hyphens allowed.</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[12px] font-medium text-[#2c3338] block">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                            placeholder="e.g. admin@yourdomain.com"
                          />
                        </div>
                      </div>

                      <div className="border-t border-dashed border-neutral-200 my-4 pt-4">
                        <h4 className="text-xs font-bold text-[#1d2327] mb-3">Change Passcode (Optional)</h4>
                        <div className="space-y-1">
                          <label className="text-[12px] font-medium text-[#2c3338] block">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={profileNewPassword}
                            onChange={(e) => setProfileNewPassword(e.target.value)}
                            className="w-full p-2 text-sm border border-[#8c8f94] bg-[#fcfcfc] text-[#2c3338] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all"
                            placeholder="Leave blank to keep current password"
                          />
                          {profileNewPassword && (
                            <div className="mt-1">
                              <div className={`h-1.5 rounded-sm transition-all ${
                                profileNewPassword.length >= 10 ? 'bg-[#46b450] w-full' : profileNewPassword.length >= 8 ? 'bg-amber-400 w-2/3' : 'bg-red-500 w-1/3'
                              }`} />
                              <span className="text-[9.5px] text-gray-500 block mt-0.5">
                                Password rating: {profileNewPassword.length >= 10 ? 'Strong (Highly Recommended)' : profileNewPassword.length >= 8 ? 'Acceptable' : 'Too short (Minimum 8 chars)'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-neutral-200 pt-4 bg-amber-50/40 p-3 rounded-sm space-y-2 border border-amber-200">
                        <p className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                          <AlertTriangle size={12} /> VERIFY IDENTITY TO DEPLOY CHANGES
                        </p>
                        <div className="space-y-1">
                          <label className="text-[12px] font-bold text-[#2c3338] block">
                            Confirm Current Password
                          </label>
                          <input
                            type="password"
                            required
                            value={profileConfirmPassword}
                            onChange={(e) => setProfileConfirmPassword(e.target.value)}
                            className="w-full p-2 text-sm border border-[#8c8f94] bg-white text-[#2c3338] outline-none focus:border-[#ccd0d4] rounded-sm transition-all"
                            placeholder="Enter your current password to apply updates"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={profileLoading}
                          className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] active:bg-[#0a4b7c] text-white border border-[#2271b1] rounded-sm text-xs font-semibold cursor-pointer shadow-sm hover:shadow active:shadow-inner transition-all flex items-center gap-1.5"
                        >
                          {profileLoading ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Securing Profile...</span>
                            </>
                          ) : (
                            <>
                              <Save size={13} />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* EDIT & CREATE MODE (GUTENBERG & CLASSIC POST EDITOR SPLIT CONTAINER) */}
          {(mode === 'edit' || mode === 'create') && (
            <form onSubmit={handleSave} className="max-w-6xl mx-auto space-y-4">
              
              {/* Header Title with action buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#ccd0d4] pb-4">
                <div>
                  <h1 className="text-2xl font-normal text-[#1d2327]">
                    {mode === 'create' ? 'Add New Page' : 'Edit Page'}
                  </h1>
                  <span className="text-xs text-[#646970] font-mono">
                    WordPress live CMS dynamic controller &bull; Pre-rendering and SEO optimizer
                  </span>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className="px-3 py-1.5 bg-white border border-[#ccd0d4] text-[#2c3338] hover:bg-[#f0f0f1] text-[12px] font-semibold rounded-sm shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white border border-[#2271b1] text-[12px] font-semibold rounded-sm shadow-sm cursor-pointer"
                  >
                    {mode === 'create' ? 'Publish' : 'Update'}
                  </button>
                </div>
              </div>

              {/* Editor Tabs switcher (WordPress Classic vs SEO tab style) */}
              <div className="flex border-b border-[#ccd0d4] mb-4">
                {editingType === 'surah' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditorTab('content')}
                      className={`py-2 px-4 text-xs font-semibold uppercase border-b-2 transition-all ${
                        editorTab === 'content'
                          ? 'border-[#2271b1] text-[#2271b1]'
                          : 'border-transparent text-[#646970] hover:text-[#135e96]'
                      }`}
                    >
                      1. Intro & Audio Config
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('seo')}
                      className={`py-2 px-4 text-xs font-semibold uppercase border-b-2 transition-all ${
                        editorTab === 'seo'
                          ? 'border-[#2271b1] text-[#2271b1]'
                          : 'border-transparent text-[#646970] hover:text-[#135e96]'
                      }`}
                    >
                      2. SEO Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('verses')}
                      className={`py-2 px-4 text-xs font-semibold uppercase border-b-2 transition-all flex items-center gap-1.5 ${
                        editorTab === 'verses'
                          ? 'border-[#2271b1] text-[#2271b1]'
                          : 'border-transparent text-[#646970] hover:text-[#135e96]'
                      }`}
                    >
                      <span>3. Verse Overrides</span>
                      <span className="bg-amber-500 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                        {Object.keys(translationOverrides).length + Object.keys(tafsirOverrides).length}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditorTab('content')}
                      className={`py-2 px-4 text-xs font-semibold uppercase border-b-2 transition-all ${
                        editorTab === 'content'
                          ? 'border-[#2271b1] text-[#2271b1]'
                          : 'border-transparent text-[#646970] hover:text-[#135e96]'
                      }`}
                    >
                      1. Content Block Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('seo')}
                      className="py-2 px-4 text-xs font-semibold uppercase border-b-2 transition-all flex items-center gap-1.5"
                      style={{
                        borderBottomColor: editorTab === 'seo' ? '#2271b1' : 'transparent',
                        color: editorTab === 'seo' ? '#2271b1' : '#646970'
                      }}
                    >
                      <span>2. SEO Settings</span>
                      <span className={`w-2 h-2 rounded-full ${
                        seoHealth.score > 80 ? 'bg-green-500' : seoHealth.score > 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`py-2 px-4 text-xs font-semibold uppercase border-b-2 transition-all ${
                        editorTab === 'preview'
                          ? 'border-[#2271b1] text-[#2271b1]'
                          : 'border-transparent text-[#646970] hover:text-[#135e96]'
                      }`}
                    >
                      3. Live HTML Pre-Render
                    </button>
                  </>
                )}
              </div>

              {/* EDITOR COLUMN CONTENT LAYOUT */}
              <div className="grid lg:grid-cols-4 gap-6 items-start">
                
                {/* LEFT 3 COLUMNS (PRIMARY WORKSPACE) */}
                <div className="lg:col-span-3 space-y-4">
                  
                  {editingType === 'standard' && editorTab === 'content' && (
                    <div className="bg-white border border-[#ccd0d4] p-5 rounded-sm space-y-4 shadow-sm text-left">
                      
                      {/* Title block */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block">
                          Page Title
                        </label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Study Guidelines of Tafsir & Scholarly Materials"
                          className="w-full p-2.5 text-base font-sans border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all shadow-inner"
                        />
                      </div>

                      {/* Permalink Permalink slug */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block">
                          URL Permalink Slug
                        </label>
                        <div className="flex items-center text-xs text-[#646970]">
                          <span className="bg-[#f0f0f1] px-2.5 py-1.5 border border-r-0 border-[#ccd0d4] rounded-l-sm select-none">
                            /page/
                          </span>
                          <input
                            type="text"
                            required
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"))}
                            placeholder="about-us"
                            className="flex-1 p-1.5 font-mono text-xs border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-r-sm transition-all"
                          />
                        </div>
                        <p className="text-[10px] text-[#8c8f94] select-none">
                          Avoid spacing or special marks. Slug used to pre-render the static landing route index.
                        </p>
                      </div>

                      {/* Content block editor with typography buttons */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide">
                            Page Markup Content (Markdown Supported)
                          </label>
                          <span className="text-[11px] font-mono text-[#646970] font-bold">
                            {content.trim().split(/\s+/).filter(Boolean).length} Words written
                          </span>
                        </div>

                        {/* Traditional formatting Toolbar */}
                        <div className="p-1 border border-b-0 border-[#ccd0d4] bg-[#f0f0f1] flex flex-wrap gap-1 rounded-t-sm select-none">
                          <button
                            type="button"
                            onClick={() => insertMarkdown('h2')}
                            className="px-2 py-0.5 border border-[#ccd0d4] text-xs font-bold bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                            title="Insert H2 Tag"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('h3')}
                            className="px-2 py-0.5 border border-[#ccd0d4] text-xs font-bold bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                            title="Insert H3 Tag"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('bold')}
                            className="px-2.5 py-0.5 border border-[#ccd0d4] text-xs font-bold bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                            title="Insert Bold Text"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('italic')}
                            className="px-2.5 py-0.5 border border-[#ccd0d4] text-xs italic bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                            title="Insert Italic Text"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('list')}
                            className="px-2 py-0.5 border border-[#ccd0d4] text-xs bg-white text-[#2c3338] hover:bg-[#f0f0f1] flex items-center justify-center rounded-sm"
                            title="Bullet list bullet points"
                          >
                            <List size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('block')}
                            className="px-2.5 py-0.5 border border-[#ccd0d4] text-xs bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                            title="Insert Quranic Verse Block Quote"
                          >
                            Blockquote
                          </button>
                        </div>

                        <textarea
                          id="gutenberg-textarea"
                          rows={14}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="# Write article text and guidelines here... Markdown lists, links, headers and headers are pre-rendered automatically into HTML crawl templates."
                          className="w-full p-3 font-mono text-[13.5px] border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-b-sm transition-all resize-y shadow-inner leading-relaxed"
                        />
                      </div>

                    </div>
                  )}

                  {editingType === 'surah' && editorTab === 'content' && (
                    <div className="bg-white border border-[#ccd0d4] p-5 rounded-sm space-y-4 shadow-sm text-left">
                      {/* Surah Title block */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block">
                          Surah Page Title
                        </label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Surah Al-Kahf - Exegesis, Recitations & AI Study Guidelines"
                          className="w-full p-2.5 text-base font-sans border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all shadow-inner"
                        />
                      </div>

                      {/* Permalink block */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block text-gray-400">
                          SEO URL Permalink (Standard Canonical Pattern)
                        </label>
                        <div className="flex items-center text-xs text-[#646970]">
                          <span className="bg-[#f0f0f1] px-2.5 py-1.5 border border-[#ccd0d4] rounded-sm select-none">
                            /surah/{selectedPage?.surahNumber}/ayah/1
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8c8f94] select-none">
                          The URL permalink is system-defined to match the classical Quranic directory index.
                        </p>
                      </div>

                      {/* Dynamic Custom Audio REC */}
                      <div className="space-y-1 pt-2 border-t border-dashed border-[#ccd0d4]">
                        <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block">
                          Custom Recitation Audio File (MP3 Streaming Link Override)
                        </label>
                        <input
                          type="url"
                          value={customAudioUrl}
                          onChange={(e) => setCustomAudioUrl(e.target.value)}
                          placeholder="e.g. https://your-server.com/audios/custom-kahf.mp3"
                          className="w-full p-2 text-xs font-mono border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-sm transition-all shadow-sm"
                        />
                        <p className="text-[10px] text-[#8c8f94] select-none">
                          If provided, this audio stream override will be dynamically pulled by the media center and player. Leave empty to stream Alquran.cloud CDNs.
                        </p>
                      </div>

                      {/* Introduction template editor */}
                      <div className="space-y-1 pt-2 border-t border-dashed border-[#ccd0d4]">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide">
                            Surah Page Introduction Summary (Markdown Supported)
                          </label>
                        </div>
                        
                        <div className="p-1 border border-b-0 border-[#ccd0d4] bg-[#f0f0f1] flex flex-wrap gap-1 rounded-t-sm select-none">
                          <button
                            type="button"
                            onClick={() => insertMarkdown('h2')}
                            className="px-2 py-0.5 border border-[#ccd0d4] text-xs font-bold bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('h3')}
                            className="px-2 py-0.5 border border-[#ccd0d4] text-xs font-bold bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('bold')}
                            className="px-2.5 py-0.5 border border-[#ccd0d4] text-xs font-bold bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('italic')}
                            className="px-2 py-0.5 border border-[#ccd0d4] text-xs italic bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('list')}
                            className="px-2 py-0.5 border border-[#ccd0d4] text-xs bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                          >
                            Bullet List
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('block')}
                            className="px-2.5 py-0.5 border border-[#ccd0d4] text-xs bg-white text-[#2c3338] hover:bg-[#f0f0f1] rounded-sm"
                          >
                            Blockquote
                          </button>
                        </div>

                        <textarea
                          id="gutenberg-textarea"
                          rows={12}
                          value={customIntro}
                          onChange={(e) => setCustomIntro(e.target.value)}
                          placeholder="Introduce the historical context, virtues, and spiritual guidance of this chapter..."
                          className="w-full p-3 font-mono text-[13px] border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] focus:ring-[1px] focus:ring-[#2271b1] rounded-b-sm transition-all resize-y shadow-inner leading-relaxed"
                        />
                        <p className="text-[10px] text-[#8c8f94] select-none">
                          This markup introduction block will be pulled dynamically and rendered at the top of this Surah's visual screen.
                        </p>
                      </div>
                    </div>
                  )}

                  {editingType === 'surah' && editorTab === 'verses' && (
                    <div className="bg-white border border-[#ccd0d4] p-5 rounded-sm space-y-4 shadow-sm text-left">
                      <div className="border-b border-[#ccd0d4] pb-3">
                        <h3 className="text-base font-normal text-[#1d2327]">Custom Verse Overrides</h3>
                        <p className="text-xs text-[#646970] mt-1">
                          Override translation texts and Tafsir exegesis for individual verses in Surah {selectedPage?.surahNumber}. Any changes here take maximum priority and will be pulled dynamically on the client frontend as well as cached in pre-renders.
                        </p>
                      </div>

                      {loadingAyahs ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-2">
                          <RefreshCw size={24} className="text-[#2271b1] animate-spin" />
                          <p className="text-xs text-[#646970]">Fetching Quranic verses and translations to load Gutenberg custom workspace...</p>
                        </div>
                      ) : surahAyahs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-red-500 border border-dashed border-[#ccd0d4] bg-red-50/20">
                          Failed to pull original verse parameters from Quran Cloud. Please check your internet connectivity.
                        </div>
                      ) : (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                          {surahAyahs.map((ayah) => {
                            const ayahNum = ayah.numberInSurah;
                            const currentTranslationOverride = translationOverrides[ayahNum] || translationOverrides[String(ayahNum)] || '';
                            const currentTafsirOverride = tafsirOverrides[ayahNum] || tafsirOverrides[String(ayahNum)] || '';

                            return (
                              <div key={ayahNum} className="border border-[#ccd0d4] bg-[#fcfcfc] rounded-sm p-4 space-y-3 transition-shadow hover:shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#f0f0f1] pb-2">
                                  <span className="bg-[#2271b1] text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                                    Verse {ayahNum}
                                  </span>
                                  <span className="text-[10px] text-[#8c8f94] italic font-sans select-none">
                                    Chapter {selectedPage?.surahNumber} &bull; Verse {ayahNum}
                                  </span>
                                </div>

                                {/* Original Arabic and Translation Display (Read-only reference) */}
                                <div className="space-y-2 bg-white border border-[#f0f0f1] p-3 rounded-sm leading-relaxed">
                                  <div className="text-right text-xl font-arabic text-[#1d2327] py-1 select-all" dir="rtl">
                                    {ayah.arabicText}
                                  </div>
                                  <div className="text-xs text-[#646970] select-all italic border-t border-[#fcfcfc] pt-1.5">
                                    <strong>Original Sahih International:</strong> {ayah.englishTranslation}
                                  </div>
                                </div>

                                {/* Dynamic Overrides inputs */}
                                <div className="grid md:grid-cols-2 gap-4">
                                  {/* Custom Translation field */}
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[#202427] uppercase tracking-wide block">
                                      Custom English Translation Override
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={currentTranslationOverride}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setTranslationOverrides(prev => {
                                          const updated = { ...prev };
                                          if (val.trim() === '') {
                                            delete updated[ayahNum];
                                            delete updated[String(ayahNum)];
                                          } else {
                                            updated[ayahNum] = val;
                                          }
                                          return updated;
                                        });
                                      }}
                                      placeholder="Leave empty to use default translation..."
                                      className="w-full p-2 text-xs font-sans border border-[#ccd0d4] text-[#2c3338] bg-white outline-none focus:border-[#2271b1] rounded-sm shadow-inner resize-y transition-all"
                                    />
                                  </div>

                                  {/* Custom Tafsir field */}
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[#202427] uppercase tracking-wide block">
                                      Custom Scholarly Tafsir Override
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={currentTafsirOverride}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setTafsirOverrides(prev => {
                                          const updated = { ...prev };
                                          if (val.trim() === '') {
                                            delete updated[ayahNum];
                                            delete updated[String(ayahNum)];
                                          } else {
                                            updated[ayahNum] = val;
                                          }
                                          return updated;
                                        });
                                      }}
                                      placeholder="Leave empty to load default Tafsir exegesis..."
                                      className="w-full p-2 text-xs font-sans border border-[#ccd0d4] text-[#2c3338] bg-white outline-none focus:border-[#2271b1] rounded-sm shadow-inner resize-y transition-all"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {editorTab === 'seo' && (
                    <div className="bg-white border border-[#ccd0d4] p-5 rounded-sm space-y-4 shadow-sm text-left">
                      
                      {/* SEO meta title */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label className="font-bold text-[#2c3338] uppercase tracking-wide">
                            Meta SEO Title
                          </label>
                          <span className={`text-[10px] font-bold ${
                            seoTitle.length >= 40 && seoTitle.length <= 65 ? 'text-green-700' : 'text-[#8c8f94]'
                          }`}>
                            {seoTitle.length} / 65 Chars
                          </span>
                        </div>
                        <input
                          type="text"
                          value={seoTitle}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          placeholder="Search engine dynamic snippet head title"
                          className="w-full p-2.5 text-sm border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] rounded-sm"
                        />
                      </div>

                      {/* SEO meta description */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label className="font-bold text-[#2c3338] uppercase tracking-wide">
                            SEO Meta Description
                          </label>
                          <span className={`text-[10px] font-bold ${
                            seoDescription.length >= 110 && seoDescription.length <= 160 ? 'text-green-700' : 'text-[#8c8f94]'
                          }`}>
                            {seoDescription.length} / 160 Chars
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          placeholder="Write a clear meta-description representing what this resource compiles. This is used by search crawlers in result pages."
                          className="w-full p-2.5 text-sm border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] rounded-sm leading-relaxed"
                        />
                      </div>

                      {/* SEO H1 Header Overlay */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block">
                          SEO Page H1 Primary Heading
                        </label>
                        <input
                          type="text"
                          value={seoH1}
                          onChange={(e) => setSeoH1(e.target.value)}
                          placeholder="Fallback default heading title"
                          className="w-full p-2.5 text-sm border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] rounded-sm"
                        />
                      </div>

                      {/* SEO Keywords & Robots Row */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block">
                            Focus Keywords/Tags (comma separated)
                          </label>
                          <input
                            type="text"
                            value={seoKeywords}
                            onChange={(e) => setSeoKeywords(e.target.value)}
                            placeholder="quran guidance, tafsir, study guidelines"
                            className="w-full p-2.5 text-sm border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] rounded-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#2c3338] uppercase tracking-wide block">
                            Robots Index Controls
                          </label>
                          <select
                            value={seoRobots}
                            onChange={(e) => setSeoRobots(e.target.value)}
                            className="w-full p-2.5 text-sm border border-[#ccd0d4] text-[#2c3338] bg-[#fff] outline-none focus:border-[#2271b1] rounded-sm"
                          >
                            <option value="index, follow">Index, Follow (Google crawl authorized)</option>
                            <option value="noindex, follow">No-index, follow (Hide in search result cards)</option>
                            <option value="noindex, nofollow">No-index, No-follow (Draft protection mode)</option>
                          </select>
                        </div>
                      </div>

                      {/* REAL-TIME GOOGLE SERP PREVIEW BOX */}
                      <div className="border border-[#ccd0d4] bg-white p-5 space-y-2 rounded-sm select-none">
                        <span className="text-[10px] uppercase font-bold text-[#646970] tracking-wide block">Google SERP Snippet Preview</span>
                        
                        <div className="font-sans space-y-1 text-left">
                          <div className="text-[12px] text-[#202124] flex items-center gap-1">
                            <span className="text-[#3c4043] font-normal">https://al-mualim.org/page/</span>
                            <strong className="text-[#202124] font-medium font-mono text-[11px]">{slug || 'page-slug'}</strong>
                          </div>
                          
                          <h4 className="text-[19px] text-[#1a0dab] hover:underline font-normal leading-tight font-sans">
                            {seoTitle || title || 'Please formulate a Page Title...'}
                          </h4>
                          
                          <p className="text-[13px] text-[#4d5156] leading-relaxed font-sans line-clamp-2">
                            {seoDescription || 'Add an index paragraph representing this static page to help search bot queries index the file perfectly.'}
                          </p>
                        </div>
                      </div>

                    </div>
                  )}

                  {editorTab === 'preview' && (
                    <div className="bg-white border border-[#ccd0d4] p-6 md:p-8 space-y-6 text-left rounded-sm min-h-[350px]">
                      <header className="border-b border-[#ccd0d4] pb-4 select-none">
                        <span className="text-[10px] font-bold tracking-widest text-[#d63638] uppercase block mb-1">
                          Static HTML Generated Layout Pre-Render
                        </span>
                        <h1 className="text-3xl font-normal text-[#1d2327]">
                          {seoH1 || title || 'Untitled Pre-render Preview'}
                        </h1>
                      </header>

                      <article className="prose prose-slate max-w-none text-[#2c3338] text-[14px] leading-relaxed space-y-4">
                        {content ? (
                          content.split('\n\n').map((para, i) => {
                            if (para.startsWith('# ')) {
                              return <h1 key={i} className="text-2xl font-normal text-[#1d2327] pt-3 pb-1 border-b border-[#ccd0d4]">{para.substring(2)}</h1>;
                            } else if (para.startsWith('## ')) {
                              return <h2 key={i} className="text-xl font-normal text-[#1d2327] pt-2 pb-1">{para.substring(3)}</h2>;
                            } else if (para.startsWith('### ')) {
                              return <h3 key={i} className="text-lg font-normal text-[#1d2327] pt-2">{para.substring(4)}</h3>;
                            } else if (para.startsWith('- [ ] ') || para.startsWith('- [x] ')) {
                              const checked = para.startsWith('- [x] ');
                              return (
                                <div key={i} className="flex items-center gap-2 py-1 font-sans">
                                  <input type="checkbox" checked={checked} disabled className="rounded-sm border-[#ccd0d4] bg-white text-[#2271b1] focus:ring-[#2271b1]" />
                                  <span>{para.substring(6)}</span>
                                </div>
                              );
                            } else if (para.startsWith('- ')) {
                              return (
                                <ul key={i} className="list-disc pl-5 space-y-0.5 font-sans">
                                  <li>{para.substring(2)}</li>
                                </ul>
                              );
                            } else if (para.startsWith('> ')) {
                              return (
                                <blockquote key={i} className="border-l-4 border-[#2271b1] pl-4 py-1.5 italic bg-[#f0f0f1] font-serif transition-all my-2 text-base text-[#4d5156]">
                                  {para.substring(2)}
                                </blockquote>
                              );
                            }
                            return <p key={i}>{para}</p>;
                          })
                        ) : (
                          <p className="text-[#646970] italic">Please structure markdown parameters under the Content tab to populate this mock view.</p>
                        )}
                      </article>
                    </div>
                  )}

                </div>

                {/* RIGHT SIDE PANEL (METRIC ACCORDIONS & METADATA WIDGETS) */}
                <div className="space-y-4">
                  
                  {/* Accordion: Publish */}
                  <div className="bg-white border border-[#ccd0d4] rounded-sm shadow-sm select-none">
                    <div className="p-3 bg-[#fcfcfc] border-b border-[#ccd0d4] text-xs font-bold text-[#2c3338] uppercase tracking-wide">
                      Publish Settings
                    </div>

                    <div className="p-4 space-y-3 text-xs text-[#2c3338] font-sans">
                      
                      {/* Active Status dropdown */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[#646970] font-medium">Status:</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${status === 'published' ? 'bg-green-600' : 'bg-neutral-400'}`} />
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                            className="p-1 border border-[#ccd0d4] text-[11px] bg-white rounded-sm text-[#2c3338] outline-none"
                          >
                            <option value="draft">Draft / Private</option>
                            <option value="published">Published / Public</option>
                          </select>
                        </div>
                      </div>

                      {/* Sitemap priority selection */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[#646970] font-medium">Priority in XML:</span>
                        <select
                          value={sitemapPriority}
                          onChange={(e) => setSitemapPriority(e.target.value)}
                          className="p-1 border border-[#ccd0d4] text-[11px] bg-white rounded-sm text-[#2c3338] outline-none"
                        >
                          <option value="1.0">1.0 (Critical Anchor/Home)</option>
                          <option value="0.8">0.8 (Excellent post index)</option>
                          <option value="0.6">0.6 (Standard sub-page)</option>
                          <option value="0.4">0.4 (Deep resource node)</option>
                        </select>
                      </div>

                      {/* Page Info */}
                      {selectedPage && (
                        <div className="border-t border-[#f0f0f1] pt-2.5 space-y-1 text-[11px] text-[#8c8f94] font-mono leading-tight">
                          <div>Created: {new Date(selectedPage.created).toLocaleDateString()}</div>
                          <div>Modified: {new Date(selectedPage.modified).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-[#fcfcfc] border-t border-[#ccd0d4] flex items-center justify-between">
                      {selectedPage && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedPage) {
                              if (editingType === 'surah') {
                                if (confirm('Are you sure you want to reset all custom introductory text, audio links, and verse translations/tafsir overrides for this Surah to standard defaults?')) {
                                  setCustomIntro('');
                                  setCustomAudioUrl('');
                                  setTranslationOverrides({});
                                  setTafsirOverrides({});
                                }
                              } else {
                                handleDelete(selectedPage.id);
                              }
                            }
                          }}
                          className="text-[#b32d2e] hover:text-[#8b1112] text-xs font-medium cursor-pointer"
                        >
                          {editingType === 'surah' ? 'Reset Overrides' : 'Move to Trash'}
                        </button>
                      )}
                      <button
                        type="submit"
                        className="ml-auto px-3 py-1.5 bg-[#2271b1] text-white hover:bg-[#135e96] border border-[#2271b1] text-xs font-semibold rounded-sm shadow-sm hover:shadow cursor-pointer"
                      >
                        {mode === 'create' ? 'Publish' : 'Update'}
                      </button>
                    </div>
                  </div>

                  {/* Accordion: SEO Health Indicator */}
                  <div className="bg-white border border-[#ccd0d4] rounded-sm shadow-sm text-left">
                    <div className="p-3 bg-[#fcfcfc] border-b border-[#ccd0d4] flex items-center justify-between text-xs font-bold text-[#2c3338] uppercase tracking-wide select-none">
                      <span>SEO Health Score</span>
                      <span className={`px-1.5 py-0.5 text-[11px] font-bold rounded-sm ${
                        seoHealth.score > 80 ? 'bg-green-100 text-green-700' : seoHealth.score > 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100/80 text-red-700'
                      }`}>
                        {seoHealth.score}/100
                      </span>
                    </div>

                    <div className="p-3.5 space-y-3 text-xs text-[#2c3338] max-h-[220px] overflow-y-auto font-sans leading-relaxed">
                      {seoHealth.reports.map((r, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="flex-shrink-0 mt-0.5">
                            {r.level === 'success' && <CheckCircle size={13} className="text-green-600" />}
                            {r.level === 'warning' && <AlertTriangle size={13} className="text-amber-600" />}
                            {r.level === 'danger' && <AlertTriangle size={13} className="text-red-650" />}
                            {r.level === 'info' && <Info size={13} className="text-[#2271b1]" />}
                          </span>
                          <span className={r.level === 'success' ? 'text-[#2c3338]' : 'text-[#646970]'}>
                            {r.msg}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </form>
          )}

        </div>

      </div>

    </div>
  );
}
