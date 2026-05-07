import { Router } from "express";
import type { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";

const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
  options?: Record<string, unknown>,
) => Promise<{ text: string; numpages: number }>;

const router = Router();
const client = new Anthropic();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/generate-cards", async (req: Request, res: Response) => {
  try {
    const {
      mode,
      prompt,
      documentText,
      deckId,
      userId,
      cardFormat = "qa",
      cardCount = 20,
      frontLanguage,
      backLanguage,
    } = req.body as {
      mode: "prompt" | "document";
      prompt?: string;
      documentText?: string;
      deckId: string;
      userId: string;
      cardFormat?: "definition" | "qa" | "translation";
      cardCount?: number;
      frontLanguage?: string;
      backLanguage?: string;
    };

    if (!deckId || !userId) {
      res.status(400).json({ error: "deckId and userId are required" });
      return;
    }

    if (mode === "prompt" && !prompt?.trim()) {
      res.status(400).json({ error: "prompt is required when mode is 'prompt'" });
      return;
    }

    if (mode === "document" && !documentText?.trim()) {
      res.status(400).json({ error: "documentText is required when mode is 'document'" });
      return;
    }

    const safeCount = Math.min(Math.max(Number(cardCount) || 20, 1), 50);

    const formatDescriptions: Record<string, string> = {
      definition:
        'Each card: front = a term or concept, back = its definition.\nExample: front "Mitochondria" → back "The powerhouse of the cell; organelle that produces ATP"',
      qa:
        'Each card: front = a clear question, back = a concise answer.\nExample: front "What year did WW2 end?" → back "1945"',
      translation:
        `Each card: front = word/phrase in ${frontLanguage ?? "the target language"}, back = ${backLanguage ?? "English"} translation.\nExample: front "Hola" (${frontLanguage ?? "target language"}) → back "Hello" (${backLanguage ?? "English"})`,
    };

    const systemPrompt = `You are an expert flashcard creator for spaced repetition learning.
Generate exactly ${safeCount} flashcards in this format:
${formatDescriptions[cardFormat] ?? formatDescriptions.qa}
Keep fronts concise and backs brief but complete. Vary the cards to cover different aspects.`;

    const userContent =
      mode === "prompt"
        ? `Generate exactly ${safeCount} flashcards about: ${prompt!.trim()}`
        : `Extract exactly ${safeCount} flashcards from this text:\n\n${documentText!.trim()}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      tools: [
        {
          name: "submit_flashcards",
          description: "Submit the generated flashcard pairs",
          input_schema: {
            type: "object" as const,
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: { type: "string" },
                    back: { type: "string" },
                  },
                  required: ["front", "back"],
                },
              },
            },
            required: ["cards"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_flashcards" },
    });

    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolBlock) {
      res.status(500).json({ error: "AI did not return flashcards" });
      return;
    }

    const { cards } = toolBlock.input as { cards: { front: string; back: string }[] };
    if (!Array.isArray(cards) || cards.length === 0) {
      res.status(500).json({ error: "AI returned no flashcard pairs" });
      return;
    }

    res.json(cards.map((c) => ({ front: c.front, back: c.back })));
  } catch (err) {
    console.error("generate-cards error:", err);
    if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: `AI service error: ${err.message}` });
      return;
    }
    res.status(500).json({ error: "Failed to generate flashcards" });
  }
});

router.post(
  "/extract-pdf",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (file.mimetype !== "application/pdf") {
        res.status(400).json({ error: "Only PDF files are supported" });
        return;
      }

      const parsed = await pdfParse(file.buffer);
      const rawText = parsed.text ?? "";
      const truncated = rawText.slice(0, 50_000);
      const wordCount = truncated
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      res.json({
        text: truncated,
        pages: parsed.numpages,
        wordCount,
      });
    } catch (err) {
      console.error("extract-pdf error:", err);
      res.status(500).json({ error: "Failed to parse PDF" });
    }
  },
);

router.post("/improve-prompt", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as { prompt: string };

    if (!prompt?.trim()) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: `You are a flashcard prompt optimizer. Given a short topic or prompt,
rewrite it to be more specific and detailed so it generates better, more focused flashcards.
Return ONLY the improved prompt text — no explanation, no preamble, no quotes.`,
      messages: [
        {
          role: "user",
          content: `Improve this flashcard prompt: ${prompt.trim()}`,
        },
      ],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!textBlock) {
      res.status(500).json({ error: "AI did not return an improved prompt" });
      return;
    }

    res.json({ improved: textBlock.text.trim() });
  } catch (err) {
    console.error("improve-prompt error:", err);
    if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: `AI service error: ${err.message}` });
      return;
    }
    res.status(500).json({ error: "Failed to improve prompt" });
  }
});

router.post("/explain", async (req: Request, res: Response) => {
  try {
    const { front, back, deckName, userRating } = req.body as {
      front: string;
      back: string;
      deckName: string;
      userRating: number;
    };

    if (!front || !back) {
      res.status(400).json({ error: "front and back are required" });
      return;
    }

    const ratingLabels = ["", "Again", "Hard", "Good", "Easy"];
    const ratingNote =
      userRating > 0 && userRating <= 4
        ? `\nThe learner rated this card "${ratingLabels[userRating]}" — tailor your explanation to address any difficulty.`
        : "";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a friendly, encouraging tutor helping someone learn with spaced repetition flashcards.
Give a clear, concise explanation (2–4 sentences) that deepens the learner's understanding of the concept.
Include the "why it matters" and a simple memory tip or mnemonic where helpful. Be warm, direct, and supportive.`,
      messages: [
        {
          role: "user",
          content: `Deck: ${deckName || "General"}
Card front: ${front}
Card back: ${back}${ratingNote}

Please explain this concept to help me understand and remember it.`,
        },
      ],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!textBlock) {
      res.status(500).json({ error: "AI did not return an explanation" });
      return;
    }

    res.json({ explanation: textBlock.text });
  } catch (err) {
    console.error("explain error:", err);
    if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: `AI service error: ${err.message}` });
      return;
    }
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

export default router;
