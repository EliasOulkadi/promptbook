const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key'

class API {
  constructor() {
    this.isElectron = !!window.pb
    this.sb = null
    this.user = null

    if (window.supabase) {
      this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      this._checkSession()
    }
  }

  async _checkSession() {
    if (!this.sb) return
    try {
      const { data: { session } } = await this.sb.auth.getSession()
      this.user = session?.user || null
      this._updateLoginUI()
      this.sb.auth.onAuthStateChange((event, session) => {
        this.user = session?.user || null
        this._updateLoginUI()
      })
    } catch (err) {
      console.error('Session check failed:', err)
    }
  }

  _updateLoginUI() {
    const btn = document.getElementById('login-btn')
    const label = document.getElementById('login-label')
    if (!btn) return
    if (this.user) {
      const name = this.user.user_metadata?.full_name || this.user.user_metadata?.name || this.user.email || 'Account'
      const avatar = this.user.user_metadata?.avatar_url || this.user.user_metadata?.picture || null
      btn.className = 'login-btn logged-in'
      btn.onclick = () => this.logout()
      if (avatar) {
        btn.innerHTML = `<img class="user-avatar" src="${avatar}" alt=""> <span>${name.split(' ')[0]}</span>`
      } else {
        const init = name.charAt(0).toUpperCase()
        btn.innerHTML = `<span class="user-init">${init}</span> <span>${name.split(' ')[0]}</span>`
      }
      if (label) label.textContent = name.split(' ')[0]
    } else {
      btn.className = 'login-btn'
      btn.onclick = () => this.login()
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> <span>Login with Google</span>`
    }
  }

  async login() {
    if (!this.sb) return
    const googleParams = {
      prompt: 'select_account',
      access_type: 'offline',
    }
    if (this.isElectron) {
      try {
        const { data, error } = await this.sb.auth.signInWithOAuth({
          provider: 'google',
          options: { skipBrowserRedirect: true, queryParams: googleParams }
        })
        if (error) { console.error('OAuth error:', error.message); return }
        if (data?.url) {
          const session = await window.pb.startAuth(data.url)
          if (session?.access_token && session?.refresh_token) {
            await this.sb.auth.setSession(session)
          }
        }
      } catch (err) {
        console.error('Login failed:', err)
      }
    } else {
      const { error } = await this.sb.auth.signInWithOAuth({
        provider: 'google',
        options: { queryParams: googleParams }
      })
      if (error) console.error('OAuth error:', error.message)
    }
  }

  async logout() {
    if (!this.sb) return
    await this.sb.auth.signOut()
    if (typeof setView === 'function') setView('all', document.querySelector('[data-v=all]'))
  }

  async getPrompts() {
    if (this.isElectron) return window.pb.getPrompts()
    return []
  }

  async getCommunityPrompts() {
    if (!this.sb) return []
    try {
      const { data, error } = await this.sb
        .from('prompts')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) { console.error('Community fetch error:', error); return [] }
      return (data || []).map(p => this._mapCommunity(p))
    } catch (err) {
      console.error('Community fetch failed:', err)
      return []
    }
  }

  async getPromptsByUser(userId) {
    if (!this.sb || !userId) return []
    try {
      const { data, error } = await this.sb
        .from('prompts')
        .select('*')
        .eq('is_public', true)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) { console.error('Profile fetch error:', error); return [] }
      return (data || []).map(p => this._mapCommunity(p))
    } catch (err) {
      console.error('Profile fetch failed:', err)
      return []
    }
  }

  _mapCommunity(p) {
    return {
      id: p.id,
      shortId: p.short_id || (p.id || '').split('-')[0],
      name: p.name || 'Untitled',
      text: p.text || '',
      tags: p.tags || [],
      pinned: false,
      uses: p.uses || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      created_at: p.created_at,
      updated_at: p.updated_at,
      isCommunity: true,
      user_id: p.user_id || null,
      user_name: p.user_name || null,
      user_avatar: p.user_avatar || null,
    }
  }

  async createPrompt(data) {
    if (this.isElectron) {
      const localP = await window.pb.createPrompt(data)
      if (data.is_public && this.user && this.sb) {
        const meta = this.user.user_metadata || {}
        const insertData = {
          id: localP.id,
          name: localP.name,
          text: localP.text,
          tags: localP.tags,
          is_public: true,
          user_id: this.user.id,
          user_name: meta.full_name || meta.name || null,
          user_avatar: meta.avatar_url || meta.picture || null,
        }
        const { error } = await this.sb.from('prompts').insert([insertData])
        if (error) {
          const fallback = { id: localP.id, name: localP.name, text: localP.text, tags: localP.tags, is_public: true, user_id: this.user.id }
          await this.sb.from('prompts').insert([fallback]).catch(console.error)
        }
      }
      return localP
    }
    return null
  }

  async updatePrompt(id, data) {
    if (this.isElectron) return window.pb.updatePrompt(id, data)
    return null
  }

  async deletePrompt(id) {
    if (this.isElectron) return window.pb.deletePrompt(id)
    return false
  }

  async incrementUses(id) {
    if (this.isElectron) return window.pb.incrementUses(id)
  }

  async copyText(text) {
    if (this.isElectron) return window.pb.copyText(text)
    try { await navigator.clipboard.writeText(text); return true } catch { return false }
  }
}

window.api = new API()
