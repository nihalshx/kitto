# Kitto – Rive Setup Guide

Kitto is a curious little black cat SaaS mascot. This kit has everything to build him in Rive: two layered rigs, 13 emotions, 8 poses, a 4-way turnaround, an anatomical IK walk cycle and a jump.

## Folder map
| Folder / file | What it is |
|---|---|
| `rigs/kitto_front_rig.svg` | **Main rig.** Front sitting view, 500 × 800. Every part, emotion, mouth and effect as a named layer |
| `rigs/kitto_side_rig.svg` | **Side rig.** Standing, facing right, 640 × 560. Anatomical legs, ready for IK |
| `emotions/` | 13 emotion stills (front) |
| `poses/` | 8 front poses: sit_idle, head_tilt, paw_wave, tail_flick, squash, hop, land, think |
| `turnaround/` | front, side sitting (right and left), back |
| `side_view/` | standing right and left, plus 8 side emotions |
| `walk_cycle/` | walk_01 to walk_12 |
| `jump/` | anticipate, launch, air, peak, reach, land |
| `previews/` | character sheet, emotion sheet, side/walk/jump sheet, plus `idle.gif`, `walk_cycle.gif`, `jump.gif` |

## Palette
| Name | Hex | Used for |
|---|---|---|
| Charcoal Black | #0B0B0F | body |
| Deep Violet | #46416B | inner ears (gradient #5B5590 → #2F2B4C) |
| Off White | #F8F6F3 | background |
| Soft Pink | #E5A0A7 | nose, tongue |
| Detail line | #34313F | toes, chest fur, mouth |
| Highlight | #2D2B38 | body and head highlight lines |
| Lavender | #DDD7F2 | shadow, background blob |
| Accent | #B9AEE6 | effect marks (zzz, sparkles, dots) |
| Far limbs | #1F1E27 | far-side legs and ear (side view) |

The shading uses SVG gradients (`gBody`, `gHeadF`, `gEar`), which Rive imports as gradient fills.

---

## 1. Front rig (`kitto_front_rig.svg`)
Artboard **500 × 800**. Drag the SVG in; group names become layers.

```
shadow
kitto                      root – pivot 250, 770 (ground centre)
├─ tail                    tapered shape, base at (200, 740) – add a 4-bone chain
├─ body
│  ├─ haunches
│  ├─ torso (+ highlight line, chest fur)
├─ leg_front_R
├─ leg_front_L             pivot 232, 470 (shoulder) – used for paw_wave
└─ head                    pivot 250, 320 (neck)
   ├─ ear_L / ear_R        each with ear_inner_L / ear_inner_R (violet gradient)
   ├─ head_shape           round head with crown and cheek fur tufts, plus highlight
   ├─ whiskers_L / whiskers_R
   ├─ eyes
   │  ├─ eyes_curious      (visible)
   │  └─ eyes_look_left · look_right · thinking · surprised · excited · happy
   │     focused · sleepy · grumpy · sad · blink · wink        (opacity 0)
   ├─ nose
   └─ mouth
      ├─ mouth_neutral     (visible)
      └─ mouth_smile · open · o · frown · flat                 (opacity 0)
effects                    fx_marks · fx_sparkle · fx_zzz · fx_dots (opacity 0)
```

### Emotion recipes
| Emotion | Eyes | Mouth | Effect |
|---|---|---|---|
| Curious (default) | eyes_curious | neutral | – |
| Happy | eyes_happy | smile | – |
| Focused | eyes_focused | flat | – |
| Sleepy | eyes_sleepy | flat | fx_zzz |
| Excited | eyes_excited | open | fx_sparkle |
| Surprised | eyes_surprised | o | fx_marks |
| Thinking | eyes_thinking | flat | fx_dots |
| Grumpy | eyes_grumpy | frown | – |
| Sad | eyes_sad | frown | – |
| Look left / right | eyes_look_left / right | neutral | – |
| Wink | eyes_wink | smile | – |
| Blink | eyes_blink | neutral | – |

---

## 2. Side rig (`kitto_side_rig.svg`) – anatomical, IK-ready
Artboard **640 × 560**, facing right. The ground line is **y = 510**.

```
kitto_side
├─ shadow
└─ kitto                       body root – rotate pivot 312, 370
   ├─ tail                     tapered; base at the rump (206, 340)
   ├─ legs_far                 (#1F1E27, drawn behind the body)
   │  ├─ leg_hind_far  → leg_hind_far_lower    (shin + hock/foot)
   │  └─ leg_front_far → leg_front_far_lower   (forearm + paw)
   ├─ body: torso (curved back, deep chest, tucked belly), back highlight, neck
   ├─ legs_near
   │  ├─ leg_hind_near  → leg_hind_near_lower
   │  └─ leg_front_near → leg_front_near_lower
   └─ head (eyes: side_eyes_curious visible + happy · sleepy · focused · grumpy · excited · surprised · blink)
```

