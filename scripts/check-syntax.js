const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dirs = ['js', 'api', 'scripts'];
const rootFiles = ['server.js'];
let hasErr = false;
let fileCount = 0;

// Root files
rootFiles.forEach(f => {
  if (fs.existsSync(f)) {
    fileCount++;
    try {
      execSync(`"${process.execPath}" --check "${f}"`, { stdio: 'pipe' });
      console.log('✓ Syntax OK:', f);
    } catch (err) {
      console.error('❌ SYNTAX ERROR IN:', f, err.message);
      hasErr = true;
    }
  }
});

// Directory files
dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(f => {
    if (f.endsWith('.js')) {
      const full = path.join(d, f);
      fileCount++;
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
  console.log(`\n✅ All ${fileCount} JavaScript files passed syntax verification cleanly!`);
} else {
  process.exit(1);
}
