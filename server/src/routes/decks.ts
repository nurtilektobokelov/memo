import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/:id/due", async (req: Request, res: Response) => {
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

router.get("/:id/next-due", async (req: Request, res: Response) => {
  try {
    const deckId = Number(req.params.id);
    const now = new Date();

    const nextCard = await prisma.card.findFirst({
      where: {
        deckId,
        state: { not: "new" },
        nextReview: { gt: now },
      },
      orderBy: { nextReview: "asc" },
    });

    if (!nextCard) {
      res.json({ nextDue: null, timeLabel: null });
      return;
    }

    const diffMs = nextCard.nextReview.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    let timeLabel: string;
    if (diffMins < 60) {
      timeLabel = `in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
    } else if (diffHours < 24) {
      timeLabel = `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else if (diffDays < 2) {
      timeLabel = "tomorrow";
    } else {
      timeLabel = `in ${diffDays} days`;
    }

    res.json({ nextDue: nextCard.nextReview.toISOString(), timeLabel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch next due" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;

    const decks = await prisma.deck.findMany({
      where: userId ? { userId } : undefined,
      include: { _count: { select: { cards: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(decks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch decks" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, category, color, userId } = req.body;

    if (!name || !userId) {
      res.status(400).json({ error: "name and userId are required" });
      return;
    }

    const deck = await prisma.deck.create({
      data: { name, description, category, color, userId: Number(userId) },
    });

    res.status(201).json(deck);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create deck" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const deckId = Number(req.params.id);
    const userId = (req.user as { id: number } | undefined)?.id;

    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const deck = await prisma.deck.findUnique({ where: { id: deckId } });
    if (!deck || deck.userId !== userId) {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    const { name, description, category, color } = req.body as {
      name?: string;
      description?: string;
      category?: string;
      color?: string;
    };

    if (name !== undefined && !name.trim()) {
      res.status(400).json({ error: "Name cannot be empty" });
      return;
    }

    const updated = await prisma.deck.update({
      where: { id: deckId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(color !== undefined && { color }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update deck" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deckId = Number(req.params.id);
    const userId = (req.user as { id: number } | undefined)?.id;

    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const deck = await prisma.deck.findUnique({ where: { id: deckId } });
    if (!deck || deck.userId !== userId) {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    const cards = await prisma.card.findMany({
      where: { deckId },
      select: { id: true },
    });
    const cardIds = cards.map((c) => c.id);

    if (cardIds.length > 0) {
      await prisma.reviewLog.deleteMany({ where: { cardId: { in: cardIds } } });
      await prisma.card.deleteMany({ where: { deckId } });
    }
    await prisma.deck.delete({ where: { id: deckId } });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete deck" });
  }
});

export default router;
