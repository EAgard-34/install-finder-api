import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME?.trim();
  if (!email || !name) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_NAME before seeding.");
  }
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", active: true, name },
    create: { email, name, role: "ADMIN" },
  });
  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
