import { file, write } from "bun";
import { existsSync } from "node:fs";

async function main() {
  const envPath = "backend/.env";
  const envExamplePath = "backend/.env.example";

  if (!existsSync(envPath)) {
    console.log("No .env found, creating from .env.example");
    if (existsSync(envExamplePath)) {
      const exampleContent = await file(envExamplePath).text();
      await write(envPath, exampleContent);
    } else {
      await write(envPath, "DATABASE_URL=postgresql://johndoe:randompassword@localhost:5432/mydb\n");
    }
  }

  const content = await file(envPath).text();
  const isSupabase = content.includes("supabase.com") || content.includes("SUPABASE_URL");
  const isNeon = content.includes("neon.tech");

  if (isSupabase || isNeon) {
    console.log("Remote database detected (Supabase or Neon). Skipping local docker database setup.");
    return;
  }

  console.log("Local database configuration detected. Ensuring DATABASE_URL points to local docker...");
  let newContent = content;
  
  if (!newContent.includes("DATABASE_URL=")) {
    newContent += "\nDATABASE_URL=postgresql://johndoe:randompassword@localhost:5432/mydb";
  } else {
    newContent = newContent.replace(
      /^DATABASE_URL=.*$/m,
      "DATABASE_URL=postgresql://johndoe:randompassword@localhost:5432/mydb"
    );
  }
  
  await write(envPath, newContent);
  
  // Start local docker
  console.log("Starting local postgres docker container...");
  const proc = Bun.spawn(["docker", "run", "--name", "aos-postgres", "-e", "POSTGRES_USER=johndoe", "-e", "POSTGRES_PASSWORD=randompassword", "-e", "POSTGRES_DB=mydb", "-p", "5432:5432", "-d", "postgres:16"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.log("Docker run failed, attempting to start existing container...");
    const startProc = Bun.spawn(["docker", "start", "aos-postgres"], {
        stdout: "inherit",
        stderr: "inherit",
    });
    await startProc.exited;
  }
  
  console.log("Waiting for database to be ready...");
  await new Promise(r => setTimeout(r, 2000));
}

main().catch(console.error);
