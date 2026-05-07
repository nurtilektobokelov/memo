import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { calculateNextReview } from "../lib/srs";
import type { CardState } from "../lib/srs";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      cardId,
      userId,
      rating,
      currentState,
      currentInterval,
      currentEase,
      currentLapses,
    } = req.body;

    if (!cardId || !userId || !rating) {
      res.status(400).json({ error: "cardId, userId, and rating are required" });
      return;
    }

    if (![1, 2, 3, 4].includes(Number(rating))) {
      res.status(400).json({ error: "rating must be 1–4" });
      return;
    }

    const card = await prisma.card.findUnique({ where: { id: Number(cardId) } });
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    const srsData = {
      state: (currentState ?? card.state) as CardState,
      interval: Number(currentInterval ?? card.interval),
      ease: Number(currentEase ?? card.ease),
      lapses: Number(currentLapses ?? card.lapses),
    };

    const result = calculateNextReview(srsData, Number(rating) as 1 | 2 | 3 | 4);

    await prisma.$transaction([
      prisma.card.update({
        where: { id: card.id },
        data: {
          state: result.state,
          interval: result.interval,
          ease: result.ease,
          lapses: result.lapses,
          nextReview: result.nextReview,
        },
      }),
      prisma.reviewLog.create({
        data: {
          cardId: card.id,
          userId: Number(userId),
          rating: Number(rating),
          state: result.state,
          ease: result.ease,
          interval: result.interval,
          lapses: result.lapses,
          nextReview: result.nextReview,
        },
      }),
    ]);

    res.status(201).json({
      state: result.state,
      interval: result.interval,
      ease: result.ease,
      lapses: result.lapses,
      nextReview: result.nextReview.toISOString(),
      nextReviewLabel: result.nextReviewLabel,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save review" });
  }
});

router.get("/streak", async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const rows = await prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE("reviewedAt") as date, COUNT(*)::int as count
      FROM "ReviewLog"
      WHERE "userId" = ${userId}
        AND "reviewedAt" >= CURRENT_DATE - INTERVAL '34 days'
      GROUP BY DATE("reviewedAt")
      ORDER BY date ASC
    `;

    const countMap: Record<string, number> = {};
    for (const row of rows) {
      const dateStr = new Date(row.date).toISOString().slice(0, 10);
      countMap[dateStr] = Number(row.count);
    }

    const result: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: countMap[dateStr] ?? 0 });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch streak" });
  }
});

export default router;
