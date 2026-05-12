import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, sanitizeForFirestore } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import { motion } from 'motion/react';
import { Plus, Trash2, ShieldCheck, Database, LayoutGrid, Users, Settings2 } from 'lucide-react';
import { UserRole, AppUser } from '../types';

export function Admin() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'matches' | 'users'>('matches');
  const [matches, setMatches] = useState<any[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMatch, setNewMatch] = useState({
    homeTeam: '',
    awayTeam: '',
    league: 'EPL',
    leagueTier: 'Tier-A',
    startTime: ''
  });

  const fetchMatches = async () => {
    try {
      const q = query(collection(db, 'matches'), orderBy('startTime', 'desc'));
      const snapshot = await getDocs(q);
      setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(d => ({ ...d.data() } as AppUser)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (profile?.role === UserRole.ADMIN) {
      setLoading(true);
      if (activeTab === 'matches') {
        fetchMatches().finally(() => setLoading(false));
      } else {
        fetchUsers().finally(() => setLoading(false));
      }
    }
  }, [profile, activeTab]);

  const handleUpdateUserRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), sanitizeForFirestore({
        role: newRole
      }));
      fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatch.homeTeam || !newMatch.awayTeam) return;

    try {
      await addDoc(collection(db, 'matches'), sanitizeForFirestore({
        ...newMatch,
        createdAt: serverTimestamp(),
      }));
      setNewMatch({ homeTeam: '', awayTeam: '', league: 'EPL', leagueTier: 'Tier-A', startTime: '' });
      fetchMatches();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'matches');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this match?')) return;
    try {
      await deleteDoc(doc(db, 'matches', id));
      fetchMatches();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `matches/${id}`);
    }
  };

  if (profile?.role !== UserRole.ADMIN) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="technical-border bg-red-500/5 p-10 rounded-lg text-center max-w-md">
          <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-2">Access Restricted</h2>
          <p className="text-[11px] text-zinc-500 leading-relaxed uppercase">
            Administrative credentials required for match reconstruction management. 
            Your current identity index: {profile?.role || 'UNVERIFIED'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:underline"
          >
            Re-verify Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full overflow-auto pb-10">
      <div className="flex justify-between items-center bg-[color:var(--color-header)] p-6 technical-border rounded">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">Central Match Repository</h2>
            <p className="text-[10px] text-zinc-500 uppercase">Input stream for live match analysis queue.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2 border transition-all ${
              activeTab === 'matches' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'
            }`}
          >
            <LayoutGrid className="w-3 h-3" /> Matches
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2 border transition-all ${
              activeTab === 'users' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'
            }`}
          >
            <Users className="w-3 h-3" /> Users
          </button>
        </div>
      </div>

      {activeTab === 'matches' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1 technical-border bg-[color:var(--color-card)] p-6 rounded h-fit">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 text-emerald-400 flex items-center gap-2">
              <Plus className="w-3 h-3" /> Insert Fixture
            </h3>
            <form onSubmit={handleAddMatch} className="space-y-4">
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Home Team</label>
                <input 
                  value={newMatch.homeTeam}
                  onChange={e => setNewMatch({...newMatch, homeTeam: e.target.value})}
                  className="w-full bg-white/5 border border-white/5 rounded p-2 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Away Team</label>
                <input 
                  value={newMatch.awayTeam}
                  onChange={e => setNewMatch({...newMatch, awayTeam: e.target.value})}
                  className="w-full bg-white/5 border border-white/5 rounded p-2 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">League</label>
                  <select 
                    value={newMatch.league}
                    onChange={e => setNewMatch({...newMatch, league: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded p-2 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="EPL">EPL</option>
                    <option value="LALIGA">LALIGA</option>
                    <option value="SERIE A">SERIE A</option>
                    <option value="BUNDESLIGA">BUNDESLIGA</option>
                    <option value="LIGUE 1">LIGUE 1</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Tier</label>
                  <select 
                    value={newMatch.leagueTier}
                    onChange={e => setNewMatch({...newMatch, leagueTier: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded p-2 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tier-A">Tier-A (Safe)</option>
                    <option value="Tier-B">Tier-B (Mod)</option>
                    <option value="Tier-C">Tier-C (Volatile)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Start Date/Time</label>
                <input 
                  type="datetime-local"
                  value={newMatch.startTime}
                  onChange={e => setNewMatch({...newMatch, startTime: e.target.value})}
                  className="w-full bg-white/5 border border-white/5 rounded p-2 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded text-[10px] uppercase tracking-widest transition-all">
                Commit to Repository
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 technical-border bg-[color:var(--color-card)] rounded flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> Active Matches ({matches.length})
              </h3>
            </div>
            <div className="flex-1 overflow-auto max-h-[600px]">
              {loading ? (
                <div className="p-10 text-center text-[10px] uppercase text-zinc-600 animate-pulse">Accessing Data Cloud...</div>
              ) : matches.length === 0 ? (
                <div className="p-10 text-center text-[10px] uppercase text-zinc-600">No matches in repository.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="bg-white/[0.01] sticky top-0 border-b border-white/5">
                    <tr>
                      <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-left">Fixture</th>
                      <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-left">League</th>
                      <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-left">Tier</th>
                      <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <motion.tr 
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/[0.01]"
                      >
                        <td className="p-3">
                          <div className="text-[11px] font-bold text-white uppercase">{m.homeTeam} vs {m.awayTeam}</div>
                          <div className="text-[8px] text-zinc-600 font-mono mt-1">{m.startTime}</div>
                        </td>
                        <td className="p-3 text-[10px] font-black text-emerald-400 uppercase">{m.league}</td>
                        <td className="p-3">
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400">{m.leagueTier}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleDelete(m.id)}
                            className="p-2 text-zinc-700 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="technical-border bg-[color:var(--color-card)] rounded flex flex-col">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Users className="w-3 h-3" /> Total Identity Registry ({users.length})
            </h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[600px]">
            {loading ? (
              <div className="p-10 text-center text-[10px] uppercase text-zinc-600 animate-pulse">Requesting Identity Data...</div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-white/[0.01] sticky top-0 border-b border-white/5">
                  <tr>
                    <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-left">Identity</th>
                    <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-left">Access Level</th>
                    <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-left">Last Verified</th>
                    <th className="p-3 text-[9px] font-black uppercase text-zinc-600 text-center">Role Control</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <motion.tr 
                      key={u.uid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/[0.01]"
                    >
                      <td className="p-3">
                        <div className="text-[11px] font-bold text-white uppercase">{u.displayName || 'Unidentified'}</div>
                        <div className="text-[8px] text-zinc-600 font-mono mt-1">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          u.role === UserRole.ADMIN ? 'bg-red-500/20 text-red-500' :
                          u.role === UserRole.PRO ? 'bg-emerald-500/20 text-emerald-500' :
                          'bg-white/5 text-zinc-500'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-zinc-500 font-mono">
                        {u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString() : u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          {Object.values(UserRole).map(role => (
                            <button
                              key={role}
                              onClick={() => handleUpdateUserRole(u.uid, role)}
                              disabled={u.role === role}
                              className={`p-1.5 rounded transition-all ${
                                u.role === role ? 'bg-emerald-500/10 text-emerald-500 opacity-50' : 'bg-white/5 text-zinc-700 hover:text-white hover:bg-white/10'
                              }`}
                              title={`Elevate to ${role}`}
                            >
                              <Settings2 className="w-3 h-3" />
                              <span className="sr-only">Set to {role}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
