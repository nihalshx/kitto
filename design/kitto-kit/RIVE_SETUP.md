# Black Cat Mascot – Full Body Rive Kit

## What's inside
| File | Use |
|---|---|
| `black_cat_fullbody_rig.svg` | **Import this into Rive.** All body parts, all 11 faces, anger mark and knife as named layers. |
| `expressions/` | 11 emotion SVGs on the full body (reference / stills) |
| `poses/` | 8 key poses: sit_idle, head_tilt, paw_wave, tail_up, tail_swish, squash, jump_peak, land |
| `sheet_emotions.png`, `sheet_poses.png`, `poster_fullbody.png` | Visual previews |

## 1. Import
1. New Rive file → artboard **500 × 800**.
2. Drag `black_cat_fullbody_rig.svg` in. Group names become layer names.

## 2. Layer hierarchy
```
shadow
cat                    ← root (pivot: 250, 764 – bottom centre)
├─ tail
├─ body
│  ├─ haunches
│  ├─ torso
│  └─ seams            (subtle leg / haunch lines)
├─ leg_R
├─ leg_L               (pivot: shoulder 229, 490)
└─ head                (pivot: neck 250, 320)
   ├─ head_shape       (head + ears)
   ├─ whiskers_L / whiskers_R
   ├─ eyes
   │  ├─ eyes_default  (visible)
   │  └─ eyes_neutral · eyes_look_right · eyes_surprised · eyes_sleepy
   │     eyes_angry · eyes_gold · eyes_happy · eyes_blink · eyes_wink   (opacity 0)
   ├─ nose
   ├─ anger_mark       (opacity 0)
   └─ knife            (opacity 0)
```
Pivots are already baked into the SVG transforms, but double-check them in Rive (Alt/Option-drag the origin) before animating.

## 3. Recommended bones
- **Tail:** 4-bone chain from base (352, 732) to tip. Bind the tail stroke for a smooth curl/swish.
- **Body:** optional 2-bone spine (hips → neck) for breathing and squash/stretch.

## 4. Emotions → which layers to show
| Emotion | Show |
|---|---|
| Default (side glance) | eyes_default |
| Neutral stare | eyes_neutral |
| Look right | eyes_look_right |
| Surprised | eyes_surprised |
| Sleepy / unimpressed | eyes_sleepy |
| Angry | eyes_angry + anger_mark |
| Excited | eyes_gold |
| Happy | eyes_happy |
| Blink | eyes_blink |
| Wink | eyes_wink |
| Mischievous | eyes_gold + knife |

Hide the previous face (opacity 0) on the same frame you show the new one.

## 5. Timelines
| Name | Length | Keys |
|---|---|---|
| idle (loop) | 3s | body scaleY 1 → 1.015 → 1 (breathing); tail bones sway ±6°; head rotate ±1.5° |
| blink | 0.18s | eyes_default → eyes_blink → eyes_default |
| look_around | 2s | default → neutral → look_right → neutral |
| head_tilt | 0.6s | head rotate 0 → 12° → 0, eyes_neutral |
| paw_wave | 1.2s | leg_L rotate 0 → 128° → 110° → 128° → 0, eyes_happy |
| tail_swish | 1s | tail bones whip right then settle |
| happy_bounce | 0.8s | 0s sit · 0.1s squash (sx 1.10, sy 0.86) · 0.3s jump (Y −30, sx .97 sy 1.04, tail up) · 0.5s peak · 0.7s land (sx 1.06 sy .92) · 0.8s settle. Shadow scales down while airborne |
| excited | 0.6s | eyes_gold, small hop, tail up |
| sleepy | 1.2s loop | eyes_sleepy, head Y +4 slow nod |
| angry | 0.8s | eyes_angry + anger_mark pulse (scale 1 → 1.2), tail swish fast |
| mischievous | 1.5s | eyes_gold + knife; knife slides in from X −40 with slight wobble |

Easing: cubic ease-out going up, ease-in coming down, 2–3 frames overshoot on settle.

## 6. State machine ("Cat")
**Inputs**
| Name | Type |
|---|---|
| tap | Trigger |
| look | Trigger |
| wave | Trigger |
| special | Trigger |
| sleep | Boolean |
| mood | Number (0 happy · 1 excited · 2 angry · 3 mischievous) |

**Layer 1 – Body:** Entry → Idle. Idle → Happy Bounce on `tap`, → Paw Wave on `wave`, → Look Around on `look`, → Sleepy while `sleep`, → Mischievous on `special`. Any State → Excited / Angry / Mischievous by `mood`. One-shot states exit back to Idle at 100%.

