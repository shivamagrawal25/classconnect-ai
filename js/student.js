/**
 * student.js — renders and drives the student dashboard. Every section
 * reads straight from CC.Data, scoped to the logged-in student's own class
 * and section (never to "everything"), and every write goes straight back
 * through CC.Data too.
 */

(function () {
  const user = CC.Auth.requireRole("student");
  if (!user) return; // requireRole already redirected to the login page

  const { escapeHtml, formatDate, initials, showToast, openModal, setupTabs } = CC.UI;

  // ---- header -------------------------------------------------------
  document.getElementById("who-name").textContent = user.name;
  document.getElementById("who-class").textContent = `Class ${user.className}-${user.section}${user.house ? " • " + user.house + " House" : ""}`;
  document.getElementById("who-avatar").textContent = initials(user.name);
  document.getElementById("greeting").textContent = `Welcome back, ${user.name.split(" ")[0]}!`;
  document.getElementById("logout-btn").addEventListener("click", () => {
    CC.Auth.logout();
    window.location.href = "index.html";
  });

  setupTabs(document.getElementById("student-tabs"));

  // ---- CONTENT --------------------------------------------------------
  function typeLabel(type) {
    return { note: "Note", worksheet: "Worksheet", video_link: "Video" }[type] || type;
  }

  function renderContent() {
    const items = CC.Data.getContentForClass(user.className, user.section);
    const grid = document.getElementById("content-grid");
    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state">Nothing's been posted for your class yet — check back soon.</div>`;
      return;
    }
    grid.innerHTML = items
      .map(
        (item) => `
      <article class="content-card" data-type="${item.type}">
        <span class="type-chip">${typeLabel(item.type)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <span class="subject">${escapeHtml(item.subject)} • ${formatDate(item.createdAt)}</span>
        <div class="card-actions">
          ${
            item.type === "video_link"
              ? `<a class="btn btn-ghost btn-sm" href="${escapeHtml(item.body)}" target="_blank" rel="noopener">Watch</a>`
              : `<button class="btn btn-ghost btn-sm" data-view-content="${item.id}">View</button>`
          }
        </div>
      </article>`
      )
      .join("");

    grid.querySelectorAll("[data-view-content]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = items.find((i) => i.id === btn.dataset.viewContent);
        openModal({ title: item.title, meta: `${typeLabel(item.type)} • ${item.subject}`, body: item.body });
      });
    });
  }

  // ---- ASSIGNMENTS -------------------------------------------------------
  function assignmentStatus(assignment, submission) {
    const dueDate = new Date(`${assignment.dueDate}T23:59:59`);
    const isPastDue = new Date() > dueDate;
    if (submission && submission.feedback) return { key: "graded", label: "Feedback received" };
    if (submission) return { key: "submitted", label: "Submitted" };
    if (isPastDue) return { key: "late", label: "Late" };
    return { key: "pending", label: "Open" };
  }

  function renderAssignments() {
    const assignments = CC.Data.getAssignmentsForClass(user.className, user.section);
    const container = document.getElementById("assignments-list");
    if (assignments.length === 0) {
      container.innerHTML = `<div class="empty-state">No assignments posted for your class yet.</div>`;
      return;
    }

    container.innerHTML = assignments
      .map((a) => {
        const submission = CC.Data.getSubmission(a.id, user.id);
        const status = assignmentStatus(a, submission);
        return `
        <article class="assignment-card" data-assignment-id="${a.id}">
          <div class="assignment-info">
            <h3>${escapeHtml(a.title)}</h3>
            <div class="meta">${escapeHtml(a.subject)} • Due ${formatDate(a.dueDate)}</div>
            <p>${escapeHtml(a.instructions)}</p>
          </div>
          <div style="min-width:200px">
            <span class="status-badge ${status.key}">${status.label}</span>
            <div class="submission-slot" style="margin-top:10px"></div>
          </div>
        </article>`;
      })
      .join("");

    assignments.forEach((a) => {
      const card = container.querySelector(`[data-assignment-id="${a.id}"] .submission-slot`);
      const submission = CC.Data.getSubmission(a.id, user.id);
      if (submission) {
        card.innerHTML = `
          <div style="font-size:0.85rem;color:var(--text-muted)">Submitted ${formatDate(submission.submittedAt)}${submission.fileName ? ` • ${escapeHtml(submission.fileName)}` : ""}</div>
          ${
            submission.feedback
              ? `<div class="feedback-box"><strong>Teacher feedback:</strong><br/>${escapeHtml(submission.feedback)}</div>`
              : `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:6px">Waiting on feedback from your teacher.</div>`
          }`;
      } else {
        card.innerHTML = `
          <form class="submit-assignment-form" data-assignment-id="${a.id}">
            <textarea rows="2" placeholder="Write your submission…" required style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px"></textarea>
            <input type="file" style="font-size:0.8rem;margin-bottom:6px;display:block" />
            <button type="submit" class="btn btn-primary btn-sm">Submit</button>
          </form>`;
        card.querySelector("form").addEventListener("submit", (e) => handleSubmitAssignment(e, a.id));
      }
    });
  }

  function handleSubmitAssignment(e, assignmentId) {
    e.preventDefault();
    const form = e.target;
    const text = form.querySelector("textarea").value.trim();
    const file = form.querySelector('input[type="file"]').files[0];
    if (!text) return;

    const finish = (filePreview) => {
      CC.Data.addSubmission({
        id: CC.Data.uid("submission"),
        assignmentId,
        studentId: user.id,
        text,
        fileName: file ? file.name : null,
        filePreview,
        submittedAt: new Date().toISOString(),
        feedback: null,
        feedbackAt: null,
      });
      showToast("Assignment submitted!");
      renderAssignments();
      // The card just re-rendered; give the updated one a brief highlight
      // so the submission visibly "confirms" rather than silently changing.
      const card = document.querySelector(`[data-assignment-id="${assignmentId}"]`);
      if (card) {
        card.style.animation = "none";
        requestAnimationFrame(() => (card.style.animation = "fadeUp 0.4s ease"));
      }
    };

    // Small file preview, prototype-only: we keep the filename always, and
    // additionally a data URL preview when it's an image small enough to
    // comfortably fit in localStorage.
    if (file && file.type.startsWith("image/") && file.size < 1_500_000) {
      const reader = new FileReader();
      reader.onload = () => finish(reader.result);
      reader.readAsDataURL(file);
    } else {
      finish(null);
    }
  }

  // ---- DOUBTS -----------------------------------------------------------
  function renderDoubts() {
    const doubts = CC.Data.getDoubtsForStudent(user.id);
    const container = document.getElementById("doubts-list");
    if (doubts.length === 0) {
      container.innerHTML = `<div class="empty-state">You haven't asked anything yet — your questions and answers will show up here.</div>`;
      return;
    }
    container.innerHTML = doubts.map(doubtThreadHTML).join("");
  }

  function doubtThreadHTML(d) {
    return `
      <article class="doubt-thread" data-doubt-id="${d.id}">
        <div class="doubt-top">
          <span class="doubt-subject">${escapeHtml(d.subject)}</span>
          <span class="doubt-meta">Asked ${formatDate(d.createdAt)}</span>
        </div>
        <div class="bubble question"><span class="bubble-label">You asked</span>${escapeHtml(d.question)}</div>
        ${
          d.aiAnswer
            ? `<div class="bubble ai"><span class="bubble-label">AI first pass</span>${escapeHtml(d.aiAnswer)}</div>`
            : `<div class="loading-row"><span class="spinner"></span> AI is drafting a first-pass answer…</div>`
        }
        ${
          d.teacherAnswer
            ? `<div class="bubble teacher"><span class="bubble-label">Teacher's answer — final</span>${escapeHtml(d.teacherAnswer)}</div>`
            : `<div style="font-size:0.8rem;color:var(--text-muted)">Waiting on your teacher's reply.</div>`
        }
      </article>`;
  }

  document.getElementById("doubt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = document.getElementById("doubt-subject").value;
    const question = document.getElementById("doubt-question").value.trim();
    if (!subject || !question) return;

    const doubt = CC.Data.addDoubt({
      id: CC.Data.uid("doubt"),
      studentId: user.id,
      subject,
      question,
      aiAnswer: null,
      teacherAnswer: null,
      status: "pending",
      createdAt: new Date().toISOString(),
      answeredAt: null,
    });

    document.getElementById("doubt-form").reset();
    renderDoubts(); // shows the question immediately, with the AI row "thinking"

    const { answer } = await CC.AI.answerDoubt(subject, question);
    CC.Data.setDoubtAiAnswer(doubt.id, answer);
    renderDoubts();

    // The newly resolved AI bubble gets a deliberate fade-in rather than
    // just popping into existence — this is the "doubt resolving" moment.
    const thread = document.querySelector(`[data-doubt-id="${doubt.id}"] .bubble.ai`);
    if (thread) {
      thread.style.animation = "none";
      requestAnimationFrame(() => (thread.style.animation = "fadeUp 0.4s ease"));
    }
  });

  // ---- STUDY KIT ----------------------------------------------------------
  function studyKitHTML(kit) {
    return `
      ${kit.isFallback ? "" : `<h3 style="font-size:1.1rem;margin-bottom:10px">${escapeHtml(kit.topic)}</h3>`}
      <div class="kit-summary">${escapeHtml(kit.summary)}</div>
      <div class="kit-section-title">Flashcards — click to flip</div>
      <div class="flashcard-grid">
        ${kit.flashcards
          .map(
            (f, i) => `
          <div class="flashcard" data-idx="${i}">
            <div class="flashcard-inner">
              <div class="flashcard-face front">${escapeHtml(f.front)}</div>
              <div class="flashcard-face back">${escapeHtml(f.back)}</div>
            </div>
          </div>`
          )
          .join("")}
      </div>
      <div class="kit-section-title">Quiz</div>
      <div class="quiz-mount"></div>
      <div class="kit-section-title">Simplified, in plain language</div>
      <p style="font-size:0.92rem">${escapeHtml(kit.simplified)}</p>
    `;
  }

  function mountFlashcards(container) {
    container.querySelectorAll(".flashcard").forEach((card) => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
    });
  }

  // Each quiz gets its own tiny state machine, scoped to the container it's
  // mounted in — the example kit and a freshly generated kit can both have
  // a quiz in progress at the same time without interfering with each other.
  function mountQuiz(mountEl, quizData) {
    let index = 0;
    let score = 0;

    function renderQuestion() {
      const q = quizData[index];
      mountEl.innerHTML = `
        <div class="quiz-progress">Question ${index + 1} of ${quizData.length}</div>
        <div class="quiz-question">${escapeHtml(q.question)}</div>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `<button class="quiz-option" data-opt="${i}">${escapeHtml(opt)}</button>`).join("")}
        </div>
      `;
      mountEl.querySelectorAll(".quiz-option").forEach((btn) => {
        btn.addEventListener("click", () => handleAnswer(Number(btn.dataset.opt)));
      });
    }

    function handleAnswer(chosenIdx) {
      const q = quizData[index];
      const buttons = mountEl.querySelectorAll(".quiz-option");
      buttons.forEach((b) => (b.disabled = true));
      buttons[q.correct].classList.add("correct");
      if (chosenIdx !== q.correct) buttons[chosenIdx].classList.add("incorrect");
      else score++;

      const explanation = document.createElement("div");
      explanation.className = "quiz-explanation";
      explanation.textContent = q.explanation;
      mountEl.appendChild(explanation);

      const nextBtn = document.createElement("button");
      nextBtn.className = "btn btn-primary btn-sm";
      nextBtn.textContent = index < quizData.length - 1 ? "Next question" : "See score";
      nextBtn.addEventListener("click", () => {
        index++;
        if (index < quizData.length) renderQuestion();
        else renderScore();
      });
      mountEl.appendChild(nextBtn);
    }

    function renderScore() {
      mountEl.innerHTML = `
        <div class="quiz-score">
          <div class="score-number">${score}/${quizData.length}</div>
          <p>${score === quizData.length ? "Perfect score!" : score >= quizData.length / 2 ? "Solid work — review the ones you missed." : "Worth another pass through the summary above."}</p>
          <button class="btn btn-ghost btn-sm" id="quiz-retry">Try again</button>
        </div>`;
      mountEl.querySelector("#quiz-retry").addEventListener("click", () => {
        index = 0;
        score = 0;
        renderQuestion();
      });
    }

    renderQuestion();
  }

  function mountStudyKit(container, kit) {
    container.innerHTML = studyKitHTML(kit);
    mountFlashcards(container);
    mountQuiz(container.querySelector(".quiz-mount"), kit.quiz);
  }

  mountStudyKit(document.getElementById("studykit-example"), CC.AI.getExampleStudyKit());

  document.getElementById("studykit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("studykit-input").value.trim();
    if (!input) return;
    document.getElementById("studykit-loading").style.display = "flex";
    document.getElementById("studykit-generated").innerHTML = "";
    const kit = await CC.AI.generateStudyKit(input);
    document.getElementById("studykit-loading").style.display = "none";
    mountStudyKit(document.getElementById("studykit-generated"), kit);
  });

  // ---- EXAM PLANNER ----------------------------------------------------
  function planHTML(plan) {
    return `
      <div class="plan-intro">${escapeHtml(plan.intro)}</div>
      <div class="plan-timeline">
        ${plan.days
          .map(
            (day) => `
          <div class="plan-day" data-tone="${day.tone}">
            <div>
              <div class="day-label">${day.label || "Day " + day.day}</div>
              <div class="day-date">${day.date ? formatDate(day.date, { day: "numeric", month: "short" }) : ""}</div>
            </div>
            <div>
              <div class="day-note">${escapeHtml(day.note)}</div>
              <div class="day-subjects">
                ${day.subjects.map((s) => `<span class="subject-chip">${escapeHtml(s.name)} • ${s.hours}h</span>`).join("")}
              </div>
            </div>
          </div>`
          )
          .join("")}
      </div>
    `;
  }

  document.getElementById("planner-example").innerHTML = planHTML(CC.AI.getExampleExamPlan());

  document.getElementById("planner-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const examDate = document.getElementById("planner-date").value;
    const hoursPerDay = Number(document.getElementById("planner-hours").value);
    const subjects = [...new Set(document.getElementById("planner-subjects").value.split(",").map((s) => s.trim()).filter(Boolean))];
    if (!examDate || subjects.length === 0) {
      showToast("Add an exam date and at least one subject.");
      return;
    }
    const plan = CC.AI.generateExamPlan({ examDate, subjects, hoursPerDay });
    const target = document.getElementById("planner-generated");
    target.innerHTML = planHTML(plan);
    target.style.animation = "none";
    requestAnimationFrame(() => (target.style.animation = "fadeUp 0.35s ease"));
  });

  // ---- ASK THE SCHOOL ----------------------------------------------------
  function askResultHTML(result, question) {
    if (!result.found) {
      return `
        ${question ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:6px">Q: ${escapeHtml(question)}</div>` : ""}
        <div class="ask-answer not-found">${escapeHtml(result.message)}</div>`;
    }
    return `
      ${question ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:6px">Q: ${escapeHtml(question)}</div>` : ""}
      <div class="ask-answer">
        <div class="ask-source">From: ${escapeHtml(result.noticeTitle)}</div>
        ${escapeHtml(result.answer)}
      </div>`;
  }

  (async function loadAskExample() {
    const { question, result } = await CC.AI.getExampleSchoolAnswer();
    document.getElementById("ask-example").innerHTML = askResultHTML(result, question);
  })();

  document.getElementById("ask-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = document.getElementById("ask-input").value.trim();
    if (!question) return;
    document.getElementById("ask-loading").style.display = "flex";
    document.getElementById("ask-result").innerHTML = "";
    const result = await CC.AI.answerSchoolQuestion(question);
    document.getElementById("ask-loading").style.display = "none";
    document.getElementById("ask-result").innerHTML = askResultHTML(result, question);
  });

  // ---- NOTICES -------------------------------------------------------
  function renderNotices() {
    const notices = CC.Data.getNotices();
    document.getElementById("notices-list").innerHTML = notices
      .map(
        (n) => `
      <article class="notice-card">
        <div class="notice-top">
          <div>
            <span class="category-tag ${n.category}">${escapeHtml(n.category)}</span>
            <h3>${escapeHtml(n.title)}</h3>
          </div>
          <span class="date">${formatDate(n.createdAt)}</span>
        </div>
        <p>${escapeHtml(n.body)}</p>
      </article>`
      )
      .join("");
  }

  // ---- go --------------------------------------------------------------
  renderContent();
  renderAssignments();
  renderDoubts();
  renderNotices();
})();
