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
  
  const isAdmin = user?.primaryEmailAddress?.emailAddress === "noctisfav1@gmail.com";

  // This part automatically fetches the assignment for the logged-in member
  useEffect(() => {
    async function getMyPath() {
      if (!user) return;
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setMyAssignment(data);
    }
    getMyPath();
  }, [user]);

  const handleAssign = async () => {
    const { error } = await supabase
      .from('assignments')
      .insert([{ user_id: targetId, node_number: nodeNum, path_number: pathNum }]);
    
    if (error) alert("Error: " + error.message);
    else alert("Success! Assignment saved.");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <h1 className="text-xl font-bold text-yellow-500">MCOC WAR COMMAND</h1>
        <SignedIn><UserButton showName /></SignedIn>
        <SignedOut><div className="bg-blue-600 px-4 py-2 rounded font-bold cursor-pointer"><SignInButton mode="modal" /></div></SignedOut>
      </nav>

      <main className="p-8 max-w-4xl mx-auto">
        <SignedIn>
          {isAdmin && (
            <div className="bg-slate-800 p-6 rounded-xl border border-red-500/30 mb-8">
              <h2 className="text-xl font-bold text-red-500 mb-4">OFFICER: ASSIGN PATH</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input className="bg-slate-900 border border-slate-700 p-2 rounded" placeholder="User ID" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
                <input className="bg-slate-900 border border-slate-700 p-2 rounded" placeholder="Path #" value={pathNum} onChange={(e) => setPathNum(e.target.value)} />
                <input className="bg-slate-900 border border-slate-700 p-2 rounded" placeholder="Node #" value={nodeNum} onChange={(e) => setNodeNum(e.target.value)} />
                <button onClick={handleAssign} className="bg-blue-600 px-4 py-2 rounded font-bold">SAVE</button>
              </div>
            </div>
          )}

          <div className="bg-slate-800 p-8 rounded-xl border-l-8 border-blue-500 shadow-2xl mb-8">
            <h2 className="text-blue-400 font-bold text-sm uppercase tracking-widest">Your Current Assignment</h2>
            {myAssignment ? (
              <div className="mt-4">
                <p className="text-5xl font-black">PATH {myAssignment.path_number}</p>
                <p className="text-xl text-slate-400 mt-2">Targeting Node: <span className="text-white font-bold">{myAssignment.node_number}</span></p>
              </div>
            ) : (
              <p className="text-2xl font-bold mt-4 text-slate-500 italic">No path assigned yet. Check with an officer.</p>
            )}
          </div>
        </SignedIn>

        <SignedOut>
          <div className="text-center mt-20">
            <h2 className="text-6xl font-black mb-4 tracking-tighter italic">WIN THE WAR.</h2>
            <p className="text-slate-400 text-xl">Log in with Discord to view your path and node targets.</p>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}