/** Write-up content. DEMO_GUIDE.md says the same things in fewer words. */

export const INTRO =
  "Users weren't short of information. The trouble was that a disconnect, a software update and someone walking past a sensor all looked equally important. So I changed the screen from a list of facts into an answer: one sentence on how things are, what needs you (if anything), and why, with the raw data still a tap away."

export const ASSUMPTIONS = [
  'There is one home with one hub. The hub has motion sensors in a few rooms and reports its connection, battery, Wi-Fi signal, software version and events.',
  'Other people or pets may be at home while the user is out, so movement on its own is not a problem. What matters is whether it is unusual for that time of day.',
  'The app already knows what a normal day looks like for this home, learned hour by hour from the last few weeks.',
  'The time away starts when the user last closed the app.',
  'While the hub is offline it records nothing, so a gap means missing data, not a quiet house.',
  'The only event types are the ones in the brief. Actions are simulated, and there is no backend.',
]

export const DECISIONS: { title: string; body: string }[] = [
  {
    title: 'Answer first, data second',
    body: 'One sentence replaces eight raw stats. The risk is oversimplifying, so every claim can be traced to the events behind it and the rule that fired.',
  },
  {
    title: 'Three tiers instead of one list',
    body: 'At most three cards for things that need you, then a single "everything else is fine" row, then the details. When everything looks important, nothing gets read.',
  },
  {
    title: 'Compare with normal instead of counting',
    body: '"15 movements" means nothing on its own. "11 movements, typical for this time of day" answers the question the user actually has.',
  },
  {
    title: 'Connect events, and say how sure I am',
    body: 'The 10:18 disconnect came 43 minutes after the 9:35 update, and the 10:42 sync shows the hub recovered. I show that as a likely cause with medium confidence and list the other possibility (a fair Wi-Fi signal) rather than pretending to be certain.',
  },
  {
    title: 'Actions that fit the moment',
    body: 'Each card has one main action. Restart and Update are still there, but they say why they are not needed instead of sitting next to the others as equal choices. Nobody should restart a hub that has already fixed itself.',
  },
  {
    title: 'Keep the logic out of the screen',
    body: 'A small set of plain functions decides everything, and every threshold lives in one place. That made it easy to test, and the same code could run on a server later.',
  },
]

export const NEXT_STEPS = [
  'Learn "normal" properly, handling weekends, holidays and seasons, with thresholds tuned per home.',
  'Decide on notifications: push only for urgent findings, with a daily summary for the rest.',
  'Test with about five people and time how long it takes them to answer "do I need to do anything?" on the old and new screens.',
  'Let "I\'m aware" learn, with snooze and per-type mute.',
  'Support homes with several devices, probably with a room map.',
  'Run a full accessibility check with VoiceOver and TalkBack.',
  'Measure whether it works: time to understanding, how often card actions are used, how often cards are dismissed as false alarms, and support tickets.',
]
