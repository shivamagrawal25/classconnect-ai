/**
 * ai-mock.js — the app's "AI" layer.
 *
 * HONESTY NOTE (read this before anything else in the file): two of the four
 * AI features here are simulated, and two are genuinely computed. This file
 * says which is which at the top of each function, not just here, because
 * that's the kind of thing a reader shouldn't have to go hunting for.
 *
 *   - answerDoubt()        → SIMULATED. Matches the question against a small
 *                            set of hand-written example answers, or falls
 *                            back to a template. No model is called.
 *   - generateStudyKit()   → SIMULATED, same approach: curated examples with
 *                            a templated fallback.
 *   - generateExamPlan()   → REAL. This is just date arithmetic and a
 *                            scheduling algorithm — every plan it returns is
 *                            actually computed from the inputs given.
 *   - answerSchoolQuestion()→ REAL. A keyword search over the notices stored
 *                            in localStorage — no fabricated answers.
 *
 * Why simulate at all, and why this way: a real deployment would swap
 * answerDoubt() and generateStudyKit() for a fetch() to a backend that calls
 * Workers AI (or any LLM API). Every function below already returns a
 * Promise and takes a plain-data argument, which is exactly the shape an
 * async fetch() call has — so making that swap later means replacing the
 * body of these two functions only. Nothing in student.js or admin.js would
 * need to change, because they only ever see "the function returns a
 * promise that resolves to an answer object."
 *
 * The artificial delay in the two simulated functions exists on purpose: it
 * makes the "AI is thinking" loading state demonstrate itself honestly,
 * instead of resolving instantly in a way that would look fake in a demo.
 */

var CC = window.CC || (window.CC = {});

