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

  const LEADER_EMAIL = "noctisfav1@gmail.com";

  useEffect(() => {
    if (!user) return;
    syncUserAndFetchData();
  }, [user]);

  const syncUserAndFetchData = async () => {
    // 1. AUTO-SYNC: Add user to Supabase profiles if they don't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      await supabase.from('profiles').insert([{
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username || user.firstName || "Unknown Soldier",
        role: user.primaryEmailAddress?.emailAddress === LEADER_EMAIL ? 'leader' : 'member'
      }]);
    }

    // 2. Set Local Role state
    if (user.primaryEmailAddress?.emailAddress === LEADER_EMAIL) {
      setUserRole('leader');
    } else if (existingProfile) {
      setUserRole(existingProfile.role);
    }

    // 3. Get Assignments
    const { data: assign } = await supabase.from('assignments').select('*').eq('user_id', user.id).single();
    if (assign) setMyAssignment(assign);

    // 4. Load Roster for Management
    if (userRole === 'leader' || userRole === 'officer' || user.primaryEmailAddress?.emailAddress === LEADER_EMAIL) {
      const { data: members } = await supabase.from('profiles').select('*').order('role', { ascending: false });
      setAllMembers(members || []);
    }
  };

  const handleAssign = async () => {
    if (!targetId) return alert("Select a member first");
    const { error } = await supabase
      .from('assignments')
      .upsert([{ user_id: targetId, node_number: nodeNum, path_number: pathNum }], { onConflict: 'user_id' });
    
    if (error) alert("Error: " + error.message);
    else alert("Assignment deployed to neural network.");
  };

  const updateRole = async (uid, newRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', uid);
    if (!error) syncUserAndFetchData();
  };

  const kickMember = async (m) => {
    if (confirm(`Exile ${m.username} from the alliance?`)) {
      await supabase.from('profiles').delete().eq('id', m.id);
      await supabase.from('assignments').delete().eq('user_id', m.id);
      syncUserAndFetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30">
      <nav className="p-4 bg-[#020b1a] border-b border-white/5 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black italic tracking-tighter text-yellow-500">WAR COMMAND</h1>
          <span className="bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-cyan-400 uppercase">{userRole}</span>
        </div>
        <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
      </nav>

      <main className="p-8 max-w-5xl mx-auto space-y-8">
        <SignedIn>
          {/* OFFICER/LEADER PANEL */}
          {(userRole === 'leader' || userRole === 'officer') && (
            <section className="bg-[#020b1a] p-6 rounded-xl border border-blue-500/20 shadow-xl">
              <h2 className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em] mb-4">Assign Path</h2>
              <div className="flex flex-col md:flex-row gap-4">
                <select 
                  className="bg-black/40 border border-white/10 p-3 rounded-lg flex-1 outline-none focus:border-blue-500"
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">Select a Member</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                </select>
                <input className="bg-black/40 border border-white/10 p-3 rounded-lg w-28 text-center" placeholder="Path #" onChange={(e) => setPathNum(e.target.value)} />
                <input className="bg-black/40 border border-white/10 p-3 rounded-lg w-28 text-center" placeholder="Node #" onChange={(e) => setNodeNum(e.target.value)} />
                <button onClick={handleAssign} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-black uppercase text-xs tracking-widest transition-all">Deploy</button>
              </div>
            </section>
          )}

          {/* MY ASSIGNMENT */}
          <section className="bg-[#020b1a] p-10 rounded-xl border-l-4 border-cyan-500 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-[40px] font-black">TACTICAL</div>
             <h2 className="text-cyan-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-6">Current Assignment</h2>
             {myAssignment ? (
               <div className="flex gap-12 items-end">
                 <div><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Sector</p><p className="text-7xl font-black">{myAssignment.path_number}</p></div>
                 <div><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Target Node</p><p className="text-7xl font-black text-cyan-400">{myAssignment.node_number}</p></div>
               </div>
             ) : (
               <p className="text-3xl font-black italic text-slate-700">AWAITING ORDERS...</p>
             )}
          </section>

          {/* ROSTER MANAGEMENT */}
          {(userRole === 'leader' || userRole === 'officer') && (
            <section className="bg-[#020b1a] rounded-xl border border-white/5 overflow-hidden shadow-xl">
              <div className="p-4 bg-white/5 border-b border-white/5 font-bold text-[10px] uppercase tracking-widest text-slate-400">Alliance Roster</div>
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-slate-500 border-b border-white/5">
                  <tr><th className="p-4">Member</th><th className="p-4">Role</th><th className="p-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="text-sm">
                  {allMembers.map(m => (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 font-bold">{m.username}</td>
                      <td className="p-4"><span className={`text-[10px] font-bold uppercase ${m.role === 'leader' ? 'text-yellow-500' : 'text-slate-400'}`}>{m.role}</span></td>
                      <td className="p-4 text-right space-x-2">
                        {userRole === 'leader' && m.role !== 'leader' && (
                          <button onClick={() => updateRole(m.id, m.role === 'member' ? 'officer' : 'member')} className="bg-white/5 px-3 py-1 rounded text-[10px] font-bold hover:bg-white/10 uppercase">
                            {m.role === 'member' ? 'Promote' : 'Demote'}
                          </button>
                        )}
                        {(userRole === 'leader' && m.role !== 'leader') || (userRole === 'officer' && m.role === 'member') ? (
                          <button onClick={() => kickMember(m)} className="bg-red-500/10 text-red-500 px-3 py-1 rounded text-[10px] font-bold hover:bg-red-500 hover:text-white uppercase">Kick</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </SignedIn>

        <SignedOut>
          <div className="text-center py-20 space-y-6">
            <h2 className="text-8xl font-black tracking-tighter italic text-white/5">COMMAND</h2>
            <div className="inline-block bg-blue-600 px-10 py-4 rounded-full font-bold cursor-pointer hover:scale-105 transition-transform">
              <SignInButton mode="modal">IDENTITY SYNC</SignInButton>
            </div>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}