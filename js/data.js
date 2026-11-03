/**
 * data.js — the app's "database".
 *
 * This is a frontend-only prototype: there is no server, so localStorage
 * plays the role a real database would. Every read goes through `load()`
 * and every write goes through `save()`, so swapping this for real fetch()
 * calls to a backend later only means rewriting the inside of these
 * functions — nothing else in the app touches localStorage directly.
 *
 * All records live in one JSON blob under DB_KEY. That's deliberately
 * simple for a prototype of this size; a real backend would obviously use
 * separate tables (see schema sketch in README.md).
 */

var CC = window.CC || (window.CC = {});

(function (CC) {
  const DB_KEY = "classconnect_db";
  const SESSION_KEY = "classconnect_session";

  // Shared with signup.html — the code a teacher hands out to their class so
  // students can self-register. In a real deployment this would live in an
  // environment variable on the server, never in client-side JS; it's a
  // plain constant here because this prototype has no server to hold it.
  CC.SIGNUP_CODE = "CLASSCONNECT2026";

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---------------------------------------------------------------------
  // Seed data — written once, the first time the app ever loads. Every
  // section of the app needs to look lived-in immediately, so this is
  // intentionally generous: real-feeling names, real due dates relative to
  // "today", and both sides of every flow (a resolved doubt AND a pending
  // one, a graded submission AND an open assignment) already present.
  // ---------------------------------------------------------------------
  function buildSeed() {
    const now = new Date();
    const iso = (daysOffset, hour = 9) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysOffset);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };
    const dateOnly = (daysOffset) => iso(daysOffset).slice(0, 10);

    const teacher = {
      id: "user_teacher1",
      name: "Mrs. Nandita Rao",
      role: "teacher",
      loginId: "teacher",
      // Plaintext on purpose, not an oversight: this is a client-only demo
      // with no server, so the password already lives in plain JSON in
      // localStorage — anyone with devtools can read it either way.
      // Hashing it here would just be theatre. A real backend would hash
      // with a per-user salt server-side, as the project README explains.
      password: "teach123",
      className: null, // the teacher isn't scoped to one class/section
      section: null,
      house: null,
      createdAt: iso(-120),
    };

    const demoStudent = {
      id: "user_student_demo",
      name: "Aarav Mehta",
      role: "student",
      loginId: "10A07",
      password: "student123",
      className: "10",
      section: "A",
      house: "Amber",
      createdAt: iso(-100),
    };

    const studentPriya = {
      id: "user_student_priya",
      name: "Priya Sharma",
      role: "student",
      loginId: "9B03",
      password: "student123",
      className: "9",
      section: "B",
      house: "Crimson",
      createdAt: iso(-95),
    };

    const studentKabir = {
      id: "user_student_kabir",
      name: "Kabir Singh",
      role: "student",
      loginId: "9B04",
      password: "student123",
      className: "9",
      section: "B",
      house: "Crimson",
      createdAt: iso(-95),
    };

    const content = [
      {
        id: uid("content"),
        title: "Photosynthesis: Light & Dark Reactions",
        type: "note",
        subject: "Biology",
        className: "10",
        section: "A",
        body:
          "Photosynthesis happens in two linked stages inside the chloroplast.\n\n" +
          "The light-dependent reactions take place in the thylakoid membrane. " +
          "Chlorophyll absorbs sunlight and uses that energy to split water " +
          "molecules (photolysis), releasing oxygen as a byproduct and producing " +
          "ATP and NADPH — the 'energy currency' the plant will spend in the next stage.\n\n" +
          "The light-independent reactions (the Calvin cycle) happen in the stroma. " +
          "They don't need light directly — instead they use the ATP and NADPH made " +
          "a moment ago to fix carbon dioxide into glucose, through a repeating cycle " +
          "built around an enzyme called RuBisCO.\n\n" +
          "Exam tip: if a question asks 'where exactly' something happens, that's your " +
          "cue to separate the two stages by location (thylakoid vs. stroma), not just by name.",
        uploadedBy: teacher.id,
        createdAt: iso(-30),
      },
      {
        id: uid("content"),
        title: "Light — Reflection & Refraction Problem Set",
        type: "worksheet",
        subject: "Physics",
        className: "10",
        section: "A",
        body:
          "1. State the laws of reflection and sketch a ray diagram for a plane mirror.\n" +
          "2. A ray of light strikes a mirror at 35° to the mirror's surface. Find the angle of reflection.\n" +
          "3. Define refractive index. Why does light bend when it passes from air into glass?\n" +
          "4. A pencil in a glass of water appears bent at the surface. Explain why, using the term 'refraction'.\n" +
          "5. Compare a concave and a convex mirror: which one is used in a car's side mirror, and why?\n" +
          "Show your working for Q2 — marks are given for the diagram, not just the final number.",
        uploadedBy: teacher.id,
        createdAt: iso(-21),
      },
      {
        id: uid("content"),
        title: "Quadratic Equations, Explained Visually",
        type: "video_link",
        subject: "Math",
        className: "10",
        section: "A",
        body: "https://www.youtube.com/results?search_query=quadratic+equations+explained+class+10",
        uploadedBy: teacher.id,
        createdAt: iso(-14),
      },
      {
        id: uid("content"),
        title: "The French Revolution: A Timeline",
        type: "note",
        subject: "History",
        className: "9",
        section: "B",
        body:
          "1789 — Estates-General convened; the Third Estate breaks away and forms the National Assembly after being locked out of their usual hall.\n" +
          "14 July 1789 — Storming of the Bastille, the event that gives the Revolution its symbolic start.\n" +
          "August 1789 — Declaration of the Rights of Man and of the Citizen is adopted.\n" +
          "1792 — France is declared a Republic; the monarchy is formally abolished.\n" +
          "1793 — King Louis XVI is executed; the Reign of Terror begins under the Committee of Public Safety.\n" +
          "1794 — Robespierre is overthrown and executed, ending the Terror.\n" +
          "1799 — Napoleon Bonaparte seizes power, closing the revolutionary period.\n\n" +
          "When answering 'causes vs. effects' questions, keep the Estates-General and the " +
          "economic crisis (bread prices, war debt) as causes, and the Declaration and the " +
          "Republic as effects.",
        uploadedBy: teacher.id,
        createdAt: iso(-28),
      },
      {
        id: uid("content"),
        title: "Balancing Chemical Equations — Practice Set",
        type: "worksheet",
        subject: "Science",
        className: "9",
        section: "B",
        body:
          "Balance each equation by adjusting coefficients only (never subscripts):\n" +
          "1. Fe + O2 → Fe2O3\n" +
          "2. H2 + N2 → NH3\n" +
          "3. Na + Cl2 → NaCl\n" +
          "4. CH4 + O2 → CO2 + H2O\n" +
          "5. Al + HCl → AlCl3 + H2\n" +
          "Remember: count each element on both sides after every change — balancing one " +
          "element can un-balance another, so re-check the whole equation each time.",
        uploadedBy: teacher.id,
        createdAt: iso(-18),
      },
      {
        id: uid("content"),
        title: "English Tenses, Made Simple",
        type: "video_link",
        subject: "English",
        className: "9",
        section: "B",
        body: "https://www.youtube.com/results?search_query=english+tenses+explained+for+students",
        uploadedBy: teacher.id,
        createdAt: iso(-10),
      },
    ];

    const assignments = [
      {
        id: "assign_photosynthesis_lab",
        title: "Photosynthesis Lab Report",
        instructions:
          "Write a 300-400 word lab report on the variegated-leaf starch test demonstrated in class. " +
          "Cover: your hypothesis, the method, your observations (which parts of the leaf turned blue-black " +
          "with iodine and which didn't), and a conclusion linking that back to chlorophyll.",
        subject: "Biology",
        className: "10",
        section: "A",
        dueDate: dateOnly(-3),
        createdBy: teacher.id,
        createdAt: iso(-15),
      },
      {
        id: "assign_quadratics_practice",
        title: "Quadratic Equations Practice Set",
        instructions:
          "Solve all 10 problems in the shared practice set using the factorisation method for Q1-5 " +
          "and the quadratic formula for Q6-10. Show every step — answers without working get partial credit only.",
        subject: "Math",
        className: "10",
        section: "A",
        dueDate: dateOnly(7),
        createdBy: teacher.id,
        createdAt: iso(-5),
      },
    ];

    const submissions = [
      {
        id: uid("submission"),
        assignmentId: "assign_photosynthesis_lab",
        studentId: demoStudent.id,
        text:
          "Hypothesis: only the green (chlorophyll-containing) parts of a variegated leaf can " +
          "photosynthesise and store starch. Method: a variegated leaf was de-starched, exposed to " +
          "light for 6 hours, then tested with iodine solution after boiling in ethanol to remove " +
          "chlorophyll. Observations: the areas that were originally green turned blue-black, while " +
          "the white/pale areas stayed orange-brown. Conclusion: this supports the hypothesis — " +
          "starch (the product of photosynthesis) only formed where chlorophyll was present to " +
          "absorb light, confirming chlorophyll's role in the light-dependent reactions.",
        fileName: null,
        filePreview: null,
        submittedAt: iso(-4),
        feedback:
          "Clear hypothesis-to-conclusion structure, Aarav — this is exactly how a lab report should " +
          "read. Next time, name the specific pigment test (iodine for starch) in your method section too.",
        feedbackAt: iso(-2),
      },
    ];

    const doubts = [
      {
        id: uid("doubt"),
        studentId: demoStudent.id,
        subject: "Biology",
        question: "Why do plants need sunlight for photosynthesis?",
        aiAnswer:
          "Great question! Plants need sunlight because it's the actual energy source that powers " +
          "photosynthesis — chlorophyll in the leaf absorbs light energy and converts it into chemical " +
          "energy (ATP and NADPH). Without that input of light energy, a plant has no way to split water " +
          "molecules or power the Calvin cycle that builds glucose. Think of sunlight as the 'fuel' and " +
          "chlorophyll as the part of the engine that catches it. This is why plants kept in the dark stop " +
          "growing and eventually use up their stored starch reserves.",
        teacherAnswer:
          "Nice explanation above! One thing to add for your exam: the light reactions and the Calvin " +
          "cycle are physically separate (thylakoid vs. stroma), so if a question asks which stage " +
          "'directly' needs light, the answer is only the light-dependent reactions — the Calvin cycle " +
          "needs the products of that stage (ATP/NADPH), not light itself.",
        status: "answered",
        createdAt: iso(-6),
        answeredAt: iso(-5),
      },
      {
        id: uid("doubt"),
        studentId: studentPriya.id,
        subject: "Science",
        question: "How do I balance a chemical equation like Fe + O2 -> Fe2O3?",
        aiAnswer:
          "Balancing is really just bookkeeping for atoms! Start by counting each element on both " +
          "sides: on the left you have 1 Fe and 2 O; on the right, Fe2O3 has 2 Fe and 3 O. Adjust " +
          "coefficients (never the little subscript numbers) until both sides match — a common trick is " +
          "to balance the element that appears in the fewest places first. For this one, you'll need a " +
          "coefficient of 4 on Fe, 3 on O2, and 2 on Fe2O3 to get 4 Fe and 6 O on both sides. Try counting " +
          "it out yourself before checking — it sticks better that way!",
        teacherAnswer: null,
        status: "pending",
        createdAt: iso(-1),
        answeredAt: null,
      },
    ];

    const notices = [
      {
        id: uid("notice"),
        title: "Inter House Web Designing Competition (AI Based)",
        category: "competition",
        body:
          "The Inter House Web Designing Competition (AI Based) will be held for the selection round " +
          "with the theme Open Topic. The final competition date is 17 Nov 2026, during V and VI period, " +
          "in the Robotics Lab. Teams of up to 3 members must submit their selection-round entry by email " +
          "no later than 12 Nov 2026. Judging will be based on presentation, coding structure, and real " +
          "life utility. Selected participants for the final round will be announced on 14 Nov 2026.",
        createdAt: iso(-14),
      },
      {
        id: uid("notice"),
        title: "Mid-Term Exam Schedule Released",
        category: "academic",
        body:
          "The mid-term examination schedule has been published on the notice board outside the staff " +
          "room. Exams begin 20 Nov 2026 and run for one week. Admit cards will be distributed in class " +
          "three days before the first exam. Students are advised to check the subject-wise timing carefully.",
        createdAt: iso(-9),
      },
      {
        id: uid("notice"),
        title: "Annual Sports Day — Save the Date",
        category: "event",
        body:
          "Annual Sports Day will be celebrated on 28 Nov 2026 on the main school ground. House captains " +
          "should submit their final participant lists to the sports department by 20 Nov 2026. Parents " +
          "are welcome to attend from 3 PM onward.",
        createdAt: iso(-19),
      },
      {
        id: uid("notice"),
        title: "Library Books Return Reminder",
        category: "general",
        body:
          "All students currently holding library books issued before October are requested to return " +
          "them by the end of this week to avoid a late fee. The library will remain open during both " +
          "lunch breaks for returns.",
        createdAt: iso(-16),
      },
    ];

    return {
      users: [teacher, demoStudent, studentPriya, studentKabir],
      content,
      assignments,
      submissions,
      doubts,
      notices,
    };
  }

  // ---------------------------------------------------------------------
  // Low-level load/save — every other function in this file goes through
  // these two, which is what makes "swap localStorage for a backend later"
  // a one-file change.
  // ---------------------------------------------------------------------
  function load() {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const seeded = buildSeed();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupted localStorage (e.g. hand-edited in devtools) — reseed
      // rather than crash the whole app.
      const seeded = buildSeed();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
  }

  function save(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  CC.Data = {
    uid,

    resetDemoData() {
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(SESSION_KEY);
      load(); // reseed immediately so the next page load isn't empty
    },

    // ---- users -----------------------------------------------------
    getUsers() {
      return load().users;
    },
    getUserById(id) {
      return load().users.find((u) => u.id === id) || null;
    },
    getUserByLoginId(loginId) {
      return load().users.find((u) => u.loginId.toLowerCase() === String(loginId).toLowerCase()) || null;
    },
    addUser(user) {
      const db = load();
      db.users.push(user);
      save(db);
      return user;
    },
    getStudentsInClass(className, section) {
      return load().users.filter(
        (u) => u.role === "student" && u.className === className && u.section === section
      );
    },
    getAllStudents() {
      return load().users.filter((u) => u.role === "student");
    },

    // ---- content -----------------------------------------------------
    getContentForClass(className, section) {
      return load()
        .content.filter((c) => c.className === className && c.section === section)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    getAllContent() {
      return load().content.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    addContent(item) {
      const db = load();
      db.content.push(item);
      save(db);
      return item;
    },

    // ---- assignments ---------------------------------------------------
    getAssignmentsForClass(className, section) {
      return load()
        .assignments.filter((a) => a.className === className && a.section === section)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    },
    getAllAssignments() {
      return load().assignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    },
    getAssignmentById(id) {
      return load().assignments.find((a) => a.id === id) || null;
    },
    addAssignment(item) {
      const db = load();
      db.assignments.push(item);
      save(db);
      return item;
    },

    // ---- submissions ----------------------------------------------------
    getSubmission(assignmentId, studentId) {
      return load().submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId) || null;
    },
    getSubmissionsForAssignment(assignmentId) {
      return load().submissions.filter((s) => s.assignmentId === assignmentId);
    },
    getSubmissionsForStudent(studentId) {
      return load().submissions.filter((s) => s.studentId === studentId);
    },
    addSubmission(submission) {
      const db = load();
      db.submissions.push(submission);
      save(db);
      return submission;
    },
    setFeedback(submissionId, feedback) {
      const db = load();
      const sub = db.submissions.find((s) => s.id === submissionId);
      if (!sub) return null;
      sub.feedback = feedback;
      sub.feedbackAt = new Date().toISOString();
      save(db);
      return sub;
    },

    // ---- doubts --------------------------------------------------------
    getDoubtsForStudent(studentId) {
      return load()
        .doubts.filter((d) => d.studentId === studentId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    getAllDoubts() {
      return load().doubts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    addDoubt(doubt) {
      const db = load();
      db.doubts.push(doubt);
      save(db);
      return doubt;
    },
    // Called once the simulated AI draft resolves, to attach it to the
    // doubt that was already written to storage (so the question shows up
    // immediately, with the AI answer filling in a second later).
    setDoubtAiAnswer(doubtId, aiAnswer) {
      const db = load();
      const doubt = db.doubts.find((d) => d.id === doubtId);
      if (!doubt) return null;
      doubt.aiAnswer = aiAnswer;
      save(db);
      return doubt;
    },
    answerDoubt(doubtId, teacherAnswer) {
      const db = load();
      const doubt = db.doubts.find((d) => d.id === doubtId);
      if (!doubt) return null;
      doubt.teacherAnswer = teacherAnswer;
      doubt.status = "answered";
      doubt.answeredAt = new Date().toISOString();
      save(db);
      return doubt;
    },

    // ---- notices --------------------------------------------------------
    getNotices() {
      return load()
        .notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    addNotice(notice) {
      const db = load();
      db.notices.push(notice);
      save(db);
      return notice;
    },
    deleteNotice(id) {
      const db = load();
      db.notices = db.notices.filter((n) => n.id !== id);
      save(db);
    },

    // ---- session ---------------------------------------------------------
    getSession() {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      try {
        const { userId } = JSON.parse(raw);
        return CC.Data.getUserById(userId);
      } catch {
        return null;
      }
    },
    setSession(userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
    },
    clearSession() {
      localStorage.removeItem(SESSION_KEY);
    },
  };

  // Make sure the DB exists as soon as this script runs, so every page —
  // even one the user lands on directly — sees seeded data immediately.
  load();
})(CC);
