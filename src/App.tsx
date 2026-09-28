import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, ADMIN_PASSCODE } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminPortal/AdminDashboard';
import { StudentPortal } from './components/StudentPortal/StudentPortal';
import { ShieldCheck, KeyRound, Sparkles, GraduationCap } from 'lucide-react';

function MainApp() {
  const { user, isAdmin, loginAsAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<'student' | 'admin'>('student');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminPassError, setAdminPassError] = useState('');

  // Handle URL query parameters (e.g. ?code=ETH2026 or ?role=student or ?role=admin)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('student');
    }
  }, []);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscode.trim() !== ADMIN_PASSCODE) {
      setAdminPassError('Incorrect admin passcode.');
      return;
    }
    await loginAsAdmin(adminPasscode.trim());
    setAdminPassError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

      <main className="flex-1 w-full">
        {currentTab === 'admin' ? (
          isAdmin ? (
            <AdminDashboard />
          ) : (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>

                <h2 className="text-2xl font-black text-white mb-2">Admin Authentication</h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Students are completely restricted from this area. Enter the administrator passcode to manage topics, study materials, and launch quizzes.
                </p>

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Admin Passcode
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={adminPasscode}
                        onChange={(e) => setAdminPasscode(e.target.value)}
                        placeholder="Enter admin passcode"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        autoFocus
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                    {adminPassError && (
                      <p className="mt-1.5 text-xs text-rose-400 font-semibold">{adminPassError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition"
                  >
                    Unlock Admin Portal
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentTab('student')}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    ← Return to Student Portal
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          <StudentPortal />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">QuizPortal PRO</span>
            <span>•</span>
            <span>20-Question Live Interactive System</span>
          </div>
          <div className="text-[11px]">
            Powered by Cloud Firestore, Firebase Auth & Storage
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
