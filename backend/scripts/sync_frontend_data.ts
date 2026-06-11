import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const requiredFiles = [
  "structured_esg_dataset.json",
  "structured_esg_signals.json",
  "trend_output.json",
  "companies.json",
  "collection_scope.json",
];

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "data");
const targetDir = path.resolve(rootDir, "..", "frontend", "public", "data");

await mkdir(targetDir, { recursive: true });

for (const fileName of requiredFiles) {
  const sourcePath = path.join(sourceDir, fileName);
  const targetPath = path.join(targetDir, fileName);
  await copyFile(sourcePath, targetPath);
  console.log(`Copied ${path.relative(rootDir, sourcePath)} -> ${path.relative(rootDir, targetPath)}`);
}
