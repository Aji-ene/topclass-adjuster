// services/sessionStore.js
//
// Cross-tab memory for a claim. Every generate/rewrite/collaborate call
// (from the existing Generate tab, the new Letterhead tab, or the new
// Collaboration tab) appends an entry here, keyed by sessionId — normally
// the claimNumber, but falls back to a generated id so users without a
// claim number yet still get continuity within one browser session.
//
// Swap the in-memory Map for a DB table (sessions/session_entries) when
// you need this to survive a server restart or work across multiple
// server instances — the interface below is intentionally small so that
// swap is a drop-in.

const sessions = new Map(); // sessionId -> array of entries

function makeSessionId(claimNumber) {
  return claimNumber && claimNumber.trim()
    ? claimNumber.trim()
    : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {string} sessionId
 * @param {object} entry
 *   { tab: 'generate'|'letterhead'|'collaboration',
 *     agent: 'claude'|'chatgpt'|'grok'|'gemini'|'collaboration',
 *     role: 'user'|'assistant',
 *     prompt?: string,
 *     response?: string,
 *     meta?: object }
 */
function appendEntry(sessionId, entry) {
  if (!sessionId) return;
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  sessions.get(sessionId).push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Returns entries for a session, optionally filtered by tab.
 */
function getHistory(sessionId, { tab, limit } = {}) {
  if (!sessionId || !sessions.has(sessionId)) return [];
  let entries = sessions.get(sessionId);
  if (tab) entries = entries.filter(e => e.tab === tab);
  if (limit) entries = entries.slice(-limit);
  return entries;
}

/**
 * Formats history into a compact text block safe to drop into a prompt.
 * Truncates each entry so old sessions don't blow the context window.
 */
function formatHistoryForPrompt(sessionId, { tab, limit = 12, maxCharsPerEntry = 800 } = {}) {
  const entries = getHistory(sessionId, { tab, limit });
  if (entries.length === 0) return '';

  let block = '\n\n═══════════════════════════════════════════════════════════\n';
  block += '🕘 PRIOR CONTEXT FOR THIS CLAIM (from earlier tabs/requests)\n';
  block += '═══════════════════════════════════════════════════════════\n';
  block += 'Use this only as background. Do not repeat it verbatim — refer to it where relevant.\n\n';

  entries.forEach(e => {
    const label = `[${e.timestamp}] (${e.tab}${e.agent ? ` / ${e.agent}` : ''} / ${e.role})`;
    const text = (e.prompt || e.response || '').slice(0, maxCharsPerEntry);
    const truncatedNote = (e.prompt || e.response || '').length > maxCharsPerEntry ? ' [...truncated]' : '';
    block += `${label}\n${text}${truncatedNote}\n\n`;
  });

  block += '═══════════════════════════════════════════════════════════\n\n';
  return block;
}

function clearSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = {
  makeSessionId,
  appendEntry,
  getHistory,
  formatHistoryForPrompt,
  clearSession,
};
