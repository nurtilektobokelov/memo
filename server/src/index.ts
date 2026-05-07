import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./lib/passport";

import authRoutes from "./routes/auth";
import deckRoutes from "./routes/decks";
import cardRoutes, { cardActionsRouter } from "./routes/cards";
import reviewRoutes from "./routes/reviews";
import aiRoutes from "./routes/ai";
import userRoutes from "./routes/users";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "memo-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "memo server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/decks/:id/cards", cardRoutes);
app.use("/api/cards", cardActionsRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/api/ai", aiRoutes);

app.listen(PORT, () => {
  console.log(`memo server running on http://localhost:${PORT}`);
});
