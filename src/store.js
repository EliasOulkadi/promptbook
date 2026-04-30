const fs = require('fs')
const fsPromises = fs.promises
const { join } = require('path')
const { homedir } = require('os')
const { randomUUID } = require('crypto')

const DATA_DIR  = join(homedir(), '.promptbook')
const DATA_FILE = join(DATA_DIR, 'prompts.json')

let memoryCache = null
let writeLock = false
let writeQueued = false

const TAG_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function shortId() {
  let s = 'PB-'
  for (let i = 0; i < 4; i++) s += TAG_CHARS[Math.floor(Math.random() * TAG_CHARS.length)]
  return s
}

function ensureDirSync() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadSync() {
  if (memoryCache) return memoryCache
  ensureDirSync()
  if (!fs.existsSync(DATA_FILE)) {
    memoryCache = { prompts: [] }
    return memoryCache
  }
  try {
    memoryCache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    if (!memoryCache || !Array.isArray(memoryCache.prompts)) {
      memoryCache = { prompts: [] }
    }
  } catch {
    memoryCache = { prompts: [] }
  }
  return memoryCache
}

loadSync()

async function writeAsync() {
  ensureDirSync()
  if (writeLock) {
    writeQueued = true
    return
  }
  writeLock = true
  writeQueued = false
  try {
    await fsPromises.writeFile(DATA_FILE, JSON.stringify(memoryCache, null, 2), 'utf8')
  } finally {
    writeLock = false
    if (writeQueued) {
      writeQueued = false
      writeAsync().catch(console.error)
    }
  }
}

async function getAll() {
  return memoryCache.prompts
}

async function getById(id) {
  return memoryCache.prompts.find(p => p.id === id) ?? null
}

async function create({ name, text, tags = [], pinned = false }) {
  const prompt = {
    id: randomUUID(),
    shortId: shortId(),
    name: (name || '').trim() || 'Untitled',
    text: (text || '').trim(),
    tags: [...new Set((tags || []).map(t => t.toLowerCase().trim()).filter(Boolean))],
    pinned: !!pinned,
    uses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  memoryCache.prompts.unshift(prompt)
  await writeAsync()
  return prompt
}

async function update(id, fields) {
  const idx = memoryCache.prompts.findIndex(p => p.id === id)
  if (idx === -1) return null
  if (fields.tags) {
    fields.tags = [...new Set(fields.tags.map(t => t.toLowerCase().trim()).filter(Boolean))]
  }
  memoryCache.prompts[idx] = {
    ...memoryCache.prompts[idx],
    ...fields,
    id,
    updatedAt: new Date().toISOString(),
  }
  await writeAsync()
  return memoryCache.prompts[idx]
}

async function remove(id) {
  const idx = memoryCache.prompts.findIndex(p => p.id === id)
  if (idx === -1) return false
  memoryCache.prompts.splice(idx, 1)
  await writeAsync()
  return true
}

async function incrementUses(id) {
  const idx = memoryCache.prompts.findIndex(p => p.id === id)
  if (idx === -1) return
  memoryCache.prompts[idx].uses = (memoryCache.prompts[idx].uses || 0) + 1
  memoryCache.prompts[idx].updatedAt = new Date().toISOString()
  await writeAsync()
}

async function getAllTags() {
  const tags = new Set()
  for (const p of memoryCache.prompts) for (const t of (p.tags || [])) tags.add(t)
  return [...tags].sort()
}

module.exports = { getAll, getById, create, update, remove, incrementUses, getAllTags }
