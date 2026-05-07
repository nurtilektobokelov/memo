import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  try {
    const deckId = Number(req.params.id);

    const cards = await prisma.card.findMany({
      where: { deckId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { reviewLogs: true } } },
    });

    res.json(cards.map(({ _count, ...c }) => ({ ...c, reviewCount: _count.reviewLogs })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const deckId = Number(req.params.id);
    const { front, back, imageUrl, audioUrl } = req.body;

    if (!front || !back) {
      res.status(400).json({ error: "front and back are required" });
      return;
    }

    const card = await prisma.card.create({
      data: { front, back, imageUrl, audioUrl, deckId },
    });

    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create card" });
  }
});

router.get("/due", async (req: Request, res: Response) => {
  try {
    const deckId = Number(req.params.id);
    const now = new Date();

    const dueCards = await prisma.card.findMany({
      where: {
        deckId,
        OR: [
          { state: "new" },
          { nextReview: { lte: now } },
        ],
      },
      orderBy: { nextReview: "asc" },
      include: { _count: { select: { reviewLogs: true } } },
    });

    res.json(dueCards.map(({ _count, ...c }) => ({ ...c, reviewCount: _count.reviewLogs })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch due cards" });
  }
});

export default router;

export const cardActionsRouter = Router();

cardActionsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const cardId = Number(req.params.id);
    const { front, back, imageUrl } = req.body as {
      front?: string;
      back?: string;
      imageUrl?: string | null;
    };

    if (front !== undefined && !front.trim()) {
      res.status(400).json({ error: "Front cannot be empty" });
      return;
    }
    if (back !== undefined && !back.trim()) {
      res.status(400).json({ error: "Back cannot be empty" });
      return;
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(front !== undefined && { front: front.trim() }),
        ...(back !== undefined && { back: back.trim() }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update card" });
  }
});

cardActionsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const cardId = Number(req.params.id);

    await prisma.reviewLog.deleteMany({ where: { cardId } });
    await prisma.card.delete({ where: { id: cardId } });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete card" });
  }
});
