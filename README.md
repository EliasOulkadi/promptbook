# Promptbook

A local desktop app to save, search, and copy AI prompts instantly.

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

---

## What it does

Stop losing your best AI prompts across chat windows, Notion pages, and sticky notes. Promptbook stores them locally and lets you find any prompt in seconds.

- **Save prompts** with a name, full text, and tags
- **One-click copy** — straight to your clipboard
- **Pin favorites** so they're always at the top
- **Tag system** — filter by category in the sidebar
- **Recently Used** view — shows prompts you copy most
- **Instant search** — filters by name, content, and tags
- **Keyboard shortcuts** — `Ctrl+N` new prompt, `Ctrl+K` search, `Esc` close
- **100% local** — your data lives in `~/.promptbook/prompts.json`, nothing leaves your machine

---

## Install

**Requirements:** [Node.js 18+](https://nodejs.org) and npm.

```bash
git clone https://github.com/EliasOulkadi/promptbook.git
cd promptbook
npm install
npm start
```

---

## Usage

| Action | How |
|---|---|
| New prompt | Click **New Prompt** or press `Ctrl+N` |
| Search | Click the search bar or press `Ctrl+K` |
| Copy a prompt | Hover a card → **Copy**, or open it and click **Copy to clipboard** |
| Edit / Delete | Open a prompt → buttons in the top-right of the panel |
| Pin | Open a prompt → click **Pin** |
| Filter by tag | Click any tag in the left sidebar |

---

## Data

Prompts are stored in `~/.promptbook/prompts.json`. Back it up, share it between machines, or import/export manually.

---

## License

MIT
