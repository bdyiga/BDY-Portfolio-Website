/**
 * Single source of truth for every word of portfolio content.
 * Sourced from the previous site (bdyiga.github.io/BDY-Portfolio-Website) and
 * "Yiga Benedict, Resume 2026.pdf". Do not add facts that are not in those sources.
 */

const BASE = import.meta.env.BASE_URL

export const profile = {
  name: 'Benedict Deogratius Yiga',
  shortName: 'Benedict Yiga',
  initials: 'BDY',
  tagline: 'Engineering Beyond the Try Line.',
  roles: ['Software Engineer', 'AI Enthusiast', 'Problem Solver'],
  headline: 'Building AI-powered solutions.',
  photo: `${BASE}bdy-portrait.webp`,
  resumeUrl: `${BASE}Yiga Benedict, Resume 2026.pdf`,
  email: 'yigabenedict5@gmail.com',
  phone: '(812) 650-8891',
  linkedin: 'https://www.linkedin.com/in/bdyiga',
  github: 'https://github.com/bdyiga',
  availability:
    'Graduating May 2027. Open to internships in Software Engineering, AI/ML, and Technology Consulting.',
  rugbyIntro:
    'On the field, every play requires strategy, teamwork, and execution. I bring that same mindset to engineering intelligent solutions.',
  bio: [
    'A Computer Science student at Indiana University Bloomington with a strong passion for technology and innovation. I am particularly interested in Artificial Intelligence and Machine Learning and enjoy building intelligent systems that address real-world challenges.',
    "I'm fascinated by the potential of AI to transform how people live and work, and I strive to be part of that transformation. My goal is to reach my full potential while using technology, creativity, and continuous learning to make a meaningful impact on my community and society.",
  ],
  interests: ['Artificial Intelligence', 'Machine Learning', 'Data Science', 'Software Engineering', 'Rugby'],
}

export const education = {
  school: 'Indiana University Bloomington',
  college: 'Luddy School of Informatics, Computing & Engineering',
  degree: 'B.S. in Computer Science',
  specialization: 'Artificial Intelligence Specialization',
  minors: ['Business', 'Data Science'],
  gpa: '3.87 / 4.0',
  graduation: 'May 2027',
  honors: ["IT Consultant of the Month (Nov '24)", "Dean's List (5x)"],
  coursework: [
    'Data Structures',
    'Intro to Artificial Intelligence',
    'Principles of Machine Learning',
    'Data Analysis & Mining',
  ],
  certifications: ['AWS Certified Cloud Practitioner'],
}

export type Project = {
  id: string
  title: string
  short: string
  description: string
  tags: string[]
  period?: string
  link?: { label: string; url: string }
  github?: string
  badge?: string
  /** A rugby "play call" name used for the playbook framing. Decorative only. */
  play: string
}

export const projects: Project[] = [
  {
    id: 'avemenu',
    title: 'AveMenu',
    short: 'Full-stack restaurant management system.',
    description:
      'Full-stack restaurant management system with real-time order tracking and a RESTful API.',
    tags: ['JavaScript', 'Node.js', 'Express', 'REST APIs'],
    link: { label: 'Live site', url: 'https://bdyiga.github.io/AveMenu/' },
    play: 'Crash Ball',
  },
  {
    id: 'ld-debate',
    title: 'LD Debate Tournament Manager',
    short: 'AI-powered Lincoln-Douglas tournament manager.',
    description:
      'A full-stack, AI-powered app for managing Lincoln-Douglas debate brackets, scoring, and results, delivering AI judge feedback, structured prep briefs, and role-based access via Supabase Auth.',
    tags: ['React', 'Express', 'PostgreSQL', 'Google Gemini', 'Supabase'],
    period: 'Feb 2026 – Present',
    link: { label: 'Live app', url: 'https://lincoln-douglas-debate-app.vercel.app/' },
    play: 'Loop Play',
  },
  {
    id: 'eazyflow',
    title: 'EazyFlow',
    short: 'AI-driven traffic optimization.',
    description: 'AI-driven traffic system optimizing flow across 500+ smart intersections.',
    tags: ['Python', 'NumPy', 'scikit-learn', 'AI'],
    github: 'https://github.com/bdyiga/EazyFlow',
    play: 'Switch',
  },
  {
    id: 'pixelscout',
    title: 'PixelScout',
    short: 'CNN image classifier, 85% on CIFAR-10.',
    description:
      'CNN-based image classification system achieving 85% accuracy on CIFAR-10, reducing manual classification time through modular design and automated processing.',
    tags: ['Python', 'TensorFlow', 'Keras', 'CNN', 'NumPy', 'Matplotlib'],
    period: 'Jun 2024 – Mar 2025',
    github: 'https://github.com/bdyiga/PixelScout',
    play: 'Blindside',
  },
  {
    id: 'flippa',
    title: 'Flippa Memory Game',
    short: 'Tile-matching game in Java.',
    description: 'Interactive tile-matching memory game built in Java.',
    tags: ['Java', 'Game Dev'],
    link: { label: 'Play it', url: 'https://bdyiga.github.io/Flippa/' },
    play: 'Scissors',
  },
  {
    id: 'flappybird',
    title: 'FlappyBird',
    short: 'The classic mobile game, rebuilt.',
    description: 'A recreation of the classic mobile game.',
    tags: ['JavaScript', 'Game Dev'],
    link: { label: 'Play it', url: 'https://bdyiga.github.io/FlappyBird/' },
    play: 'Chip & Chase',
  },
  {
    id: 'aldi',
    title: 'ALDI AI Team Case Competition',
    short: 'Winner, BUS-K201, Indiana University.',
    description:
      'Performed a SWOT analysis and an operational audit of retail processes, developing AI-powered recommendations presented at ALDI HQ with a projected 4–8% sales boost.',
    tags: ['AI Strategy', 'SWOT Analysis', 'Consulting'],
    period: 'Jan 2024 – May 2024',
    badge: 'Winner',
    play: 'Lineout Drive',
  },
]

