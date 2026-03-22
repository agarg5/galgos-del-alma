Galgos del Alma
A 3D Web RPG with LLM-Powered NPCs
Implementation Spec — for Claude Code

1. Overview
Galgos del Alma is a browser-based 3D RPG built in a single HTML file using Three.js. The player explores a low-poly Spanish landscape, rescues abandoned galgos (Spanish greyhounds), and interacts with LLM-powered NPCs whose dialogue is dynamically generated via the Anthropic API. The game requires no build step, no backend, and no asset files — everything is procedurally generated in JavaScript.
The tone is hopeful realism: the subject matter (galgo abandonment after hunting season) is treated honestly but the experience is ultimately about compassion, patience, and connection. Visually, the aesthetic is warm golden-hour Spain — amber dehesa, whitewashed walls, long shadows.

2. Technical Stack
Runtime
Single .html file, no build step, no npm
3D Engine
Three.js r128 — loaded from cdnjs.cloudflare.com
LLM API
Anthropic /v1/messages — claude-sonnet-4-20250514
Persistence
localStorage — NPC memory, galgo trust levels
Fonts
Google Fonts CDN — Playfair Display + Source Serif 4
No dependencies
No React, no bundler, no additional libraries

The API key is entered by the player in a start screen input field and stored in sessionStorage for the duration of the session. It is never sent anywhere except the Anthropic API.

3. File Architecture
Everything lives in one file: galgos-del-alma.html. Internally it is organised into clearly commented script sections:
	•	SCENE SETUP — Three.js renderer, camera, lights, fog
	•	WORLD — terrain, buildings, trees, props (all procedural geometry)
	•	PLAYER — controller, input handling, collision
	•	GALGOS — galgo class, trust system, animations
	•	NPCS — NPC class, patrol, proximity detection
	•	DIALOGUE — overlay UI, Anthropic API calls, streaming
	•	GAME LOOP — main animate() function, update cycle
	•	UI — HUD, start screen, dialogue box styles (inline CSS)

