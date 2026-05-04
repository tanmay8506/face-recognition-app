import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, LogOut, Image as ImageIcon, ScanFace, Zap, Shield, Cpu, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const isValidUrl = (string) => {
    try { new URL(string); return true; } catch { return false; }
};

const AppContainer = () => {
    const [input, setInput] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [boxes, setBoxes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [imgError, setImgError] = useState(false);
    const navigate = useNavigate();
    const { user, updateUser, logout, handleUnauthorized } = useAuth();

    const onButtonSubmit = async () => {
        if (!input.trim()) return toast.error('Please enter an image URL');
        if (!isValidUrl(input)) return toast.error('Invalid URL format. Paste a direct image link.');

        setLoading(true);
        setBoxes([]);
        setImgError(false);

        const prevEntries = user?.entries || 0;
        updateUser({ entries: prevEntries + 1 });

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ imageUrl: input })
            });
            const data = await res.json();

            if (res.status === 401) { handleUnauthorized(); return; }
            if (!res.ok) {
                updateUser({ entries: prevEntries });
                throw new Error(data.error || 'Detection failed');
            }

            setImageUrl(input);
            setBoxes(data.boxes);
            updateUser({ entries: data.entries });
            toast.success(`${data.boxes.length} face(s) detected`);
        } catch (err) {
            updateUser({ entries: prevEntries });
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => { logout(); navigate('/signin'); };

    return (
        <div className="min-h-screen flex flex-col">
            <nav className="glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Brain className="w-7 h-7 text-blue-400" />
                    <h1 className="text-xl lg:text-2xl font-bold tracking-tight">SmartBrain</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-medium text-white">{user?.name || 'User'}</span>
                        <span className="text-xs text-slate-400">Entries: {user?.entries || 0}</span>
                    </div>
                    <button onClick={handleSignOut} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
                        <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </nav>

            <main className="flex-1 flex flex-col items-center p-4 lg:p-8 gap-10">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center space-y-4 max-w-2xl">
                    <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight">AI Face Detection</h2>
                    <p className="text-slate-400 text-base lg:text-lg">Paste any image URL and let our AI instantly locate and highlight faces.</p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-300 text-xs font-medium border border-blue-500/20"><Zap className="w-3.5 h-3.5" /> Lightning Fast</span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 text-xs font-medium border border-purple-500/20"><Cpu className="w-3.5 h-3.5" /> AI Powered</span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-medium border border-emerald-500/20"><Shield className="w-3.5 h-3.5" /> Secure & Private</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.3 }} className="glass-card w-full max-w-3xl p-5 lg:p-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
                            <input aria-label="Image URL" className="input-field pl-14 pr-5 h-12 lg:h-14 text-base lg:text-lg" type="url" placeholder="https://example.com/photo.jpg" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && onButtonSubmit()} />
                        </div>
                        <button aria-label="Detect faces" onClick={onButtonSubmit} disabled={loading} className="btn-primary flex items-center justify-center gap-2 md:w-auto w-full h-12 lg:h-14 text-base lg:text-lg px-8">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing...
                                </span>
                            ) : (
                                <><ScanFace className="w-5 h-5" /> Detect Faces</>
                            )}
                        </button>
                    </div>
                </motion.div>

                {imageUrl && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-3 sm:p-4 max-w-4xl w-full mx-auto"
                    >
                        <div className="relative inline-block max-w-full max-h-[50vh] sm:max-h-[60vh] mx-auto overflow-hidden rounded-xl bg-slate-900/40">
                            <img
                                src={imageUrl}
                                alt="Detection target"
                                loading="lazy"
                                className="block max-w-full max-h-[50vh] sm:max-h-[60vh] w-auto h-auto object-contain rounded-xl"
                                onError={() => setImgError(true)}
                            />
                            {imgError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 rounded-xl text-center p-4">
                                    <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                                    <p className="text-sm text-slate-300">Image failed to load. Check the URL or try another link.</p>
                                </div>
                            )}
                            {!imgError && boxes.map((box, i) => (
                                <div
                                    key={i}
                                    className="absolute border-2 border-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)] pointer-events-none rounded-sm"
                                    style={{
                                        top: `${box.top_row * 100}%`,
                                        bottom: `${(1 - box.bottom_row) * 100}%`,
                                        left: `${box.left_col * 100}%`,
                                        right: `${(1 - box.right_col) * 100}%`
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="w-full max-w-4xl mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    {[{ step: '1', title: 'Paste URL', desc: 'Drop any public image link into the input field.' }, { step: '2', title: 'AI Scans', desc: 'Our model detects facial landmarks in milliseconds.' }, { step: '3', title: 'View Results', desc: 'See highlighted faces and track your detection count.' }].map((item) => (
                        <div key={item.step} className="p-5 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">{item.step}</div>
                            <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                            <p className="text-sm text-slate-400">{item.desc}</p>
                        </div>
                    ))}
                </motion.div>
            </main>
        </div>
    );
};

export default AppContainer;