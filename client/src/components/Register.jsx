import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, user } = useAuth();

    if (user) navigate('/home');

    const onRegister = async () => {
        if (!name || !email || !password) return toast.error('Please fill in all fields');
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');
            login(data.user, data.token);
            toast.success('Account created successfully');
            navigate('/home');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="glass-card w-full max-w-xl p-8 lg:p-10">
                <h1 className="text-3xl lg:text-4xl font-bold text-center mb-2">Create Account</h1>
                <p className="text-slate-400 text-center mb-8 text-base lg:text-lg">Join SmartBrain and start detecting</p>
                <div className="space-y-5">
                    <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
                        <input aria-label="Full name" className="input-field pl-14 pr-5 h-12 lg:h-14 text-base lg:text-lg" type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
                        <input aria-label="Email address" className="input-field pl-14 pr-5 h-12 lg:h-14 text-base lg:text-lg" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
                        <input aria-label="Password" className="input-field pl-14 pr-5 h-12 lg:h-14 text-base lg:text-lg" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button aria-label="Create account" onClick={onRegister} disabled={loading} className="btn-primary w-full h-12 lg:h-14 flex items-center justify-center gap-2 text-base lg:text-lg mt-2">
                        {loading ? 'Creating...' : <><UserPlus className="w-5 h-5" /> Register</>}
                    </button>
                </div>
                <p className="text-center mt-8 text-sm lg:text-base text-slate-400">
                    Already have an account?{' '}
                    <span onClick={() => navigate('/signin')} className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium transition-colors">Sign In</span>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;