(function (CC) {
  const THINKING_DELAY_MS = [1100, 1800]; // randomised range, see delay() below

  function delay(rangeMs) {
    const [min, max] = rangeMs;
    const ms = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Picks the example whose keyword list has the most hits inside `text`
  // (case-insensitive substring match). Returns null if nothing matches at
  // all, so callers can fall back to a template instead of guessing.
  function bestKeywordMatch(text, examples) {
    const haystack = text.toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const example of examples) {
      let score = 0;
      for (const kw of example.keywords) {
        if (haystack.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = example;
      }
    }
    return bestScore > 0 ? best : null;
  }

  // -----------------------------------------------------------------------
  // SIMULATED: doubt first-pass answers
  // -----------------------------------------------------------------------
  const DOUBT_EXAMPLES = [
    {
      keywords: ["photosynthesis", "sunlight", "chlorophyll", "light reaction"],
      answer:
        "Great question! Plants need sunlight because it's the actual energy source that powers " +
        "photosynthesis — chlorophyll in the leaf absorbs light energy and converts it into chemical " +
        "energy (ATP and NADPH). Without that input of light energy, a plant has no way to split water " +
        "molecules or power the Calvin cycle that builds glucose. Think of sunlight as the fuel and " +
        "chlorophyll as the part of the engine that catches it. This is why plants kept in the dark stop " +
        "growing and eventually use up their stored starch reserves.",
    },
    {
      keywords: ["quadratic", "discriminant", "roots", "factorise", "factorize"],
      answer:
        "The fastest way in is the discriminant, b²-4ac — it tells you what kind of roots you're " +
        "about to get before you even solve anything. Positive means two distinct real roots, zero " +
        "means one repeated root, and negative means no real roots at all. If the numbers look like they " +
        "factorise neatly (two integers that multiply to 'c' and add to 'b'), factorising is quicker than " +
        "the quadratic formula. If they don't, the formula x = (-b ± √(b²-4ac)) / 2a always works, no " +
        "matter how ugly the numbers are.",
    },
    {
      keywords: ["newton", "law of motion", "inertia", "force", "acceleration"],
      answer:
        "Newton's second law, F = ma, is usually the one tripping people up here. It says the force " +
        "needed is directly proportional to both the mass you're moving and the acceleration you want — " +
        "double the mass and you need double the force for the same acceleration. The first law " +
        "(inertia) is really just the special case where force is zero: nothing changes about the " +
        "object's motion. And the third law is about the OTHER object in the interaction — whatever " +
        "force you apply, something pushes back on you exactly as hard, just in the opposite direction.",
    },
    {
      keywords: ["french revolution", "bastille", "monarchy", "estates", "1789"],
      answer:
        "The short version: France was broke, taxes fell almost entirely on the Third Estate " +
        "(commoners), and that group had the least political power despite being the vast majority of " +
        "the population. When they broke away to form the National Assembly and then stormed the " +
        "Bastille on 14 July 1789, it became the symbolic start of the Revolution. From there it escalated " +
        "quickly — the monarchy was abolished in 1792, Louis XVI was executed in 1793, and the Reign of " +
        "Terror followed before Napoleon eventually took over in 1799.",
    },
    {
      keywords: ["balance", "chemical equation", "reactants", "products", "coefficient"],
      answer:
        "Balancing is really just bookkeeping for atoms. Count every element on both sides first, " +
        "then adjust the coefficients — the big numbers in front of a formula — until both sides match; " +
        "never touch the small subscript numbers, since that changes what substance it actually is. A " +
        "good trick is to balance whichever element appears in the fewest compounds first, then work " +
        "outward, re-checking the WHOLE equation after every change, since fixing one element can " +
        "accidentally un-balance one you already fixed.",
    },
  ];

  function doubtFallback(subject, question) {
    return (
      `That's a thoughtful question about ${subject}. I don't have a specific pre-built answer for ` +
      `"${question}" yet, but here's how to approach it: break it into the core concept being tested, ` +
      `re-read the relevant section of your ${subject} notes, and try working through a simpler version ` +
      `of the same idea first. Your teacher will follow up shortly with a complete, question-specific answer.`
    );
  }

  CC.AI = CC.AI || {};

  // SIMULATED. See the file header. Always resolves — there is no "AI failed"
  // state in this prototype, since nothing is actually being called.
  CC.AI.answerDoubt = async function answerDoubt(subject, question) {
    await delay(THINKING_DELAY_MS);
    const match = bestKeywordMatch(`${subject} ${question}`, DOUBT_EXAMPLES);
    return { answer: match ? match.answer : doubtFallback(subject, question) };
  };

  // -----------------------------------------------------------------------
  // SIMULATED: notes → study kit
  // -----------------------------------------------------------------------
  const STUDY_KIT_EXAMPLES = [
    {
      topic: "Photosynthesis",
      keywords: ["photosynthesis", "chlorophyll", "calvin cycle", "light reaction", "plant food"],
      summary:
        "Photosynthesis is the process green plants use to convert light energy into chemical energy " +
        "stored in glucose. It happens in two stages inside the chloroplast: the light-dependent " +
        "reactions in the thylakoid membrane, which split water and generate ATP/NADPH, and the " +
        "light-independent Calvin cycle in the stroma, which uses that energy to fix CO2 into glucose. " +
        "Oxygen is released as a byproduct of splitting water, which is why plants are central to Earth's " +
        "oxygen supply.",
      flashcards: [
        { front: "What are the two main stages of photosynthesis?", back: "The light-dependent reactions (thylakoid membrane) and the light-independent Calvin cycle (stroma)." },
        { front: "What pigment absorbs light for photosynthesis?", back: "Chlorophyll, found in the chloroplasts of plant cells." },
        { front: "What gas is released as a byproduct?", back: "Oxygen, released when water molecules are split (photolysis)." },
        { front: "What two energy carriers does the light reaction produce?", back: "ATP and NADPH, used to power the Calvin cycle." },
        { front: "What enzyme drives carbon fixation in the Calvin cycle?", back: "RuBisCO." },
        { front: "What is the overall input and output of photosynthesis?", back: "Input: CO2 + water + light energy. Output: glucose + oxygen." },
      ],
      quiz: [
        { question: "Where do the light-dependent reactions occur?", options: ["Stroma", "Thylakoid membrane", "Mitochondria", "Nucleus"], correct: 1, explanation: "The thylakoid membrane holds the chlorophyll and electron transport chains needed for the light reactions." },
        { question: "Which gas is released during photosynthesis?", options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Methane"], correct: 2, explanation: "Oxygen is released when water is split during the light reactions." },
        { question: "What does the Calvin cycle use to fix carbon dioxide?", options: ["Sunlight directly", "ATP and NADPH", "Oxygen", "Chlorophyll"], correct: 1, explanation: "The Calvin cycle runs on the ATP and NADPH made earlier, not on light itself." },
        { question: "Which enzyme is central to the Calvin cycle?", options: ["Amylase", "RuBisCO", "Pepsin", "Catalase"], correct: 1, explanation: "RuBisCO catalyses the fixation of CO2 onto a five-carbon sugar, starting the Calvin cycle." },
        { question: "What is the final product of photosynthesis the plant can store or use?", options: ["Water", "Glucose", "Oxygen", "Carbon dioxide"], correct: 1, explanation: "Glucose is the sugar built by the Calvin cycle, stored as starch or used for energy." },
      ],
      simplified:
        "Plants eat sunlight, basically. They catch light with the green chlorophyll in their leaves, use " +
        "that energy to split water and make two quick energy packets (ATP and NADPH), then spend those " +
        "packets building sugar out of carbon dioxide from the air. Oxygen is just the leftover from " +
        "splitting the water — lucky for us, since we breathe it.",
    },
    {
      topic: "Newton's Laws of Motion",
      keywords: ["newton", "law of motion", "inertia", "force", "acceleration", "action reaction"],
      summary:
        "Newton's three laws describe how forces affect motion. The first law (inertia) says an object " +
        "stays at rest or in uniform motion unless acted on by a net force. The second law quantifies " +
        "this as F = ma — force equals mass times acceleration. The third law says every action has an " +
        "equal and opposite reaction, which is why a rocket moves forward by pushing exhaust gas backward.",
      flashcards: [
        { front: "What does Newton's First Law describe?", back: "Inertia — an object keeps its state of motion unless a net external force acts on it." },
        { front: "What is the formula for Newton's Second Law?", back: "F = ma (force equals mass times acceleration)." },
        { front: "What does Newton's Third Law say?", back: "For every action there is an equal and opposite reaction." },
        { front: "Why does a rocket move forward?", back: "It pushes exhaust gas backward; the reaction force pushes the rocket forward (Third Law)." },
        { front: "If mass doubles and force stays the same, what happens to acceleration?", back: "Acceleration halves, since a = F/m." },
        { front: "What is inertia?", back: "An object's tendency to resist a change in its state of motion." },
      ],
      quiz: [
        { question: "Which law is also called the law of inertia?", options: ["Second Law", "Third Law", "First Law", "Law of Gravitation"], correct: 2, explanation: "The First Law describes inertia — resistance to a change in motion." },
        { question: "If a 2 kg object accelerates at 3 m/s², what force acts on it?", options: ["1.5 N", "5 N", "6 N", "9 N"], correct: 2, explanation: "F = ma = 2 × 3 = 6 N." },
        { question: "A book resting on a table is in equilibrium because:", options: ["No forces act on it", "Gravity and the normal force cancel out", "It has no mass", "It is accelerating"], correct: 1, explanation: "Gravity pulls it down and the table's normal force pushes up with equal magnitude." },
        { question: "Newton's Third Law explains why:", options: ["Objects slow down due to friction", "A swimmer pushes water backward to move forward", "Heavier objects fall faster", "Mass affects weight"], correct: 1, explanation: "The swimmer pushes water back (action); the water pushes the swimmer forward (reaction)." },
        { question: "Doubling the force on a fixed mass will:", options: ["Double the acceleration", "Halve the acceleration", "Leave acceleration unchanged", "Double the mass"], correct: 0, explanation: "Since a = F/m, doubling F with m fixed doubles a." },
      ],
      simplified:
        "Newton basically explained why things start, stop, speed up, or push back. Rule 1: stuff keeps " +
        "doing what it's doing unless something pushes or pulls it. Rule 2: the harder you push (or the " +
        "lighter the thing), the faster it speeds up. Rule 3: whenever you push on something, it pushes " +
        "back on you exactly as hard.",
    },
    {
      topic: "The French Revolution",
      keywords: ["french revolution", "bastille", "monarchy", "estates", "robespierre", "1789"],
      summary:
        "The French Revolution (1789-1799) grew out of a financial crisis, unfair taxation, and the " +
        "Third Estate's exclusion from real political power. It began when the Third Estate broke away " +
        "to form the National Assembly, and turned symbolically violent with the Storming of the Bastille " +
        "on 14 July 1789. The monarchy was abolished in 1792 and Louis XVI executed in 1793, followed by " +
        "the Reign of Terror under Robespierre, before Napoleon seized power in 1799.",
      flashcards: [
        { front: "What event is considered the symbolic start of the Revolution?", back: "The Storming of the Bastille, 14 July 1789." },
        { front: "What were the three Estates?", back: "First (clergy), Second (nobility), Third (commoners — the majority, with the least power)." },
        { front: "When was the monarchy abolished?", back: "1792, when France was declared a Republic." },
        { front: "What was the Reign of Terror?", back: "A period (1793-94) of mass executions led by the Committee of Public Safety under Robespierre." },
        { front: "Who ended the revolutionary period by seizing power in 1799?", back: "Napoleon Bonaparte." },
        { front: "What document, adopted in August 1789, laid out revolutionary ideals?", back: "The Declaration of the Rights of Man and of the Citizen." },
      ],
      quiz: [
        { question: "Which Estate made up the vast majority of the population but held the least formal power?", options: ["First Estate", "Second Estate", "Third Estate", "The clergy"], correct: 2, explanation: "The Third Estate (commoners) was by far the largest group, yet had the least political representation." },
        { question: "What happened on 14 July 1789?", options: ["Louis XVI was executed", "The Storming of the Bastille", "Napoleon seized power", "The Reign of Terror began"], correct: 1, explanation: "The Storming of the Bastille is the Revolution's symbolic starting event." },
        { question: "In which year was the French monarchy formally abolished?", options: ["1789", "1799", "1792", "1794"], correct: 2, explanation: "France was declared a Republic in 1792, ending the monarchy." },
        { question: "Who led the Committee of Public Safety during the Reign of Terror?", options: ["Napoleon Bonaparte", "Louis XVI", "Robespierre", "Marie Antoinette"], correct: 2, explanation: "Robespierre led the Committee of Public Safety during the Terror of 1793-94." },
        { question: "What ended the revolutionary period in 1799?", options: ["The execution of Louis XVI", "Napoleon's seizure of power", "The Storming of the Bastille", "The Declaration of Rights"], correct: 1, explanation: "Napoleon Bonaparte's coup in 1799 is generally taken as the end of the revolutionary period." },
      ],
      simplified:
        "France was broke and unfair: the people doing all the paying (the Third Estate) had almost none " +
        "of the power. They finally said enough, stormed a prison-fortress (the Bastille) as a show of " +
        "force, and things snowballed — no more king, then a scary period where the new government " +
        "executed anyone it saw as a threat, and finally a soldier named Napoleon just took charge.",
    },
    {
      topic: "Quadratic Equations",
      keywords: ["quadratic", "discriminant", "roots", "factorise", "factorize", "parabola"],
      summary:
        "A quadratic equation has the form ax² + bx + c = 0, where a ≠ 0. It can be solved by " +
        "factorisation when the expression splits neatly, or always by the quadratic formula " +
        "x = (-b ± √(b²-4ac)) / 2a. The discriminant (b²-4ac) tells you how many real roots exist: " +
        "positive means two distinct real roots, zero means one repeated root, and negative means no " +
        "real roots (the graph never touches the x-axis).",
      flashcards: [
        { front: "What is the standard form of a quadratic equation?", back: "ax² + bx + c = 0, with a ≠ 0." },
        { front: "What is the quadratic formula?", back: "x = (-b ± √(b²-4ac)) / 2a." },
        { front: "What does the discriminant tell you?", back: "How many real roots: positive → two, zero → one (repeated), negative → none." },
        { front: "What shape does a quadratic function graph as?", back: "A parabola." },
        { front: "When is factorisation the fastest method?", back: "When the quadratic splits neatly into two integer-coefficient factors." },
        { front: "If the discriminant is negative, where does the parabola sit relative to the x-axis?", back: "Entirely above or entirely below it — it never crosses, so there are no real roots." },
      ],
      quiz: [
        { question: "What is the discriminant of x² - 5x + 6 = 0?", options: ["1", "-1", "25", "11"], correct: 0, explanation: "b²-4ac = 25 - 24 = 1." },
        { question: "How many real roots does a quadratic with a negative discriminant have?", options: ["Two", "One", "Zero", "Infinite"], correct: 2, explanation: "A negative discriminant means the square root term is imaginary, so there are no real roots." },
        { question: "What are the roots of x² - 5x + 6 = 0?", options: ["2 and 3", "1 and 6", "-2 and -3", "2 and -3"], correct: 0, explanation: "(x-2)(x-3) = 0, so x = 2 or x = 3." },
        { question: "What shape does y = ax² + bx + c graph as?", options: ["A straight line", "A parabola", "A circle", "A hyperbola"], correct: 1, explanation: "Quadratic functions always graph as a parabola." },
        { question: "If the discriminant equals zero, how many real roots are there?", options: ["Zero", "One (repeated)", "Two distinct", "Cannot tell"], correct: 1, explanation: "A zero discriminant means the two roots coincide into a single repeated root." },
      ],
      simplified:
        "A quadratic is just an equation with an x² in it. There's a universal formula that solves ANY " +
        "quadratic — you plug in a, b, c. Before you even solve it, one number (the discriminant) tells " +
        "you what kind of answer you're going to get: two answers, one answer, or no real answer at all.",
    },
    {
      topic: "Balancing Chemical Equations",
      keywords: ["balance", "chemical equation", "reactants", "products", "coefficient", "conservation of mass"],
      summary:
        "Balancing a chemical equation means adjusting the coefficients (the numbers in front of each " +
        "formula) so the same number of atoms of each element appears on both sides — this reflects the " +
        "Law of Conservation of Mass. You can only change coefficients, never the subscripts inside a " +
        "formula, since that would change what substance it actually is. A good strategy is to balance " +
        "the element that appears in the fewest compounds first, then work outward, re-checking the whole " +
        "equation after every change.",
      flashcards: [
        { front: "What law does balancing an equation reflect?", back: "The Law of Conservation of Mass — matter is neither created nor destroyed in a chemical reaction." },
        { front: "What can you change when balancing: coefficients or subscripts?", back: "Only coefficients. Changing a subscript changes the substance itself." },
        { front: "What's a good first step when balancing?", back: "Balance the element that appears in the fewest compounds first." },
        { front: "In Fe + O2 → Fe2O3, what are the balanced coefficients?", back: "4 Fe + 3 O2 → 2 Fe2O3." },
        { front: "Why re-check the whole equation after each change?", back: "Balancing one element can un-balance another you'd already fixed." },
        { front: "What are the substances on the left side of an equation called?", back: "Reactants (the products are on the right)." },
      ],
      quiz: [
        { question: "What must stay equal on both sides of a balanced chemical equation?", options: ["Number of molecules", "Number of atoms of each element", "Volume", "Color"], correct: 1, explanation: "Balancing ensures the same count of each element's atoms on both sides." },
        { question: "What's wrong with changing a subscript to balance an equation?", options: ["Nothing, it's allowed", "It changes the identity of the substance", "It only affects volume", "Subscripts can't be read by students"], correct: 1, explanation: "Changing a subscript (e.g. H2O to H2O2) turns it into a different compound entirely." },
        { question: "In 2H2 + O2 → 2H2O, how many hydrogen atoms are on each side?", options: ["2", "4", "6", "8"], correct: 1, explanation: "2H2 gives 4 H atoms on the left, and 2H2O gives 4 H atoms on the right." },
        { question: "What are the starting substances in a chemical equation called?", options: ["Products", "Reactants", "Catalysts", "Coefficients"], correct: 1, explanation: "Reactants are on the left side, before the arrow; products are on the right." },
        { question: "Which law explains why equations must be balanced?", options: ["Law of Conservation of Energy", "Newton's Third Law", "Law of Conservation of Mass", "Boyle's Law"], correct: 2, explanation: "The Law of Conservation of Mass says matter isn't created or destroyed, so atom counts must match." },
      ],
      simplified:
        "Balancing an equation is just making sure you haven't 'lost' or 'invented' any atoms on paper. " +
        "You're only allowed to change the big numbers in front of each formula, never the little numbers " +
        "stuck inside it — those little numbers define what the substance actually is.",
    },
  ];

  function studyKitFallback(topic) {
    return {
      topic,
      isFallback: true,
      summary:
        `Here's a starting study structure for "${topic}". This exact topic isn't one of our deeply ` +
        `curated kits yet, so treat this as a framework to fill in using your own notes and textbook, ` +
        `rather than a complete answer.`,
      flashcards: [
        { front: `What is the core definition of ${topic}?`, back: "Check your textbook's definition and write it in your own words here." },
        { front: `What's one real-world example of ${topic}?`, back: "Think of a situation from daily life or the chapter's examples that illustrates this." },
        { front: `What's a common mistake students make with ${topic}?`, back: "Review your teacher's feedback or the chapter summary for common pitfalls." },
        { front: `How does ${topic} connect to the previous chapter?`, back: "Look for the concept this topic builds on — most chapters link to what came before." },
        { front: `What formula or rule is central to ${topic}?`, back: "Find the key formula/rule in your notes and practice applying it." },
        { front: `What question type usually appears on ${topic} in exams?`, back: "Check previous years' papers for the typical question style on this topic." },
      ],
      // Note the fallback quiz asks about STUDY TECHNIQUE, not facts about the
      // topic itself — since this file has no real content for an
      // unrecognised topic, inventing "correct" facts would be worse than
      // admitting the gap. These five answers are genuinely correct study
      // advice, applicable to any topic.
      quiz: [
        { question: `What's the best first step before diving deep into "${topic}"?`, options: ["Skip straight to past papers", "Skim the chapter for key terms first", "Memorize without understanding", "Ignore the diagrams"], correct: 1, explanation: "Skimming for key terms first gives you a mental map before you go deep — true for any topic." },
        { question: `When reviewing "${topic}", what should flashcards focus on?`, options: ["Copying the textbook word-for-word", "Key terms and definitions in your own words", "Irrelevant details", "Nothing, flashcards don't help"], correct: 1, explanation: "Putting definitions in your own words is what makes them stick." },
        { question: `If you get a practice question on "${topic}" wrong, what's the best next step?`, options: ["Skip it and move on", "Re-derive where your understanding broke down", "Memorize the answer only", "Avoid that topic in the exam"], correct: 1, explanation: "Finding exactly where your reasoning broke down is more useful than memorizing one answer." },
        { question: `How can you check if you've really understood "${topic}"?`, options: ["Explain it out loud without notes", "Just re-read the chapter once", "Highlight the textbook", "Guess on a quiz"], correct: 0, explanation: "If you can explain a topic out loud without checking notes, you understand it (the Feynman technique)." },
        { question: `What's a reliable way to find the kind of "${topic}" questions your exam will ask?`, options: ["Ignore past papers", "Review 2-3 years of past exam papers on this topic", "Only study the easiest part", "Ask a friend to guess"], correct: 1, explanation: "Past papers are the best predictor of question style and difficulty for any topic." },
      ],
      simplified:
        `In plain terms: "${topic}" is still being added to our curated library, so start by identifying ` +
        `its 2-3 most important ideas in your textbook, then explain each one to yourself in a single ` +
        `simple sentence. That's the fastest way to turn any new topic into something you actually understand.`,
    };
  }

  // SIMULATED. Returns { topic, isFallback, summary, flashcards, quiz, simplified }.
  CC.AI.generateStudyKit = async function generateStudyKit(topicInput) {
    await delay(THINKING_DELAY_MS);
    const match = bestKeywordMatch(topicInput, STUDY_KIT_EXAMPLES);
    if (match) {
      return { topic: match.topic, isFallback: false, summary: match.summary, flashcards: match.flashcards, quiz: match.quiz, simplified: match.simplified };
    }
    return studyKitFallback(topicInput);
  };

  // Synchronous accessor for the "Example" kit shown before the student
  // generates anything. Always the Photosynthesis example, for consistency.
  CC.AI.getExampleStudyKit = function getExampleStudyKit() {
    const example = STUDY_KIT_EXAMPLES[0];
    return { topic: example.topic, isFallback: false, summary: example.summary, flashcards: example.flashcards, quiz: example.quiz, simplified: example.simplified };
  };

  // -----------------------------------------------------------------------
  // REAL: exam countdown planner (pure date math + scheduling, no AI call)
  // -----------------------------------------------------------------------
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function daysUntil(examDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(`${examDateStr}T00:00:00`);
    return Math.round((exam - today) / MS_PER_DAY);
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  const FOCUS_PHRASES = [
    (s) => `spend today building real understanding of ${s} — not just reading, actually working through examples`,
    (s) => `today is for ${s}: slow down on the parts that didn't click the first time`,
    (s) => `give ${s} a focused pass today — concepts first, speed later`,
  ];
  const REVISION_PHRASES = [
    (list) => `do a full run-through of ${list} — quick recall, not new learning`,
    (list) => `this is a polishing day: skim ${list} and fix any shaky spots before the exam`,
    (list) => `final review of ${list} — you're consolidating, not cramming`,
  ];

  function splitHours(total, count) {
    const each = round1(total / count);
    return each;
  }

  // Builds the day-by-day plan. Pure function of its inputs — call it twice
  // with the same arguments and you get the same plan back.
  CC.AI.generateExamPlan = function generateExamPlan({ examDate, subjects, hoursPerDay }) {
    subjects = subjects.map((s) => s.trim()).filter(Boolean);
    hoursPerDay = Number(hoursPerDay) || 1;
    const remaining = daysUntil(examDate);

    if (remaining <= 1) {
      // Exam is today, tomorrow, or (edge case) already past — one
      // last-minute plan instead of a multi-week schedule.
      const label = remaining <= 0 ? "Today" : "Tomorrow";
      const hoursEach = splitHours(hoursPerDay, subjects.length || 1);
      return {
        daysUntil: remaining,
        intro:
          remaining <= 0
            ? "Exam day is here — this is a last-minute, high-yield review, not a full re-learn."
            : "Only one day left, so this plan is deliberately light and focused: a quick pass over everything, not new learning.",
        days: [
          {
            day: 1,
            label,
            tone: "final-review",
            note: `Run through every subject once, in short bursts, focusing only on formulas, key dates, and definitions you're least sure of.`,
            subjects: subjects.map((s) => ({ name: s, hours: hoursEach })),
          },
        ],
      };
    }

    // Reserve the last ~20% of days (minimum 1) for cumulative revision
    // across all subjects; the rest are single/paired-subject focus days.
    const revisionDays = Math.max(1, Math.round(remaining * 0.2));
    const focusDays = Math.max(1, remaining - revisionDays);

    const days = [];
    const today = new Date();

    // Focus days: round-robin through the subject list. If there are more
    // focus days than subjects, the cycle repeats (later passes read as
    // "practice" rather than "first look"). If there are fewer focus days
    // than subjects, group several subjects into each day so every subject
    // still gets covered at least once before the revision days start.
    const subjectsPerFocusDay = focusDays >= subjects.length ? 1 : Math.ceil(subjects.length / focusDays);

    let subjectCursor = 0;
    for (let d = 1; d <= focusDays; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const daySubjects = [];
      for (let i = 0; i < subjectsPerFocusDay; i++) {
        daySubjects.push(subjects[subjectCursor % subjects.length]);
        subjectCursor++;
      }
      const uniqueDaySubjects = [...new Set(daySubjects)];
      const pass = Math.floor((d - 1) / subjects.length) + 1; // which full cycle this is
      const hoursEach = splitHours(hoursPerDay, uniqueDaySubjects.length);
      const phrase = FOCUS_PHRASES[(d - 1) % FOCUS_PHRASES.length](uniqueDaySubjects.join(" and "));
      days.push({
        day: d,
        date: date.toISOString().slice(0, 10),
        tone: pass === 1 ? "concept-building" : "practice",
        note: pass === 1 ? `First pass — ${phrase}.` : `Second look — practice problems on ${uniqueDaySubjects.join(" and ")}, this time against the clock.`,
        subjects: uniqueDaySubjects.map((s) => ({ name: s, hours: hoursEach })),
      });
    }

    // Revision days: everything, every day, lighter touch each time.
    for (let r = 0; r < revisionDays; r++) {
      const d = focusDays + r + 1;
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const hoursEach = splitHours(hoursPerDay, subjects.length);
      const phrase = REVISION_PHRASES[r % REVISION_PHRASES.length](subjects.join(", "));
      days.push({
        day: d,
        date: date.toISOString().slice(0, 10),
        tone: "revision",
        note: `Revision day — ${phrase}.`,
        subjects: subjects.map((s) => ({ name: s, hours: hoursEach })),
      });
    }

    return {
      daysUntil: remaining,
      intro: `You have ${remaining} days until the exam. Here's a plan that front-loads real understanding and ends with ${revisionDays} full revision day${revisionDays > 1 ? "s" : ""} covering everything.`,
      days,
    };
  };

  // Fixed example plan shown before the student fills the form in.
  CC.AI.getExampleExamPlan = function getExampleExamPlan() {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 9);
    return CC.AI.generateExamPlan({
      examDate: examDate.toISOString().slice(0, 10),
      subjects: ["Math", "Biology", "English"],
      hoursPerDay: 3,
    });
  };

  // -----------------------------------------------------------------------
  // REAL: Ask the School (keyword search over seeded notices)
  // -----------------------------------------------------------------------
  const STOPWORDS = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "for", "of", "to", "in", "on", "at",
    "when", "what", "how", "do", "does", "will", "it", "and", "or", "my", "i", "we", "our", "this",
    "that", "with", "about", "can", "could", "would", "should", "please", "tell", "me",
  ]);

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  }

  function splitSentences(text) {
    return text.split(/(?<=[.!?])\s+/).filter(Boolean);
  }

  // Real keyword search: scores each notice by how many query tokens appear
  // in its title (weighted higher) and body, picks the best match, and
  // extracts the most relevant sentence(s) rather than dumping the whole
  // notice. No model, no invented facts — if nothing scores above zero, it
  // says so plainly instead of guessing.
  CC.AI.answerSchoolQuestion = async function answerSchoolQuestion(query) {
    await delay([300, 500]); // tiny pause for UX pacing only — the search itself is instant
    const tokens = tokenize(query);
    const notices = CC.Data.getNotices();

    if (tokens.length === 0) {
      return { found: false, message: "Try asking a specific question — for example, mention a date, event, or topic." };
    }

    let best = null;
    let bestScore = 0;
    for (const notice of notices) {
      const titleTokens = tokenize(notice.title);
      const bodyTokens = tokenize(notice.body);
      let score = 0;
      for (const t of tokens) {
        if (titleTokens.includes(t)) score += 2;
        if (bodyTokens.includes(t)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = notice;
      }
    }

    if (!best || bestScore === 0) {
      return {
        found: false,
        message:
          "I don't have that information in any posted notice yet. Try rephrasing, or check back after the next notice is posted.",
      };
    }

    // Within the winning notice, rank sentences by token overlap so the
    // "answer" is a tight quote, not the entire notice body.
    const sentences = splitSentences(best.body);
    const ranked = sentences
      .map((sentence) => {
        const sTokens = tokenize(sentence);
        const overlap = tokens.filter((t) => sTokens.includes(t)).length;
        return { sentence, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap);

    const topSentences = ranked
      .filter((r) => r.overlap > 0)
      .slice(0, 2)
      .map((r) => r.sentence);

    return {
      found: true,
      noticeTitle: best.title,
      noticeId: best.id,
      answer: topSentences.length > 0 ? topSentences.join(" ") : sentences[0],
    };
  };

  CC.AI.getExampleSchoolAnswer = async function getExampleSchoolAnswer() {
    const question = "When is the final round of the web design competition?";
    const result = await CC.AI.answerSchoolQuestion(question);
    return { question, result };
  };
})(CC);
