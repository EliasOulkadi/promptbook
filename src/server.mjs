import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as store from './store.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) } catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

function parseId(url, prefix) {
  return url.startsWith(prefix) ? url.slice(prefix.length).split('?')[0] : null
}

export function createAppServer() {
  return createServer(async (req, res) => {
    const url = req.url ?? '/'
    const method = req.method ?? 'GET'

    if (method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' })
      res.end()
      return
    }

    if (url === '/' || url === '/index.html') {
      const html = readFileSync(join(__dir, 'ui.html'), 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    if (url === '/api/prompts' && method === 'GET') {
      json(res, store.getAll())
      return
    }

    if (url === '/api/tags' && method === 'GET') {
      json(res, store.getAllTags())
      return
    }

    if (url === '/api/prompts' && method === 'POST') {
      const body = await parseBody(req)
      if (!body.text?.trim()) { json(res, { error: 'text is required' }, 400); return }
      const prompt = store.create(body)
      json(res, prompt, 201)
      return
    }

    const putId = parseId(url, '/api/prompts/')
    if (putId && method === 'PUT') {
      const body = await parseBody(req)
      const updated = store.update(putId, body)
      if (!updated) { json(res, { error: 'not found' }, 404); return }
      json(res, updated)
      return
    }

    if (putId && method === 'DELETE') {
      const ok = store.remove(putId)
      if (!ok) { json(res, { error: 'not found' }, 404); return }
      json(res, { ok: true })
      return
    }

    const useId = parseId(url, '/api/use/')
    if (useId && method === 'POST') {
      store.incrementUses(useId)
      json(res, { ok: true })
      return
    }

    res.writeHead(404)
    res.end('Not found')
  })
}
