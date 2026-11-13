# Home Briefing: demo guide

Ashmit Sanjay Katale, Ogmen Robotics Software Intern Assignment 1 (2026)

Live demo: _Vercel link_
Code: _GitHub link_

## The idea

The current screen isn't missing information. The problem is that a disconnect, a software update and someone walking past a sensor all look equally important. I turned the screen into an answer: one sentence on how things are, what needs you (if anything), and why, with the raw data still a tap away.

## Walkthrough (about two minutes)

1. **Start on "Before (current)"** with the *Needs attention* scenario. Eight stats and six events. Is anything wrong? It's hard to say.
2. **Switch to "After (redesign)".** The verdict reads "Mostly quiet. One thing is worth a look." On the timeline, the ticks are movement, the blue dot is the 9:35 update, and the hatched bit is when the hub couldn't see.
3. **Look at the card.** The best guess is that the 10:18 drop came from the 9:35 update, 43 minutes earlier, with medium confidence. It also lists the other possibility, the fair Wi-Fi signal. Open "Why am I seeing this?" to show the events and the rule.
4. **Tap "Run a connection check".** The card resolves and the verdict changes to "You're all caught up."
5. **Scroll to Controls.** Restart and Update aren't suggested, and each one says why.
6. **Switch to *Urgent*.** The hub has been offline for three hours. Low battery is the likely cause, so it sits inside that card instead of getting a second one. "Try to reconnect" fails, honestly.
7. **Switch to *All quiet*.** Nothing needs you, and the screen stays calm.
8. **Open "How it's built"** if there's time. Pick a step in "How the data flows" to show the live output next to the real code.

The three things I want to land: the answer comes first, events are connected with an honest confidence level, and actions fit the moment.

## Assumptions

- One home with one hub, which has motion sensors in a few rooms.
- Other people or pets may be home, so movement only matters when it's unusual.
- The app knows what a normal day looks like for this home, hour by hour.
- The time away starts when the user last closed the app.
- While the hub is offline it records nothing, so a gap means missing data, not a quiet house.
- Actions are simulated and there's no backend.

## Key decisions

- **Answer first.** One sentence replaces eight stats, and every claim can be traced back to its evidence.
- **Three tiers.** At most three cards, then "everything else is fine", then the details.
- **Compare with normal.** "11 movements, typical for this time of day" instead of a raw list.
- **Honest confidence.** A best guess with alternatives, never false certainty.
- **Actions that fit.** One main action per card. Controls that aren't needed explain why rather than vanish.
- **Logic separate from the screen.** Plain, tested functions with every threshold in one place.

## With more time

- Learn "normal" properly (weekends, holidays) and tune thresholds per home.
- Push only for urgent findings, with a daily summary for the rest.
- Test with about five people, timing "do I need to do anything?" on both screens.
- Snooze and mute, so "I'm aware" can learn.
- Homes with several devices, probably with a room map.
- A full screen reader audit.
- Measure time to understanding, card action rate, false-alarm dismissals and support tickets.
