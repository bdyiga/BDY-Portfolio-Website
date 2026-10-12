# BDY's World — Beyond the Try Line

The interactive portfolio of **Benedict Deogratius Yiga**: a futuristic rugby stadium you can explore in the browser, plus a one-page **Quick View** for recruiters.

**Live:** https://bdyiga.github.io/BDY-Portfolio-Website/

## The stadium

| Zone | Section | What's there |
| --- | --- | --- |
| Center field | About | The hero rugby ball on its kicking tee. Click it to meet Benedict. |
| Left try zone | Projects | Seven holographic "plays" from the playbook, each with a whiteboard play diagram. |
| Right try zone | Experience | Four LED totems forming a match timeline from kick-off (2023) to now. |
| North stand | Leadership | Team banners on the stand facade, plus a team-sheet formation. |
| Training ground | Skills | Tackle bags for each skill group. Skills orbit the active bag and link to where they were used. |
| Goalposts | Contact | Opening it kicks a conversion through the posts and the crowd does a wave. |

Also included: a career-highlights scoreboard (click it), a day/night toggle, a minimap, and **The Coach** (a portfolio assistant). Easter eggs include a ball that bounces unpredictably, a hidden trophy cabinet, and the `K` key for a shot at goal.

### Keyboard

`1`–`6` open a section · `0`/`Esc` go back to the overview · `←`/`→` move between items · `N` toggles day/night · `Q` opens Quick View · `C` opens the Coach · `K` kicks a conversion · `M` opens the menu.

### Deep links

Every view has a shareable URL, for example `#projects/pixelscout`, `#experience/elanco`, `#contact` or `#quick`.

## Editing content

All content lives in [`src/data/portfolio.ts`](src/data/portfolio.ts). It was taken from the previous site and the 2026 resume. The 3D scene, the panels, Quick View and the Coach all read from this file, so a change there shows up everywhere.

- To swap the resume, replace `public/Yiga Benedict, Resume 2026.pdf` and update `resumeUrl` if the name changes.
- To swap the photo, replace `public/bdy-portrait.webp`. It is about 720px wide.
- `rugbyFunFact` is an intentional **placeholder**. Set it to a real rugby fact and it appears in the hidden-trophy Easter egg.

## Tech

React 19 + TypeScript + Vite, React Three Fiber + Drei for the 3D scene, GSAP for cinematic camera moves and ball flights, Motion for UI animation, Tailwind CSS v4, and Zustand for state.

The scene uses no downloaded 3D models. The pitch, ball, banners, scoreboard and LED boards are all drawn procedurally on canvas, so the 3D part costs only JavaScript.

```
src/
  data/portfolio.ts      single source of truth for all content
  lib/sections.ts        stadium layout, hotspots, camera framings
  lib/sceneState.ts      per-frame shared state (lighting, ball controller)
  lib/coach.ts           retrieval-only portfolio assistant
  lib/textures.ts        procedural canvas textures
  state/store.ts         app state (phase, section, day/night, …)
  three/                 R3F scene, lazy-loaded (Director = camera + choreography)
  ui/                    intro, HUD, minimap, panels, Coach, Quick View
```

### Performance and accessibility

- The 3D bundle (three.js, R3F, postprocessing, GSAP) is code-split and lazy-loaded. The first paint ships only React, the UI, and the CSS.
- An adaptive quality mode drops bloom, sparkles and pixel ratio on low-end devices. The menu also has a "Battery saver" toggle.
- `prefers-reduced-motion` is respected. The menu has its own toggle as well.
- Every 3D hotspot is a real, focusable button. A skip link, a menu and the minimap give non-3D navigation.
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
