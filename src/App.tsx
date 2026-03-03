import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { User, LeaveRequest } from './types';
import { Calendar as CalendarIcon, Check, X, Clock, User as UserIcon, FileSpreadsheet, Send, ShieldAlert, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]); // For calendar view
  const [view, setView] = useState<'dashboard' | 'form' | 'admin' | 'calendar'>('dashboard');
  
  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
    substituteId: '',
    branch: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications (Simulated Email)
  const [notifications, setNotifications] = useState<string[]>([]);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'GP' | 'Specialist'>('all');
  const [calendarBranchFilter, setCalendarBranchFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  
  // Admin Filter State
  const [adminMonthFilter, setAdminMonthFilter] = useState<number>(new Date().getMonth());
  const [adminYearFilter, setAdminYearFilter] = useState<number>(new Date().getFullYear());

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);

  // Signup State
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vet',
    specialty: 'GP',
    branch: 'Thonglor'
  });

  const branches = [
    { id: 'Thonglor', name: 'ทองหล่อ' },
    { id: 'Langsuan', name: 'หลังสวน' },
    { id: 'Phetkasem', name: 'เพชรเกษม' },
    { id: 'Praditmanutham', name: 'ประดิษฐ์มนูธรรม' },
    { id: 'Chiang Mai', name: 'เชียงใหม่' },
    { id: 'Phuket', name: 'ภูเก็ต' },
    { id: 'Prawet', name: 'ประเวศ' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
      fetchAllRequests(); // Fetch all for calendar
      if (currentUser.role === 'head') {
        setView('admin');
      } else {
        setView('dashboard');
      }
      // Pre-fill branch if user has one
      if (currentUser.branch) {
        setFormData(prev => ({ ...prev, branch: currentUser.branch! }));
        setCalendarBranchFilter(currentUser.branch);
      }
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const fetchRequests = async () => {
    if (!currentUser) return;
    const query = new URLSearchParams();
    query.append('userId', currentUser.id.toString());
    
    const res = await fetch(`/api/requests?${query.toString()}`);
    const data = await res.json();
    setRequests(data);
  };

  const fetchAllRequests = async () => {
    const res = await fetch('/api/requests'); // No filters = all
    const data = await res.json();
    setAllRequests(data);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setNotifications([]);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('An error occurred during login');
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setNotifications([]);
      } else {
        setLoginError(data.error || 'Signup failed');
      }
    } catch (err) {
      setLoginError('An error occurred during signup');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    if (!formData.branch) {
      setFormError('Please select a branch');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          ...formData,
          substituteId: formData.substituteId ? parseInt(formData.substituteId) : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      // Update current user with the new branch if returned
      if (data.updatedUser) {
        setCurrentUser(data.updatedUser);
      }

      setNotifications(prev => [`📧 Email sent to Head Vet: New request from ${currentUser?.name}`]);
      setView('dashboard');
      fetchRequests();
      fetchAllRequests();
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '17:00',
        reason: '',
        substituteId: '',
        branch: data.updatedUser?.branch || formData.branch
      });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproval = async (id: number, status: 'approved' | 'rejected') => {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminComment: status === 'approved' ? 'Approved by Head Vet' : 'Staff shortage' })
    });
    
    if (res.ok) {
      const req = requests.find(r => r.id === id);
      setNotifications(prev => [`📧 Email sent to ${req?.userName}: Request ${status}`]);
      fetchRequests();
      fetchAllRequests();
    }
  };

  // Calendar Logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const startDay = getDay(startOfMonth(currentMonth)); // 0 = Sunday

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-sky-400 rounded-2xl flex items-center justify-center text-white shadow-lg transform -rotate-6">
              <CalendarIcon size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">{isLoginView ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-slate-500 text-center mb-8">{isLoginView ? 'Sign in to manage your leave requests' : 'Join the team to manage your schedule'}</p>
          
          {isLoginView ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="doctor@vet.com"
                  className="w-full px-4 py-2.5 h-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 h-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <ShieldAlert size={16} />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={signupData.name}
                  onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                  placeholder="Dr. Name Surname"
                  className="w-full px-4 py-2.5 h-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                  placeholder="doctor@vet.com"
                  className="w-full px-4 py-2.5 h-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 h-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={signupData.role}
                    onChange={(e) => setSignupData({...signupData, role: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="vet">Veterinarian</option>
                    <option value="head">Head Vet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
                  <select
                    value={signupData.specialty}
                    onChange={(e) => setSignupData({...signupData, specialty: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="GP">GP</option>
                    <option value="Specialist">Specialist</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch (สาขา)</label>
                <select
                  value={signupData.branch}
                  onChange={(e) => setSignupData({...signupData, branch: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <ShieldAlert size={16} />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                Create Account
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setLoginError('');
              }}
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>

          {isLoginView && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center mb-4">Demo Accounts (Password: 1234)</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {users.slice(0, 3).map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setLoginEmail(u.email); setLoginPassword('1234'); }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center text-white">
              <CalendarIcon size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight">VetLeave</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs text-slate-500">{currentUser.specialty} • {branches.find(b => b.id === currentUser.branch)?.name || currentUser.branch}</p>
            </div>
            <button 
              onClick={() => setCurrentUser(null)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Notifications Toast Simulation */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
          <AnimatePresence>
            {notifications.map((note, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 pointer-events-auto"
              >
                <Send size={16} className="text-green-400" />
                {note}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Actions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Current Branch</p>
                  <p className="font-medium text-slate-800">{branches.find(b => b.id === currentUser.branch)?.name || currentUser.branch}</p>
                </div>
                <button
                  onClick={() => setView('form')}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors",
                    view === 'form' 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <CalendarIcon size={18} />
                  Request Leave
                </button>
                <button
                  onClick={() => setView('dashboard')}
                  className={cn(
                    "w-full mt-3 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors",
                    view === 'dashboard' 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <FileSpreadsheet size={18} />
                  My Requests
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={cn(
                    "w-full mt-3 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors",
                    view === 'calendar' 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <CalendarIcon size={18} />
                  View Schedule
                </button>
                
                {currentUser.role === 'head' && (
                  <button
                    onClick={() => setView('admin')}
                    className={cn(
                      "w-full mt-3 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors",
                      view === 'admin' 
                        ? "bg-indigo-600 text-white shadow-md" 
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <ShieldAlert size={18} />
                    Admin Dashboard
                  </button>
                )}
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-indigo-900 font-semibold flex items-center gap-2 mb-2">
                  <ShieldAlert size={18} />
                  GP Coverage Rule
                </h3>
                <p className="text-sm text-indigo-700 leading-relaxed">
                  System automatically checks ensuring at least <strong>1 GP</strong> is on duty during your requested slot.
                </p>
              </div>
            </div>

            {/* Right Column: Content */}
            <div className="lg:col-span-2">
              {view === 'form' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
                >
                  <h2 className="text-2xl font-bold mb-6">New Leave Request</h2>
                  
                  {formError && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3">
                      <ShieldAlert className="shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-semibold">Request Blocked</p>
                        <p className="text-sm opacity-90">{formError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Branch (สาขา)</label>
                        <select
                          value={formData.branch}
                          onChange={e => setFormData({...formData, branch: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="">-- Select Branch --</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                        <input
                          type="time"
                          required
                          value={formData.startTime}
                          onChange={e => setFormData({...formData, startTime: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                        <input
                          type="time"
                          required
                          value={formData.endTime}
                          onChange={e => setFormData({...formData, endTime: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Leave</label>
                      <textarea
                        required
                        rows={3}
                        value={formData.reason}
                        onChange={e => setFormData({...formData, reason: e.target.value})}
                        placeholder="e.g. Personal errand, Medical appointment..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Substitute Doctor</label>
                      <select
                        value={formData.substituteId}
                        onChange={e => setFormData({...formData, substituteId: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        disabled={!formData.branch}
                      >
                        <option value="">-- Select a substitute (Optional) --</option>
                        {users.filter(u => u.id !== currentUser.id && u.branch === formData.branch).map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.specialty})</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400 mt-1">
                        {formData.branch 
                          ? `Only showing doctors from ${branches.find(b => b.id === formData.branch)?.name}`
                          : 'Please select a branch first'}
                      </p>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                      >
                        {isSubmitting ? 'Checking Coverage...' : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {view === 'dashboard' && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold mb-6">My Requests</h2>
                  {requests.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <p className="text-slate-400">No leave requests found.</p>
                    </div>
                  ) : (
                    requests.map(req => (
                      <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-bold text-lg text-slate-700">{format(new Date(req.date), 'MMM dd, yyyy')}</span>
                            <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1">
                              <Clock size={12} /> {req.startTime} - {req.endTime}
                            </span>
                          </div>
                          <p className="text-slate-600 mb-1">{req.reason}</p>
                          {req.substituteName && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <UserIcon size={12} /> Sub: {req.substituteName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusBadge status={req.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {view === 'calendar' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
                    
                    <div className="flex items-center gap-4">
                      <select
                        value={calendarBranchFilter}
                        onChange={(e) => setCalendarBranchFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="all">All Branches</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>

                      <select
                        value={calendarFilter}
                        onChange={(e) => setCalendarFilter(e.target.value as any)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="all">All Specialties</option>
                        <option value="GP">GP Only</option>
                        <option value="Specialist">Specialist Only</option>
                      </select>

                      <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={20} /></button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-medium text-slate-500">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: startDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-24 bg-slate-50 rounded-lg" />
                    ))}
                    {daysInMonth.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayRequests = allRequests.filter(r => {
                        if (r.date !== dayStr || r.status === 'rejected') return false;
                        if (calendarFilter !== 'all' && r.userSpecialty !== calendarFilter) return false;
                        if (calendarBranchFilter !== 'all' && r.userBranch !== calendarBranchFilter) return false;
                        return true;
                      });
                      
                      return (
                        <div 
                          key={dayStr} 
                          className={cn(
                            "h-24 p-2 rounded-lg border border-slate-100 bg-white hover:border-indigo-200 transition-colors relative overflow-y-auto custom-scrollbar",
                            isToday(day) && "ring-2 ring-indigo-500 ring-offset-2"
                          )}
                          onClick={() => {
                            setSelectedDate(day);
                            setIsDayDetailOpen(true);
                          }}
                        >
                          <div className="text-sm font-medium text-slate-700 mb-1 sticky top-0 bg-white/90 backdrop-blur-sm z-10 w-full">{format(day, 'd')}</div>
                          <div className="space-y-1">
                            {dayRequests.map(req => (
                              <div 
                                key={req.id} 
                                className={cn(
                                  "text-[10px] px-1 rounded truncate cursor-pointer hover:opacity-80",
                                  req.status === 'approved' 
                                    ? "bg-green-50 text-green-700 font-medium" 
                                    : "bg-red-50 text-red-700"
                                )}
                              >
                                {req.userName}
                                {req.status === 'approved' && req.substituteName && (
                                  <span className="opacity-75"> - {req.substituteName} (sub)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Day Detail Modal */}
                  <AnimatePresence>
                    {isDayDetailOpen && selectedDate && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                              {format(selectedDate, 'MMMM d, yyyy')}
                            </h3>
                            <button 
                              onClick={() => setIsDayDetailOpen(false)}
                              className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          
                          <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {allRequests.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd') && r.status !== 'rejected' && (calendarBranchFilter === 'all' || r.userBranch === calendarBranchFilter)).length === 0 ? (
                              <div className="text-center py-8 text-slate-500">
                                No leave requests for this day.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {allRequests
                                  .filter(r => r.date === format(selectedDate, 'yyyy-MM-dd') && r.status !== 'rejected' && (calendarBranchFilter === 'all' || r.userBranch === calendarBranchFilter))
                                  .map(req => (
                                    <div key={req.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-slate-900">{req.userName}</span>
                                        <StatusBadge status={req.status} />
                                      </div>
                                      <div className="text-sm text-slate-600 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <Clock size={14} className="text-slate-400" />
                                          {req.startTime} - {req.endTime}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <UserIcon size={14} className="text-slate-400" />
                                          {req.userSpecialty} • {branches.find(b => b.id === req.userBranch)?.name || req.userBranch}
                                        </div>
                                        {req.substituteName && (
                                          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                                            Substitute: {req.substituteName}
                                          </div>
                                        )}
                                        {req.reason && (
                                          <div className="text-xs text-slate-500 italic mt-1">
                                            "{req.reason}"
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => {
                                setFormData({ ...formData, date: format(selectedDate, 'yyyy-MM-dd') });
                                setIsDayDetailOpen(false);
                                setView('form');
                              }}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                              Request Leave for this Day
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {view === 'admin' && currentUser.role === 'head' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                      <FileSpreadsheet size={16} />
                      Google Sheets Synced
                    </div>
                  </div>

                  {/* Google Sheets Mimic View */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
                    <div className="bg-green-50 border-b border-green-100 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white">
                          <FileSpreadsheet size={18} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-900">
                            Leave_Requests_{currentUser.branch ? branches.find(b => b.id === currentUser.branch)?.name : 'All'}_{adminYearFilter}
                          </h3>
                          <p className="text-xs text-green-700">Last synced: Just now</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <select 
                          value={adminMonthFilter}
                          onChange={(e) => setAdminMonthFilter(parseInt(e.target.value))}
                          className="px-3 py-1.5 text-sm rounded-lg border border-green-200 text-green-800 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        >
                          {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i} value={i}>{format(new Date(2000, i, 1), 'MMMM')}</option>
                          ))}
                        </select>
                        <select 
                          value={adminYearFilter}
                          onChange={(e) => setAdminYearFilter(parseInt(e.target.value))}
                          className="px-3 py-1.5 text-sm rounded-lg border border-green-200 text-green-800 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        >
                          {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Submitted At</th>
                            <th className="px-6 py-3">Doctor</th>
                            <th className="px-6 py-3">Branch</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3">Substitute</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allRequests
                            .filter(req => {
                              if (currentUser.branch && req.userBranch !== currentUser.branch) return false;
                              const reqDate = new Date(req.date);
                              return reqDate.getMonth() === adminMonthFilter && reqDate.getFullYear() === adminYearFilter;
                            })
                            .map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-slate-400">#{req.id}</td>
                              <td className="px-6 py-4 text-slate-500 text-xs">
                                {req.createdAt ? format(new Date(req.createdAt), 'MMM dd, HH:mm') : '-'}
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-900">
                                {req.userName}
                                <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{req.userSpecialty}</span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {branches.find(b => b.id === req.userBranch)?.name || req.userBranch}
                              </td>
                              <td className="px-6 py-4">{req.date}</td>
                              <td className="px-6 py-4">{req.startTime} - {req.endTime}</td>
                              <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                              <td className="px-6 py-4 text-slate-500">{req.substituteName || '-'}</td>
                              <td className="px-6 py-4">
                                <StatusBadge status={req.status} />
                              </td>
                              <td className="px-6 py-4 text-right">
                                {req.status === 'pending' && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleApproval(req.id, 'approved')}
                                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                      title="Approve"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleApproval(req.id, 'rejected')}
                                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                      title="Reject"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Removed old separate blocks for vet and head */}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };
  
  const icons = {
    pending: Clock,
    approved: Check,
    rejected: X
  };

  const Icon = icons[status as keyof typeof icons];

  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit", styles[status as keyof typeof styles])}>
      <Icon size={12} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
