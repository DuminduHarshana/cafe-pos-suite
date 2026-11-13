// Database Target Switcher (Local SQLite <-> Cloud PostgreSQL)
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const target = process.argv[2]; // 'cloud' or 'local'

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
const postgresSchemaPath = path.join(__dirname, "../prisma/schema.postgres.prisma");

if (target === "cloud") {
  console.log("Switching datasource to Cloud PostgreSQL (Supabase / Neon / AWS / Cloud SQL)...");
  if (!fs.existsSync(postgresSchemaPath)) {
    console.error("Missing prisma/schema.postgres.prisma");
    process.exit(1);
  }
  const content = fs.readFileSync(postgresSchemaPath, "utf8");
  fs.writeFileSync(schemaPath, content, "utf8");
  console.log("✓ Updated prisma/schema.prisma to provider = 'postgresql'");
  console.log("Generating Prisma Client for PostgreSQL...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("\nNext Steps for Cloud DB:");
  console.log("1. Add your cloud PostgreSQL connection string in .env: DATABASE_URL=\"postgresql://...\"");
  console.log("2. Run: npx prisma db push (to sync tables to your cloud database)");
  console.log("3. Run: npm run db:seed (to seed initial cafe menu & inventory)");
} else if (target === "local") {
  console.log("Switching datasource to Local SQLite...");
  let content = fs.readFileSync(schemaPath, "utf8");
  content = content.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, content, "utf8");
  console.log("✓ Updated prisma/schema.prisma to provider = 'sqlite'");
  console.log("Generating Prisma Client for SQLite...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✓ Local SQLite configuration active (dev.db)");
} else {
  console.log("Usage: node scripts/switch-db.js [cloud|local]");
}

