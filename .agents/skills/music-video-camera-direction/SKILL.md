---
name: music-video-camera-direction
description: Plan and review motivated camera movement, Sokolov-style adjacent-shot continuity and coverage for narrative music videos, including physically imitated jib/crane, robot-arm, drone/aerial and slider/dolly-on-rails moves. Use for shot bibles, storyboards and Qwen Image or MiniMax H3 prompts; movement and continuity choices must serve story, space, performance or music.
---

# Music-video camera direction

Use camera movement to direct attention, reveal geography, accompany an action, transfer power, or mark a change in the music. The name of a rig is not a visual result: describe the path, speed, relationship to the subject, parallax and ending composition so a physical camera or a generative model can reproduce the intended image.

For every storyboard or edit sequence with two or more adjacent shots, run the pairwise continuity audit in [references/cinematic-editing-keyframe-continuity.md](references/cinematic-editing-keyframe-continuity.md). Record each check as `PASS`, `INTENTIONAL BREAK` (with the dramatic reason and the visual cue that makes it legible), or `UNVERIFIED`. Do not silently skip a check. For a standalone frame, use the camera and composition rules below without inventing a neighboring shot.

## Plan the shot before naming the rig

For each shot, state:

1. **Dramatic purpose:** what new fact, feeling or change should the move reveal?
2. **Spatial anchor:** where the subject, foreground, background and practical light begin and end; preserve the scene's geography.
3. **Camera path:** start and end position/height, primary direction, optional secondary axis, distance or angle of travel, and whether the camera leads, follows, passes or circles the subject.
4. **Movement curve:** stillness, acceleration, peak, deceleration and settle/exit point. Avoid a move that starts and stops without relation to the action.
5. **Optics and attention:** proposed lens range, focus plane, depth-of-field intent, focus pull if any, and the detail that must remain readable.
6. **Edit connection:** screen direction, axis, action phase, music cue confidence, cut-in/cut-out handle and whether the next shot continues or deliberately breaks the move.

Use real-world measurements only as production intent. A generated prompt cannot guarantee a specific lens, f-stop, rig, path length or motion profile. Describe the visible result and QC it in the actual output.

## Camera-move palette

| Move | Dramatic use | State the path and guardrails |
|---|---|---|
| **Slider / dolly on rails** | Controlled lateral reveal, foreground parallax, quiet approach to an object or person | Straight track direction and distance; fixed or gently adjusting pan; foreground crossing speed; preserve screen direction and a motivated stop |
| **Jib / crane** | Rise/fall that changes scale or reveals a relationship between person, place and crowd | Start/end height, tilt relationship and what enters/leaves frame; use available vertical clearance; avoid rising solely to make a shot feel expensive |
| **Robot-arm camera** | Precise repeatable orbit, fast but legible sweep, tabletop/turntable detail or a tightly choreographed pass | One designed arc/curve, axis of rotation, radius, speed peak and landing frame; keep the physical camera path smooth and plausible; do not ask for unrelated moves in the same take |
| **Drone / aerial imitation** | Establish a district, cross a roofline, reveal a route or connect street scale to a human destination | Launch/landing or entry/exit, height, direction, yaw, obstacle clearance and scale; respect wind, momentum, sightlines and the grounded visual style; do not insert an aerial view without a geographic or emotional reason |
| **Track / follow / truck** | Keep pace with a moving character or reveal foreground/background layers | Subject-relative speed, screen vector, camera side, distance, occlusion and endpoint; match direction and action phase across cuts |
| **Arc / orbit** | Change allegiance or reveal a hidden side of a person/object | Arc side and extent, subject's gaze/axis, what parallax reveals, and where the orbit stops; keep the background anchored and prevent identity/geometry drift |
| **Pan / tilt / pedestal** | Reframe from a cause to its consequence, follow a vertical gesture or handoff | Start and end framing, pivot or vertical travel, headroom, timing relative to action, and settled composition |
| **Push / pull / zoom** | Change emotional distance or attention | Say whether this is physical camera travel or optical zoom; a push creates parallax, a zoom does not. Do not substitute one for the other. |
| **Handheld / roll / shake** | Embodied urgency, impact or unstable attention | Intensity, duration and source of shake; preserve readable faces, props and horizon unless instability is the point |

