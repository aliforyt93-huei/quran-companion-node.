import { Reciter } from './types';

export const POPULAR_RECITERS: Reciter[] = [
  { identifier: 'ar.alafasy', name: 'مشاري بن راشد العفاسي', englishName: 'Mishary Alafasy', format: 'audio', type: 'surah' },
  { identifier: 'ar.abdulsamad', name: 'عبد الباسط عبد الصمد', englishName: 'Abdul Basit Abdul Samad', format: 'audio', type: 'surah' },
  { identifier: 'ar.mahermuaiqly', name: 'ماهر المعيقلي', englishName: 'Maher Al Muaiqly', format: 'audio', type: 'surah' },
  { identifier: 'ar.husary', name: 'محمود خليل الحصري', englishName: 'Mahmoud Khalil Al-Husary', format: 'audio', type: 'surah' },
];

export const TRANSLATION_LANGUAGES = [
  { id: 'en.sahih', name: 'English (Sahih)', label: 'English', audioId: 'en.walk' },
  { id: 'ur.jalandhry', name: 'Urdu (Jalandhry)', label: 'Urdu', audioId: 'ur.khan' },
];

export const BACKGROUND_VIDEOS = [
  {
    id: 'universe',
    name: 'Universe',
    url: 'https://cdn.pixabay.com/get/video/2019/05/30/24103-340150993_large.mp4',
  },
  {
    id: 'sky',
    name: 'Day Sky',
    url: 'https://cdn.pixabay.com/get/video/2016/09/21/5416-184000305_large.mp4',
  },
  {
    id: 'flowers',
    name: 'Wonderful Flowers',
    url: 'https://cdn.pixabay.com/get/video/2021/04/18/71321-539088647_large.mp4',
  },
  {
    id: 'nature',
    name: 'Mountain Lake',
    url: 'https://cdn.pixabay.com/get/video/2016/01/29/1897-152066861_large.mp4',
  }
];

export const API_BASE_URL = 'https://api.alquran.cloud/v1';
export const QURAN_COM_API_BASE_URL = 'https://api.quran.com/api/v4';

export const TAFSIR_SOURCES = [
  { id: 169, name: 'Tafsir Ibn Kathir (Abridged)', author: 'Hafiz Ibn Kathir', language: 'English' },
  { id: 168, name: "Ma'arif al-Qur'an", author: 'Mufti Muhammad Shafi', language: 'English' },
  { id: 16, name: 'Tafsir Muyassar (Simplified)', author: 'Al-Muyassar', language: 'Arabic' },
  { id: 91, name: "Al-Sa'di (Taysir al-Karim)", author: 'Sheikh Abdur Rahman as-Sa\'di', language: 'Arabic' },
  { id: 14, name: 'Tafsir Ibn Kathir', author: 'Hafiz Ibn Kathir', language: 'Arabic' },
  { id: 15, name: 'Tafsir al-Tabari', author: 'Imam al-Tabari', language: 'Arabic' },
  { id: 159, name: 'Bayan ul Quran', author: 'Dr. Israr Ahmed', language: 'Urdu' },
  { id: 160, name: 'Tafsir Ibn Kathir', author: 'Hafiz Ibn Kathir', language: 'Urdu' },
  { id: 157, name: 'Fi Zilal al-Quran', author: 'Sayyid Qutb', language: 'Urdu' },
  { id: 166, name: 'Tafsir Abu Bakr Zakaria', author: 'Dr. Abu Bakr Zakaria', language: 'Bengali' },
];