export type Experience = {
  id: string
  company: string
  shortName: string
  role: string
  location: string
  start: string
  end: string
  year: number
  responsibilities: string[]
  achievements: { value: string; label: string }[]
  tech: string[]
}

/** Chronological (kick-off to now). */
export const experiences: Experience[] = [
  {
    id: 'steel',
    company: 'Steel and Tube Industries Ltd.',
    shortName: 'Steel & Tube',
    role: 'Software Engineer Intern',
    location: 'Kampala, Uganda',
    start: 'Feb 2023',
    end: 'Jul 2023',
    year: 2023,
    responsibilities: [
      'Engineered Python software to automatically calculate optimal zinc coating weights, replacing manual processes in stainless steel manufacturing.',
      'Automated manufacturing processes with Python.',
    ],
    achievements: [{ value: '+10%', label: 'product quality & effectiveness' }],
    tech: ['Python', 'SAP ERP', 'E-Commerce'],
  },
  {
    id: 'uits',
    company: 'University Information Technology Services',
    shortName: 'IU UITS',
    role: 'IT Consultant Supervisor',
    location: 'Bloomington, IN',
    start: 'Oct 2024',
    end: 'Present',
    year: 2024,
    responsibilities: [
      'Leverage ServiceNow workflows and reporting dashboards to oversee campus technology infrastructure, enabling data-driven, proactive issue resolution.',
      'Coach and assess 25+ technical support consultants through structured weekly feedback.',
      'Optimize team deployment through capacity analysis.',
    ],
    achievements: [
      { value: '12,000+', label: 'tickets processed per month' },
      { value: '25+', label: 'consultants coached' },
      { value: '+8%', label: 'service delivery in 5 months' },
    ],
    tech: ['ServiceNow', 'Leadership', 'Data Analytics'],
  },
  {
    id: 'fwc',
    company: 'Future Wonder Co.',
    shortName: 'Future Wonder',
    role: 'AI Charioteer Intern',
    location: 'Bloomington, IN',
    start: 'Jun 2025',
    end: 'Aug 2025',
    year: 2025,
    responsibilities: [
      'Led a development team using Agile workflows to engineer custom AI-supported reporting software in Python, deployed via AWS Lambda with Docker containerization and 3 REST APIs.',
      'Integrated GitLab, Clockify, and Slack into the reporting workflow.',
      'Evaluated emerging AI tooling like Cursor and Windsurf for code generation, review, and unit testing, and authored AI-assisted coding guidelines adopted team-wide.',
    ],
    achievements: [
      { value: '3–4h → 30m', label: 'weekly reporting work' },
      { value: '−15%', label: 'merge request review time' },
      { value: '3', label: 'REST APIs deployed on AWS Lambda' },
    ],
    tech: ['Python', 'AWS Lambda', 'Docker', 'REST APIs', 'Prompt Engineering', 'Agile', 'GitLab'],
  },
  {
    id: 'elanco',
    company: 'Elanco Animal Health',
    shortName: 'Elanco',
    role: 'IT Junior Engineer Intern',
    location: 'Indianapolis, IN',
    start: 'May 2026',
    end: 'Aug 2026',
    year: 2026,
    responsibilities: [
      'Built and shipped an Azure Databricks lakehouse pipeline ingesting daily FX rates from SAP, normalizing ratio-scaled raw values into model-ready rates.',
      'Surfaced the rates through a self-service dashboard and a custom AI/BI Genie space for natural-language analysis, both now in production use by the Finance FX modeling team.',
      'Prototyped an SAP Build Process Automation POC for accrual journal entries, orchestrating Document Information Extraction (DOX), Power Query transformation, and approval routing to post directly into S/4HANA.',
    ],
    achievements: [
      { value: '4h → 20m', label: 'monthly reporting effort (−90%)' },
      { value: '30m → 3m', label: 'accrual workflow in the POC' },
      { value: '300 hrs', label: 'projected savings per year' },
    ],
    tech: ['Azure Databricks', 'SAP S/4HANA', 'SAP BTP', 'AI/BI Genie', 'Process Automation'],
  },
]

