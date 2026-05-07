import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from "passport-github2";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      avatar: string | null;
      provider: string | null;
      dailyGoal: number;
      newCardsPerDay: number;
    }
  }
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id } });
    if (!dbUser) return done(null, false);
    done(null, {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      avatar: dbUser.avatar ?? null,
      provider: dbUser.provider ?? null,
      dailyGoal: dbUser.dailyGoal,
      newCardsPerDay: dbUser.newCardsPerDay,
    });
  } catch (err) {
    done(err);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? "";
          const avatar = profile.photos?.[0]?.value ?? null;

          let user = await prisma.user.findFirst({
            where: { provider: "google", providerId: profile.id },
          });

          if (!user && email) {
            user = await prisma.user.findUnique({ where: { email } });
          }

          if (user) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { avatar, provider: "google", providerId: profile.id },
            });
          } else {
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || email.split("@")[0] || "User",
                provider: "google",
                providerId: profile.id,
                avatar,
              },
            });
          }

          done(null, {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar ?? null,
            provider: user.provider ?? null,
            dailyGoal: user.dailyGoal,
            newCardsPerDay: user.newCardsPerDay,
          });
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback",
        scope: ["user:email"],
      },
      async (_accessToken: string, _refreshToken: string, profile: GitHubProfile, done: (err: Error | null, user?: Express.User | false) => void) => {
        try {
          const email =
            profile.emails?.[0]?.value ??
            `${profile.username ?? profile.id}@users.noreply.github.com`;
          const avatar = profile.photos?.[0]?.value ?? null;
          const providerId = String(profile.id);

          let user = await prisma.user.findFirst({
            where: { provider: "github", providerId },
          });

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } });
          }

          if (user) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { avatar, provider: "github", providerId },
            });
          } else {
            user = await prisma.user.create({
              data: {
                email,
                name:
                  profile.displayName ||
                  profile.username ||
                  email.split("@")[0] ||
                  "User",
                provider: "github",
                providerId,
                avatar,
              },
            });
          }

          done(null, {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar ?? null,
            provider: user.provider ?? null,
            dailyGoal: user.dailyGoal,
            newCardsPerDay: user.newCardsPerDay,
          });
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
          return done(null, false, { message: "Invalid email or password." });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          return done(null, false, { message: "Invalid email or password." });
        }

        done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
          provider: user.provider ?? null,
          dailyGoal: user.dailyGoal,
          newCardsPerDay: user.newCardsPerDay,
        });
      } catch (err) {
        done(err);
      }
    },
  ),
);

export default passport;
