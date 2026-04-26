const NC=12
let prompts=[],view='all',atag=null,q='',eid=null,oid=null
const tm={},tca=[]
function tc(t){if(tm[t]==null){tm[t]=tca.length%NC;tca.push(t)}return tm[t]}
function th(t){return `<span class="tag c${tc(t)}">${xe(t)}</span>`}
function xe(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function ago(iso){
  const s=(Date.now()-new Date(iso))/1000
  if(s<60)return'just now'
  if(s<3600)return`${~~(s/60)}m ago`
  if(s<86400)return`${~~(s/3600)}h ago`
  if(s<604800)return`${~~(s/86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

async function load(){prompts=await window.api.getPrompts();renderAll()}

function filtered(){
  if(view==='community') return prompts; // When community, prompts array holds community data
  let l=[...prompts]
  if(view==='pinned')l=l.filter(p=>p.pinned)
  if(view==='recent')l=l.filter(p=>p.uses>0).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,30)
  if(atag)l=l.filter(p=>(p.tags||[]).includes(atag))
  if(q){const lq=q.toLowerCase();l=l.filter(p=>p.name.toLowerCase().includes(lq)||p.text.toLowerCase().includes(lq)||(p.tags||[]).some(t=>t.includes(lq)))}
  return l
}

function renderAll(){renderSide();renderList()}

function renderSide(){
  document.getElementById('n-all').textContent=prompts.length
  document.getElementById('n-pin').textContent=prompts.filter(p=>p.pinned).length
  document.getElementById('n-rec').textContent=prompts.filter(p=>p.uses>0).length
  document.getElementById('foot-count').textContent=`${prompts.length} prompt${prompts.length!==1?'s':''}`
  const tags={}
  for(const p of prompts)for(const t of(p.tags||[]))tags[t]=(tags[t]||0)+1
  document.getElementById('tag-list').innerHTML=Object.keys(tags).sort().map(t=>`
    <div class="tag-item${atag===t?' on':''}" onclick="setTag('${xe(t)}')">
      <span class="tdot c${tc(t)}" style="background:currentColor;opacity:.8"></span>
      ${xe(t)}<span class="tag-n">${tags[t]}</span>
    </div>`).join('')
}

function renderList(){
  const l=filtered()
  document.getElementById('tb-count').textContent=l.length
  const el=document.getElementById('list')
  const ee=document.getElementById('empty')
  const nr=document.getElementById('no-results')
  const lw=document.getElementById('list-wrap')

  if(prompts.length===0){ee.style.display='flex';lw.style.display='none';nr.style.display='none';return}
  ee.style.display='none'

  if(l.length===0){nr.style.display='block';lw.style.display='none';el.innerHTML='';return}
  nr.style.display='none';lw.style.display='block'

  el.innerHTML=l.map(p=>`
    <div class="row${p.pinned?' pinned':''}" onclick="openDrawer('${p.id}')">
      <div class="row-id">${xe(p.shortId||'')}</div>
      <div class="row-name">
        <div class="row-title">${xe(p.name)}</div>
        <div class="row-prev">${xe(p.text.slice(0,80))}</div>
      </div>
      <div class="row-tags">${(p.tags||[]).map(th).join('')}</div>
      <div class="row-uses">${p.uses||0}</div>
      <div class="row-actions" onclick="event.stopPropagation()">
        <button class="ra-btn" onclick="copyRow('${p.id}',this)">Copy</button>
      </div>
    </div>`).join('')
}

async function copyRow(id,btn){
  const p=prompts.find(x=>x.id===id);if(!p)return
  await window.api.copyText(p.text);await window.api.incrementUses(id)
  p.uses=(p.uses||0)+1
  btn.textContent='Copied';btn.classList.add('ok')
  showToast('Copied to clipboard')
  setTimeout(()=>{btn.textContent='Copy';btn.classList.remove('ok')},1500)
}

function openDrawer(id){
  const p=prompts.find(x=>x.id===id);if(!p)return
  oid=id
  document.getElementById('d-id').textContent=p.shortId||''
  document.getElementById('d-title').textContent=p.name
  document.getElementById('d-tags').innerHTML=(p.tags||[]).map(th).join('')
  document.getElementById('d-text').textContent=p.text
  const pin=document.getElementById('d-pin')
  pin.textContent=p.pinned?'Unpin':'Pin'
  pin.classList.toggle('pnd',p.pinned)
  document.getElementById('d-meta').innerHTML=`
    <div class="m-row"><strong>Used</strong><span>${p.uses||0} time${p.uses!==1?'s':''}</span></div>
    <div class="m-row"><strong>Created</strong><span>${ago(p.createdAt)}</span></div>
    <div class="m-row"><strong>Updated</strong><span>${ago(p.updatedAt)}</span></div>`
  const cb=document.getElementById('d-copy')
  cb.className='copy-btn'
  cb.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy to clipboard'
  document.getElementById('drawer').classList.add('open')
}
function closeDrawer(){document.getElementById('drawer').classList.remove('open');oid=null}

async function copyDrawer(){
  const p=prompts.find(x=>x.id===oid);if(!p)return
  await window.api.copyText(p.text);await window.api.incrementUses(p.id)
  p.uses=(p.uses||0)+1
  const cb=document.getElementById('d-copy')
  cb.classList.add('ok');cb.textContent='Copied!'
  showToast('Copied to clipboard');renderList()
  setTimeout(()=>{
    cb.className='copy-btn'
    cb.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy to clipboard'
  },1800)
}

async function togglePin(){
  const p=prompts.find(x=>x.id===oid);if(!p)return
  p.pinned=!p.pinned;await window.api.updatePrompt(p.id,{pinned:p.pinned})
  openDrawer(p.id);renderAll()
}
function editCurrent(){const p=prompts.find(x=>x.id===oid);if(p)openModal(p)}
async function delCurrent(){
  if(!oid)return
  if(!confirm('Delete this prompt?'))return
  await window.api.deletePrompt(oid)
  prompts=prompts.filter(x=>x.id!==oid)
  closeDrawer();renderAll();showToast('Deleted')
}

async function setView(v,el){
  view=v;atag=null
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('on'))
  document.querySelectorAll('.tag-item').forEach(e=>e.classList.remove('on'))
  if(el)el.classList.add('on')
  document.getElementById('view-lbl').textContent={all:'All prompts',pinned:'Pinned',recent:'Recently used',community:'Community'}[v]||v
  
  if (v === 'community') {
    prompts = await window.api.getCommunityPrompts();
  } else {
    prompts = await window.api.getPrompts();
  }
  renderList()
}
function setTag(tag){
  if(atag===tag){atag=null;setView('all',document.querySelector('[data-v=all]'));return}
  atag=tag;view='all'
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('on'))
  document.getElementById('view-lbl').textContent=`#${tag}`
  renderSide();renderList()
}
function onSearch(v){q=v.trim();renderList()}

function openModal(p=null){
  eid=p?.id||null
  document.getElementById('m-ttl').textContent=p?'Edit prompt':'New prompt'
  document.getElementById('f-name').value=p?.name||''
  document.getElementById('f-text').value=p?.text||''
  document.getElementById('f-tags').value=(p?.tags||[]).join(', ')
  const pubSwitch = document.getElementById('f-public');
  if(pubSwitch) {
    pubSwitch.checked = false;
    pubSwitch.parentElement.style.display = p ? 'none' : 'block';
  }
  updChar()
  document.getElementById('backdrop').classList.add('open')
  setTimeout(()=>document.getElementById(p?'f-text':'f-name').focus(),50)
}
function closeModal(){document.getElementById('backdrop').classList.remove('open');eid=null}
function bgClose(e){if(e.target===document.getElementById('backdrop'))closeModal()}
function updChar(){const n=document.getElementById('f-text').value.length;document.getElementById('char-n').textContent=`${n} chars`}

async function savePrompt(){
  const name=document.getElementById('f-name').value.trim()
  const text=document.getElementById('f-text').value.trim()
  const tags=document.getElementById('f-tags').value.split(',').map(t=>t.trim()).filter(Boolean)
  if(!text){
    const ta=document.getElementById('f-text')
    ta.focus();ta.style.borderColor='var(--red)'
    setTimeout(()=>ta.style.borderColor='',1400);return
  }
  if(eid){
    const u=await window.api.updatePrompt(eid,{name:name||'Untitled',text,tags})
    const i=prompts.findIndex(p=>p.id===eid);if(i!==-1)prompts[i]=u
    if(oid===eid)openDrawer(eid)
  }else{
    const isPublic = document.getElementById('f-public')?.checked || false;
    const c=await window.api.createPrompt({name:name||'Untitled',text,tags,is_public:isPublic})
    if(view!=='community') prompts.unshift(c)
  }
  closeModal();renderAll();showToast(eid?'Saved':'Prompt added')
}

function showToast(msg){
  const t=document.getElementById('toast')
  t.textContent=msg;t.classList.add('show')
  setTimeout(()=>t.classList.remove('show'),2000)
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('backdrop').classList.contains('open'))closeModal()
    else if(document.getElementById('drawer').classList.contains('open'))closeDrawer()
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();document.getElementById('srch').focus()}
  if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();openModal()}
})

if (window.pb && window.pb.platform !== 'darwin') {
  document.getElementById('wc').style.display = 'flex'
  window.pb.onMaximize(isMax => {
    document.getElementById('wc-max-ic').innerHTML = isMax
      ? '<path d="M2 0H10V8M0 2H8V10H0Z" fill="none" stroke="currentColor" stroke-width="1.2"/>'
      : '<rect x=".6" y=".6" width="8.8" height="8.8" rx="0" fill="none" stroke="currentColor" stroke-width="1.2"/>'
  })
}

load()