**Layer 2 – Blink:** blink timeline on its own layer every 3–5s, so the cat blinks in any state.

**Layer 3 – Tail:** idle sway loop, overridden by tail_swish when angry.

## 7. Listeners
| Event | Action |
|---|---|
| Pointer down on cat | `tap` |
| Pointer enter | `look` |
| Pointer down on head | `wave` |
| 10s with no input | `sleep = true` (set from code) |

## 8. Web runtime
```js
import { Rive } from "@rive-app/canvas";
const r = new Rive({
  src: "black_cat.riv",
  canvas: document.getElementById("cat"),
  stateMachines: "Cat",
  autoplay: true,
  onLoad: () => {
    const inputs = r.stateMachineInputs("Cat");
    inputs.find(i => i.name === "mood").value = 3; // mischievous
  },
});
```

## Palette
Body #0B0B0B · Seams #262626 · Eye white #FFFFFF · Eye gold #D9A21E · Nose #FFFFFF
Knife handle #4B5059 · Blade #E9ECEE · Anger mark #E53935
Backgrounds: Blue #4E6390 · Green #9FB08A · Red #A8303A · Yellow #F7D64A

---

# Side View, Walk & Jump (added)

## New files
| File | Use |
|---|---|
| `black_cat_side_rig.svg` | **Second rig to import** – side view facing right, 640 × 500 artboard, jointed legs |
| `side_view/` | right, left (mirrored) and 6 side-view emotions |
| `turnaround/` | front, right, left, back |
| `walk_cycle/walk_01–12.svg` | 12-frame walk reference |
| `jump/jump_1–6.svg` | anticipate, launch, air, peak, reach, land |
| `walk_cycle.gif`, `jump.gif` | animated previews |
| `sheet_side_walk_jump.png` | everything on one sheet |

**Left view:** don't build a second rig. Put the side cat in a group and set its scale X to −1, or flip with a Number input (`facing`: 1 / −1).

## Side rig hierarchy
```
side_cat
├─ shadow
└─ cat                     (pivot 300, 448 – ground under the body)
   ├─ tail
   ├─ legs_far             (slightly lighter #1E1E1E so they read behind)
   │  ├─ leg_hind_far  → leg_hind_far_lower
   │  └─ leg_front_far → leg_front_far_lower
   ├─ body (torso, neck)
   ├─ legs_near
   │  ├─ leg_hind_near  → leg_hind_near_lower   (hip pivot 226, 300 · knee +64px)
   │  └─ leg_front_near → leg_front_near_lower  (shoulder pivot 362, 312 · elbow +64px)
   └─ head                 (pivot 390, 250)
      ├─ head_shape, side_whiskers, side_nose
      ├─ eyes: side_eyes_default (visible) · happy · sleepy · angry · gold · blink
      └─ side_knife (opacity 0)
```
Best practice in Rive: replace each leg pair (upper + lower) with a **2-bone chain** and add **IK constraints** to the paws so feet stay planted on the ground line.

## Walk cycle (0.96s loop, 12 frames @ 12.5fps or tween keys)
Lateral-sequence cat gait – leg phase offsets:
| Leg | Offset |
|---|---|
| hind near | 0% |
| front near | 25% |
| hind far | 50% |
| front far | 75% |

Per leg: upper swings ±24° (negative = forward); lower bends up to 42° (front) / 34° (hind) only while the leg swings forward, so the paw lifts.
Body bobs 4px twice per loop, head counter-rotates ±1.5°, tail sways gently.
Key only frames 1, 4, 7, 10 per leg in Rive and let cubic easing fill the rest.

## Jump (≈1s)
| Key | Time | Pose |
|---|---|---|
| anticipate | 0.00s | crouch, scaleY 0.86, haunches loaded |
| launch | 0.15s | body rotate −18°, back legs fully extended, front legs reach |
| air | 0.35s | rise 80px, front paws tucked, happy eyes |
| peak | 0.50s | rise 95px, body level, tail up |
| reach | 0.70s | front legs straight down, body tips forward +16° |
| land | 0.85s | squash scaleY 0.88, blink, then settle at 1.0s |
Shadow shrinks while airborne. Ease-out on the way up, ease-in on the way down.

## Extra state machine inputs
| Name | Type | Use |
|---|---|---|
| walk | Boolean | Idle ↔ Walk loop (side artboard) |
| jump | Trigger | play Jump once, then return |
| facing | Number | 1 = right, −1 = left (bind to cat scale X) |

Tip: keep **front** and **side** as two artboards, then nest both in a main artboard. Switch between them with a `view` input (0 front · 1 side).
