// =========== STATE ===========
let currentUser = null;
let currentResults = null;
let selectedFile = null;

const API = '';

// =========== INIT ===========
document.addEventListener('DOMContentLoaded', () => {
    // Check localStorage for existing session
    const saved = localStorage.getItem('jobfinder_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateAuthUI();
    }

    // Setup dropzone
    setupDropzone();

    // Animate stat counters
    animateCounters();
});

// =========== NAVIGATION ===========
function showSection(id) {
    // If trying to access upload without login, redirect to login
    if (id === 'upload' && !currentUser) {
        id = 'login';
    }

    // Hide ALL sections — clear both class and inline style
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        el.style.display = 'flex';
    }

    // Re-trigger animations
    if (id === 'hero') animateCounters();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleGetStarted() {
    if (currentUser) {
        showSection('upload');
    } else {
        showSection('signup');
    }
}

// =========== AUTH ===========
async function handleSignup(e) {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');
    const err = document.getElementById('signupError');
    err.textContent = '';

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (password.length < 6) {
        err.textContent = 'Password must be at least 6 characters';
        return;
    }

    btn.innerHTML = '<span>Creating account...</span>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            err.textContent = data.error || 'Signup failed';
            return;
        }

        currentUser = data.user;
        localStorage.setItem('jobfinder_user', JSON.stringify(currentUser));
        updateAuthUI();
        showSection('upload');

    } catch (error) {
        err.textContent = 'Network error. Please try again.';
    } finally {
        btn.innerHTML = '<span>Create Account</span>';
        btn.disabled = false;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginError');
    err.textContent = '';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    btn.innerHTML = '<span>Logging in...</span>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            err.textContent = data.error || 'Login failed';
            return;
        }

        currentUser = data.user;
        localStorage.setItem('jobfinder_user', JSON.stringify(currentUser));
        updateAuthUI();
        showSection('upload');

    } catch (error) {
        err.textContent = 'Network error. Please try again.';
    } finally {
        btn.innerHTML = '<span>Log In</span>';
        btn.disabled = false;
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('jobfinder_user');
    updateAuthUI();
    showSection('hero');
}

function updateAuthUI() {
    const authDiv = document.getElementById('navAuth');
    const userDiv = document.getElementById('navUser');
    const greeting = document.getElementById('userGreeting');

    if (currentUser) {
        authDiv.style.display = 'none';
        userDiv.style.display = 'flex';
        greeting.textContent = `Hey, ${currentUser.name.split(' ')[0]}!`;
    } else {
        authDiv.style.display = 'flex';
        userDiv.style.display = 'none';
    }
}

// =========== DROPZONE ===========
function setupDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            handleFile(file);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    selectedFile = file;
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const analyzeBtn = document.getElementById('analyzeBtn');

    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    analyzeBtn.style.display = 'inline-flex';

    // Visual feedback on dropzone
    const dropzone = document.getElementById('dropzone');
    dropzone.style.borderColor = 'var(--accent)';
    dropzone.style.background = 'rgba(99, 102, 241, 0.04)';
}

function removeFile() {
    selectedFile = null;
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('analyzeBtn').style.display = 'none';
    document.getElementById('fileInput').value = '';

    const dropzone = document.getElementById('dropzone');
    dropzone.style.borderColor = '';
    dropzone.style.background = '';
}

