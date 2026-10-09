const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const commitMsg = process.argv[2] || "chore: update dashboard";
const shortTitle = process.argv[3] || commitMsg;
const manifestPath = path.join(__dirname, 'manifest.json');
const repoName = "MortezaAbner/ChromeExtensions";
const notesFile = path.join(__dirname, 'release-notes.md');

if (!fs.existsSync(manifestPath)) {
  console.error("Khata: File manifest.json peyda nashod!");
  process.exit(1);
}

// ============================================================
// ۱. تشخیص نوع bump (پشتیبانی از feat(scope): )
// ============================================================
function detectBumpType(msg) {
  const m = msg.toLowerCase().trim();
  if (m.startsWith('breaking:') || m.startsWith('breaking change:') || m.includes('!:')) {
    return 'major';
  }
  if (/^feat(\(.+\))?:/.test(m) || m.startsWith('feature:') || m.startsWith('minor:')) {
    return 'minor';
  }
  return 'patch';
}
const bumpType = detectBumpType(commitMsg);

// ============================================================
// ۲. محاسبه‌ی نسخه جدید
// ============================================================
const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const currentVer = manifestData.version || "1.0.0";
const [maj, min, pat] = currentVer.split('.').map(n => parseInt(n, 10));

let newVer;
if (bumpType === 'major') newVer = `${maj + 1}.0.0`;
else if (bumpType === 'minor') newVer = `${maj}.${min + 1}.0`;
else newVer = `${maj}.${min}.${pat + 1}`;

const tagName = `v${newVer}`;
const zipName = `Chrome-Extension-${tagName}.zip`;

console.log(`\n========================================`);
console.log(`  Noe taghir: ${bumpType.toUpperCase()}`);
console.log(`  Version:    ${currentVer}  ==>  ${newVer}`);
console.log(`========================================\n`);

manifestData.version = newVer;
fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

// ============================================================
// ۳. حذف زیپ‌های قدیمی
// ============================================================
fs.readdirSync(__dirname).forEach(file => {
  if (file.endsWith('.zip')) {
    try { fs.unlinkSync(path.join(__dirname, file)); } catch (e) {}
  }
});

// ============================================================
// ۴. ساخت زیپ
// ============================================================
console.log(`Dar hale sakhte zip: ${zipName}...`);
execSync(`powershell -Command "Compress-Archive -Path index.html, style.css, app.js, icon.png, manifest.json, modules -DestinationPath '${zipName}' -Force"`, { stdio: 'inherit' });

// ============================================================
// ۵. Git — Pull + Commit + Tag + Push
// ============================================================
try {
  console.log(`\nSync ba remote...`);
  execSync('git pull origin main --rebase --autostash', { stdio: 'inherit' });

  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "chore(release): ${tagName} - ${commitMsg}"`, { stdio: 'inherit' });
  execSync(`git tag -fa ${tagName} -m "Release ${tagName}"`, { stdio: 'inherit' });
  execSync(`git push origin main`, { stdio: 'inherit' });
  execSync(`git push origin ${tagName} --force`, { stdio: 'inherit' });
  console.log(`✅ Tag ${tagName} ba movafaghiat push shod.`);
} catch (e) {
  console.log("⚠️ Ekhtar dar bakhshe Git Push.");
}

// ============================================================
// ۶. ساخت Release Notes (از release-notes.md اگه موجود باشه)
// ============================================================
const flagIR = "🇮🇷 [FA]";
const flagUS = "🇺🇸 [EN]";

let faBullets, enBullets;
if (fs.existsSync(notesFile)) {
  const content = fs.readFileSync(notesFile, 'utf8');
  const faMatch = content.match(/##\s*FA([\s\S]*?)(?=##\s*EN|$)/i);
  const enMatch = content.match(/##\s*EN([\s\S]*?)$/i);
  faBullets = (faMatch ? faMatch[1] : '').trim() || `- ${commitMsg}`;
  enBullets = (enMatch ? enMatch[1] : '').trim() || `- ${commitMsg}`;
} else {
  faBullets = `- ${commitMsg}`;
  enBullets = `- ${commitMsg}`;
}

const releaseTitle = `Abner Extension ${tagName} - ${shortTitle}`;
const releaseNotes = `### ${flagIR} تغییرات نسخه ${tagName}:

${faBullets}

---

### ${flagUS} Release Notes (${tagName}):

${enBullets}`;

fs.writeFileSync('release_notes.txt', releaseNotes, { encoding: 'utf8' });

// ============================================================
// ۷. ساخت Release روی GitHub
// ============================================================
try {
  console.log(`\nDar hale sakhte Release dar ${repoName}...`);
  execSync(`gh release create ${tagName} "${zipName}" --repo ${repoName} --title "${releaseTitle}" --notes-file release_notes.txt`, { stdio: 'inherit' });
  console.log(`\n========================================`);
  console.log(`✅ Noskheye ${tagName} Release shod!`);
  console.log(`========================================\n`);
} catch (err) {
  console.log("\n⚠️ Khata dar sakhte Release.");
}

if (fs.existsSync('release_notes.txt')) fs.unlinkSync('release_notes.txt');
