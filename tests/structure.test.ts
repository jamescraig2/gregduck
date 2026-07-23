import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('Project Structure', () => {
  it('shouldHaveRequiredDirectories', () => {
    const dirs = ['app', 'components', 'services', 'lib', 'types', 'tests'];
    for (const dir of dirs) {
      expect(fs.existsSync(path.join(root, dir))).toBe(true);
    }
  });

  it('shouldHaveCoreFiles', () => {
    const files = ['package.json', 'tsconfig.json', '.gitignore'];
    // next.config.* or eslint.config.*
    const nextFiles = fs.readdirSync(root).filter((f) => f.startsWith('next.config'));
    const eslintFiles = fs.readdirSync(root).filter((f) => f.startsWith('eslint.config'));
    expect(nextFiles.length).toBeGreaterThan(0);
    expect(eslintFiles.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
  });

  it('shouldHaveAppFiles', () => {
    const appFiles = ['app/page.tsx', 'app/layout.tsx', 'app/globals.css', 'app/page.module.css'];
    for (const file of appFiles) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
  });

  it('shouldHaveTsconfigPathAlias', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./*']);
  });

  it('shouldNotHaveTailwindConfig', () => {
    const files = fs.readdirSync(root);
    const tailwindFiles = files.filter((f) => f.includes('tailwind') || f.includes('postcss'));
    expect(tailwindFiles.length).toBe(0);
  });

  it('shouldNotHaveSrcDirectory', () => {
    expect(fs.existsSync(path.join(root, 'src'))).toBe(false);
  });
});
