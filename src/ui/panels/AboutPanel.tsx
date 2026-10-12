import { education, profile } from '../../data/portfolio'
import { Panel, Reveal, Tags } from '../Panel'

export function AboutPanel() {
  return (
    <Panel id="about">
      <Reveal className="flex items-center gap-4">
        <img
          src={profile.photo}
          alt={`Portrait of ${profile.name}`}
          width={96}
          height={101}
          className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-lime/40"
        />
        <div>
          <p className="display text-xl leading-tight">{profile.name}</p>
          <p className="mt-1 text-sm text-silver">{profile.roles.join(' · ')}</p>
          <p className="mt-1 text-sm text-lime">{profile.headline}</p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <blockquote className="mt-6 border-l-2 border-lime pl-4 text-lg leading-snug text-ink">
          “{profile.rugbyIntro}”
        </blockquote>
      </Reveal>

      <Reveal delay={0.14} className="mt-5 space-y-3 text-[0.95rem] leading-relaxed text-silver">
        {profile.bio.map((p) => (
          <p key={p.slice(0, 20)}>{p}</p>
        ))}
      </Reveal>

      <Reveal delay={0.2} className="mt-6 rounded-2xl border border-white/10 bg-forest/40 p-4">
        <p className="kicker">Education</p>
        <p className="mt-2 font-semibold">{education.school}</p>
        <p className="text-sm text-silver">{education.college}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-silver-dim">Degree</dt>
            <dd>{education.degree}</dd>
          </div>
          <div>
            <dt className="text-silver-dim">Specialization</dt>
            <dd>Artificial Intelligence</dd>
          </div>
          <div>
            <dt className="text-silver-dim">Minors</dt>
            <dd>{education.minors.join(' & ')}</dd>
          </div>
          <div>
            <dt className="text-silver-dim">GPA · Graduation</dt>
            <dd>
              {education.gpa} · {education.graduation}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-silver">
          <span className="text-silver-dim">Honors: </span>
          {education.honors.join(' · ')}
        </p>
        <p className="mt-1 text-sm text-silver">
          <span className="text-silver-dim">Certified: </span>
          {education.certifications.join(', ')}
        </p>
      </Reveal>

      <Reveal delay={0.26} className="mt-5">
        <p className="kicker mb-2">Coursework</p>
        <Tags items={education.coursework} delay={0.3} />
      </Reveal>
      <Reveal delay={0.3} className="mt-5">
        <p className="kicker mb-2">Interests</p>
        <Tags items={profile.interests} delay={0.34} />
      </Reveal>
      <Reveal delay={0.34} className="mt-5 rounded-2xl border border-lime/25 bg-lime/5 p-4 text-sm text-silver">
        <p className="font-semibold text-ink">What I'm looking for</p>
        <p className="mt-1">{profile.availability}</p>
      </Reveal>
    </Panel>
  )
}
