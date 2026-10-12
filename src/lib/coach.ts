/**
 * "The Coach": the portfolio assistant. It is a deterministic, retrieval-only
 * responder: every answer is assembled from src/data/portfolio.ts, so it cannot
 * invent facts. Ported and extended from the assistant on the previous site.
 */
import {
  education,
  experiences,
  leadership,
  profile,
  projects,
  skillGroups,
  whereUsed,
} from '../data/portfolio'
import type { SectionId } from './sections'

export type CoachAction = { label: string; section: SectionId; item?: number }
export type CoachReply = { text: string; actions?: CoachAction[] }

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9+#./ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const has = (q: string, re: RegExp) => re.test(q)

const projectAliases: Record<string, RegExp> = {
  avemenu: /\b(ave ?menu|restaurant|menu)\b/,
  'ld-debate': /\b(debate|lincoln|douglas|ld app|tournament)\b/,
  eazyflow: /\b(eazy ?flow|easy ?flow|traffic|intersection)/,
  pixelscout: /\b(pixel ?scout|cifar|cnn|image classif)/,
  flippa: /\b(flippa|memory game|tile)/,
  flappybird: /\b(flappy|bird)\b/,
  aldi: /\b(aldi|case comp|competition|swot)\b/,
}

const experienceAliases: Record<string, RegExp> = {
  elanco: /\b(elanco|databricks|genie|fx rate|s\/?4 ?hana|sap build|accrual)/,
  fwc: /\b(future wonder|charioteer|lambda|cursor|windsurf)/,
  uits: /\b(uits|it consultant|supervisor|servicenow|ticket|help ?desk)/,
  steel: /\b(steel|tube|zinc|kampala|uganda|manufactur)/,
}

const leadershipAliases: Record<string, RegExp> = {
  nsbe: /\b(nsbe|black engineers?|vice president|vp)\b/,
  ta: /\b(ta|teaching|teach|vibe|office hours)\b/,
  ambassador: /\b(ambassador)\b/,
  consulting: /\b(ey|deloitte|big four)\b/,
  ktp: /\b(kappa|theta|ktp|fraternity)\b/,
  lca: /\b(consulting association|lca)\b/,
}

function describeProject(i: number): CoachReply {
  const p = projects[i]
  const links = [p.link?.url, p.github].filter(Boolean).join('\n')
  return {
    text: `${p.title}${p.badge ? ` (${p.badge})` : ''}${p.period ? `, ${p.period}` : ''}.\n${p.description}\nBuilt with: ${p.tags.join(', ')}.${links ? `\n${links}` : ''}`,
    actions: [{ label: `Open ${p.title} in the playbook`, section: 'projects', item: i }],
  }
}

function describeExperience(i: number): CoachReply {
  const e = experiences[i]
  return {
    text: `${e.role} at ${e.company} (${e.start} – ${e.end}, ${e.location}).\n• ${e.responsibilities.join('\n• ')}\nResults: ${e.achievements
      .map((a) => `${a.value} ${a.label}`)
      .join('; ')}.\nTech: ${e.tech.join(', ')}.`,
    actions: [{ label: `See ${e.shortName} on the match timeline`, section: 'experience', item: i }],
  }
}

function describeLeadership(i: number): CoachReply {
  const l = leadership[i]
  return {
    text: `${l.role}, ${l.org}${l.period ? ` (${l.period})` : ''}.${l.description ? `\n${l.description}` : ''}`,
    actions: [{ label: 'Open the team sheet', section: 'leadership', item: i }],
  }
}

export const COACH_SUGGESTIONS = [
  'Give me the 30-second scouting report',
  'What did he build at Elanco?',
  'Which projects use AI?',
  "What's his tech stack?",
  'How do I contact him?',
]

