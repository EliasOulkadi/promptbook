const NC = 12
let localPrompts = []
let communityPrompts = []
let currentProfile = null
let view = 'all'
let displayMode = 'grid'
let sortBy = 'newest'
let atag = null
let q = ''
let eid = null
let oid = null
let confirmCallback = null
const tagColorMap = {}, tagColorArr = []

function tc(t) {
  if (tagColorMap[t] == null) { tagColorMap[t] = tagColorArr.length % NC; tagColorArr.push(t) }
  return tagColorMap[t]
}
function th(t) { return `<span class="tag c${tc(t)}">${xe(t)}</span>` }
function xe(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${~~(s/60)}m ago`
  if (s < 86400) return `${~~(s/3600)}h ago`
  if (s < 604800) return `${~~(s/86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function focusSearch() { document.getElementById('srch').focus() }

async function load() {
  localPrompts = await window.api.getPrompts()
  renderAll()
}

function getDisplayList() {
  if (view === 'community') {
    let l = [...communityPrompts]
    if (q) { const lq = q.toLowerCase(); l = l.filter(p => p.name.toLowerCase().includes(lq) || p.text.toLowerCase().includes(lq) || (p.tags||[]).some(t => t.toLowerCase().includes(lq))) }
    return l
  }
  let l = [...localPrompts]
  if (view === 'pinned') l = l.filter(p => p.pinned)
  if (view === 'recent') l = l.filter(p => p.uses > 0).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 30)
  if (atag) l = l.filter(p => (p.tags||[]).includes(atag))
  if (q) {
    const lq = q.toLowerCase()
    l = l.filter(p => p.name.toLowerCase().includes(lq) || p.text.toLowerCase().includes(lq) || (p.tags||[]).some(t => t.toLowerCase().includes(lq)))
  }
  if (view !== 'recent') l = applySort(l)
  return l
}

function applySort(l) {
  const s = [...l]
  if (sortBy === 'newest') s.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
  else if (sortBy === 'oldest') s.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
  else if (sortBy === 'uses') s.sort((a,b) => (b.uses||0) - (a.uses||0))
  else if (sortBy === 'alpha') s.sort((a,b) => a.name.localeCompare(b.name))
  return s
}

function renderAll() { renderSide(); renderList() }

function renderSide() {
  document.getElementById('n-all').textContent = localPrompts.length
  document.getElementById('n-pin').textContent = localPrompts.filter(p => p.pinned).length
  document.getElementById('n-rec').textContent = localPrompts.filter(p => p.uses > 0).length
  document.getElementById('foot-count').textContent = `${localPrompts.length} prompt${localPrompts.length !== 1 ? 's' : ''}`
  const tags = {}
  for (const p of localPrompts) for (const t of (p.tags||[])) tags[t] = (tags[t]||0) + 1
  document.getElementById('tag-list').innerHTML = Object.keys(tags).sort().map(t =>
    `<div class="tag-item${atag===t?' on':''}" onclick="setTag('${xe(t)}')">
      <span class="tdot c${tc(t)}" style="background:currentColor;opacity:.7"></span>
      ${xe(t)}<span class="tag-n">${tags[t]}</span>
    </div>`
  ).join('')
}

function renderList() {
  const l = getDisplayList()
  const isCommunity = view === 'community'
  const el = document.getElementById('list')
  const eg = document.getElementById('grid')
  const ee = document.getElementById('empty')
  const nr = document.getElementById('no-results')
  const lw = document.getElementById('list-wrap')
  const gw = document.getElementById('grid-wrap')
  const pv = document.getElementById('profile-view')

  document.getElementById('tb-count').textContent = l.length
  pv.style.display = 'none'
  document.getElementById('tb-breadcrumb').classList.remove('show')
  document.getElementById('view-lbl').style.display = ''
  document.getElementById('tb-count').style.display = ''

  const src = isCommunity ? communityPrompts : localPrompts
  if (!isCommunity && src.length === 0) {
    ee.style.display = 'flex'; lw.style.display = 'none'; gw.style.display = 'none'
    nr.style.display = 'none'; return
  }
  ee.style.display = 'none'
  if (l.length === 0) {
    nr.style.display = 'block'; lw.style.display = 'none'; gw.style.display = 'none'
    const nrq = document.getElementById('nr-q'); if (nrq) nrq.textContent = q
    return
  }
  nr.style.display = 'none'

  if (displayMode === 'grid') {
    lw.style.display = 'none'; gw.style.display = 'block'
    eg.innerHTML = l.map((p, i) => renderCard(p, i)).join('')
  } else {
    gw.style.display = 'none'; lw.style.display = 'block'
    el.innerHTML = l.map((p, i) => renderRow(p, i)).join('')
  }
}

function renderRow(p, i) {
  const isCom = p.isCommunity
  const authorHtml = isCom ? `<span style="font-size:11px;color:var(--text-3);margin-left:4px">by ${xe(p.user_name || 'User')}</span>` : ''
  const descriptionHtml = p.description ? `<div style="font-size:11px;color:var(--text-3);font-style:italic;margin-bottom:2px">${xe(p.description)}</div>` : ''
  return `<div class="row${p.pinned?' pinned':''}" style="animation-delay:${i*12}ms" onclick="openDrawer('${xe(p.id)}')">
    <div class="row-name">
      <div class="row-title">${xe(p.name)} ${authorHtml}</div>
      ${descriptionHtml}
      <div class="row-prev">${xe(p.text.slice(0,90))}</div>
    </div>
    <div class="row-tags">${(p.tags||[]).slice(0,3).map(th).join('')}</div>
    <div class="row-uses">${p.uses||0}</div>
    <div class="row-actions" onclick="event.stopPropagation()">
      <button class="ra-btn" onclick="copyRow('${xe(p.id)}',this)">Copy</button>
    </div>
  </div>`
}

function renderCard(p, i) {
  const isCom = p.isCommunity
  const authorSection = isCom ? `<div class="card-author">
    ${p.user_avatar
      ? `<img class="card-author-avatar" src="${xe(p.user_avatar)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : ''}
    <div class="card-author-init" style="${p.user_avatar?'display:none':'display:flex'}">${initials(p.user_name)}</div>
    <span class="card-author-name">${xe(p.user_name || 'Anonymous')}</span>
    <button class="card-author-link" onclick="event.stopPropagation();showProfile('${xe(p.user_id||'')}','${xe(p.user_name||'')}','${xe(p.user_avatar||'')}')">Profile →</button>
  </div>` : ''
  const descriptionHtml = p.description ? `<div class="card-description">${xe(p.description)}</div>` : ''
  return `<div class="card${p.pinned?' pinned':''}" style="animation-delay:${i*15}ms" onclick="openDrawer('${xe(p.id)}')">
    <div class="card-title">${xe(p.name)}</div>
    ${descriptionHtml}
    <div class="card-tags">${(p.tags||[]).slice(0,4).map(th).join('')}</div>
    <div class="card-prev">${xe(p.text.slice(0,160))}</div>
    ${authorSection}
    <div class="card-foot">
      <span class="card-uses">${p.uses||0} ${(p.uses||0)===1?'use':'uses'}</span>
      <button class="card-copy" onclick="event.stopPropagation();copyCard('${xe(p.id)}',this)">Copy</button>
    </div>
  </div>`
}

async function copyRow(id, btn) {
  const src = view === 'community' ? communityPrompts : localPrompts
  const p = src.find(x => x.id === id); if (!p) return
  await window.api.copyText(p.text)
  if (!p.isCommunity) { await window.api.incrementUses(id); p.uses = (p.uses||0)+1 }
  btn.textContent = 'Copied'; btn.classList.add('ok')
  showToast('Copied to clipboard')
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('ok') }, 1500)
}

async function copyCard(id, btn) {
  const src = view === 'community' ? communityPrompts : (currentProfile ? currentProfile.prompts : localPrompts)
  const p = src.find(x => x.id === id); if (!p) return
  await window.api.copyText(p.text)
  if (!p.isCommunity) { await window.api.incrementUses(id); p.uses = (p.uses||0)+1 }
  btn.textContent = 'Copied'; btn.classList.add('ok')
  showToast('Copied to clipboard')
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('ok') }, 1500)
}

function openDrawer(id) {
  const src = currentProfile
    ? currentProfile.prompts
    : (view === 'community' ? communityPrompts : localPrompts)
  const p = src.find(x => x.id === id); if (!p) return
  oid = id
  const isCom = !!p.isCommunity
  document.getElementById('d-id').textContent = p.shortId || ''
  document.getElementById('d-title').textContent = p.name
  document.getElementById('d-tags').innerHTML = (p.tags||[]).map(th).join('')
  
  // Handle description
  const descEl = document.getElementById('d-description')
  if (descEl) {
    if (p.description) {
      descEl.textContent = p.description
      descEl.style.display = 'block'
    } else {
      descEl.style.display = 'none'
    }
  }
  
  document.getElementById('d-text').textContent = p.text

  const pin = document.getElementById('d-pin')
  const editBtn = document.getElementById('d-edit')
  const delBtn = document.getElementById('d-del')
  const saveBtn = document.getElementById('d-save')
  const authorEl = document.getElementById('d-author')

  pin.style.display = isCom ? 'none' : ''
  editBtn.style.display = isCom ? 'none' : ''
  delBtn.style.display = isCom ? 'none' : ''
  saveBtn.style.display = isCom ? '' : 'none'

  if (isCom) {
    authorEl.classList.add('show')
    const avatarImg = document.getElementById('d-avatar')
    const avatarInit = document.getElementById('d-author-init')
    document.getElementById('d-author-name').textContent = p.user_name || 'Anonymous user'
    if (p.user_avatar) {
      avatarImg.src = p.user_avatar; avatarImg.style.display = ''
      avatarInit.style.display = 'none'
    } else {
      avatarImg.style.display = 'none'
      avatarInit.style.display = 'flex'; avatarInit.textContent = initials(p.user_name)
    }
    const link = document.getElementById('d-author-link')
    link.onclick = () => showProfile(p.user_id || '', p.user_name || '', p.user_avatar || '')
  } else {
    authorEl.classList.remove('show')
    pin.textContent = p.pinned ? 'Unpin' : 'Pin'
    pin.classList.toggle('pnd', !!p.pinned)
  }

  document.getElementById('d-meta').innerHTML = `
    <div class="m-row"><strong>Used</strong><span>${p.uses||0} time${p.uses!==1?'s':''}</span></div>
    <div class="m-row"><strong>Created</strong><span>${ago(p.createdAt||p.created_at)}</span></div>
    <div class="m-row"><strong>Updated</strong><span>${ago(p.updatedAt||p.updated_at)}</span></div>`

  const cb = document.getElementById('d-copy')
  cb.className = 'copy-btn'
  cb.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy to clipboard'

  document.getElementById('drawer').classList.add('open')
  document.getElementById('drawer-overlay').classList.add('show')
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open')
  document.getElementById('drawer-overlay').classList.remove('show')
  oid = null
}

async function copyDrawer() {
  const src = currentProfile
    ? currentProfile.prompts
    : (view === 'community' ? communityPrompts : localPrompts)
  const p = src.find(x => x.id === oid); if (!p) return
  await window.api.copyText(p.text)
  if (!p.isCommunity) { await window.api.incrementUses(p.id); p.uses = (p.uses||0)+1; renderList() }
  const cb = document.getElementById('d-copy')
  cb.classList.add('ok'); cb.textContent = '✓ Copied!'
  showToast('Copied to clipboard')
  setTimeout(() => {
    cb.className = 'copy-btn'
    cb.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy to clipboard'
  }, 1800)
}

async function saveFromCommunity() {
  const p = communityPrompts.find(x => x.id === oid) || (currentProfile && currentProfile.prompts.find(x => x.id === oid))
  if (!p) return
  const created = await window.api.createPrompt({ name: p.name, description: p.description, text: p.text, tags: p.tags || [] })
  if (created) {
    localPrompts.unshift(created)
    showToast('Saved to your library')
    const btn = document.getElementById('d-save')
    if (btn) { btn.textContent = '✓ Saved'; btn.disabled = true }
  }
}

async function togglePin() {
  const p = localPrompts.find(x => x.id === oid); if (!p) return
  p.pinned = !p.pinned
  await window.api.updatePrompt(p.id, { pinned: p.pinned })
  openDrawer(p.id); renderAll()
}

function editCurrent() { const p = localPrompts.find(x => x.id === oid); if (p) openModal(p) }

function delCurrent() {
  if (!oid) return
  showConfirm('Delete this prompt?', 'This cannot be undone.', async () => {
    await window.api.deletePrompt(oid)
    localPrompts = localPrompts.filter(x => x.id !== oid)
    closeDrawer(); renderAll(); showToast('Prompt deleted')
  })
}

async function setView(v, el) {
  view = v; atag = null; currentProfile = null; q = ''
  document.getElementById('srch').value = ''
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('on'))
  document.querySelectorAll('.tag-item').forEach(e => e.classList.remove('on'))
  if (el) el.classList.add('on')

  const labels = { all: 'All prompts', pinned: 'Pinned', recent: 'Recently used', community: 'Community' }
  document.getElementById('view-lbl').textContent = labels[v] || v

  const isCom = v === 'community'
  document.getElementById('tb-controls').style.display = ''
  document.getElementById('tb-breadcrumb').classList.remove('show')
  document.getElementById('view-lbl').style.display = ''

  if (isCom) {
    communityPrompts = []
    renderList()
    document.getElementById('content').innerHTML = '<div class="loading"><div class="spinner"></div>Loading community prompts…</div>'
    communityPrompts = await window.api.getCommunityPrompts()
    document.getElementById('content').innerHTML = ''
    rebuildContent()
    renderList()
  } else {
    localPrompts = await window.api.getPrompts()
    renderAll()
  }
}

function rebuildContent() {
  const content = document.getElementById('content')
  content.innerHTML = `
    <div id="empty" style="display:none">
      <div class="empty-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
      <h3>No prompts yet</h3>
      <p>Save the prompts you use every day and copy them in one click.</p>
      <div class="empty-actions">
        <button class="btn btn-solid" onclick="openModal()"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>New prompt</button>
        <button class="btn btn-ghost" onclick="importPrompts()">Import</button>
      </div>
    </div>
    <div id="no-results" style="display:none"><p>No prompts match <strong>"<span id="nr-q"></span>"</strong></p></div>
    <div id="list-wrap" style="display:none">
      <div class="list-head"><div class="lh-name">Name</div><div class="lh-tags">Tags</div><div class="lh-uses">Uses</div></div>
      <div id="list"></div>
    </div>
    <div id="grid-wrap" style="display:none"><div id="grid"></div></div>
    <div id="profile-view" style="display:none">
      <div class="profile-header">
        <div class="profile-avatar-wrap">
          <img class="profile-avatar" id="pv-avatar" src="" alt="" style="display:none">
          <div class="profile-avatar-init" id="pv-init" style="display:none"></div>
        </div>
        <div class="profile-info">
          <div class="profile-name" id="pv-name">User</div>
          <div class="profile-sub" id="pv-sub">0 public prompts</div>
        </div>
      </div>
      <div id="profile-grid"></div>
    </div>`
}

function setTag(tag) {
  if (atag === tag) { atag = null; setView('all', document.querySelector('[data-v=all]')); return }
  atag = tag; view = 'all'
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('on'))
  document.getElementById('view-lbl').textContent = `#${tag}`
  renderSide(); renderList()
}

function onSearch(v) { q = v.trim(); renderList() }

function setDisplayMode(mode) {
  displayMode = mode
  document.getElementById('vt-list').classList.toggle('active', mode === 'list')
  document.getElementById('vt-grid').classList.toggle('active', mode === 'grid')
  renderList()
}

let sortOpen = false
function toggleSort(e) {
  e.stopPropagation()
  sortOpen = !sortOpen
  document.getElementById('sort-menu').classList.toggle('open', sortOpen)
}
function setSortBy(s) {
  sortBy = s
  sortOpen = false
  document.getElementById('sort-menu').classList.remove('open')
  const labels = { newest: 'Newest', oldest: 'Oldest', uses: 'Most used', alpha: 'A – Z' }
  document.getElementById('sort-label').textContent = labels[s] || 'Sort'
  document.querySelectorAll('.sort-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.sort === s)
  })
  renderList()
}

document.addEventListener('click', e => {
  if (sortOpen && !document.getElementById('sort-wrap').contains(e.target)) {
    sortOpen = false
    document.getElementById('sort-menu').classList.remove('open')
  }
})

async function showProfile(userId, name, avatar) {
  if (!userId) return
  currentProfile = { userId, name, avatar, prompts: [] }
  closeDrawer()

  document.getElementById('view-lbl').style.display = 'none'
  document.getElementById('tb-count').style.display = 'none'
  document.getElementById('tb-breadcrumb').classList.add('show')
  document.getElementById('tb-profile-name').textContent = name || `User ${userId.slice(0, 8)}`

  const pv = document.getElementById('profile-view')
  const lw = document.getElementById('list-wrap')
  const gw = document.getElementById('grid-wrap')
  const ee = document.getElementById('empty')
  const nr = document.getElementById('no-results')
  ee.style.display = 'none'; lw.style.display = 'none'; gw.style.display = 'none'; nr.style.display = 'none'
  pv.style.display = 'block'

  const pvAvatar = document.getElementById('pv-avatar')
  const pvInit = document.getElementById('pv-init')
  document.getElementById('pv-name').textContent = name || `User ${userId.slice(0, 8)}`
  if (avatar) {
    pvAvatar.src = avatar; pvAvatar.style.display = 'block'; pvInit.style.display = 'none'
  } else {
    pvAvatar.style.display = 'none'
    pvInit.style.display = 'flex'; pvInit.textContent = initials(name)
  }
  document.getElementById('pv-sub').textContent = 'Loading…'

  const profileGrid = document.getElementById('profile-grid')
  profileGrid.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  const userPrompts = await window.api.getPromptsByUser(userId)
  currentProfile.prompts = userPrompts

  document.getElementById('pv-sub').textContent = `${userPrompts.length} public prompt${userPrompts.length !== 1 ? 's' : ''}`
  profileGrid.innerHTML = userPrompts.length === 0
    ? '<div class="loading">No public prompts found.</div>'
    : userPrompts.map((p, i) => renderCard(p, i)).join('')
}

function hideProfile() {
  currentProfile = null
  setView('community', document.querySelector('[data-v=community]'))
}

function openModal(p = null) {
  eid = p?.id || null
  document.getElementById('m-ttl').textContent = p ? 'Edit prompt' : 'New prompt'
  document.getElementById('f-name').value = p?.name || ''
  document.getElementById('f-description').value = p?.description || ''
  document.getElementById('f-text').value = p?.text || ''
  document.getElementById('f-tags').value = (p?.tags||[]).join(', ')
  document.getElementById('f-public').checked = false
  document.getElementById('public-row').style.display = p ? 'none' : ''
  updChar()
  document.getElementById('backdrop').classList.add('open')
  setTimeout(() => document.getElementById(p ? 'f-text' : 'f-name').focus(), 60)
}

function closeModal() { document.getElementById('backdrop').classList.remove('open'); eid = null }
function bgClose(e) { if (e.target === document.getElementById('backdrop')) closeModal() }
function updChar() {
  const n = document.getElementById('f-text').value.length
  document.getElementById('char-n').textContent = `${n.toLocaleString()} chars`
}

async function savePrompt() {
  const name = document.getElementById('f-name').value.trim()
  const description = document.getElementById('f-description').value.trim()
  const text = document.getElementById('f-text').value.trim()
  const tags = document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  if (!text) {
    const ta = document.getElementById('f-text')
    ta.focus(); ta.style.borderColor = 'rgba(239,68,68,0.6)'
    setTimeout(() => ta.style.borderColor = '', 1400); return
  }
  if (eid) {
    const u = await window.api.updatePrompt(eid, { name: name || 'Untitled', description, text, tags })
    const i = localPrompts.findIndex(p => p.id === eid)
    if (i !== -1) localPrompts[i] = u
    if (oid === eid) openDrawer(eid)
  } else {
    const isPublic = document.getElementById('f-public').checked
    const c = await window.api.createPrompt({ name: name || 'Untitled', description, text, tags, is_public: isPublic })
    if (c) localPrompts.unshift(c)
  }
  closeModal(); renderAll(); showToast(eid ? 'Prompt updated' : 'Prompt saved')
}

function showConfirm(title, msg, cb) {
  document.getElementById('confirm-title').textContent = title
  document.getElementById('confirm-msg').textContent = msg
  confirmCallback = cb
  document.getElementById('confirm-backdrop').classList.add('open')
  setTimeout(() => document.getElementById('confirm-ok').focus(), 60)
}
function confirmOk() {
  document.getElementById('confirm-backdrop').classList.remove('open')
  if (confirmCallback) { confirmCallback(); confirmCallback = null }
}
function confirmCancel() {
  document.getElementById('confirm-backdrop').classList.remove('open')
  confirmCallback = null
}
function confirmBgClose(e) { if (e.target === document.getElementById('confirm-backdrop')) confirmCancel() }

document.getElementById('confirm-ok').addEventListener('click', confirmOk)

function exportPrompts() {
  if (localPrompts.length === 0) { showToast('Nothing to export'); return }
  const data = JSON.stringify({ version: 1, prompts: localPrompts }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `promptbook-export-${new Date().toISOString().slice(0,10)}.json`
  document.body.appendChild(a); a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 1000)
  showToast(`Exported ${localPrompts.length} prompts`)
}

function importPrompts() { document.getElementById('import-file').click() }

async function handleImport(e) {
  const file = e.target.files[0]; if (!file) return
  e.target.value = ''
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const list = Array.isArray(data) ? data : (data.prompts || [])
    if (!Array.isArray(list) || list.length === 0) { showToast('No valid prompts found'); return }
    let count = 0
    for (const p of list) {
      if (!p.text) continue
      const created = await window.api.createPrompt({ name: p.name || 'Untitled', text: p.text, tags: p.tags || [] })
      if (created) { localPrompts.unshift(created); count++ }
    }
    renderAll()
    showToast(`Imported ${count} prompt${count !== 1 ? 's' : ''}`)
  } catch {
    showToast('Invalid JSON file')
  }
}

