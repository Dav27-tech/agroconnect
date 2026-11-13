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
  console.log('🌾 AgroConnect : Génération du bundle Tailwind CSS v4...');
  const candidates = extractCandidates(SRC_DIR);
  console.log(`🔍 ${candidates.length} candidats de classes analysés dans src/`);

  const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: ROOT_DIR });
  const compiledRules = ds.candidatesToCss(candidates);

  const themeCss = fs.readFileSync(path.join(ROOT_DIR, 'node_modules/tailwindcss/theme.css'), 'utf8');
  const preflightCss = fs.readFileSync(path.join(ROOT_DIR, 'node_modules/tailwindcss/preflight.css'), 'utf8');

  // Custom AgroConnect Brand Design Tokens & Overrides
  const brandCustomCss = `
/* ----------------------------------------------------
 * AgroConnect DRC - Brand Design System & Tokens
 * ---------------------------------------------------- */
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  /* Palette Agricole RDC */
  --color-primary-50: #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-600: #16a34a;
  --color-primary-700: #15803d;
  --color-primary-800: #166534;
  --color-primary-900: #14532d;
  
  --color-accent-50: #fff7ed;
  --color-accent-100: #ffedd5;
  --color-accent-500: #f97316;
  --color-accent-600: #ea580c;
  --color-accent-700: #c2410c;

  --color-charcoal-900: #1c1917;
  --color-charcoal-800: #292524;
  --color-charcoal-700: #44403c;
  --color-charcoal-600: #57534e;
  --color-charcoal-400: #a8a29e;
}

html {
  scroll-behavior: smooth;
  font-family: var(--font-sans);
}

body {
  color: var(--color-charcoal-900);
  background-color: #fafaf9;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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

