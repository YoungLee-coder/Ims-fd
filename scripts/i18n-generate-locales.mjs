// 从 en.ts 生成 zh-TW、ja、ko、fr、de、es、ru 词典（翻译步骤需联网）。
// 用法：node scripts/i18n-generate-locales.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import * as OpenCC from "opencc-js"
import translate from "google-translate-api-x"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = join(__dirname, "../src/lib/i18n/messages")
const EN_PATH = join(MESSAGES_DIR, "en.ts")

const TARGETS = [
  { id: "zh-TW", mode: "opencc" },
  { id: "ja", to: "ja" },
  { id: "ko", to: "ko" },
  { id: "fr", to: "fr" },
  { id: "de", to: "de" },
  { id: "es", to: "es" },
  { id: "ru", to: "ru" },
]

const LOCALE_HEADERS = {
  "zh-TW": "繁体中文词典：key 为界面中的简体中文原文。",
  ja: "日本語辞書：key は中国語原文、value は日本語。",
  ko: "한국어 사전: key는 중국어 원문, value는 한국어.",
  fr: "Dictionnaire français : clés en chinois simplifié, valeurs en français.",
  de: "Deutsch-Wörterbuch: Schlüssel vereinfachtes Chinesisch, Werte Deutsch.",
  es: "Diccionario español: claves en chino simplificado, valores en español.",
  ru: "Русский словарь: ключи — упрощённый китайский, значения — русский.",
}

const varNames = {
  "zh-TW": "zhTW",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  ru: "ru",
}

const opencc = OpenCC.Converter({ from: "cn", to: "tw" })

function parseEnDict(source) {
  const match = source.match(/export const en[^=]*=\s*(\{[\s\S]*\})\s*$/m)
  if (!match) throw new Error("无法解析 en.ts")
  return Function(`"use strict"; return (${match[1]})`)()
}

function escapeTs(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function formatDict(varName, header, obj) {
  const lines = [
    `/**`,
    ` * ${header}`,
    ` * 由 scripts/i18n-generate-locales.mjs 生成；可手工修订。`,
    ` */`,
    `export const ${varName}: Record<string, string> = {`,
  ]
  for (const [key, value] of Object.entries(obj)) {
    const v = String(value)
    if (v.includes("\n")) {
      lines.push(`  "${escapeTs(key)}":`, `    "${escapeTs(v)}",`)
    } else {
      lines.push(`  "${escapeTs(key)}": "${escapeTs(v)}",`)
    }
  }
  lines.push("}", "")
  return lines.join("\n")
}

async function translateAll(entries, to) {
  const texts = entries.map(([, en]) => en)
  const batchSize = 40
  const results = []
  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize)
    process.stdout.write(`  translating ${i + 1}-${Math.min(i + batchSize, texts.length)} / ${texts.length}\n`)
    const res = await translate(chunk, { from: "en", to, forceBatch: false })
    const translated = Array.isArray(res) ? res.map((r) => r.text) : [res.text]
    results.push(...translated)
    await new Promise((r) => setTimeout(r, 800))
  }
  const out = {}
  entries.forEach(([key], idx) => {
    out[key] = results[idx] ?? entries[idx][1]
  })
  return out
}

const enObj = parseEnDict(readFileSync(EN_PATH, "utf8"))
const entries = Object.entries(enObj)
console.log(`Parsed ${entries.length} entries from en.ts`)

for (const target of TARGETS) {
  const varName = varNames[target.id]
  const outPath = join(MESSAGES_DIR, `${target.id}.ts`)
  console.log(`Generating ${target.id}…`)

  let dict
  if (target.mode === "opencc") {
    dict = {}
    for (const [key] of entries) dict[key] = opencc(key)
  } else {
    dict = await translateAll(entries, target.to)
  }

  writeFileSync(outPath, formatDict(varName, LOCALE_HEADERS[target.id], dict), "utf8")
  console.log(`  wrote ${outPath}`)
}

console.log("Done.")
