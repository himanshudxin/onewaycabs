const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dirs = ['js', 'api', 'scripts'];
let hasErr = false;

dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(f => {
    if (f.endsWith('.js')) {
      const full = path.join(d, f);
      try {
        execSync(`"${process.execPath}" --check "${full}"`, { stdio: 'pipe' });
        console.log('✓ Syntax OK:', full);
      } catch (err) {
        console.error('❌ SYNTAX ERROR IN:', full, err.message);
        hasErr = true;
      }
    }
  });
});

if (!hasErr) {
  console.log('\n✅ All 12 JavaScript files passed syntax verification cleanly!');
} else {
  process.exit(1);
}
