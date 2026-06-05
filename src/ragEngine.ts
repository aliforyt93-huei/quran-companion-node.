export interface RagDocument {
  id: string;
  title: string;
  category: 'tafsir' | 'hadith' | 'jurisprudence' | 'history' | 'user-upload';
  source: string; // e.g. "Tafsir Ibn Kathir", "Sahih al-Bukhari"
  content: string;
  isActive: boolean;
  created?: string;
}

export interface RagChunk {
  documentId: string;
  documentTitle: string;
  category: string;
  source: string;
  text: string;
  index: number;
}

export interface SearchResult {
  chunk: RagChunk;
  score: number;
}

// Preloaded Classical Islamic Scholarly Texts
export const PRELOADED_DOCUMENTS: RagDocument[] = [
  {
    id: "pre-niyyah",
    title: "Sincerity, Intentions, and Sincerity of Action (Niyyah)",
    category: "hadith",
    source: "Sahih al-Bukhari & Sahih Muslim",
    isActive: true,
    content: `Narrated by Umar bin Al-Khattab, the Messenger of Allah, peace be upon him, said: "Actions are but by intentions and every man shall have only that which he intended. Thus, he whose migration was for Allah and His Messenger, his migration was for Allah and His Messenger, and he whose migration was for a worldly benefit or for a woman to marry, his migration was for what he migrated for." 

Scholarly Commentary:
Imam al-Bukhari chose this Hadith as the opening text of his entire Sahih because it sets the purification of intention as the prerequisite for lock-step acceptability of all righteous deeds. In Islamic law, every act of worship (ibadah) such as ablution, daily prayer, fasting, and almsgiving must be prefaced by a sincere intention to please Allah alone. The Arabic term Niyyah represents the conscious motivation of the spiritual heart.`
  },
  {
    id: "pre-ikhlas",
    title: "Tafseer of Surah Al-Ikhlas (Absolute Monotheism)",
    category: "tafsir",
    source: "Tafsir Ibn Kathir - Chapter 112",
    isActive: true,
    content: `Surah Al-Ikhlas (Chapter 112) is equivalent to one-third of the Quran. Ibn Kathir explains: "This Surah teaches absolute monotheism (Tawheed). It was revealed when the polytheists of Makkah came to the Messenger of Allah demanding, 'Describe the lineage of your Lord to us.' In response, Allah revealed: 'Say, He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent.' 

This Surah declares that Allah the Almighty has no parents, no children, no partners, and no ancestry, refuting all forms of polytheism and anthropomorphism. It establishes the purity of Faith (Ikhlas) as centering solely on Creator uniqueness and absolute transcendence over creation."`
  },
  {
    id: "pre-ilm",
    title: "The Virtues of Seeking and Spreading Sacred Knowledge (Al-Ilm)",
    category: "hadith",
    source: "Sahih Muslim & Sunan Ibn Majah",
    isActive: true,
    content: `The Prophet Muhammad (peace be upon him) said: "Whoever takes a path in search of knowledge, Allah will make easy for him the path to Paradise. Verily, the angels lower their wings in approval for the seeker of knowledge, and those in the heavens and the earth, even the fish in the depths of the water, ask forgiveness for the scholar. The virtue of the scholar over the worshipper is like the superiority of the moon over all other stars. The scholars are the heirs of the Prophets."

Scholarly Context:
Imam Al-Ghazali in his masterpiece "Ihya Ulum al-Din" (The Revival of the Religious Sciences) outlines that Al-Mualim (the teacher) holds a sacred office under the inheritance of Prophet-guidance. Seeking knowledge of faith is an individual obligation (Fard al-Ayn) for matters of daily ritual and character, while broader scholarly study is a collective duty (Fard al-Kifayah) for the community.`
  },
  {
    id: "pre-sabr-salah",
    title: "The Value of Patience, Struggle and Prayer (Sabr & Salah)",
    category: "tafsir",
    source: "Tafsir al-Jalalayn & Maariful Quran - Al-Baqarah",
    isActive: true,
    content: `Allah the Almighty says in Surah Al-Baqarah (2:153): "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient."

The classical scholars explain that Sabr (patience) has three distinct levels:
1) Patience in obeying Allah's commands and executing rituals consistently.
2) Patience in refraining from sins and forbidden worldly temptations.
3) Patience (resignation/Rida) during trials, illness, loss, and tribulations.

Combined with Salah (prayer), Sabr acts as the ultimate spiritual anchor for believers, grounding their hearts during hardship. When the Prophet encountered difficult situations, he would immediately rush to establish prayer, seeking the divine assistance of Allah.`
  },
  {
    id: "pre-khuluq",
    title: "Good Character, Manners, and Interpersonal Ethics (Husn al-Khuluq)",
    category: "hadith",
    source: "Jami' at-Tirmidhi & Riyadh us-Saliheen",
    isActive: true,
    content: `The Messenger of Allah, peace be upon him, said: "Nothing is heavier on the Scale of the believer on the Day of Resurrection than good character. Indeed, Allah dislikes the rude and vulgar person." He also said: "The most perfect of believers in faith is the one with the best character, and the best of you are those who are best to their wives." 

Scholarly Insights:
Good character in Islam (Husn al-Khuluq) represents the visible fruits of inward faith (Iman). It encompasses honesty, humility, generosity, smiling, tolerance, refraining from harm or gossip, and displaying absolute moral excellence. Traditional scholars affirm that true devotion to Allah cannot be separated from treating human beings with gentle empathy and high ethical standards.`
  },
  {
    id: "pre-wahy",
    title: "The Process of Revelation & Asbab al-Nuzul (History of Wahy)",
    category: "history",
    source: "Sahih al-Bukhari & Al-Suyuti's Itqan",
    isActive: true,
    content: `Wahy (Divine Revelation) began in the Cave of Hira in the Year 610 CE. The Angel Jibreel (Gabriel) appeared to Prophet Muhammad (peace be upon him) and commanded: "Iqra!" (Read/Recite!). The Prophet replied: "I am not a reader." The angel embraced him tightly and repeated the command twice more, then revealed the first five verses of Surah Al-Alaq: "Recite in the name of your Lord who created...". 

Revelation came in different forms: sometimes like the ringing of a bell (which was the hardest on the Prophet), and sometimes Jibreel appeared in human form to speak to him directly.

Understanding 'Asbab al-Nuzul' (reasons/events of revelation) is a foundational science. It allows scholars to understand the historic context and legal scope of Quranic verses, preventing false interpretations from taking verses out of their historical situations.`
  },
  {
    id: "pre-parents",
    title: "Honoring, Serving, and Loving Parents (Birr al-Walidayn)",
    category: "tafsir",
    source: "Maariful Quran & Ibn Kathir - Surah Al-Isra",
    isActive: true,
    content: `Allah says in Surah Al-Isra (17:23-24): "And your Lord has decreed that you not worship except Him, and to parents, good treatment. Whether one or both of them reach old age [while] with you, say not to them [so much as], 'uff,' and do not repel them but speak to them a noble word."

The tafseer highlights that immediately after commanding monotheism (Tawheed), Allah commands absolute kindness and duty to parents. Saying "uff" represents the slightest sign of heavy breathing or irritation. Showing anger, raising the voice, or ignoring calls are strictly forbidden in Islam. Monotheism and respect for parents are joined together in the Quran as the dual pillars of Islamic moral commitments.`
  }
];

