---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: []
---

# DojoManager app shell and screens

Scope: every authenticated screen plus login and public enrollment. Visitor mode: Operate. Audience: administrador, profesor, tutor and alumno, at equal priority. Constraints: behavior, permissions, PayPal flow and copy facts stay unchanged; the AI assistant must not appear because it does not exist.

## Direction contract

THESIS: One colour per dojo module, carried by a tinted icon tile wherever that module appears, so people find their place by colour. It refuses the grey admin template with one blue accent. Visual language pinned by the user: flashka.ai, as reference only, with no use of its logo, name, mascot or illustrations.

OWN-WORLD: Near-white #FAFAFA ground with a faint dot grid. Mona Sans, bold neutral-800 headings. Violet-600 primary with an inner edge. Very round white surfaces with hairline borders and soft offset shadows. Tile hues: violet Inicio, sky Profesores, emerald Alumnos, rose Eventos, orange Horario, amber Pagos, fuchsia Notificaciones, lime Mi tarjeta.

STORY: A person signs in, sees which area they are in from its colour, reads what is owed or next, and acts with one clear violet button.

FIRST VIEWPORT: Floating rounded sidebar left with module tiles; floating pill top bar with notifications; page header with a large module tile, 40px title and description; work area below. Login: one large rounded container, headline left with labelled tilted module tiles, form in an inner panel right.

FORM: Pinned by the user, so the seeded roll was not applied. Standard web controls and navigation. seed: none (user-pinned direction)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
