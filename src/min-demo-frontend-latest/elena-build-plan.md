# Elena Fixes — Build Plan & Triage
## Thinking Through What Actually Matters

---

## The Filter

Elena evaluated Min as a production product. Min is a demo that needs to close its first deal. These are different things. A production product needs error handling for edge cases that happen 1% of the time. A demo needs to be flawless on the golden path 100% of the time.

So the filter is: **Does this fix change what happens in a 30-minute demo with a real buyer?**

---

## What I'm Building (7 items)

### 1. Post-briefing actions → "Log Meeting" + "View Family" buttons
**Why:** Elena's right that Briefing is a dead end. The briefing-to-meeting transition is the most natural advisor workflow. In a demo, when the buyer clicks through Briefing and hits a "Home" button, the momentum dies. Two buttons fix this. ~15 min.

### 2. Meeting Logs complete → "View Family" button  
**Why:** Same triage-loop pattern. Compliance → Family works. Meeting → Home is a dead end. One button. ~10 min.

### 3. Post-compliance "next best action"
**Why:** This is the delight item that also fixes a demo flow problem. After a compliance review completes, showing "This household hasn't had a meeting in 60 days — schedule a check-in?" with a one-click bridge to Meeting Logs turns the compliance demo from "look, it checks boxes" into "look, it thinks about what comes next." This is what makes a COO say "this was built by someone who understands my job." ~20 min.

### 4. Replace "Completed" stat card with "Overdue"
**Why:** Elena's point is precise. Every stat card should represent work to be done. A COO's morning question isn't "what went well?" — it's "what's on fire?" Overdue tasks are the fire. This also makes the stat cards more visually interesting — if there are 0 overdue, the card shows green. If there are 5, it shows red. The completed card was always green, which is boring. ~15 min.

### 5. Advisor Scoreboard "Team View" toggle
**Why:** This is politically important. Not every firm wants a leaderboard. The toggle lets Min serve both cultures. Default to Team (aggregate) — COO clicks "Individual" to see names. ~25 min.

### 6. Task Manager grouped view
**Why:** The flat list is Elena's #4 deal-loser and she's right. Not because the demo has 200 tasks — it doesn't — but because the buyer will mentally project "what does this look like with my 200 households?" and a flat list answers "a mess." Grouping by time bucket (Overdue / Today / This Week / Upcoming) is the minimum viable scaling signal. ~30 min.

### 7. Zero-data home screen guidance
**Why:** If someone connects SF and has no data, they see zeros everywhere. In a controlled demo this doesn't happen. But if a buyer tries Min on their own (which David Park would — he tests everything himself), zero-data is the first thing they see. A welcome state with "Let's get started → Onboard your first family" prevents the bounce. ~15 min.

---

## What I'm Skipping (and why)

### Skip: SF error handling (Elena #3)
In a demo, SF doesn't disconnect. In production, yes, this matters. But hardening every callSF wrapper with retry/reconnect logic is 2-3 hours of work that doesn't change any demo interaction. **Ship later.**

### Skip: Hide "Seed Demo Data" (Elena Launch #2)
Valid point but it's a demo tool. When Min ships to real customers, this button doesn't exist. Hiding it now adds complexity (URL param check, dev mode flag) for no demo benefit. **Ship later.**

### Skip: Skeleton loading (Elena Launch #3)
The full-screen spinner appears for 1-2 seconds during home screen load. Skeleton loading is better UX but the current state isn't broken — it's just not polished. **Ship later.**

### Skip: Planning & Goals depth (Elena Launch #4)
Elena's right that it's thin. But deepening Planning (milestones, progress tracking, account linkage) is a 4-6 hour effort that makes one card better. The same time spent on the 7 items above makes the entire product better. **Ship later.**

### Skip: "Monday Morning" narrated summary (Elena Delight #1)
This is a great feature but it's additive — the dashboard already does 80% of this visually. Building a text narrative generator is real work for a delight moment. **Ship later.**

### Skip: Advisor onboarding email (Elena Delight #3)
Requires email infrastructure Min doesn't have. **Ship much later.**

### Skip: Batch compliance (Elena's #1 close-rate feature)
Elena's right that this is the single highest-impact feature. But it's also the most complex — running compliance against 50+ households means parallel/sequential SF queries, a progress UI for a multi-minute operation, and a multi-page PDF generator. That's a 4-8 hour build. It deserves its own focused session, not a line item in a fix batch. **Build next, but separately.**

---

## Build Order

1. Post-briefing actions (Briefing → Meeting + Family)
2. Meeting complete → View Family  
3. Replace "Completed" stat card with "Overdue"
4. Post-compliance next best action
5. Task Manager grouped view
6. Advisor Scoreboard Team View toggle
7. Zero-data home screen

Total estimate: ~2.5 hours. Items 1-3 are small targeted changes. Items 4-7 are moderate.