// Helper to chunk text documents into readable ~120-150 word segments with overlaps
export function chunkDocument(doc: RagDocument, maxWords = 150, overlapWords = 30): RagChunk[] {
  const words = doc.content.split(/\s+/).filter(w => w.trim().length > 0);
  const chunks: RagChunk[] = [];
  
  if (words.length <= maxWords) {
    chunks.push({
      documentId: doc.id,
      documentTitle: doc.title,
      category: doc.category,
      source: doc.source,
      text: doc.content,
      index: 0
    });
    return chunks;
  }

  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < words.length) {
    const chunkWords = words.slice(startIndex, startIndex + maxWords);
    if (chunkWords.length === 0) break;

    chunks.push({
      documentId: doc.id,
      documentTitle: doc.title,
      category: doc.category,
      source: doc.source,
      text: chunkWords.join(" "),
      index: chunkIdx++
    });

    startIndex += (maxWords - overlapWords);
  }

  return chunks;
}

// Low-case and strip punctuation for tokenizing
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'🗣️📖📜💡]/g, "")
    .split(/\s+/)
    .filter(token => token.length > 2); // Filter short words
}

// Stop words dictionary to skip common fillers
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "you", "not", "but", "are", "have", "said", "shall", "whose", "whom", "will", "been", "was", "were", "has", "had", "would", "could", "should", "your", "their", "them", "about", "into", "onto", "then", "there", "their", "these", "those"
]);

// Hybrid search matching: TF-IDF with phrase & positional boost
export function searchKnowledgeBase(query: string, activeDocuments: RagDocument[]): SearchResult[] {
  if (!query || activeDocuments.length === 0) return [];

  // Create chunks of all active documents
  const allChunks: RagChunk[] = [];
  for (const doc of activeDocuments) {
    if (doc.isActive) {
      allChunks.push(...chunkDocument(doc));
    }
  }

  if (allChunks.length === 0) return [];

  const queryTokens = tokenize(query).filter(t => !STOP_WORDS.has(t));
  const cleanQuery = query.toLowerCase().trim();

  // 1. Calculate document frequencies for query tokens of active chunks
  const docFrequency: Record<string, number> = {};
  for (const token of queryTokens) {
    docFrequency[token] = 0;
    for (const chunk of allChunks) {
      if (chunk.text.toLowerCase().includes(token)) {
        docFrequency[token]++;
      }
    }
  }

  // 2. Score chunks
  const results: SearchResult[] = allChunks.map(chunk => {
    let score = 0;
    const chunkLowerText = chunk.text.toLowerCase();
    const chunkLowerTitle = chunk.documentTitle.toLowerCase();
    const chunkLowerSource = chunk.source.toLowerCase();

    // Boost: Exact sub-phrase match is highly relevant!
    if (chunkLowerText.includes(cleanQuery)) {
      score += 30.0;
    }

    // Process token by token
    for (const token of queryTokens) {
      // Calculate Inverse Document Frequency to prioritize unique words (e.g. "Ikhlas", "Sabr")
      const chunksContainingToken = docFrequency[token] || 0;
      const idf = Math.log(1 + (allChunks.length - chunksContainingToken + 0.5) / (chunksContainingToken + 0.5)) + 1;

      // Count term frequency in chunk text
      const regex = new RegExp(token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      const matches = chunkLowerText.match(regex);
      const tf = matches ? matches.length : 0;

      if (tf > 0) {
        // Base TF-IDF score
        score += tf * idf * 2.5;

        // Title match boost
        if (chunkLowerTitle.includes(token)) {
          score += idf * 8.0;
        }

        // Source match boost
        if (chunkLowerSource.includes(token)) {
          score += idf * 4.0;
        }
      }
    }

    // Category match boost
    if (queryTokens.some(t => chunk.category.includes(t))) {
      score += 3.0;
    }

    return {
      chunk,
      score
    };
  });

  // Filter out zero-scores and sort by highest score first
  return results
    .filter(res => res.score > 0.5)
    .sort((a, b) => b.score - a.score);
}
