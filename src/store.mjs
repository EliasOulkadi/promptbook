import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'

const DATA_DIR = join(homedir(), '.promptbook')
const DATA_FILE = join(DATA_DIR, 'prompts.json')

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function read() {
  ensureDir()
  if (!existsSync(DATA_FILE)) return { prompts: [] }
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return { prompts: [] }
  }
}

function write(data) {
  ensureDir()
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

export function getAll() {
  return read().prompts
}

export function getById(id) {
  return read().prompts.find(p => p.id === id) ?? null
}

export function create({ name, text, tags = [], pinned = false }) {
  const data = read()
  const prompt = {
    id: randomUUID(),
    shortId: `PB-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    name: name || 'Untitled',
    text,
    tags: tags.map(t => t.toLowerCase().trim()).filter(Boolean),
    pinned,
    uses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  data.prompts.unshift(prompt)
  write(data)
  return prompt
}

export function update(id, fields) {
  const data = read()
  const idx = data.prompts.findIndex(p => p.id === id)
  if (idx === -1) return null
  data.prompts[idx] = {
    ...data.prompts[idx],
    ...fields,
    id,
    updatedAt: new Date().toISOString(),
  }
  write(data)
  return data.prompts[idx]
}

export function remove(id) {
  const data = read()
  const idx = data.prompts.findIndex(p => p.id === id)
  if (idx === -1) return false
  data.prompts.splice(idx, 1)
  write(data)
  return true
}

export function incrementUses(id) {
  const data = read()
  const idx = data.prompts.findIndex(p => p.id === id)
  if (idx === -1) return
  data.prompts[idx].uses = (data.prompts[idx].uses || 0) + 1
  data.prompts[idx].updatedAt = new Date().toISOString()
  write(data)
}

export function getAllTags() {
  const prompts = read().prompts
  const tags = new Set()
  for (const p of prompts) {
    for (const t of (p.tags || [])) tags.add(t)
  }
  return [...tags].sort()
}
