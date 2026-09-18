import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();

async function clean() {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('.test-state-')) {
      const target = path.join(rootDir, entry.name);
      try {
        await fs.rm(target, { recursive: true, force: true });
        count += 1;
      } catch (error) {
        console.warn(`Failed to remove ${entry.name}:`, error.message);
      }
    }
  }
  console.log(`Cleaned up ${count} temporary test state directories.`);
}

clean().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