// =========== ANALYZE ===========
async function analyzeResume() {
    if (!selectedFile) return;

    // Show loading
    showSection('loading');

    const loadingSteps = [
        'Extracting text from PDF...',
        'Identifying skills and keywords...',
        'Running semantic analysis...',
        'Computing TF-IDF similarity scores...',
        'Ranking job matches...',
        'Finalizing results...'
    ];

    const bar = document.getElementById('loadingBarFill');
    const stepEl = document.getElementById('loadingStep');

    // Animate loading steps
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
        if (stepIndex < loadingSteps.length) {
            stepEl.textContent = loadingSteps[stepIndex];
            bar.style.width = `${((stepIndex + 1) / loadingSteps.length) * 80}%`;
            stepIndex++;
        }
    }, 600);

    try {
        const formData = new FormData();
        formData.append('resume', selectedFile);

        const res = await fetch(`${API}/api/upload-resume`, {
            method: 'POST',
            body: formData
        });

        clearInterval(stepInterval);
        bar.style.width = '100%';
        stepEl.textContent = 'Done!';

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Failed to process resume');
            showSection('upload');
            return;
        }

        currentResults = data;

        // Short delay for UX
        setTimeout(() => {
            renderResults(data);
            showSection('results');
        }, 500);

    } catch (error) {
        clearInterval(stepInterval);
        alert('Network error. Please try again.');
        showSection('upload');
    }
}

// =========== RESULTS ===========
function renderResults(data) {
    // Summary
    document.getElementById('resultsSummary').textContent =
        `Found ${data.matchedJobs.length} relevant matches from ${data.totalJobs} jobs based on ${data.skills.length} detected skills`;

    // Skills
    const skillsTags = document.getElementById('skillsTags');
    skillsTags.innerHTML = data.skills.map(s =>
        `<span class="skill-tag">${s}</span>`
    ).join('');

    // Count
    document.getElementById('resultsCount').textContent =
        `Showing ${data.matchedJobs.length} of ${data.totalJobs} jobs`;

    // Job cards
    renderJobCards(data.matchedJobs);
}

function renderJobCards(jobs) {
    const grid = document.getElementById('jobsGrid');
    grid.innerHTML = jobs.map((job, i) => {
        const matchClass = job.matchPercentage >= 70 ? 'high' :
            job.matchPercentage >= 40 ? 'medium' : 'low';

        const skillsHtml = job.skills.map(s => {
            const isMatched = job.matchedSkills.some(ms => ms.toLowerCase() === s.toLowerCase());
            return `<span class="job-skill ${isMatched ? 'matched' : ''}">${s}</span>`;
        }).join('');

        return `
      <div class="job-card" style="animation-delay: ${i * 0.05}s">
        <div class="job-card-top">
          <div>
            <div class="job-title">${job.title}</div>
            <div class="job-company">${job.company}</div>
          </div>
          <span class="match-badge ${matchClass}">${job.matchPercentage}% Match</span>
        </div>
        <div class="job-meta">
          <span class="job-meta-item">
            <svg fill="none" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
            ${job.location}
          </span>
          <span class="job-meta-item">
            <svg fill="none" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${job.salary}
          </span>
          <span class="job-meta-item">
            <svg fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" stroke-width="2"/></svg>
            ${job.type}
          </span>
        </div>
        <div class="job-desc">${job.description}</div>
        <div class="job-skills">${skillsHtml}</div>
      </div>
    `;
    }).join('');
}

function sortResults() {
    if (!currentResults) return;

    const sort = document.getElementById('sortSelect').value;
    let sorted = [...currentResults.matchedJobs];

    if (sort === 'relevance') {
        sorted.sort((a, b) => b.matchPercentage - a.matchPercentage);
    } else if (sort === 'salary') {
        sorted.sort((a, b) => {
            const getSalary = s => parseInt(s.replace(/[^0-9]/g, '')) || 0;
            return getSalary(b.salary) - getSalary(a.salary);
        });
    } else if (sort === 'recent') {
        sorted.sort((a, b) => new Date(b.posted) - new Date(a.posted));
    }

    renderJobCards(sorted);
}

// =========== COUNTER ANIMATION ===========
function animateCounters() {
    document.querySelectorAll('.stat-num').forEach(el => {
        const target = parseInt(el.dataset.count) || 0;
        let current = 0;
        const increment = target / 40;
        const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            el.textContent = Math.round(current);
        }, 40);
    });
}