### Real cat anatomy – build these bone chains in Rive
| Leg | Bones | Bend | IK target |
|---|---|---|---|
| Front | shoulder → elbow (72) → wrist (70) → paw (15) | elbow points **back** | wrist, 14px above ground |
| Hind | hip → knee (70) → hock (62) → paw (52) | knee points **forward**, hock points **back** | hock; the foot (hock → toe) stays angled like a high heel |

Joint positions in the standing pose (artboard coordinates):
- **Front:** shoulder (392, 362), neutral paw x = 398.
- **Hind:** hip (232, 358), neutral toe x = 236. The hock sits 24px behind and 46px above the toe.

Add an **IK constraint** on each 2-bone chain, targeting the wrist (front) or hock (hind). Animate only the targets, which keeps the paws planted.

**Left view:** set the root scale X to −1, or bind it to the `facing` input.

---

## 3. Timelines

### Front
| Name | Length | Keys |
|---|---|---|
| idle (loop) | 2.2s | body scaleY ±1.2%, tail sway, head ±1.5°, blink at 70% |
| blink | 0.18s | curious → blink → curious |
| head_tilt | 0.6s | head 0 → 12° → 0 |
| paw_wave | 1.2s | leg_front_L 0 → 132° → 112° → 132° → 0, happy face |
| tail_flick | 0.5s | tail chain whips and settles |
| hop | 0.8s | squash (1.08 / 0.88) → hop (lift 16) → land (1.06 / 0.93) → settle |
| think | 1s | head −8°, eyes_thinking, fx_dots fade in one dot at a time |

### Walk cycle (side, 0.96s loop) – planted-foot cat walk
A real cat walks in a **lateral sequence**: back leg, then the front leg on the same side, then the other side.

| Leg | Phase offset |
|---|---|
| hind near | 0% |
| front near | 25% |
| hind far | 50% |
| front far | 75% |

For each IK target:
- **Stance (62% of the cycle):** the paw stays **on the ground** and slides back 90px at a constant speed. This is what makes it look planted.
- **Swing (38%):** the paw lifts on an arc, 30px high for the front and 26px for the hind, and moves forward 90px with ease-in-out.
- **Front paw:** curls back while swinging. **Hind foot:** the hock flexes up and back.

The body bobs 3px twice per cycle, and the shoulder and hip each rise slightly when their leg is mid-stance. The body pitches ±0.6°, the head counters ±1.5°, and the tail waves on a 1-cycle sine.

For a walking-across-the-screen effect, either move the cat right by 145px per cycle, or keep the cat still and scroll the ground left at 145px per cycle (see `walk_cycle.gif`).

### Jump (side, about 1.2s, interpolated in `jump.gif`)
| Key | Pose |
|---|---|
| anticipate | body drops 16px, all four paws planted, focused face |
| launch | body −22°, hind legs fully extended pushing off, front paws tucked |
| air | up 88px, front legs reach forward, hind legs trail, excited face |
| peak | up 98px, level, all paws tucked under, happy face |
| reach | body +14° nose-down, front legs straight to the ground first |
| land | body drops 16px to absorb, blink, then return to standing |

The shadow shrinks while airborne. Ease out on the way up and ease in coming down.

---

## 4. State machine "Kitto"
| Input | Type | Use |
|---|---|---|
| emotion | Number 0–12 | 0 curious · 1 happy · 2 focused · 3 sleepy · 4 excited · 5 surprised · 6 thinking · 7 grumpy · 8 sad · 9 look_left · 10 look_right · 11 wink · 12 blink |
| tap | Trigger | hop with a happy face |
| wave | Trigger | paw_wave |
| walk | Boolean | side artboard: idle ↔ walk loop |
| jump | Trigger | side artboard: jump once |
| facing | Number | 1 right · −1 left |
| view | Number | 0 front · 1 side (switch nested artboards) |

**Layers**
1. **Body:** Idle → Hop (tap), Wave (wave), Walk (walk), Jump (jump); one-shots return to Idle.
2. **Face:** Any State → emotion timeline by `emotion` value, with a 120 ms blend.
3. **Blink:** random blink every 3–5s, additive.
4. **Tail:** idle sway, overridden by tail_flick.

### SaaS-friendly triggers
| Moment in your product | Set |
|---|---|
| Hover over the mascot | look toward the cursor (bind pupil X to pointer X) |
| Task completed / success toast | `tap` + `emotion = 1` |
| Loading / processing | `emotion = 6` (thinking) |
| Long inactivity | `emotion = 3` (sleepy) |
| Error state | `emotion = 8` (sad) |
| New feature / upgrade | `emotion = 4` (excited) |
| Onboarding hello | `wave` |
| Navigating between pages | `view = 1`, `walk = true` |

## 5. Web runtime
```js
import { Rive } from "@rive-app/canvas";
const kitto = new Rive({
  src: "kitto.riv",
  canvas: document.getElementById("kitto"),
  stateMachines: "Kitto",
  autoplay: true,
  onLoad: () => {
    const inputs = kitto.stateMachineInputs("Kitto");
    inputs.find(i => i.name === "emotion").value = 1;  // happy
    inputs.find(i => i.name === "tap").fire();         // celebratory hop
  },
});
```
