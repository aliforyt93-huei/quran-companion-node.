export interface Ayah {
  number: number;
  audio: string;
  translationAudio?: string;
  text: string;
  translation: string;
  tafsir?: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs?: Ayah[];
}

export interface Reciter {
  identifier: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
}

export interface SurahListItem {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface BookmarkItem {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  ayahNumberInSurah: number;
  ayahGlobalNumber: number;
  text: string;
  translation: string;
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoH1?: string;
  seoRobots?: string;
  sitemapPriority?: string;
  created: string;
  modified: string;
}

export function isRtlText(text: string): boolean {
  if (!text) return false;
  const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlPattern.test(text);
}

