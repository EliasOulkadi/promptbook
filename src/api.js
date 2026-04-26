// Abstraction Layer for Data Storage & Supabase

const SUPABASE_URL = 'https://hxnqzytpyedlvreoideh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0z1zyU_5cZ1U9tV73IuTew_rXISJeUU';

class API {
  constructor() {
    this.isElectron = !!window.pb;
    this.sb = null;
    this.user = null;
    
    // Initialize Supabase if available via CDN
    if (window.supabase) {
      this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.checkSession();
    }
  }

  async checkSession() {
    if (!this.sb) return;
    const { data: { session } } = await this.sb.auth.getSession();
    this.user = session?.user || null;
    this.updateLoginUI();
    
    this.sb.auth.onAuthStateChange((event, session) => {
      this.user = session?.user || null;
      this.updateLoginUI();
    });
  }

  updateLoginUI() {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    if (this.user) {
      btn.textContent = 'Logout';
      btn.onclick = () => this.logout();
    } else {
      btn.textContent = 'Login';
      btn.onclick = () => this.login();
    }
  }

  async login() {
    if (!this.sb) return alert('Supabase not loaded');
    
    if (this.isElectron) {
      // In Electron, OAuth can be tricky, but we can try opening the URL or using Supabase's PKCE
      const { data, error } = await this.sb.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) alert(error.message);
    } else {
      // On Web (Vercel)
      const { error } = await this.sb.auth.signInWithOAuth({ provider: 'google' });
      if (error) alert(error.message);
    }
  }

  async logout() {
    if (!this.sb) return;
    await this.sb.auth.signOut();
    // Go back to all view
    if (typeof setView === 'function') setView('all', document.querySelector('[data-v=all]'));
  }

  async getPrompts() {
    if (this.isElectron) {
      return await window.pb.getPrompts();
    }
    // Web local storage implementation would go here, 
    // for now we just return empty if offline web
    return [];
  }

  async getCommunityPrompts() {
    if (!this.sb) return [];
    // Assuming there's a table called 'prompts' with a 'is_public' boolean
    const { data, error } = await this.sb
      .from('prompts')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('Error fetching community prompts:', error);
      return [];
    }
    
    // Map them to look like local prompts
    return data.map(p => ({
      id: p.id,
      shortId: p.short_id || p.id.split('-')[0],
      name: p.name,
      text: p.text,
      tags: p.tags || [],
      pinned: false,
      uses: p.uses || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      isCommunity: true
    }));
  }

  async getTags() {
    if (this.isElectron) {
      return await window.pb.getTags();
    }
    return [];
  }

  async createPrompt(data) {
    if (this.isElectron) {
      // Create local
      const localP = await window.pb.createPrompt(data);
      // If public and logged in, push to Supabase
      if (data.is_public && this.user && this.sb) {
        await this.sb.from('prompts').insert([{
          id: localP.id,
          name: localP.name,
          text: localP.text,
          tags: localP.tags,
          is_public: true,
          user_id: this.user.id
        }]);
      }
      return localP;
    }
    return null;
  }

  async updatePrompt(id, data) {
    if (this.isElectron) {
      return await window.pb.updatePrompt(id, data);
    }
    return null;
  }

  async deletePrompt(id) {
    if (this.isElectron) {
      return await window.pb.deletePrompt(id);
    }
    return false;
  }

  async incrementUses(id) {
    if (this.isElectron) {
      return await window.pb.incrementUses(id);
    }
  }

  async copyText(text) {
    if (this.isElectron) {
      return await window.pb.copyText(text);
    } else {
      await navigator.clipboard.writeText(text);
      return true;
    }
  }
}

window.api = new API();