## Compound moves and complex passes

Complex moves are welcome when their choreography stays legible. Give each move **one primary path** plus at most the secondary axes that support it: for example, a slider move with a small pan to hold the DJ's gaze; a jib rise with a measured tilt to reveal the listening crowd; a drone-style forward glide with a slow yaw to bring the shop entrance into view; or a robot-arm arc that lands on the needle and groove.

For a designed multi-axis pass, write it in beats: **start/hold → travel → reveal or action peak → settle on an edit point**. Identify which elements are stationary, which move, and how near/mid/far planes pass one another. Use a visible foreground reference when parallax matters. Do not stack pan + tilt + roll + zoom + orbit just to make the prompt sound elaborate.

If one continuous move crosses a geography, actor performance or object interaction that the model cannot keep stable, divide it into separate shots with a clear spatial master, intermediate coverage and a motivated cut. Keep the intended camera vector and screen direction consistent. A match-on-action, graphic match or rhythmic cut may create the impression of a complex move more reliably than one long generated take.

## Music-video rhythm and editing

- Let the actual master and verified cue sheet govern movement accents. Candidate cues stay labelled candidate until conformed; do not infer a downbeat from a spectral hit or a lyric onset from a drum transient.
- Most music-video shots may land around 2–4 seconds, with shorter inserts or longer holds where action and rhythm justify them. Do not put every cut or camera change on a beat by default.
- Alternate movement with a composed hold. Vary shot scale, camera height, vector, depth and visual density; repeated slow push-ins are not a camera style.
- Preserve screen direction, eyelines, action phase, lighting direction and geography. An axis break needs a clear master, camera-crossing move, insert or deliberate change of viewpoint.
- Camera movement should leave handles for an editorial cut. Use short move-ins/settles when a musical impact needs an exact cut; do not force the model to deliver sample-accurate beat timing.

## Qwen Image / MiniMax H3 prompt translation

- A Qwen Image storyboard still describes one decisive frame: camera height/angle, lens intent, framing, subject action phase, focus plane, depth layers, light source and continuity landmarks. It does not prove the move works in video.
- For MiniMax H3, use one dominant physical action chain and a camera path with a clear start/end state. Distinguish source-generation length from the final timeline trim. A 5–8 second source may be cut to a much shorter music-video shot.
- Do not promise guaranteed multi-shot consistency inside one H3 prompt. For hard changes in scale, axis, location or camera rig, generate separate shots/keyframes and assemble them in the NLE.
- Compound movement is allowed when needed, but keep the action understandable and physical. Avoid contradictory direction words, sudden position changes, impossible acceleration, geometry morphing, camera passing through people/props, or an orbit that changes the room layout.
- Name a real rig only when it helps specify the visual path. When equipment is unavailable or purely virtual, request the simulated camera behavior and its parallax/landing image; do not claim that the runtime contains a crane, drone or robot arm.

## QC before selection

Review the complete generated take, not only the prompt or first frame. Check start, middle, peak and end frames at full resolution, plus a contact sheet for temporal drift. Verify:

- the camera truly travels on the intended path and does not fake the move with scale pulsing;
- foreground parallax, background geometry, lens perspective, horizon and focus behaviour agree with that path;
- the subject, face, wardrobe, bicycle/prop and room landmarks remain stable;
- the move has a readable beginning and end, preserves the action and leaves a usable edit handle;
- dark exposure retains the specific detail that carries the story;
- the cut preserves or intentionally changes axis, vector, scale and musical energy.

Reject a take for a concrete continuity, geometry, performance or motion defect; revise the path/action or split coverage instead of adding more adjectives or applying an automatic upscale.
