# BDY's World — Beyond the Try Line

The interactive portfolio of **Benedict Deogratius Yiga**: a floodlit rugby stadium you can explore in the browser, styled like a match-night TV broadcast, plus a one-page **Quick View** ("See everything on one page") for recruiters.

**Live:** https://bdyiga.github.io/BDY-Portfolio-Website/

## The stadium

| Zone | Section | What's there |
| --- | --- | --- |
| Center field | About | The hero rugby ball on its kicking tee. Click it to meet Benedict. |
| Left try zone | Projects | Nine holographic "plays" from the playbook. A project page leads with its result, then the problem, what was built and how it works, drawn as a play. |
| Right try zone | Experience | Four LED totems forming a match timeline from kick-off (2023) to now. |
| North stand | Leadership | Team banners on the stand facade, plus a team-sheet formation. |
| Training ground | Skills | Tackle bags for each skill group. Skills orbit the active bag and link to where they were used. |
| Goalposts | Contact | Opening it kicks a conversion through the posts and the crowd does a wave. |

Also included: a career-highlights scoreboard (click it), a day/night toggle, and **The Coach** (a portfolio assistant, opened from the whistle button, the menu or `C`). Easter eggs include a ball that bounces unpredictably, a hidden trophy cabinet, and the `K` key for a shot at goal.

### For a recruiter in a hurry

