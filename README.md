# ClassConnect AI

A two-sided school portal prototype — teachers post notes, worksheets, assignments and notices for their class, and answer student doubts; students see only their own class's content, submit assignments, and get help from four AI-flavoured tools. It's built to replace what a school currently coordinates over a WhatsApp group, with four AI touchpoints woven into the core flow instead of bolted on as a separate "chatbot" page.

**For a student:** log in, see your own notes and assignments, submit your work, ask a doubt and get an instant draft answer before your teacher replies, and turn any topic into a flashcard-and-quiz study kit.
**For a teacher:** one shared login, manage students/content/assignments/notices, answer the doubts queue, leave feedback on submissions.
**For a judge:** this is a *working local prototype* — every click does something real against real stored data, not a static mockup. Open `index.html` and it is already mid-use: populated classes, a resolved doubt thread, a graded submission, a pending doubt sitting in the queue, real notices.

## What's real logic vs. simulated — read this before judging the "AI"

This runs with **no backend and no API key**, by design, so it can be opened and judged with zero setup. That means two of the four AI features are genuinely computed, and two are simulated for the demo. The code says this in its own comments too (see the top of `js/ai-mock.js`), but to be upfront about it here:

| Feature | Status | How it actually works |
|---|---|---|
| **Exam Countdown Planner** | **Real logic** | Pure date arithmetic + a scheduling algorithm in `js/ai-mock.js` (`generateExamPlan`). Computes real days-remaining, distributes subjects across real calendar days, reserves a genuine revision block near the exam, and adapts to a same-day/next-day exam. No model involved — every plan is actually calculated from the inputs. |
| **Ask the School** | **Real logic** | A real keyword search (`answerSchoolQuestion`) over the notices stored in `localStorage` — tokenizes the question, scores every notice's title/body for overlap, and returns the best-matching sentence(s). If nothing scores above zero, it says plainly that it doesn't have that information, rather than inventing an answer. |
| **AI doubt first-pass** | **Simulated** | `answerDoubt` matches the question's keywords against five hand-written example Q&As (Biology, Math, Physics, History, Science). No match → a template that still references the actual subject and question text, so it never looks broken. An artificial 1-2s "thinking" delay is deliberate, so the loading state demonstrates itself honestly. |
| **Notes → Study Kit** | **Simulated** | `generateStudyKit` matches the topic against five fully hand-written kits (summary + 6 flashcards + 5-question quiz + simplified explanation). No match → a structural fallback built from your own topic text (the fallback quiz asks about study *technique*, not invented facts, since we have no real content to quiz you on). |

**Why simulate at all, and how this becomes real:** every one of these four functions is `async` and takes a plain-data argument and returns a plain-data result — exactly the shape a `fetch()` call to a real backend has. Swapping `answerDoubt()` and `generateStudyKit()` for a real call to Cloudflare Workers AI (`env.AI.run(...)`) or any other LLM API later means rewriting the *inside* of those two functions only. Nothing in `student.js` needs to change, because it only ever knows "I awaited a function and got an answer object back." `generateExamPlan` and `answerSchoolQuestion` would stay exactly as they are even behind a real backend — they're not something an LLM should be doing anyway.

## Architecture, in plain language

There is no server. `localStorage` plays the role a database would:

- **`js/data.js`** is the only file that touches `localStorage` directly. Every other file calls functions like `CC.Data.getContentForClass(...)` or `CC.Data.addSubmission(...)`. On first load, if `localStorage` is empty, it seeds a full dataset (see below) so the app never looks empty.
- **`js/auth.js`** handles login, signup, and "session" (just a user id written to `localStorage`). It says plainly in its own comment that this is **not a security boundary** — there's no server to check anything against, so this is session *bookkeeping* for a single-browser demo, not authentication in the real sense. A real deployment would move this server-side: hashed passwords, a signed httpOnly session cookie, and every protected request re-deriving the user from that cookie rather than trusting anything the client claims.
- **`js/ai-mock.js`** is the AI layer described in the table above.
- **`js/ui.js`** holds small shared DOM helpers (escaping, toasts, the tab switcher, a view-content modal) used by both dashboards.
- **`js/student.js`** / **`js/admin.js`** render each dashboard and wire up its forms. They never touch `localStorage` directly — only through `CC.Data`.

Scoping (a student seeing only their own class/section) is enforced by always reading `className`/`section` off the logged-in session object, never from anything the UI could be tricked into passing in. Two seeded students in a different class (`9-B`) exist specifically so you can confirm the demo student (`10-A`) never sees their content.

## Running it

No build step, no install. Either works:

- **Open directly:** double-click `index.html` (or any of the four HTML files) in a browser.
- **Or serve it locally** (sometimes nicer for file:// quirks around fonts/localStorage in some browsers):
  ```bash
  python3 -m http.server 8000
  ```
  then visit `http://localhost:8000`.

## Demo credentials

| Role | ID | Password |
|---|---|---|
| Teacher (shared) | `teacher` | `teach123` |
| Student (seeded demo account) | `10A07` | `student123` |

**Student sign up code:** `CLASSCONNECT2026` (shown on the sign-up page too — a teacher would hand this out to their class).

## What's already populated on first load

- The shared teacher account, plus three seeded students: the demo student (class **10-A**) and two students in a *different* class (**9-B**) to prove scoping actually works.
- Six content items (notes, a worksheet, video links) across six subjects, split across both classes.
- Two assignments for class 10-A: **Photosynthesis Lab Report** (already submitted by the demo student, with teacher feedback already filled in) and **Quadratic Equations Practice Set** (still open, so you can submit it live).
- One fully resolved doubt thread from the demo student (AI draft + teacher's final answer), and one pending doubt from a 9-B student sitting unanswered in the teacher's queue.
- Four notices, including the real "Inter House Web Designing Competition (AI Based)" announcement this project was built for.

## What each feature does

- **Content** — notes/worksheets (viewable inline) and video links, scoped to your class.
- **Assignments** — see instructions and due date, submit text + an optional file, see status (open/late/submitted/feedback received) and your teacher's feedback once given.
- **Doubts** — ask a question, get an instant AI first-pass answer, then see your teacher's real reply once it arrives.
- **Study Kit** — paste a topic, get a summary, 6 flippable flashcards, and an interactive 5-question quiz with a running score.
- **Exam Planner** — enter your exam date, subjects, and daily hours; get a real day-by-day revision schedule.
- **Ask the School** — ask a question and get an answer pulled from the actual posted notices, or an honest "I don't have that" if nothing matches.
- **Notices** — the school's announcement board.
- **Teacher side** — add students directly, post content/assignments/notices, review submissions and leave feedback, and clear the doubts queue.

## Resetting the demo

Click **"Reset demo data"** — it's on the login page and in the teacher dashboard header. It clears everything in `localStorage` (including any accounts, submissions, or doubts added during this session) and reseeds the original dataset from scratch, so you can hand the laptop to the next judge with a clean slate.
