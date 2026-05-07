import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import passport from "../lib/passport";

const router = Router();
const CLIENT_URL = "http://localhost:5173";

router.get("/me", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: req.user });
});

router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${CLIENT_URL}/login?error=google`,
  }),
  (_req: Request, res: Response) => {
    res.redirect(`${CLIENT_URL}/auth/success`);
  },
);

router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${CLIENT_URL}/login?error=github`,
  }),
  (_req: Request, res: Response) => {
    res.redirect(`${CLIENT_URL}/auth/success`);
  },
);

router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: email.trim() },
    });
    if (existing) {
      res
        .status(409)
        .json({ error: "An account with that email already exists." });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashed,
        provider: "local",
      },
    });

    const sessionUser: Express.User = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: null,
      provider: user.provider ?? null,
      dailyGoal: user.dailyGoal,
      newCardsPerDay: user.newCardsPerDay,
    };

    req.login(sessionUser, (err) => {
      if (err) {
        res.status(500).json({ error: "Login failed after registration." });
        return;
      }
      res.status(201).json({ user: req.user });
    });
  } catch {
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", (req: Request, res: Response) => {
  passport.authenticate("local", (err: Error | null, user: Express.User | false, info: any) => {
    if (err) {
      res.status(500).json({ error: "Login failed." });
      return;
    }
    if (!user) {
      res
        .status(401)
        .json({ error: (info as { message?: string })?.message ?? "Invalid credentials." });
      return;
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        res.status(500).json({ error: "Session error." });
        return;
      }
      res.json({ user });
    });
  })(req, res);
});

router.post("/logout", (req: Request, res: Response) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });
});

export default router;
