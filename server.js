const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { extractSkills, matchJobs } = require('./matcher');
const jobs = require('./jobs.json');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// --- Auth: local JSON file storage ---
const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        }
    } catch (e) { /* ignore */ }
    return [];
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Signup
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const users = loadUsers();
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name,
        email,
        password, // In production, hash this!
        createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email }
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = loadUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email }
    });
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
    res.json(jobs);
});

// Upload resume and match
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Parse PDF
        const pdfData = await pdfParse(req.file.buffer);
        const resumeText = pdfData.text;

        if (!resumeText || resumeText.trim().length < 20) {
            return res.status(400).json({ error: 'Could not extract text from PDF. Try a different resume.' });
        }

        // Extract skills
        const skills = extractSkills(resumeText);

        // Match jobs
        const matchedJobs = matchJobs(resumeText, jobs);

        res.json({
            success: true,
            resumeText: resumeText.substring(0, 500) + '...',
            skills,
            totalJobs: jobs.length,
            matchedJobs: matchedJobs.slice(0, 20) // Top 20 matches
        });

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to process resume. Please try again.' });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 JobFinder server running at http://localhost:${PORT}\n`);
});
