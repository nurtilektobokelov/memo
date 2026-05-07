import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: "demo@memo.app" },
    update: {},
    create: { email: "demo@memo.app", name: "Demo User" },
  });
  console.log(`✓ Demo user ready: id=${user.id} email=${user.email} name="${user.name}"`);
  console.log(`  → Set DEMO_USER_ID = "${user.id}" in client/src/lib/api.ts if it differs from "1"`);
}

main()
  .catch((err: unknown) => { console.error(err); process.exit(1); })
  .finally(() => void prisma.$disconnect());
