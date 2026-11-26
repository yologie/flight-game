# Sky Courier

[![Make the best flight game](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/yologie/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/yologie/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A courier prop plane over a green island. Fly the chase view through 8
glowing rings, then bring her home and land on the runway — 3 minutes on
the clock, and the ground anywhere but the runway is a crash.

## How to play

- **Arrows / WASD** — pitch and bank (roll turns the plane)
- **W / S** (or Shift / Ctrl, or + / -) — throttle up / down
- **P** — pause, **M** — mute, **Enter** — start / fly again
- Mouse buttons work too: pause, sound, start, restart

## The flight

Rings pay +100 plus a line bonus for flying them fast and level. Missing
one costs the bonus, not the flight. After the last ring — or when the
clock runs out — land on the home runway: slow, level and centred pays up
to +250. Touch down hard and it still counts, just cheaper. Stall below
35 m/s and the plane buffets and sinks, so keep the power in.

The HUD shows altitude, airspeed, heading with a compass strip, throttle,
score, time and rings. The lit instrument panel below has an airspeed
gauge, altimeter, artificial horizon, compass and vertical speed.

## Screenshots

Four deterministic renders of the game's own code (`?shot=` states in
`game/src/shots.js`): `1-play.jpg` (cover — mid-flight, ring ahead),
`2-title.jpg`, `3-ring.jpg` (through the ring), `4-land.jpg` (final
approach, runway centred ahead).

## Run it

```sh
node serve.ts
# open http://127.0.0.1:8080
```

Static files only — `game/index.html` opens in desktop Chrome and plays
with no network request. All art is drawn in code and all sound is
synthesised with WebAudio.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Entry for [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057) on make.fun.