export function coachReply(input: string): CoachReply {
  const q = norm(input)
  if (!q) return { text: 'Ask me anything about Benedict: experience, projects, skills, education, or leadership.' }

  if (has(q, /^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))\b/) && q.split(' ').length <= 4)
    return {
      text: "Welcome to the stadium. I'm the Coach, Benedict's portfolio assistant. I only answer from his portfolio, so everything I tell you is on the record. What do you want to know?",
    }

  if (has(q, /\b(thank|thanks|cheers|appreciate)/)) return { text: 'Anytime. Enjoy the rest of the stadium.' }
  if (has(q, /\b(bye|goodbye|see you|later)\b/)) return { text: 'Thanks for visiting. Full time!' }

  // Specific entities first, so "Elanco experience" answers about Elanco.
  for (const [id, re] of Object.entries(experienceAliases))
    if (has(q, re)) return describeExperience(experiences.findIndex((e) => e.id === id))
  for (const [id, re] of Object.entries(projectAliases))
    if (has(q, re)) return describeProject(projects.findIndex((p) => p.id === id))
  for (const [id, re] of Object.entries(leadershipAliases))
    if (has(q, re)) return describeLeadership(leadership.findIndex((l) => l.id === id))

  // A specific skill? ("does he know docker", "python")
  const allSkills = skillGroups.flatMap((g) => g.skills.map((s) => ({ s, g })))
  const skillHit = allSkills.find(({ s }) => {
    const k = norm(s).replace(/\.js\b/, '').replace(/ \/ /g, ' ').split(' ')[0]
    return k.length > 1 && new RegExp(`(^|\\s)${k.replace(/[.+]/g, '\\$&')}(\\s|$)`).test(q)
  })
  if (skillHit && !has(q, /\b(skills|stack|languages)\b/)) {
    const used = whereUsed(skillHit.s)
    return {
      text: `Yes. ${skillHit.s} is in his ${skillHit.g.name} toolkit.${
        used.length ? `\nIt shows up in: ${used.map((u) => u.title).join(', ')}.` : ''
      }`,
      actions: [
        { label: 'Visit the training ground', section: 'skills', item: skillGroups.indexOf(skillHit.g) },
      ],
    }
  }

  if (has(q, /\b(scouting|summary|summar|overview|who is|about|introduce|tell me about|30 ?second|elevator)/))
    return {
      text: `${profile.name} studies ${education.degree} (${education.specialization}; minors in ${education.minors.join(
        ' and ',
      )}) at ${education.school}, graduating ${education.graduation} with a ${education.gpa} GPA.\nMost recently: ${
        experiences[3].role
      } at ${experiences[3].company}. He also supervises 25+ consultants at IU UITS and served as NSBE Vice President.\nHe is an ${
        education.certifications[0]
      }. ${profile.availability}`,
      actions: [{ label: 'Meet him at center field', section: 'about' }],
    }

  if (has(q, /\b(gpa|grades?|deans list|honou?rs?|award)/))
    return { text: `GPA: ${education.gpa}. Honors: ${education.honors.join(', ')}.` }

  if (has(q, /\b(school|university|college|education|study|studies|degree|major|minor|luddy|graduat|course|class)/))
    return {
      text: `${education.degree} with an ${education.specialization} at ${education.school} (${education.college}).\nMinors: ${education.minors.join(
        ', ',
      )}. GPA ${education.gpa}. Graduating ${education.graduation}.\nCoursework: ${education.coursework.join(', ')}.`,
      actions: [{ label: 'Open About', section: 'about' }],
    }

  if (has(q, /\b(certif|aws|cloud practitioner)/)) return { text: `He is an ${education.certifications[0]}.` }

  if (has(q, /\b(ai|ml|machine learning|artificial intelligence|neural|model)\b/) && has(q, /\b(project|built|build|work)/)) {
    const ai = projects
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.tags.some((t) => /ai|tensorflow|cnn|gemini|scikit|keras/i.test(t)))
    return {
      text: `AI-related plays:\n${ai.map(({ p }) => `• ${p.title}: ${p.short}`).join('\n')}\nAt work: an AI/BI Genie space at Elanco and AI-supported reporting software at Future Wonder Co.`,
      actions: ai.slice(0, 2).map(({ p, i }) => ({ label: p.title, section: 'projects' as const, item: i })),
    }
  }

  if (has(q, /\b(skill|tech|stack|language|tools?|framework|know|proficien|enterprise)/))
    return {
      text: skillGroups.map((g) => `${g.name}: ${g.skills.join(', ')}`).join('\n'),
      actions: [{ label: 'Visit the training ground', section: 'skills' }],
    }

  if (has(q, /\b(experience|work|job|intern|employ|career|company|companies)/))
    return {
      text: experiences
        .slice()
        .reverse()
        .map((e) => `• ${e.role}, ${e.company} (${e.start} – ${e.end})`)
        .join('\n'),
      actions: [{ label: 'Open the match timeline', section: 'experience' }],
    }

  if (has(q, /\b(project|built|build|made|portfolio|create|playbook)/))
    return {
      text: projects.map((p) => `• ${p.title}: ${p.short}`).join('\n'),
      actions: [{ label: 'Open the playbook', section: 'projects' }],
    }

  if (has(q, /\b(lead|involve|org|club|volunteer|community)/))
    return {
      text: leadership.map((l) => `• ${l.role}, ${l.org}`).join('\n'),
      actions: [{ label: 'Open the team sheet', section: 'leadership' }],
    }

  if (has(q, /\b(contact|reach|email|connect|linkedin|github|phone|call|hire|hiring|available|availability|internship)/))
    return {
      text: `Email: ${profile.email}\nLinkedIn: linkedin.com/in/bdyiga\nGitHub: github.com/bdyiga\nPhone: ${profile.phone}\n${profile.availability}`,
      actions: [{ label: 'Go to the goalposts', section: 'contact' }],
    }

  if (has(q, /\b(resume|cv)\b/))
    return {
      text: 'You can download the full resume from the Contact section at the goalposts, or from the menu.',
      actions: [{ label: 'Go to the goalposts', section: 'contact' }],
    }

  if (has(q, /\b(rugby|try line|sport)/))
    return {
      text: `Rugby is one of Benedict's biggest passions, which is why this portfolio is a stadium. In his words: "${profile.rugbyIntro}"`,
    }

  return {
    text: "I don't have that in Benedict's portfolio, and I won't guess. Try asking about his experience, projects, skills, education, leadership, or how to contact him.",
  }
}
