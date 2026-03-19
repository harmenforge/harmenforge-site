import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "data");
const outputFile = path.join(outputDir, "models.js");
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

const entries = await fs.readdir(rootDir, { withFileTypes: true });
const modelDirs = entries
  .filter((entry) => entry.isDirectory() && /^model[-_ ]?\d+/i.test(entry.name))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

const models = await Promise.all(modelDirs.map(buildModel));

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  outputFile,
  `export const models = ${JSON.stringify(models, null, 2)};\n`,
  "utf8",
);

console.log(`Generated ${path.relative(rootDir, outputFile)} with ${models.length} model entries.`);

async function buildModel(directory) {
  const fullDir = path.join(rootDir, directory);
  const files = await fs.readdir(fullDir, { withFileTypes: true });

  const imageFiles = files
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const images = imageFiles.map((fileName, index) => ({
    src: `./${directory}/${encodeURIComponent(fileName).replace(/%2F/g, "/")}`,
    alt: `${toTitle(directory)} showcase image ${index + 1}`,
  }));

  return {
    folder: directory,
    title: toTitle(directory),
    description:
      "A refined AI model collage built for premium brand storytelling, campaign presentation, and editorial launch visuals.",
    imageCount: images.length,
    cover: images[0] ?? null,
    images,
  };
}

function toTitle(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