function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg; t.classList.add('show')
  clearTimeout(t._timer)
  t._timer = setTimeout(() => t.classList.remove('show'), 2200)
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('confirm-backdrop').classList.contains('open')) { confirmCancel(); return }
    if (document.getElementById('backdrop').classList.contains('open')) { closeModal(); return }
    if (document.getElementById('drawer').classList.contains('open')) { closeDrawer(); return }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); focusSearch() }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openModal() }
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault()
    if (oid && !document.getElementById('drawer').classList.contains('open')) return
    if (oid) editCurrent()
  }
})

if (window.pb && window.pb.platform !== 'darwin') {
  document.getElementById('wc').style.display = 'flex'
  document.getElementById('topbar').classList.add('has-wc')
  window.pb.onMaximize(isMax => {
    document.getElementById('wc-max-ic').innerHTML = isMax
      ? '<path d="M2 0H10V8M0 2H8V10H0Z" fill="none" stroke="currentColor" stroke-width="1.2"/>'
      : '<rect x=".6" y=".6" width="8.8" height="8.8" rx="0" fill="none" stroke="currentColor" stroke-width="1.2"/>'
  })
}

function applyTheme(light) {
  document.body.classList.toggle('light', light)
  const moon = document.getElementById('theme-ic-moon')
  const sun = document.getElementById('theme-ic-sun')
  if (moon) moon.style.display = light ? 'none' : ''
  if (sun) sun.style.display = light ? '' : 'none'
  if (window.pb) window.pb.setTheme(!light)
}

function toggleTheme() {
  const isLight = !document.body.classList.contains('light')
  localStorage.setItem('pb-theme', isLight ? 'light' : 'dark')
  applyTheme(isLight)
}

const _savedTheme = localStorage.getItem('pb-theme')
if (_savedTheme === 'light') applyTheme(true)

load()