The intro title card is usable from its first frame: degree and graduation date, three featured projects (one click to a project's detail), and Resume, Email and LinkedIn. Once inside, a fixed top bar keeps **Resume**, **Contact** and **One page** in the same place on every screen.

### The guided tour

"Take the guided tour" walks a visitor through the six zones in order (About, Projects, Experience, Leadership, Skills, Contact). Each stop is one short card: a plain headline, a few lines summarising what `portfolio.ts` says, and rows that open the detail. Nothing moves on until the visitor clicks **Next**. **Know more** opens the full panel, which keeps **Summary** and **Next** at the bottom. The close button (or `Esc`) leaves the tour for free exploration, and the menu can restart it. While the tour runs, the screen keeps to one graphic: no rundown strip and no score flashes. #13 still carries the ball to each stop and stands in the shot.

### Quick View

A calm, conventional page for reading: a light warm-paper background, white cards, near-black text and IU crimson as the only accent, with plain sentence-case headings. It is also the fallback when WebGL is unavailable.

### Look

Broadcast graphics, not glass: opaque slabs, square corners, condensed caption type, IU crimson and cream. One graphic on screen at a time, each in a fixed place. Lime is kept for the single primary action and the focus ring.

### The ground

Mown turf whose stripes swap light and dark as the camera goes round, the way real grass does. Stands built in bays, with stairways, tunnel mouths, a players' tunnel and a steel roof frame. The crowd is seated people, not blocks, and it still does the wave. All of it is procedural: no models or images to download.

### #13

#13 is a rigged athlete in the red #13 YIGA kit. He jogs, sprints, carries the ball in two hands or tucked under one arm at speed, passes, kicks and celebrates. The running and standing come from motion-capture clips. The kick, pass, wave and celebration are hand-keyed on top, and two-bone IK keeps his hands on the ball wherever those put it. The kit is painted onto the body in a shader, so there are no extra textures for it.

The model loads after the stadium is up (867 KB, one `.glb`). Until it arrives, and if it ever fails to load, the code-only #13 stands in.

### Camera

Each zone has its own move into it: a push-in to #13, a jib up to the playbook, a truck along the try line, a pedestal up to the banners, a whip pan to the training ground and a low arc round to the kicker. On a phone, every zone has its own portrait framing, which shoots down a row of objects instead of across it. The framing stays put whether the bottom sheet is open or collapsed with "Show field".

### Keyboard

`1`–`6` open a section · `0`/`Esc` go back to the overview · `←`/`→` move between items · `N` toggles day/night · `Q` opens Quick View · `C` opens the Coach · `K` kicks a conversion · `M` opens the menu.

### Deep links

Every view has a shareable URL, for example `#projects/pixelscout`, `#experience/elanco`, `#contact` or `#quick`.

## Editing content

All content lives in [`src/data/portfolio.ts`](src/data/portfolio.ts). It was taken from the previous site and the 2026 resume. The 3D scene, the panels, Quick View and the Coach all read from this file, so a change there shows up everywhere.

- To swap the resume, replace `public/Yiga Benedict, Resume 2026.pdf` and update `resumeUrl` if the name changes.
- To swap the photo, replace `public/bdy-portrait.webp`. It is about 720px wide.
- `featuredProjectIds` picks the three projects on the intro title card. Reorder or swap the ids freely.
- Each project can also have `result`, `problem`, `built`, `stack`, `screenshot` and `steps` (two to five short steps, drawn as the play diagram). They are optional, and a project page shows only the ones that are filled in. Screenshots go in `public/projects/`.
- `rugbyFunFact` is an intentional **placeholder**. Set it to a real rugby fact and it appears in the hidden-trophy Easter egg.

## Tech

React 19 + TypeScript + Vite, React Three Fiber + Drei for the 3D scene, GSAP for cinematic camera moves and ball flights, Motion for UI animation, Tailwind CSS v4, and Zustand for state.

The only downloaded 3D model is #13 ([`src/assets/athlete.glb`](src/assets/athlete.glb)). The pitch, stands, crowd, ball, banners, scoreboard and LED boards are all drawn procedurally, in code and on canvas.

### #13's model

Built from two free CC0 packs by [Quaternius](https://quaternius.com): the male base character from [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) and the idle, walk, jog and sprint clips from the [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html). Both share one skeleton, so the clips play on the body directly. The textures were shrunk to 1024 px JPEGs and the file meshopt-compressed, without quantising positions, because the kit shader paints by height on the body in metres. CC0 needs no credit; this note is here so the source is easy to find.

```
src/
  data/portfolio.ts      single source of truth for all content
  lib/sections.ts        stadium layout, hotspots, camera framings
  lib/sceneState.ts      per-frame shared state (lighting, ball controller)
  lib/coach.ts           retrieval-only portfolio assistant
  lib/textures.ts        procedural canvas textures
  lib/poses.ts           hand-keyed moves for #13 (kick, pass, wave, celebrate, …)
  state/store.ts         app state (phase, section, day/night, …)
  three/                 R3F scene, lazy-loaded (Director = camera + choreography)
  ui/                    intro title card, HUD (top bar, rundown, menu), panels, Coach, Quick View
```

### Performance and accessibility

- The 3D bundle (three.js, R3F, postprocessing, GSAP) is code-split and lazy-loaded. The first paint ships only React, the UI, and the CSS.
- An adaptive quality mode drops shadows, bloom, sparkles and pixel ratio on low-end devices. The menu also has a "Battery saver" toggle.
- `prefers-reduced-motion` is respected. The menu has its own toggle as well.
- Every zone is a real, focusable button in "the rundown" strip, and focusing one highlights its marker on the pitch. A skip link and the menu give non-3D navigation.
- If WebGL is unavailable or the context is lost, the site falls back to Quick View automatically.

## Development

Requires Node 20+ (24 recommended).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve dist/ locally
```

## Deployment

### GitHub Pages (recommended)

1. Merge into `main`.
2. In the repository, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. This is a one-time step. The old site was served straight from the branch root, which no longer works because the site now needs a build.
3. Every push to `main` then runs `.github/workflows/deploy.yml`, which builds and publishes `dist/`.

The build uses relative asset paths (`base: './'`), so it works under `/BDY-Portfolio-Website/` without extra config.

### Netlify

Import the repository. `netlify.toml` already sets the build command (`npm ci && npm run build`) and the publish directory (`dist`).
