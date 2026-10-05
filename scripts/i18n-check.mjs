// 校验各语言词典：与代码中中文文案对齐，且各语言 key 集合完全一致。
// 用法：pnpm i18n:check
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const SRC = new URL("../src", import.meta.url).pathname
const MESSAGES_DIR = join(SRC, "lib/i18n/messages")
const DICTS = ["en", "zh-TW", "ja", "ko", "fr", "de", "es", "ru"]
const CJK = /[一-鿿　-〿＀-￯]/

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(name) && !path.includes("/lib/i18n/") ? [path] : []
  })
}

function parseDict(filePath) {
  const source = readFileSync(filePath, "utf8")
  const match = source.match(/export const \w+[^=]*=\s*(\{[\s\S]*\})\s*$/m)
  if (!match) throw new Error(`无法解析 ${filePath}`)
  return Function(`"use strict"; return (${match[1]})`)()
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

const parsed = Object.fromEntries(DICTS.map((id) => [id, parseDict(join(MESSAGES_DIR, `${id}.ts`))]))
const referenceKeys = new Set(Object.keys(parsed.en))

let failed = false

for (const id of DICTS) {
  const defined = new Set(Object.keys(parsed[id]))
  const missing = [...used].filter((k) => !defined.has(k))
  const extraInDict = [...defined].filter((k) => !referenceKeys.has(k))
  const missingFromEn = [...referenceKeys].filter((k) => !defined.has(k))

  if (missing.length) {
    failed = true
    console.error(`[${id}] 词典缺少译文（${missing.length}）:\n  ${missing.join("\n  ")}`)
  } else {
    console.log(`[${id}] 代码文案覆盖：${used.size} 条均有译文`)
  }

  if (missingFromEn.length) {
    failed = true
    console.error(`[${id}] 与 en.ts key 不一致，缺少 ${missingFromEn.length} 条:\n  ${missingFromEn.slice(0, 20).join("\n  ")}${missingFromEn.length > 20 ? "\n  …" : ""}`)
  }
  if (extraInDict.length) {
    failed = true
    console.error(`[${id}] 与 en.ts key 不一致，多出 ${extraInDict.length} 条`)
  }
}

if (failed) process.exit(1)
console.log("i18n 校验通过：各语言词典 key 一致且覆盖全部界面文案。")