export type Leadership = {
  id: string
  org: string
  role: string
  period?: string
  description?: string
  /** Rugby position used for the team-sheet framing. Decorative only. */
  position: string
  number: number
}

export const leadership: Leadership[] = [
  {
    id: 'nsbe',
    org: 'National Society of Black Engineers (NSBE)',
    role: 'Vice President',
    period: 'Apr 2024 – May 2026',
    description:
      'Organized fundraising events that boosted chapter participation in regional and national NSBE conferences by 40%, and developed retention workshops driving 30% chapter growth.',
    position: 'Openside flanker',
    number: 7,
  },
  {
    id: 'ta',
    org: 'Luddy School of Informatics, Computing & Engineering',
    role: 'Teaching Assistant, Vibe & AI Programming',
    period: 'Jan 2026 – Present',
    description:
      'Support 30 students in an AI-assisted software development course, running weekly office hours and reviewing prototypes at each milestone to keep semester-long builds in scope.',
    position: 'Scrum-half',
    number: 9,
  },
  {
    id: 'ambassador',
    org: 'Luddy School of Informatics, Computing & Engineering',
    role: 'Luddy Student Ambassador',
    position: 'Fly-half',
    number: 10,
  },
  {
    id: 'consulting',
    org: 'EY & Deloitte',
    role: 'Technology Consulting Program',
    position: 'Inside centre',
    number: 12,
  },
  {
    id: 'ktp',
    org: 'Kappa Theta Pi',
    role: 'Member, professional technology fraternity',
    position: 'Wing',
    number: 14,
  },
  {
    id: 'lca',
    org: 'Luddy Consulting Association',
    role: 'Member',
    position: 'Fullback',
    number: 15,
  },
]

export type SkillGroup = { id: string; name: string; drill: string; skills: string[] }

export const skillGroups: SkillGroup[] = [
  {
    id: 'languages',
    name: 'Programming Languages',
    drill: 'Passing drills',
    skills: ['Python', 'Java', 'JavaScript', 'C / C++', 'Swift', 'SQL', 'Ruby', 'HTML / CSS'],
  },
  {
    id: 'ai',
    name: 'AI & Machine Learning',
    drill: 'Game-sense drills',
    skills: ['TensorFlow', 'PyTorch', 'scikit-learn', 'Prompt Engineering', 'MLflow', 'Google Gemini'],
  },
  {
    id: 'cloud',
    name: 'Cloud & DevOps',
    drill: 'Conditioning',
    skills: ['AWS', 'Docker', 'Linux / Unix', 'MongoDB', 'Azure Databricks', 'Supabase', 'PostgreSQL'],
  },
  {
    id: 'frameworks',
    name: 'Frameworks',
    drill: 'Set-piece drills',
    skills: ['React.js', 'Node.js', 'Express', 'REST APIs', 'Agile'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Systems',
    drill: 'Scrum machine',
    skills: ['SAP S/4HANA', 'SAP BTP', 'SAP Concur', 'Oracle', 'ServiceNow', 'Microsoft 365'],
  },
]

/** Scoreboard highlights. Each value is stated on the resume or previous site. */
export const highlights: { value: string; label: string }[] = [
  { value: '3', label: 'Internships' },
  { value: '3.87', label: 'GPA' },
  { value: 'AWS', label: 'Certified Cloud Practitioner' },
  { value: '7', label: 'Projects & plays' },
  { value: '5x', label: "Dean's List" },
  { value: 'VP', label: 'NSBE Vice President' },
  { value: '25+', label: 'Consultants coached' },
  { value: 'WIN', label: 'ALDI AI Case Competition' },
]

/** Trophy cabinet for the hidden-trophy Easter egg. */
export const trophies = [
  'Winner, ALDI AI Team Case Competition (BUS-K201)',
  "IT Consultant of the Month, Nov '24",
  "Dean's List, 5 times",
  'AWS Certified Cloud Practitioner',
]

/**
 * PLACEHOLDER: add a personal rugby fact (position played, club, favourite match…).
 * It appears in the hidden-trophy Easter egg when set. Left null on purpose so nothing is invented.
 */
export const rugbyFunFact: string | null = null

/** Skill -> where it shows up (derived from tags above, so it can never drift). */
export function whereUsed(skill: string): { kind: 'project' | 'experience'; id: string; title: string }[] {
  const norm = (s: string) => s.toLowerCase().replace(/\.js$/, '').replace(/[^a-z0-9+#]/g, '')
  const target = norm(skill)
  const alias: Record<string, string[]> = {
    tensorflow: ['tensorflow', 'keras'],
    aws: ['aws', 'awslambda'],
    restapis: ['restapis'],
  }
  const keys = alias[target] ?? [target]
  const hit = (tags: string[]) => tags.some((t) => keys.includes(norm(t)))
  return [
    ...projects.filter((p) => hit(p.tags)).map((p) => ({ kind: 'project' as const, id: p.id, title: p.title })),
    ...experiences
      .filter((e) => hit(e.tech))
      .map((e) => ({ kind: 'experience' as const, id: e.id, title: e.shortName })),
  ]
}
