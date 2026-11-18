const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const extDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');
const stageDir = path.join(distDir, 'ReEcap-v2.0.0');
const zipFile = path.join(distDir, 'ReEcap-v2.0.0.zip');

console.log('Building production release package for ReEcap v2.0.0...');

// Ensure dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// Copy all extension files recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Exclude local demo-mode from release package
      if (entry.name === 'demo-mode.js') continue;
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(extDir, stageDir);

// Sanitize manifest.json for production
const manifestPath = path.join(stageDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = '2.0.0';

if (manifest.content_scripts) {
  manifest.content_scripts.forEach(cs => {
    if (Array.isArray(cs.js)) {
      cs.js = cs.js.filter(f => !f.includes('demo-mode.js'));
    }
  });
}
if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources.forEach(war => {
    if (Array.isArray(war.resources)) {
      war.resources = war.resources.filter(f => !f.includes('demo-mode.js'));
    }
  });
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));

// Sanitize popup.html for production
const popupHtmlPath = path.join(stageDir, 'popup.html');
let popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');
popupHtml = popupHtml.replace(/<div class="section-label"[\s\S]*?id="demoToggle"[\s\S]*?<\/div>/, '');
fs.writeFileSync(popupHtmlPath, popupHtml);

// Sanitize popup.js for production
const popupJsPath = path.join(stageDir, 'popup.js');
let popupJs = fs.readFileSync(popupJsPath, 'utf8');
popupJs = popupJs.replace(/const demoToggle = document\.getElementById\('demoToggle'\);[\s\S]*?}\s*}\s*}/, '} }');
fs.writeFileSync(popupJsPath, popupJs);

// Create ZIP archive
try {
  const psCmd = `powershell -Command "Compress-Archive -Path '${stageDir}/*' -DestinationPath '${zipFile}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  console.log(`Production package created: ${zipFile} (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('Failed to create zip archive:', err);
  process.exit(1);
}
