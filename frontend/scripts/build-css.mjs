import { __unstable__loadDesignSystem } from '@tailwindcss/node';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

function extractCandidates(dir) {
  const candidates = new Set();
  const tokenRegex = /([a-zA-Z0-9_\-\/\[\]#:.%]+)/g;

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (/\.(tsx|ts|jsx|js|html|css)$/.test(file) && !file.includes('generated') && !file.includes('built')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        let match;
        while ((match = tokenRegex.exec(content)) !== null) {
          const token = match[1];
          if (token && token.length > 1 && !token.startsWith('http') && !token.startsWith('/')) {
            candidates.add(token);
          }
        }
      }
    }
  }

  walk(dir);
  return Array.from(candidates);
}

async function buildCss() {
  console.log('AgroConnect : génération du bundle Tailwind CSS v4...');
  const candidates = extractCandidates(SRC_DIR);
  console.log(`${candidates.length} candidats de classes analysés dans src/`);

  const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: ROOT_DIR });
  const compiledRules = ds.candidatesToCss(candidates);

  const themeVariables = [...ds.theme.values.entries()]
    .filter(([, token]) => !token.value.includes('--theme('))
    .map(([name, token]) => `  ${name}: ${token.value.replace(/\s+/g, ' ').trim()};`)
    .join('\n');
  const themeCss = `:root {\n${themeVariables}\n}`;
  const preflightCss = fs.readFileSync(path.join(ROOT_DIR, 'node_modules/tailwindcss/preflight.css'), 'utf8');

  // Custom AgroConnect Brand Design Tokens & Overrides
  const brandCustomCss = `
/* ----------------------------------------------------
 * AgroConnect DRC - Brand Design System & Tokens
 * ---------------------------------------------------- */
:root {
  color-scheme: light;
  --font-sans: Aptos, "Segoe UI Variable", "Segoe UI", "Noto Sans", system-ui, sans-serif;
  
  --text-xs: 0.8125rem;
  --text-xs--line-height: 1.4;
  --text-sm: 0.9375rem;
  --text-sm--line-height: 1.5;
  --text-base: 1rem;
  --text-base--line-height: 1.55;
  --font-weight-bold: 650;
  --font-weight-extrabold: 700;
  --font-weight-black: 750;

  --ac-green-950: #27372e;
  --ac-green-900: #365342;
  --ac-green-800: #4a6c58;
  --ac-green-700: #5d7d69;
  --ac-green-100: #e6ede8;
  --ac-green-50: #f2f6f3;
  --ac-orange-600: #a25f3e;
  --ac-orange-100: #f6eee9;
  --color-emerald-700: #5d7d69;
  --color-emerald-800: #4a6c58;
  --color-emerald-900: #365342;
  --color-emerald-50: #f2f6f3;
  --color-emerald-100: #e6ede8;
  --color-emerald-200: #d4dfd7;
  --color-orange-600: #a25f3e;
  --color-orange-700: #875039;
  --color-stone-900: #303a33;
  --color-stone-600: #65716a;
  --color-stone-200: #e3e8e4;
  --ac-ink: #303a33;
  --ac-muted: #65716a;
  --ac-line: #e3e8e4;
  --ac-canvas: #f7f8f6;
  --ac-radius-card: 1.125rem;
  --ac-shadow-card: 0 6px 20px rgb(32 52 39 / 0.045);
  --ac-shadow-floating: 0 14px 36px rgb(32 52 39 / 0.1);
}

html {
  scroll-behavior: smooth;
  font-family: var(--font-sans);
  background: #fff;
}

body {
  color: var(--ac-ink);
  background-color: var(--ac-canvas);
  font-size: 1rem;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

button,
input,
select,
textarea {
  line-height: 1.2;
  letter-spacing: 0;
}

::selection {
  color: var(--ac-green-950);
  background: #dfe9e2;
}

:focus-visible {
  outline-color: rgb(74 108 88 / 0.45);
}

input,
select,
textarea,
button {
  line-height: 1.45;
}

@media (max-width: 640px) {
  body {
    font-size: 1rem;
  }
}
button,
a {
  -webkit-tap-highlight-color: transparent;
}

a {
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

::selection {
  color: var(--ac-green-950);
  background: #d7ecdf;
}

:focus-visible {
  outline: 3px solid rgb(36 118 80 / 0.48);
  outline-offset: 3px;
}

.ac-container {
  width: min(100% - 2rem, 80rem);
  margin-inline: auto;
}

.ac-card {
  border: 1px solid var(--ac-line);
  border-radius: var(--ac-radius-card);
  background: #fff;
  box-shadow: var(--ac-shadow-card);
}

.ac-eyebrow {
  color: var(--ac-green-800);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  line-height: 1.4;
  text-transform: uppercase;
}

.ac-hero-photo {
  isolation: isolate;
  overflow: hidden;
  border-radius: 1rem;
  background: var(--ac-green-950);
}

.ac-hero-photo img {
  transition: transform 500ms ease;
}

.ac-hero-photo:hover img {
  transform: scale(1.035);
}

.ac-home-hero-overlay {
  background-image: linear-gradient(
    90deg,
    rgb(255 255 255 / 0.98) 0%,
    rgb(255 255 255 / 0.95) 42%,
    rgb(255 255 255 / 0.82) 68%,
    rgb(255 255 255 / 0.18) 100%
  );
}

.ac-form-control {
  min-height: 2.875rem;
  border: 1px solid #d6ded8;
  border-radius: 0.75rem;
  background: #fff;
}

.ac-form-control:focus {
  border-color: var(--ac-green-700);
  box-shadow: 0 0 0 3px rgb(36 118 80 / 0.12);
  outline: none;
}

@media (max-width: 640px) {
  .ac-container {
    width: min(100% - 1.25rem, 80rem);
  }

  .ac-home-hero-overlay {
    background-image: linear-gradient(
      90deg,
      rgb(255 255 255 / 0.98) 0%,
      rgb(255 255 255 / 0.96) 58%,
      rgb(255 255 255 / 0.9) 100%
    );
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f5f5f4;
}
::-webkit-scrollbar-thumb {
  background: #d6d3d1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #a8a29e;
}
`;

  // Filter valid rules (non empty)
  const validRules = compiledRules.filter(Boolean);

  const finalCss = [
    '/* =================================================== */',
    '/* AGROCONNECT RDC - TAILWIND CSS V4 BUNDLE            */',
    '/* =================================================== */',
    themeCss,
    preflightCss,
    brandCustomCss,
    '/* Generated Utility Classes */',
    ...validRules,
  ].join('\n\n');

  const outputPath = path.join(SRC_DIR, 'app/globals.css');
  fs.writeFileSync(outputPath, finalCss, 'utf8');

  console.log(`✅ Fichier CSS généré avec succès : ${outputPath} (${(finalCss.length / 1024).toFixed(1)} KB, ${validRules.length} règles utilitaires actives)`);
}

buildCss().catch(console.error);
