import type { APIDeck, APICard } from "./api.ts";

export const MOCK_DECKS: APIDeck[] = [
  { id: 1, name: "Japanese N3",             description: "JLPT N3 vocabulary & grammar", category: "Language", color: "#FBEAF0", userId: 1, createdAt: "", _count: { cards: 240 } },
  { id: 2, name: "AWS Solutions Architect",  description: "SAA-C03 exam preparation",     category: "Cert",     color: "#FAEEDA", userId: 1, createdAt: "", _count: { cards: 380 } },
  { id: 3, name: "Human Anatomy",            description: "Med school fundamentals",       category: "Subject",  color: "#E1F5EE", userId: 1, createdAt: "", _count: { cards: 150 } },
  { id: 4, name: "Capital Cities",           description: "World capitals quiz",           category: "General",  color: "#EEEDFE", userId: 1, createdAt: "", _count: { cards: 195 } },
  { id: 5, name: "Spanish Verbs",            description: "Common verb conjugations",      category: "Language", color: "#FBEAF0", userId: 1, createdAt: "", _count: { cards: 120 } },
  { id: 6, name: "CompTIA Security+",        description: "SY0-701 exam preparation",      category: "Cert",     color: "#FAEEDA", userId: 1, createdAt: "", _count: { cards: 290 } },
];

export interface MockDeckMeta {
  dueCount: number;
  masteredCount: number;
  totalCount: number;
}

export const MOCK_DECK_META: Record<number, MockDeckMeta> = {
  1: { dueCount: 18, masteredCount: 160, totalCount: 240 },
  2: { dueCount: 42, masteredCount: 200, totalCount: 380 },
  3: { dueCount: 7,  masteredCount: 90,  totalCount: 150 },
  4: { dueCount: 25, masteredCount: 140, totalCount: 195 },
  5: { dueCount: 30, masteredCount: 55,  totalCount: 120 },
  6: { dueCount: 0,  masteredCount: 280, totalCount: 290 },
};

export const MOCK_STREAK: number[] = [
  0, 1, 2, 3, 2, 4, 3,
  1, 0, 3, 4, 3, 2, 4,
  2, 3, 4, 4, 2, 1, 3,
  0, 1, 2, 3, 4, 3, 2,
  3, 4, 4, 3, 2, 4, 0,
];

const now = new Date().toISOString();

export const MOCK_CARDS: APICard[] = [
  { id: 1,  front: "食べる",                         back: "taberu — to eat (ichidan verb)",                                    imageUrl: null, audioUrl: null, deckId: 1, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
  { id: 2,  front: "飲む",                           back: "nomu — to drink (godan verb)",                                     imageUrl: null, audioUrl: null, deckId: 1, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
  { id: 3,  front: "勉強する",                       back: "benkyou suru — to study",                                          imageUrl: null, audioUrl: null, deckId: 1, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
  { id: 4,  front: "What does IAM stand for?",       back: "Identity and Access Management — controls who can access what in AWS.", imageUrl: null, audioUrl: null, deckId: 2, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
  { id: 5,  front: "What is an AWS Region?",         back: "A geographic area containing multiple isolated Availability Zones.",  imageUrl: null, audioUrl: null, deckId: 2, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
  { id: 6,  front: "What is the mitochondria?",      back: "The powerhouse of the cell. Produces ATP via cellular respiration.",   imageUrl: null, audioUrl: null, deckId: 3, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
  { id: 7,  front: "What is the capital of Japan?",  back: "Tokyo (東京) — population ~14 million in the city proper.",           imageUrl: null, audioUrl: null, deckId: 4, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
  { id: 8,  front: "¿Cómo estás?",                  back: "How are you? (informal) — Estoy bien, gracias.",                      imageUrl: null, audioUrl: null, deckId: 5, createdAt: now, nextReview: now, interval: 1, ease: 2.5, state: "new", lapses: 0 },
];
