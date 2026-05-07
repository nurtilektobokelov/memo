import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

router.patch("/me", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;

  const { name, dailyGoal, newCardsPerDay } = req.body as {
    name?: string;
    dailyGoal?: number;
    newCardsPerDay?: number;
  };

  try {
    const data: { name?: string; dailyGoal?: number; newCardsPerDay?: number } = {};
    if (name !== undefined) data.name = name.trim();
    if (dailyGoal !== undefined) data.dailyGoal = Number(dailyGoal);
    if (newCardsPerDay !== undefined) data.newCardsPerDay = Number(newCardsPerDay);

    const updated = await prisma.user.update({ where: { id: userId }, data });

    const sessionUser: Express.User = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar ?? null,
      provider: updated.provider ?? null,
      dailyGoal: updated.dailyGoal,
      newCardsPerDay: updated.newCardsPerDay,
    };

    req.login(sessionUser, (err) => {
      if (err) {
        res.status(500).json({ error: "Session update failed." });
        return;
      }
      res.json({ user: req.user });
    });
  } catch {
    res.status(500).json({ error: "Update failed." });
  }
});

router.post("/me/password", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;

  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both current and new passwords are required." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      res.status(400).json({ error: "Password change is not available for OAuth accounts." });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters." });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Password change failed." });
  }
});

router.delete("/me/cards", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;

  try {
    const decks = await prisma.deck.findMany({
      where: { userId },
      select: { id: true },
    });
    const deckIds = decks.map((d) => d.id);

    await prisma.reviewLog.deleteMany({ where: { userId } });
    const { count } = await prisma.card.deleteMany({
      where: { deckId: { in: deckIds } },
    });

    res.json({ deleted: count });
  } catch {
    res.status(500).json({ error: "Failed to delete cards." });
  }
});

router.delete("/me", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;

  try {
    const decks = await prisma.deck.findMany({
      where: { userId },
      select: { id: true },
    });
    const deckIds = decks.map((d) => d.id);

    await prisma.reviewLog.deleteMany({ where: { userId } });
    await prisma.card.deleteMany({ where: { deckId: { in: deckIds } } });
    await prisma.deck.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    req.logout(() => {
      req.session.destroy(() => {
        res.json({ ok: true });
      });
    });
  } catch {
    res.status(500).json({ error: "Account deletion failed." });
  }
});

export default router;
