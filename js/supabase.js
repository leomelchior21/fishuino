/* ============================================================
   FISHUINO — Supabase client (leaderboard)
   ============================================================ */
const _SB_URL = 'https://imodobxbarcsjylvitxt.supabase.co';
const _SB_KEY = 'sb_publishable_jkHrLZkNR4Zh3XtHEgpTMA_JnMMpG6w';

let _sbClient = null;
function _sb() {
  if (!_sbClient) {
    if (!window.supabase?.createClient) return null;
    _sbClient = window.supabase.createClient(_SB_URL, _SB_KEY);
  }
  return _sbClient;
}

const SB = {
  getClient() { return _sb(); },

  async submitScore(name, score, levelReached, mode) {
    const db = _sb();
    if (!db || !name || score <= 0) return;
    try {
      const { error } = await db.from('scores').insert({
        player_name: String(name).slice(0, 20),
        score: Math.round(score),
        level_reached: Math.max(1, levelReached || 1),
        mode: mode || 'meh'
      });
      if (error) console.warn('SB.submitScore:', error.message);
    } catch (e) { console.warn('SB.submitScore err', e); }
  },

  async getTopScores(mode) {
    const db = _sb();
    if (!db) return [];
    try {
      let q = db.from('scores')
        .select('player_name, score, level_reached, mode')
        .order('score', { ascending: false })
        .limit(10);
      if (mode) q = q.eq('mode', mode);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn('SB.getTopScores err', e); return []; }
  },

  async renderLeaderboard(containerId, mode) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div class="glb-loading">⚡ Loading…</div>';
    const rows = await this.getTopScores(mode);
    if (!rows.length) {
      el.innerHTML = '<div class="glb-empty">No scores yet — be the first!</div>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    el.innerHTML = rows.map((r, i) => `
      <div class="glb-row${i < 3 ? ' glb-top' : ''}">
        <span class="glb-rank">${medals[i] || (i + 1)}</span>
        <span class="glb-name">${r.player_name}</span>
        <span class="glb-score">${r.score}</span>
        <span class="glb-lvl">L${r.level_reached}</span>
      </div>
    `).join('');
  },

  _activeTab: 'meh',

  showTab(tab) {
    this._activeTab = tab;
    ['meh','god'].forEach(t => {
      const btn = document.getElementById('glb-tab-' + t);
      const body = document.getElementById('glb-body-' + t);
      if (btn) btn.classList.toggle('glb-tab-active', t === tab);
      if (body) body.style.display = t === tab ? '' : 'none';
    });
  },

  refreshLeaderboard() {
    this.renderLeaderboard('glb-body-meh', 'meh');
    this.renderLeaderboard('glb-body-god', 'god');
    this.showTab(this._activeTab);
  }
};
