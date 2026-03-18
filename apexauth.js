/**
 * apexauth.js — ApexPrime Auth System
 * Powered by Supabase
 */

const SUPABASE_URL = 'https://oauwgfuboeboumwfbfje.supabase.co';
const SUPABASE_KEY = 'sb_publishable__a_pTEA2WAgUcdPh836kwQ_IWdsjUAk';

let _supabase = null;
function getClient() {
  if (!_supabase) _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabase;
}

const PROTECTED  = ['dashboard.html'];
const AUTH_ONLY  = ['login.html'];
const LOGIN_PAGE = 'login.html';
const HOME_PAGE  = 'dashboard.html';

function currentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

/* ── ROUTE GUARD ── */
async function guard() {
  const { data: { session } } = await getClient().auth.getSession();
  const page   = currentPage();
  const authed = !!session;
  if (PROTECTED.includes(page) && !authed) {
    sessionStorage.setItem('apexprime_redirect', page);
    window.location.replace(LOGIN_PAGE);
  } else if (AUTH_ONLY.includes(page) && authed) {
    window.location.replace(HOME_PAGE);
  }
}

/* ── AUTH ── */
async function signup(firstName, lastName, email, password) {
  if (!firstName || !lastName || !email || !password) return { ok: false, error: 'Please fill in all fields.' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  const { data, error } = await getClient().auth.signUp({
    email, password,
    options: { data: { full_name: `${firstName} ${lastName}`, avatar: (firstName[0]+lastName[0]).toUpperCase(), plan: 'Free' } }
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

async function login(email, password) {
  if (!email || !password) return { ok: false, error: 'Please fill in all fields.' };
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

async function logout() {
  await getClient().auth.signOut();
  window.location.replace(LOGIN_PAGE);
}

async function getUser() {
  const { data: { user } } = await getClient().auth.getUser();
  return user;
}

async function getSession() {
  const { data: { session } } = await getClient().auth.getSession();
  return session;
}

/* ── PROJECTS ── */
async function getProjects() {
  const { data, error } = await getClient().from('projects').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function createProject(name, description, agentsUsed = []) {
  const user = await getUser();
  if (!user) return { ok: false, error: 'Not authenticated.' };
  const { data, error } = await getClient().from('projects')
    .insert([{ user_id: user.id, name, description, agents_used: agentsUsed, status: 'building' }])
    .select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, project: data };
}

async function updateProjectStatus(projectId, status) {
  const { error } = await getClient().from('projects').update({ status }).eq('id', projectId);
  return !error;
}

/* ── AGENT LOGS ── */
async function logAgent(projectId, agentName, status = 'queued', result = null, duration = null) {
  const user = await getUser();
  if (!user) return;
  await getClient().from('agent_logs').insert([{ project_id: projectId, user_id: user.id, agent_name: agentName, status, result, duration_seconds: duration }]);
}

async function getAgentLogs(projectId) {
  const { data, error } = await getClient().from('agent_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

document.addEventListener('DOMContentLoaded', guard);

const ApexAuth = { login, signup, logout, getUser, getSession, guard, getProjects, createProject, updateProjectStatus, logAgent, getAgentLogs, getClient };
