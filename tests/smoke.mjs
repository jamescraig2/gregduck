import { execSync } from 'child_process';

try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✓ Build passed');
  execSync('npm run lint -- --quiet', { stdio: 'inherit' });
  console.log('✓ Lint passed');
  process.exit(0);
} catch {
  process.exit(1);
}
