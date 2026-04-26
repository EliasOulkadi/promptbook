#!/usr/bin/env node

import { execSync } from 'child_process'
import { createAppServer } from '../src/server.mjs'
import * as store from '../src/store.mjs'

const VERSION = '1.0.0'
const PORT = 4321

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', cyan: '\x1b[36m', gray: '\x1b[90m', red: '\x1b[31m',
}
const b  = s => `${c.bold}${s}${c.reset}`
const g  = s => `${c.green}${s}${c.reset}`
const d  = s => `${c.dim}${c.gray}${s}${c.reset}`
const cy = s => `${c.cyan}${s}${c.reset}`
const r  = s => `${c.red}${s}${c.reset}`

function openBrowser(url) {
  try {
    if (process.platform === 'win32') execSync(`start ${url}`, { stdio: 'ignore' })
    else if (process.platform === 'darwin') execSync(`open ${url}`, { stdio: 'ignore' })
    else execSync(`xdg-open ${url}`, { stdio: 'ignore' })
  } catch { }
}

function printHelp() {
  console.log(`
  ${b('promptbook')} ${d(`v${VERSION}`)}  —  Your local AI prompt manager

  ${b('Usage')}
    promptbook               Open the web UI
    promptbook open          Open the web UI
    promptbook add           Add a prompt interactively
    promptbook list          List all prompts
    promptbook --version
    promptbook --help

  ${b('Options for add')}
    --name, -n   Prompt name
    --text, -t   Prompt text
    --tags       Comma-separated tags

  ${b('Examples')}
    promptbook
    promptbook add --name "Fix TS errors" --text "Fix all TypeScript errors..." --tags "ts,code"
    promptbook list
`)
}

function printList() {
  const prompts = store.getAll()
  if (prompts.length === 0) {
    console.log(`\n  ${d('No prompts yet. Run')} ${cy('promptbook open')} ${d('to add one.')}\n`)
    return
  }
  console.log('')
  for (const p of prompts) {
    const tags = p.tags?.length ? `  ${d(p.tags.map(t=>`#${t}`).join(' '))}` : ''
    const pin = p.pinned ? ' ★' : ''
    console.log(`  ${d(p.shortId)}  ${b(p.name)}${pin}${tags}`)
    console.log(`  ${d(' '.repeat(6) + p.text.slice(0, 80).replace(/\n/g,' ') + (p.text.length > 80 ? '…' : ''))}`)
    console.log('')
  }
}

function stripQuotes(s) {
  return s.replace(/^["']|["']$/g, '')
}

async function addInteractive(args) {
  let name = '', text = '', tags = []

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--name' || args[i] === '-n') && args[i+1]) name = stripQuotes(args[++i])
    else if (args[i].startsWith('--name=')) name = stripQuotes(args[i].slice(7))
    else if ((args[i] === '--text' || args[i] === '-t') && args[i+1]) text = stripQuotes(args[++i])
    else if (args[i].startsWith('--text=')) text = stripQuotes(args[i].slice(7))
    else if (args[i] === '--tags' && args[i+1]) tags = stripQuotes(args[++i]).split(',').map(t=>t.trim()).filter(Boolean)
    else if (args[i].startsWith('--tags=')) tags = stripQuotes(args[i].slice(7)).split(',').map(t=>t.trim()).filter(Boolean)
  }

  if (!text) {
    console.error(r('Error: --text is required'))
    process.exit(1)
  }

  const prompt = store.create({ name, text, tags })
  console.log(`\n  ${g('✓')} Saved ${b(prompt.name)} ${d(`(${prompt.shortId})`)}\n`)
}

async function openUI() {
  const server = createAppServer()
  const url = `http://localhost:${PORT}`

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n  ${cy('➜')}  ${b('promptbook')} already running at ${cy(url)}\n`)
      openBrowser(url)
      process.exit(0)
    }
    console.error(r(`Server error: ${err.message}`))
    process.exit(1)
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log('')
    console.log(`  ${b('promptbook')} ${d(`v${VERSION}`)}`)
    console.log(`  ${d('─'.repeat(36))}`)
    console.log(`  ${cy('➜')}  Local   ${b(url)}`)
    console.log('')
    console.log(`  ${d('Press Ctrl+C to stop')}`)
    console.log('')
    openBrowser(url)
  })

  process.on('SIGINT', () => {
    console.log(`\n  ${d('Shutting down…')}\n`)
    server.close(() => process.exit(0))
  })
}

const args = process.argv.slice(2)
const cmd = args[0]

if (!cmd || cmd === 'open') {
  openUI()
} else if (cmd === 'list' || cmd === 'ls') {
  printList()
} else if (cmd === 'add') {
  addInteractive(args.slice(1))
} else if (cmd === '--version' || cmd === '-v') {
  console.log(`promptbook v${VERSION}`)
} else if (cmd === '--help' || cmd === '-h') {
  printHelp()
} else {
  console.error(r(`Unknown command: ${cmd}`) + '\nRun promptbook --help for usage.')
  process.exit(1)
}