4. 3D World
4.1 Scene Configuration
World size
500 × 500 units (walkable area ~450 × 450)
Camera
Third-person, follows player at height 8, distance 14
Fog
THREE.Fog, warm amber (#C8854A), near 80, far 300
Sky
Renderer background color #F2C07A (golden hour)
Ambient light
#FFD580, intensity 0.6
Sun (Directional)
#FFF0C0, intensity 1.2, position (100, 120, 60)
Shadow
Directional light casts shadows, PCFSoftShadowMap

4.2 Terrain
A flat PlaneGeometry(500, 500, 60, 60) with vertex displacement via a simple sine-based heightmap (max 1.5 units of variation) — enough to feel organic, not enough to cause navigation issues. Vertex colors baked in: dusty amber (#D4A96A) for open areas, slightly darker patches near buildings.
	•	No texture files — vertex colors only
	•	MeshLambertMaterial for performance
	•	Receives shadows
4.3 World Zones
Three visually distinct zones on one contiguous map:
	•	 — northeast quadrant. Open land, sparse holm oak trees (low-poly cone + cylinder), dried grass instanced geometry. Danger zone where galgos are found.La Dehesa (hunting zone)
	•	 — center-west. 4–6 whitewashed cube buildings (BoxGeometry, white MeshLambertMaterial with dark window cutouts as separate inset boxes). A central plaza with a fountain (cylinder stack).El Pueblo (village)
	•	 — center. A slightly larger building with a warm orange roof (BoxGeometry in terracotta). Entering the proximity triggers a 2D shelter management overlay, not a scene change.El Refugio (shelter)
4.4 Procedural Assets
All assets built from Three.js primitives — no external files:
	•	 — SphereGeometry crown (#4A5E2A, flattened scaleY 0.7) + CylinderGeometry trunk (#6B4226)Holm oak tree
	•	 — BoxGeometry body (white) + BoxGeometry roof (terracotta) + small inset boxes for windows (dark gray)Building
	•	 — InstancedMesh of thin BoxGeometry scaled tall, rotated randomly, amber-green colorDry grass tufts
	•	 — cylinder stack, light gray stone colorFountain
	•	 — thin flattened BoxGeometry strips, slightly darker than terrainRoad paths

5. Player Controller
The player controls a human volunteer character (or optionally the galgo — see Section 7). Movement is WASD / arrow keys. Mouse look rotates camera around player.
Move speed
8 units/sec
Input
WASD + arrow keys. Gamepad optional.
Camera
Follows behind player. Mouse drag = orbit. No camera collision needed.
Collision
Simple AABB against building bounding boxes only. Terrain is flat enough to ignore.
Interact key
E — triggers dialogue or care action when in proximity
Player mesh
Capsule approximation: CylinderGeometry body + SphereGeometry head, neutral beige color

When dialogue is active, player movement is disabled and the cursor is unlocked.

6. Galgo System
6.1 Galgo Mesh
Each galgo is assembled from Three.js primitives to capture the iconic greyhound silhouette:
	•	 — BoxGeometry(2.4, 0.7, 0.7), slightly tapered using morph or manual vertex editBody
	•	 — BoxGeometry(0.6, 0.5, 0.4), positioned forward and slightly downHead
	•	 — BoxGeometry(0.35, 0.3, 0.35), extending from headSnout
	•	 — 4× CylinderGeometry(0.08, 0.08, 1.0), positioned at corners of bodyLegs
	•	 — CylinderGeometry(0.05, 0.02, 1.2), attached at rear, rotation driven by trust levelTail
	•	 — 2× BoxGeometry(0.12, 0.3, 0.08), rotation driven by trust levelEars
Color variants for different galgos: brindle (#8B7355), fawn (#C4956A), black (#2C2C2C), white (#E8E0D0).
6.2 Trust System
Each galgo has a trustLevel property (0–100) persisted in localStorage by galgo ID.
Level
Range
Behaviour & Visuals
Traumatised
0–25
Tail tucked (rotateZ -0.8), ears flat (rotateX -0.5). Moves away if player within 6 units. Crouches (scaleY 0.85).
Cautious
26–60
Tail neutral (rotateZ -0.2), ears half-raised. Stays put. Allows approach to 3 units before retreating.
Trusting
61–85
Tail raised (rotateZ 0.3), ears up. Trots toward player slowly when in 8-unit range.
Bonded
86–100
Tail wagging (oscillate rotateZ ±0.5 at 3Hz), follows player at 2-unit distance. Adoption menu unlocks.

6.3 Care Actions
When the player presses E near a galgo, a radial action menu appears (HTML overlay, 3 options):
	•	 — player crouches, does not approach. +3 trust. Cooldown 60s.Sit nearby
	•	 — only available if trust > 20. +8 trust. Cooldown 120s.Offer food
	•	 — only available if trust > 50. +12 trust. Cooldown 180s. Triggers brief galgo flinch animation then relax.Gentle touch
Trust values are saved to localStorage immediately on change.
6.4 Starting Galgos
Three galgos placed at game start, each with a name, color, and unique personality (used in their LLM dialogue if the player can eventually talk to them in bonded state):
	•	Luna — fawn, dehesa zone, trust starts at 10
	•	Rayo — brindle, village outskirts, trust starts at 30
	•	Sombra — black, near shelter, trust starts at 55

7. NPC System
7.1 NPC Types
Four NPC archetypes at launch, each a stationary or slowly patrolling character in the world:
El Cazador (The Hunter)
	•	 — dehesa zoneLocation
	•	 — olive jacket, weathered face (box-primitive character, slightly taller)Visual
	•	 — walks a 20-unit loop slowlyPatrol
	•	 — starts hostile/dismissive. Can shift to reluctant respect over many sessions.Relationship
	•	 — 'You are Miguel, a 58-year-old galgo hunter from Castilla. You have hunted with galgos your whole life, as did your father. You genuinely love your dogs but see them as working animals. You are not a villain — you are a man of tradition who has never been asked to question it. You are gruff but not cruel. You remember previous conversations.'System prompt seed
La Veterinaria (The Vet)
	•	 — near the shelterLocation
	•	 — white coat, warm expressionVisual
	•	 — stationary, tends to a water bowl propPatrol
	•	 — always friendly, gives practical advice about care actions, references galgo healthRelationship
	•	 — 'You are Dr. Amparo, a vet who volunteers at the galgo shelter. You are warm but exhausted. You have seen too many galgos come in injured. You give practical advice and remember which galgos the player has been working with.'System prompt seed
El Alcalde (The Mayor)
	•	 — village plazaLocation
	•	 — suit, slightly portlyVisual
	•	 — stationary on plaza benchPatrol
	•	 — politically cautious. Can be persuaded to support a local ordinance protecting galgos if the player has built enough reputation.Relationship
	•	 — 'You are Alcalde Don Bernardo. You care about your village and your re-election. You are not hostile to animal welfare but you fear upsetting the hunters who vote for you. You are persuadable with the right arguments — economics, tourism, public image.'System prompt seed
La Adoptante (The Adopter)
	•	 — visits the shelter area periodically (spawns at shelter, despawns after 5 min)Location
	•	 — casual clothes, curious expressionVisual
	•	 — genuinely wants to adopt but has specific needs. The player must describe a galgo whose profile matches.Relationship
	•	 — 'You are Clara, a 34-year-old graphic designer who lives alone in a quiet apartment in Madrid. You work from home. You want to adopt a galgo but you are nervous — you have never had a dog. Ask the player about the galgo they are recommending. Be genuinely moved if the match sounds right.'System prompt seed
7.2 NPC Memory Schema
Each NPC's conversation history is stored in localStorage as JSON under the key npc_{id}_history. The array contains message objects {role, content} in Anthropic API format. Maximum 20 messages stored (oldest pruned first to stay within token limits).
A summary string npc_{id}_summary is updated after each conversation with a 1-sentence LLM-generated summary of relationship status. This summary is injected into the system prompt on next load so the NPC 'remembers' past sessions even after localStorage pruning.
7.3 Proximity Detection
Each NPC has a proximityRadius (default 6 units). Each frame, the game checks distance from player to each NPC. When player enters radius, a floating prompt appears in the HUD: 'Press E to talk to [Name]'. When player presses E, dialogue opens.

8. Dialogue System
8.1 UI Layout
When dialogue opens, the 3D scene continues rendering but is dimmed (CSS overlay at 40% black). A dialogue panel appears at the bottom of the screen occupying roughly the bottom 35% of the viewport:
	•	NPC name + small color indicator top-left of panel
	•	Scrollable conversation history above input
	•	Text input field + Send button
	•	'End conversation' button top-right
	•	Typewriter effect on NPC responses (character-by-character via streaming)
Font: Playfair Display for NPC speech, Source Serif 4 for player input. Warm parchment background (#F5EED8). No hard UI chrome — soft edges, warm palette.
8.2 Anthropic API Call
Each message sends a POST to https://api.anthropic.com/v1/messages with:
	•	 — claude-sonnet-4-20250514model
	•	 — 300 (keeps responses conversational, not essay-length)max_tokens
	•	 — NPC system prompt + relationship summary + current world state injectionsystem
	•	 — full conversation history from localStorage (last 20 messages)messages
World state injection appended to system prompt: current time of day, which galgos the player has rescued, player's current trust level with each galgo, how many sessions have passed. This gives NPCs awareness of game progress.
Streaming is used (stream: true) so the typewriter effect is driven by the actual token stream, not a fake setTimeout. Each text delta appends a character to the dialogue box.
The API key is read from sessionStorage.getItem('anthropic_key').
8.3 Dialogue Triggers
Beyond standard NPC conversation, two special dialogue types exist:
	•	 — when a bonded galgo (trust > 85) is near, the player can press E for a short poetic inner-monologue from the galgo's perspective. Max 80 tokens. System prompt: 'You are [Name], a galgo who has learned to trust again. Speak in simple, sensory, present-tense observations. No dramatics. Just small true things.'Galgo whisper
	•	 — when talking to La Adoptante, the player can type a description of a specific galgo. The LLM evaluates fit and responds in character, asking follow-up questions or expressing interest.Adoption pitch

9. Game Loop & State
9.1 Main Loop
Standard Three.js requestAnimationFrame loop. Delta time capped at 0.05s to prevent spiral-of-death on tab switch. Update order per frame:
	•	1. Read input
	•	2. Update player position + camera
	•	3. Update NPC patrol positions
	•	4. Update galgo behaviours (flee, approach, wag) based on trust and player distance
	•	5. Check proximity triggers for all NPCs and galgos
	•	6. Update HUD (trust bars, prompt hints)
	•	7. Render scene
9.2 Persistent State (localStorage keys)
galgo_{id}_trust
Integer 0–100, updated on care actions
galgo_{id}_rescued
Boolean, set true when player first finds galgo
npc_{id}_history
JSON array of {role, content} message objects
npc_{id}_summary
Short string: LLM-generated relationship summary
game_sessions
Integer, incremented on each page load
game_reputation
Integer 0–100, affected by NPC persuasion outcomes

9.3 Win Conditions
No hard win/loss. The game is open-ended. Milestone events trigger celebratory UI moments (particle burst, warm overlay, short music sting via Web Audio API):
	•	First galgo reaches trust 50 — 'Rayo is starting to trust you'
	•	Any galgo reaches trust 100 — '[Name] is ready for a forever home'
	•	Successful adoption conversation — '[Name] found their person'
	•	Mayor persuaded — 'The village has passed an animal welfare ordinance'

10. UI & HUD
10.1 Start Screen
Full-screen HTML overlay before Three.js initialises. Contains:
	•	Game title in Playfair Display
	•	One-paragraph description of what galgos are and why they need rescue
	•	API key input field (type=password), placeholder 'Enter your Anthropic API key'
	•	'Begin' button — saves key to sessionStorage, hides overlay, starts Three.js init
10.2 HUD Elements
Minimal, non-intrusive. All HTML overlaid on the canvas:
	•	 — small compass rose, current zone name ('La Dehesa')Top-left
	•	 — trust level bars for each galgo the player has met (icon + name + bar)Top-right
	•	 — context prompt hint ('E: Talk', 'E: Care for Luna', fades in/out)Bottom-center
	•	 — session count, reputation meter (shown as 'Village standing: 42/100')Bottom-right
10.3 Visual Style Notes
CSS for all UI elements is inline within the HTML file. Palette: parchment (#F5EED8), dark earth (#2C1A0E), warm gold (#C4A35A), terracotta (#B85C38). Font pairing: Playfair Display (headings, NPC names, dialogue) + Source Serif 4 (body, player input, HUD text). No sans-serif anywhere — the game should feel like a hand-written letter.

11. Audio
Simple ambient audio via Web Audio API — no external files:
	•	 — low-frequency OscillatorNode (sine, ~60Hz) with LFO modulationWind drone
	•	 — short white noise bursts triggered by player movement cycleFootstep rhythm
	•	 — simple pentatonic arpeggio via OscillatorNode sequenceTrust milestone chime
	•	 — soft cloth-rustle approximation via filtered noiseDialogue open/close
All audio starts muted. A small speaker icon in the top-right corner toggles it. No music — the ambient sound design should feel like being there, not like playing a game.

12. Performance Guidelines
	•	Use MeshLambertMaterial throughout — no PBR, no MeshStandardMaterial
	•	Grass tufts as InstancedMesh — max 800 instances
	•	Trees as merged BufferGeometry — merge all tree meshes into one draw call
	•	Shadow map size: 1024×1024 — sufficient for soft look without cost
	•	Frustum culling is automatic in Three.js — rely on it, don't disable
	•	Cap NPC pathfinding to simple linear interpolation — no navmesh needed
	•	Dialogue API calls are debounced — cannot re-send while response is streaming
	•	Target 60fps on a mid-range laptop. If below 40fps, disable shadows via quality toggle.

13. Suggested Implementation Order
For Claude Code, this order minimises blocked work:
	•	Start screen + API key storage
	•	Three.js scene: renderer, camera, lighting, fog
	•	Terrain + one building + player mesh
	•	WASD player controller + third-person camera
	•	Full world geometry: all zones, trees, roads
	•	Galgo mesh + trust system + care actions
	•	NPC meshes + proximity detection + patrol
	•	Dialogue overlay UI + Anthropic API integration
	•	localStorage persistence for all state
	•	HUD + milestone events + ambient audio
	•	Polish: fog tuning, galgo animations, UI warmth

14. Narrative Design — Galgo Discovery & In-Game Guidance

14.1 Discovery System
Galgos are not all visible from the start. The player must discover them through exploration and NPC conversations. This makes the NPCs load-bearing for progression rather than optional flavor.

Starting state:
	•	Only Sombra is visible, near the shelter (trust starts at 55). She is the player's first encounter — already somewhat comfortable around people.
	•	Luna and Rayo do not appear in the world until the player unlocks them through NPC dialogue.

Unlock flow — Luna:
	•	Talking to Dr. Amparo (the vet), she mentions hearing reports of an abandoned galgo spotted out in the dehesa — "thin, fawn-colored, very skittish."
	•	This triggers a hint in the HUD: a subtle directional indicator or zone highlight pointing toward La Dehesa.
	•	Once the player walks into the dehesa zone, Luna spawns (trust starts at 10, traumatised).

Unlock flow — Rayo:
	•	Talking to Miguel (the hunter), after a few exchanges he lets slip that he left a brindle galgo near the edge of the village after the season ended — "couldn't keep him, didn't want to deal with it."
	•	This triggers Rayo spawning near the village outskirts (trust starts at 30, cautious).

Design intent: Each NPC holds a piece of the map. The player has a reason to talk to everyone, not just the NPCs they find sympathetic.

14.2 In-Game Instructions & Hints
The game should gently guide players without breaking immersion. New players currently have no guidance on what to do or how the mechanics work.

First-time tutorial hints (shown once, dismissible):
	•	On game start: "Use WASD to walk. Hold and drag the mouse to look around."
	•	On first NPC proximity: "Press E to talk. These conversations shape the story."
	•	On first galgo proximity: "Press E to care for this galgo. Earning trust takes patience."
	•	After first care action: "Trust builds slowly. Try different actions — sit nearby, offer food, or a gentle touch when the time is right."
	•	After first galgo unlock: "Dr. Amparo mentioned another galgo. Explore the dehesa to find her."

Contextual hints (shown when stuck):
	•	If the player hasn't talked to any NPC after 2 minutes: "The people of this village each know something. Try talking to someone."
	•	If the player has only found Sombra after 5 minutes: "Ask around — someone may know where other galgos have been seen."
	•	If a galgo's trust is stuck (no care action in 3 minutes while near the galgo): "Remember: you can sit nearby quietly, even when other actions are on cooldown."

HUD enhancements:
	•	Discovered galgos show in the trust panel; undiscovered slots show as "???" to hint that more exist.
	•	After an NPC gives a location hint, a subtle golden marker or zone glow appears on the HUD compass.

14.3 Current Architecture Status
The project has been restructured from a single HTML file to a modular Vite project:
	•	src/state.js — shared game state
	•	src/scene.js — Three.js renderer, camera, lights
	•	src/world.js — terrain, buildings, trees, props
	•	src/player.js — player mesh and controller
	•	src/galgos.js — galgo meshes, trust system, care actions
	•	src/npcs.js — NPC definitions, meshes, patrol
	•	src/dialogue.js — dialogue UI + Anthropic API streaming
	•	src/hud.js — trust panel, zone indicator, milestones
	•	src/input.js — keyboard + mouse input
	•	src/main.js — entry point
	•	api/chat.js — Vercel serverless proxy for Anthropic API (key stored server-side)

Deployed at: https://galgos-del-alma.vercel.app
Repo: https://github.com/agarg5/galgos-del-alma

Built with care for the galgos.
