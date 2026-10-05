// 校验英文词典：列出代码中出现但词典里缺失的中文文案，以及词典里已不再使用的条目。
// 用法：pnpm i18n:check
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const SRC = new URL("../src", import.meta.url).pathname
const DICT = join(SRC, "lib/i18n/messages/en.ts")
const CJK = /[一-鿿　-〿＀-￯]/

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(name) && !path.includes("/lib/i18n/") ? [path] : []
  })
}

const used = new Set()
for (const file of walk(SRC)) {
  const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
  for (const line of code.split("\n")) {
    if (line.trim().startsWith("//")) continue
    for (const m of line.replace(/\s\/\/.*$/, "").matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
      const text = m[1].replaceAll('\\"', '"')
      if (CJK.test(text)) used.add(text)
    }
  }
}

const dictSource = readFileSync(DICT, "utf8")
const defined = new Set([...dictSource.matchAll(/^\s*"((?:[^"\\\n]|\\.)*)":/gm)].map((m) => m[1].replaceAll('\\"', '"')))

const missing = [...used].filter((k) => !defined.has(k))
const unused = [...defined].filter((k) => !used.has(k))

if (unused.length) console.warn(`词典中未使用的条目（${unused.length}）:\n  ${unused.join("\n  ")}\n`)
if (missing.length) {
  console.error(`词典缺少英文译文（${missing.length}）:\n  ${missing.join("\n  ")}`)
  process.exit(1)
}
console.log(`i18n 校验通过：${used.size} 条文案均有英文译文。`)
