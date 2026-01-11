"use client";
import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const { user } = useUser();
  const [targetId, setTargetId] = useState('');
  const [nodeNum, setNodeNum] = useState('');
  const [pathNum, setPathNum] = useState('');
  const [myAssignment, setMyAssignment] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [userRole, setUserRole] = useState('member');

  // YOUR EMAIL IS THE PERMANENT LEADER
  const LEADER_EMAIL = "noctisfav1@gmail.com";

  useEffect(() => {
    if (!user) return;
    checkRoleAndFetchData();
  }, [user]);

  const checkRoleAndFetchData = async () => {
    // 1. Get my role
    let { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Auto-set Leader if email matches
    if (user.primaryEmailAddress?.emailAddress === LEADER_EMAIL) {
      setUserRole('leader');
    } else if (profile) {
      setUserRole(profile.role);
    }

    // 2. Get my assignment
    const { data: assign } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (assign) setMyAssignment(assign);

    // 3. If Leader or Officer, fetch member list for management
    if (user.primaryEmailAddress?.emailAddress === LEADER_EMAIL || profile?.role === 'officer') {
      const { data: members } = await supabase.from('profiles').select('*');
      setAllMembers(members || []);
    }
  };

  const handleAssign = async () => {
    const { error } = await supabase
      .from('assignments')
      .upsert([{ user_id: targetId, node_number: nodeNum, path_number: pathNum }], { onConflict: 'user_id' });
    
    if (error) alert("Error: " + error.message);
    else { alert("Assignment saved."); checkRoleAndFetchData(); }
  };

  const updateRole = async (uid, newRole) => {
    if (userRole !== 'leader') return alert("Only the Leader can change roles.");
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', uid);
    if (!error) checkRoleAndFetchData();
  };

  const kickMember = async (targetMember) => {
    // Logic: Leader can kick anyone. Officer can only kick members.
    if (userRole === 'officer' && (targetMember.role === 'officer' || targetMember.role === 'leader')) {
      return alert("Officers cannot kick other Officers or the Leader.");
    }

    const confirmKick = confirm(`Are you sure you want to kick ${targetMember.username || 'this user'}?`);
    if (confirmKick) {
      const { error } = await supabase.from('profiles').delete().eq('id', targetMember.id);
      await supabase.from('assignments').delete().eq('user_id', targetMember.id);
      if (!error) checkRoleAndFetchData();
    }
  };

  const isManagement = userRole === 'leader' || userRole === 'officer';

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <nav className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-yellow-500 tracking-tighter italic">WAR COMMAND</h1>
          {user && <span className="bg-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-cyan-400">{userRole}</span>}
        </div>
        <SignedIn><UserButton showName /></SignedIn>
        <SignedOut><div className="bg-blue-600 px-4 py-2 rounded font-bold cursor-pointer"><SignInButton mode="modal" /></div></SignedOut>
      </nav>

      <main className="p-8 max-w-6xl mx-auto">
        <SignedIn>
          {/* ASSIGNMENT SECTION */}
          {isManagement && (
            <div className="bg-slate-800 p-6 rounded-xl border border-blue-500/30 mb-8">
              <h2 className="text-xl font-bold text-blue-400 mb-4 uppercase tracking-tighter">Assign Path</h2>
              <div className="flex flex-wrap gap-4">
                <select 
                  className="bg-slate-900 border border-slate-700 p-2 rounded flex-1 min-w-[200px]"
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">Select a Member</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.username || m.email}</option>)}
                </select>
                <input className="bg-slate-900 border border-slate-700 p-2 rounded w-24" placeholder="Path #" onChange={(e) => setPathNum(e.target.value)} />
                <input className="bg-slate-900 border border-slate-700 p-2 rounded w-24" placeholder="Node #" onChange={(e) => setNodeNum(e.target.value)} />
                <button onClick={handleAssign} className="bg-blue-600 px-6 py-2 rounded font-black uppercase text-sm">Deploy</button>
              </div>
            </div>
          )}

          {/* PERSONAL ASSIGNMENT CARD */}
          <div className="bg-slate-800 p-8 rounded-xl border-l-8 border-cyan-500 shadow-2xl mb-8">
            <h2 className="text-cyan-400 font-bold text-xs uppercase tracking-[0.3em]">Your Current Assignment</h2>
            {myAssignment ? (
              <div className="mt-4 flex items-end gap-6">
                <div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Sector</p>
                  <p className="text-7xl font-black italic">{myAssignment.path_number}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Node</p>
                  <p className="text-7xl font-black italic text-cyan-400">{myAssignment.node_number}</p>
                </div>
              </div>
            ) : (
              <p className="text-2xl font-bold mt-4 text-slate-500 italic uppercase tracking-tighter">Awaiting Orders...</p>
            )}
          </div>

          {/* MEMBER MANAGEMENT TABLE (Leader & Officer only) */}
          {isManagement && (
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <div className="p-4 bg-slate-700/50 font-bold text-xs uppercase tracking-widest">Roster Management</div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px]">
                    <th className="p-4">Member</th>
                    <th className="p-4">Role</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allMembers.map((m) => (
                    <tr key={m.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="p-4 font-bold">{m.username || m.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.role === 'leader' ? 'text-yellow-500' : m.role === 'officer' ? 'text-red-400' : 'text-slate-400'}`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        {userRole === 'leader' && m.role !== 'leader' && (
                          <>
                            {m.role === 'member' ? (
                              <button onClick={() => updateRole(m.id, 'officer')} className="text-[10px] bg-slate-700 px-2 py-1 rounded font-bold hover:bg-blue-600">PROMOTE</button>
                            ) : (
                              <button onClick={() => updateRole(m.id, 'member')} className="text-[10px] bg-slate-700 px-2 py-1 rounded font-bold hover:bg-orange-600">DEMOTE</button>
                            )}
                          </>
                        )}
                        {/* Kicking Logic */}
                        {(userRole === 'leader' && m.role !== 'leader') || (userRole === 'officer' && m.role === 'member') ? (
                          <button onClick={() => kickMember(m)} className="text-[10px] bg-red-900/50 text-red-400 px-2 py-1 rounded font-bold hover:bg-red-600 hover:text-white">KICK</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SignedIn>

        <SignedOut>
          <div className="text-center mt-32">
            <h2 className="text-8xl font-black mb-4 tracking-tighter italic text-slate-800">FORGE.</h2>
            <p className="text-slate-500 text-xl tracking-widest uppercase font-bold">Identity Verification Required</p>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}