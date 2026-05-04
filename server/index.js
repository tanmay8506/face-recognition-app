require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knexConfig = require('./knexfile').development;

const db = knex(knexConfig);
const app = express();

app.use(cors());
app.use(express.json());

// 🔐 AUTH MIDDLEWARE
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// 🟢 REGISTER
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [user] = await db('users')
            .insert({ name, email, password: hashedPassword })
            .returning(['id', 'name', 'email', 'entries', 'joined']);
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ user, token });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// 🟢 SIGN IN
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    try {
        const user = await db('users').where({ email }).first();
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, name: user.name, email: user.email, entries: user.entries, joined: user.joined }, token });
    } catch {
        res.status(500).json({ error: 'Server error during sign in' });
    }
});

// 🟢 PROFILE (Protected)
app.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await db('users').where({ id: req.userId }).first();
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: { id: user.id, name: user.name, email: user.email, entries: user.entries, joined: user.joined } });
    } catch {
        res.status(500).json({ error: 'Server error' });
    }
});

// 🤖 FACE DETECTION (Clarifai v2 — PAT Authentication)
app.post('/image', authenticate, async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });

    const PAT = process.env.CLARIFAI_PAT || process.env.CLARIFAI_API_KEY;

    try {
        // Full URL with user/app in path — most reliable approach
        const clarifaiUrl = 'https://api.clarifai.com/v2/users/clarifai/apps/main/models/face-detection/outputs';

        const clarifaiRes = await fetch(clarifaiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: [{ data: { image: { url: imageUrl } } }]
            })
        });

        const clarifaiData = await clarifaiRes.json();
        console.log('Clarifai response status:', JSON.stringify(clarifaiData.status));

        if (clarifaiData.status.code !== 10000) {
            console.error('Clarifai API error details:', JSON.stringify(clarifaiData.status));
            return res.status(400).json({ error: clarifaiData.status.description || 'Clarifai API error' });
        }

        const regions = clarifaiData.outputs[0].data.regions || [];
        const boxes = regions.map(r => r.region_info.bounding_box);

        const [updatedUser] = await db('users')
            .where({ id: req.userId })
            .increment('entries', 1)
            .returning(['id', 'name', 'email', 'entries', 'joined']);

        res.json({ boxes, entries: updatedUser.entries });
    } catch (err) {
        console.error('Clarifai error:', err);
        res.status(500).json({ error: 'Face detection failed' });
    }
});

// 🔍 TEMP TEST ROUTE (Remove after verification)
app.get('/test-clarifai', async (req, res) => {
    const PAT = process.env.CLARIFAI_PAT || process.env.CLARIFAI_API_KEY;
    try {
        const clarifaiUrl = 'https://api.clarifai.com/v2/users/clarifai/apps/main/models/face-detection/outputs';
        const r = await fetch(clarifaiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: [{ data: { image: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' } } }]
            })
        });
        const d = await r.json();
        res.json({ status: d.status, patLoaded: !!PAT });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 🟢 ROOT
app.get('/', (req, res) => res.json({ message: 'SmartBrain API running', db: 'connected' }));

// ✅ DB CONNECTION TEST
db.raw('SELECT 1+1 AS result')
    .then(() => console.log('✅ PostgreSQL connected'))
    .catch(err => console.error('❌ DB connection failed:', err.message));

const PORT = process.env.PORT || 3001;
// 🛡️ Global Error Handler (catches unhandled rejections & sync errors)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));