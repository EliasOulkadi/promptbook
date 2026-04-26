const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs')
const { join } = require('path')
const { homedir } = require('os')
const { randomUUID } = require('crypto')

const DATA_DIR  = join(homedir(), '.promptbook')
const DATA_FILE = join(DATA_DIR, 'prompts.json')

const TAG_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function shortId() {
  let s = 'PB-'
  for (let i = 0; i < 4; i++) s += TAG_CHARS[Math.floor(Math.random() * TAG_CHARS.length)]
  return s
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function read() {
  ensureDir()
  if (!existsSync(DATA_FILE)) return { prompts: [] }
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')) } catch { return { prompts: [] } }
}

function write(data) {
  ensureDir()
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function getAll() {
  return read().prompts
}

function getById(id) {
  return read().prompts.find(p => p.id === id) ?? null
}

function create({ name, text, tags = [], pinned = false }) {
  const data = read()
  const prompt = {
    id: randomUUID(),
    shortId: shortId(),
    name: name?.trim() || 'Untitled',
    text: text?.trim() || '',
    tags: [...new Set(tags.map(t => t.toLowerCase().trim()).filter(Boolean))],
    pinned,
    uses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  data.prompts.unshift(prompt)
  write(data)
  return prompt
}

function update(id, fields) {
  const data = read()
  const idx = data.prompts.findIndex(p => p.id === id)
  if (idx === -1) return null
  if (fields.tags) fields.tags = [...new Set(fields.tags.map(t => t.toLowerCase().trim()).filter(Boolean))]
  data.prompts[idx] = { ...data.prompts[idx], ...fields, id, updatedAt: new Date().toISOString() }
  write(data)
  return data.prompts[idx]
}

function remove(id) {
  const data = read()
  const idx = data.prompts.findIndex(p => p.id === id)
  if (idx === -1) return false
  data.prompts.splice(idx, 1)
  write(data)
  return true
}

function incrementUses(id) {
  const data = read()
  const idx = data.prompts.findIndex(p => p.id === id)
  if (idx === -1) return
  data.prompts[idx].uses = (data.prompts[idx].uses || 0) + 1
  data.prompts[idx].updatedAt = new Date().toISOString()
  write(data)
}

function getAllTags() {
  const tags = new Set()
  for (const p of read().prompts) for (const t of (p.tags || [])) tags.add(t)
  return [...tags].sort()
}

module.exports = { getAll, getById, create, update, remove, incrementUses, getAllTags }
