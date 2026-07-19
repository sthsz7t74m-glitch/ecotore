import { existsSync, readFileSync } from 'node:fs'

const expected = { 1: 40, 2: 70, 3: 55, 4: 55, 5: 50, 6: 55, 7: 65, 8: 45, 9: 35, 10: 50 }
const knowledge = readFileSync('src/data/knowledge.ts', 'utf8')
const starts = [...knowledge.matchAll(/^  (\d+): \[/gm)].map((match) => ({ id: Number(match[1]), index: match.index }))
const actual = {}

for (let position = 0; position < starts.length; position += 1) {
  const start = starts[position]
  const end = starts[position + 1]?.index ?? knowledge.indexOf('\n}', start.index)
  const conceptCount = (knowledge.slice(start.index, end).match(/\bseed\(/g) ?? []).length
  actual[start.id] = conceptCount * 5
}

if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`章別問題数が不正です: ${JSON.stringify(actual)}`)
if (Object.values(actual).reduce((sum, count) => sum + count, 0) !== 520) throw new Error('問題総数が520問ではありません。')

const required = ['public/manifest.webmanifest', 'public/sw.js', 'public/icon-192.png', 'public/icon-512.png', '.github/workflows/deploy-pages.yml']
for (const path of required) if (!existsSync(path)) throw new Error(`${path} がありません。`)

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const app = readFileSync('src/App.tsx', 'utf8')
const serviceWorker = readFileSync('public/sw.js', 'utf8')
if (!app.includes(`v${packageJson.version}`)) throw new Error('画面のバージョンとpackage.jsonが一致しません。')
if (!serviceWorker.includes(`v${packageJson.version}`)) throw new Error('Service Workerのキャッシュ版が一致しません。')

console.log(`OK: v${packageJson.version} / 520問 / PWA / GitHub Pages`)
console.log(`章別: ${JSON.stringify(actual)}`)
