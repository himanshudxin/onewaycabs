const fs = require('fs');
const { execSync } = require('child_process');

const htmlFiles = ['index.html', 'admin.html', 'driver.html', '404.html', '500.html'];
let totalScripts = 0;
let errors = 0;

htmlFiles.forEach(h => {
  const content = fs.readFileSync(h, 'utf8');
  const regex = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let idx = 0;
  while ((match = regex.exec(content)) !== null) {
    const attrs = match[1];
    const code = match[2].trim();
    if (!code) continue;
    totalScripts++;
    idx++;

    if (attrs.includes('application/ld+json')) {
      try {
        JSON.parse(code);
        console.log(`✓ ${h} (JSON-LD SEO schema #${idx}) Valid JSON`);
      } catch (err) {
        console.error(`❌ JSON-LD syntax error in ${h} (schema #${idx}):`, err.message);
        errors++;
      }
      continue;
    }
    const tmpFile = `scratch/temp_script_${h}_${idx}.js`;
    fs.mkdirSync('scratch', { recursive: true });
    fs.writeFileSync(tmpFile, code, 'utf8');
    try {
      execSync(`"${process.execPath}" --check "${tmpFile}"`, { stdio: 'pipe' });
      console.log(`✓ ${h} (script #${idx}) OK`);
    } catch (err) {
      console.error(`❌ Syntax error in ${h} (script #${idx}):`, err.message);
      errors++;
    } finally {
      try { fs.unlinkSync(tmpFile); } catch (e) {}
    }
  }
});

if (errors === 0) {
  console.log(`\n✅ All ${totalScripts} inline HTML scripts passed syntax validation!`);
} else {
  console.error(`\n❌ Found ${errors} syntax errors in HTML scripts.`);
  process.exit(1);
}
