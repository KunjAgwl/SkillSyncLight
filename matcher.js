const natural = require('natural');
const TfIdf = natural.TfIdf;

// Common skill keywords for extraction
const SKILL_KEYWORDS = [
  // Programming Languages
  'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'golang', 'rust', 'swift',
  'kotlin', 'typescript', 'php', 'scala', 'r', 'matlab', 'perl', 'bash', 'powershell',
  'solidity', 'vhdl', 'vba', 'sql', 'html', 'css', 'sass', 'less',

  // Frameworks & Libraries
  'react', 'angular', 'vue', 'svelte', 'next.js', 'nextjs', 'node.js', 'nodejs', 'express',
  'django', 'flask', 'spring', 'rails', 'laravel', 'flutter', 'react native', 'swiftui',
  'uikit', 'jetpack compose', 'jquery', 'bootstrap', 'tailwind', 'redux', 'graphql',
  'webpack', 'vite', 'jest', 'cypress', 'selenium', 'playwright',

  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible',
  'jenkins', 'ci/cd', 'github actions', 'gitlab', 'linux', 'nginx', 'apache',

  // Databases
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
  'sqlite', 'oracle', 'sql server', 'firebase', 'snowflake', 'neo4j',

  // Data & ML
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas',
  'numpy', 'nlp', 'natural language processing', 'computer vision', 'data visualization',
  'tableau', 'power bi', 'apache spark', 'hadoop', 'airflow', 'kafka', 'dbt',
  'statistics', 'data modeling', 'etl', 'bert', 'gpt', 'transformers', 'hugging face',

  // Design
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'indesign', 'canva',
  'wireframing', 'prototyping', 'user research', 'design systems', 'ui/ux', 'ui', 'ux',
  'accessibility', 'typography', 'branding', 'color theory',

  // Tools & Platforms
  'git', 'github', 'jira', 'confluence', 'slack', 'postman', 'vs code', 'xcode',
  'android studio', 'unity', 'unreal engine', 'solidworks', 'autocad', 'revit',
  'salesforce', 'hubspot', 'wordpress', 'shopify',

  // Methodologies
  'agile', 'scrum', 'kanban', 'devops', 'microservices', 'rest api', 'api design',
  'system design', 'architecture', 'tdd', 'bdd', 'pair programming',

  // Soft Skills & Domain
  'communication', 'leadership', 'project management', 'problem solving', 'teamwork',
  'analytics', 'a/b testing', 'seo', 'sem', 'content marketing', 'email marketing',
  'social media', 'copywriting', 'financial modeling', 'accounting', 'compliance',
  'patient care', 'nursing', 'pharmacy', 'culinary', 'legal',

  // Engineering
  'pcb design', 'embedded systems', 'rtos', 'iot', 'arm', 'fpga', 'signal processing',
  'fea', '3d printing', 'manufacturing', 'cad', 'gis', 'structural analysis',

  // Certifications & Misc
  'aws certified', 'cissp', 'ceh', 'pmp', 'cpa', 'cfa', 'pe license', 'leed',
  'sre', 'monitoring', 'incident management', 'security', 'networking', 'performance',
  'multiplayer', 'game design', 'blockchain', 'defi', 'web3', 'smart contracts',
  'cryptography', 'cybersecurity', 'penetration testing', 'firewall',

  // Business & Operations
  'excel', 'powerpoint', 'microsoft office', 'forecasting', 'inventory management',
  'supply chain', 'operations', 'process improvement', 'risk management',
  'cost control', 'cost optimization', 'budgeting',

  // Science & Healthcare  
  'molecular biology', 'pcr', 'crispr', 'cell culture', 'bioinformatics',
  'lab techniques', 'scientific writing', 'research', 'environmental science',
  'food safety', 'nutrition', 'menu development'
];

function extractSkills(text) {
  const lowerText = text.toLowerCase();
  const foundSkills = [];

  for (const skill of SKILL_KEYWORDS) {
    // Use word boundary matching for short skills
    if (skill.length <= 2) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText)) {
        foundSkills.push(skill);
      }
    } else {
      if (lowerText.includes(skill)) {
        foundSkills.push(skill);
      }
    }
  }

  // Capitalize skills for display
  return [...new Set(foundSkills)].map(s => {
    // Handle acronyms and special cases
    const upper = ['aws', 'gcp', 'sql', 'html', 'css', 'api', 'ci/cd', 'seo', 'sem',
      'nlp', 'ui', 'ux', 'etl', 'dbt', 'cad', 'gis', 'iot', 'sre', 'vba',
      'fpga', 'pcr', 'fea', 'rtos', 'vhdl', 'cpa', 'cfa', 'pmp'];
    if (upper.includes(s)) return s.toUpperCase();
    
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  });
}

function matchJobs(resumeText, jobs) {
  const tfidf = new TfIdf();

  // Add resume as document 0
  tfidf.addDocument(resumeText.toLowerCase());

  // Add each job as a document
  jobs.forEach(job => {
    const jobText = [
      job.title,
      job.description,
      job.requirements,
      job.skills.join(' ')
    ].join(' ').toLowerCase();
    tfidf.addDocument(jobText);
  });

  // Get all terms from resume
  const resumeTerms = [];
  tfidf.listTerms(0).forEach(item => {
    resumeTerms.push({ term: item.term, tfidf: item.tfidf });
  });

  // Score each job based on shared terms with resume
  const results = jobs.map((job, index) => {
    let score = 0;
    const jobDocIndex = index + 1;

    resumeTerms.forEach(({ term }) => {
      const resumeScore = tfidf.tfidf(term, 0);
      const jobScore = tfidf.tfidf(term, jobDocIndex);
      score += resumeScore * jobScore;
    });

    // Also check direct skill matches
    const resumeSkills = extractSkills(resumeText);
    const matchedSkills = job.skills.filter(skill =>
      resumeSkills.some(rs => rs.toLowerCase() === skill.toLowerCase())
    );
    
    // Boost score by matched skills
    score += matchedSkills.length * 5;

    return {
      ...job,
      score: score,
      matchedSkills: matchedSkills,
      matchPercentage: 0
    };
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Normalize to percentage (0-100)
  const maxScore = results[0]?.score || 1;
  results.forEach(r => {
    r.matchPercentage = Math.min(99, Math.round((r.score / maxScore) * 95 + Math.random() * 5));
    if (r.matchPercentage < 5) r.matchPercentage = Math.round(Math.random() * 10 + 5);
  });

  return results;
}

module.exports = { extractSkills, matchJobs };
