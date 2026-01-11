"use client";
import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { user } = useUser();
  const [userRole, setUserRole] = useState('member');
  const [myProfile, setMyProfile] = useState({ display_name: '', avatar_url: '' });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setMyProfile({ display_name: data.display_name || data.username, avatar_url: data.avatar_url });
      setUserRole(data.role);
    }
  };

  const handleUpdateProfile = async () => {
    const { error } = await supabase.from('profiles')
      .update({ display_name: myProfile.display_name, avatar_url: myProfile.avatar_url })
      .eq('id', user.id);
    if (!error) {
      alert("Profile Optimized.");
      setIsProfileOpen(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage (Assumes you have an 'avatars' bucket)
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setMyProfile({ ...myProfile, avatar_url: data.publicUrl });
    } catch (error) {
      alert('Error uploading avatar!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="p-4 bg-[#020b1a] border-b border-cyan-500/20 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black italic tracking-tighter text-yellow-500">WAR COMMAND</h1>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded uppercase font-bold">{userRole}</span>
        </div>
        
        <SignedIn>
          <div className="flex items-center gap-4">
            {/* COOL ANIMATED PROFILE TRIGGER */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsProfileOpen(true)}
              className="relative cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full border-2 border-cyan-500 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                {myProfile.avatar_url ? (
                  <img src={myProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs">ID</div>
                )}
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full bg-cyan-500 -z-10"
              />
            </motion.div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </nav>

      {/* MAIN CONTENT PLACEHOLDER */}
      <main className="p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-black opacity-20 mt-20">SYSTEM ONLINE</h2>
      </main>

      {/* PROFILE MODAL SECTION */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.9 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.9 }}
              className="bg-[#0b0e14] border border-white/10 w-full max-w-md p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,1)] relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 blur-[80px] rounded-full" />
              
              <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 right-6 text-slate-500 hover:text-white text-2xl">✕</button>
              
              <h2 className="text-2xl font-black tracking-widest text-center mb-8 uppercase italic">Identity Config</h2>

              <div className="flex flex-col items-center gap-6">
                {/* Avatar Upload Display */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-4 border-cyan-500/30 overflow-hidden bg-slate-900">
                    {myProfile.avatar_url && <img src={myProfile.avatar_url} className="w-full h-full object-cover" />}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Upload</span>
                    <input type="file" className="hidden" onChange={uploadAvatar} disabled={uploading} />
                  </label>
                </div>

                <div className="w-full space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
                    <input 
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl mt-1 outline-none focus:border-cyan-500 transition-colors"
                      value={myProfile.display_name}
                      onChange={(e) => setMyProfile({...myProfile, display_name: e.target.value})}
                    />
                  </div>
                  
                  <button 
                    onClick={handleUpdateProfile}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-cyan-900/20 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}