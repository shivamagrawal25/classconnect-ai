/**
 * admin.js — the teacher dashboard. Deliberately plainer than student.js:
 * this is a utility screen for managing data, not the showcase. It still
 * reads and writes through CC.Data exclusively, same as the student side.
 */

(function () {
  const user = CC.Auth.requireRole("teacher");
  if (!user) return;

  const { escapeHtml, formatDate, initials, showToast } = CC.UI;

  document.getElementById("who-name").textContent = user.name;
  document.getElementById("who-avatar").textContent = initials(user.name);
  document.getElementById("signup-code-hint").textContent = `Sign up code for new students: ${CC.SIGNUP_CODE}`;

  document.getElementById("logout-btn").addEventListener("click", () => {
    CC.Auth.logout();
    window.location.href = "index.html";
  });

  document.getElementById("reset-demo-btn").addEventListener("click", () => {
    if (!confirm("This clears every account, submission, and doubt added during this demo and reseeds the original data. Continue?")) return;
    CC.Data.resetDemoData();
    showToast("Demo data reset.");
    setTimeout(() => window.location.reload(), 600);
  });

  CC.UI.setupTabs(document.getElementById("admin-tabs"));

  // ---- STUDENTS -----------------------------------------------------
  function renderStudents() {
    const students = CC.Data.getAllStudents();
    const target = document.getElementById("students-table");
    if (students.length === 0) {
      target.innerHTML = `<div class="empty-state">No students yet.</div>`;
      return;
    }
    target.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Roll no.</th><th>Class</th><th>House</th><th>Joined</th></tr></thead>
        <tbody>
          ${students
            .map(
              (s) => `
            <tr>
              <td>${escapeHtml(s.name)}</td>
              <td>${escapeHtml(s.loginId)}</td>
              <td>${escapeHtml(s.className)}-${escapeHtml(s.section)}</td>
              <td>${escapeHtml(s.house || "—")}</td>
              <td>${formatDate(s.createdAt)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  document.getElementById("add-student-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const loginId = document.getElementById("st-roll").value.trim();
    if (CC.Data.getUserByLoginId(loginId)) {
      showToast("That roll number is already in use.");
      return;
    }
    CC.Data.addUser({
      id: CC.Data.uid("user"),
      name: document.getElementById("st-name").value.trim(),
      role: "student",
      loginId,
      password: document.getElementById("st-password").value,
      className: document.getElementById("st-class").value.trim(),
      section: document.getElementById("st-section").value.trim().toUpperCase(),
      house: document.getElementById("st-house").value.trim() || null,
      createdAt: new Date().toISOString(),
    });
    e.target.reset();
    showToast("Student added.");
    renderStudents();
  });

  // ---- CONTENT -----------------------------------------------------
  function renderContentTable() {
    const items = CC.Data.getAllContent();
    const target = document.getElementById("content-table");
    if (items.length === 0) {
      target.innerHTML = `<div class="empty-state">Nothing posted yet.</div>`;
      return;
    }
    target.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Title</th><th>Type</th><th>Subject</th><th>Class</th><th>Posted</th></tr></thead>
        <tbody>
          ${items
            .map(
              (c) => `
            <tr>
              <td>${escapeHtml(c.title)}</td>
              <td>${escapeHtml(c.type)}</td>
              <td>${escapeHtml(c.subject)}</td>
              <td>${escapeHtml(c.className)}-${escapeHtml(c.section)}</td>
              <td>${formatDate(c.createdAt)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  document.getElementById("add-content-form").addEventListener("submit", (e) => {
    e.preventDefault();
    CC.Data.addContent({
      id: CC.Data.uid("content"),
      title: document.getElementById("ct-title").value.trim(),
      type: document.getElementById("ct-type").value,
      subject: document.getElementById("ct-subject").value.trim(),
      className: document.getElementById("ct-class").value.trim(),
      section: document.getElementById("ct-section").value.trim().toUpperCase(),
      body: document.getElementById("ct-body").value.trim(),
      uploadedBy: user.id,
      createdAt: new Date().toISOString(),
    });
    e.target.reset();
    showToast("Content posted.");
    renderContentTable();
  });

  // ---- ASSIGNMENTS -----------------------------------------------------
  function renderAssignmentsAdmin() {
    const assignments = CC.Data.getAllAssignments();
    const target = document.getElementById("assignments-admin-list");
    if (assignments.length === 0) {
      target.innerHTML = `<div class="empty-state">No assignments created yet.</div>`;
      return;
    }
    target.innerHTML = assignments
      .map((a) => {
        const submissions = CC.Data.getSubmissionsForAssignment(a.id);
        return `
        <div class="panel" data-assignment-id="${a.id}">
          <div class="section-head">
            <div>
              <h3 style="margin-bottom:2px">${escapeHtml(a.title)}</h3>
              <span class="hint">${escapeHtml(a.subject)} • Class ${escapeHtml(a.className)}-${escapeHtml(a.section)} • Due ${formatDate(a.dueDate)}</span>
            </div>
            <span class="status-badge submitted">${submissions.length} submission${submissions.length === 1 ? "" : "s"}</span>
          </div>
          <div class="submissions-mount"></div>
        </div>`;
      })
      .join("");

    assignments.forEach((a) => {
      const mount = target.querySelector(`[data-assignment-id="${a.id}"] .submissions-mount`);
      const submissions = CC.Data.getSubmissionsForAssignment(a.id);
      if (submissions.length === 0) {
        mount.innerHTML = `<p style="color:var(--text-muted);font-size:0.86rem">No submissions yet.</p>`;
        return;
      }
      mount.innerHTML = submissions
        .map((s) => {
          const student = CC.Data.getUserById(s.studentId);
          return `
          <div class="queue-item" data-submission-id="${s.id}">
            <strong>${escapeHtml(student ? student.name : "Unknown student")}</strong>
            <span class="hint"> • submitted ${formatDate(s.submittedAt)}${s.fileName ? " • " + escapeHtml(s.fileName) : ""}</span>
            <p style="margin:6px 0;font-size:0.9rem">${escapeHtml(s.text)}</p>
            <textarea rows="2" class="feedback-input" placeholder="Write feedback…" style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px">${escapeHtml(s.feedback || "")}</textarea>
            <button class="btn btn-ghost btn-sm save-feedback-btn">${s.feedback ? "Update feedback" : "Save feedback"}</button>
          </div>`;
        })
        .join("");

      mount.querySelectorAll(".queue-item").forEach((item) => {
        item.querySelector(".save-feedback-btn").addEventListener("click", () => {
          const text = item.querySelector(".feedback-input").value.trim();
          if (!text) return;
          CC.Data.setFeedback(item.dataset.submissionId, text);
          showToast("Feedback saved.");
          renderAssignmentsAdmin();
        });
      });
    });
  }

  document.getElementById("add-assignment-form").addEventListener("submit", (e) => {
    e.preventDefault();
    CC.Data.addAssignment({
      id: CC.Data.uid("assignment"),
      title: document.getElementById("as-title").value.trim(),
      instructions: document.getElementById("as-instructions").value.trim(),
      subject: document.getElementById("as-subject").value.trim(),
      className: document.getElementById("as-class").value.trim(),
      section: document.getElementById("as-section").value.trim().toUpperCase(),
      dueDate: document.getElementById("as-due").value,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    });
    e.target.reset();
    showToast("Assignment created.");
    renderAssignmentsAdmin();
  });

  // ---- DOUBTS QUEUE -----------------------------------------------------
  function renderDoubtsQueue() {
    const doubts = CC.Data.getAllDoubts().sort((a, b) => {
      if (a.status === b.status) return new Date(b.createdAt) - new Date(a.createdAt);
      return a.status === "pending" ? -1 : 1; // pending first
    });
    const target = document.getElementById("doubts-queue");
    if (doubts.length === 0) {
      target.innerHTML = `<div class="empty-state">No doubts have been asked yet.</div>`;
      return;
    }
    target.innerHTML = doubts
      .map((d) => {
        const student = CC.Data.getUserById(d.studentId);
        return `
        <div class="queue-item" data-doubt-id="${d.id}">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px">
            <div>
              <strong>${escapeHtml(student ? student.name : "Unknown student")}</strong>
              <span class="hint"> • ${escapeHtml(d.subject)} • ${formatDate(d.createdAt)}</span>
            </div>
            <span class="status-badge ${d.status === "pending" ? "pending" : "graded"}">${d.status === "pending" ? "Pending" : "Answered"}</span>
          </div>
          <div class="bubble question">${escapeHtml(d.question)}</div>
          <div class="bubble ai"><span class="bubble-label">AI first pass</span>${escapeHtml(d.aiAnswer || "(still generating…)")}</div>
          ${
            d.teacherAnswer
              ? `<div class="bubble teacher"><span class="bubble-label">Your answer — final</span>${escapeHtml(d.teacherAnswer)}</div>`
              : `<form class="doubt-reply-form">
                   <textarea placeholder="Write the final answer…" required></textarea>
                   <button type="submit" class="btn btn-primary btn-sm">Send reply</button>
                 </form>`
          }
        </div>`;
      })
      .join("");

    target.querySelectorAll(".doubt-reply-form").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const doubtId = form.closest(".queue-item").dataset.doubtId;
        const text = form.querySelector("textarea").value.trim();
        if (!text) return;
        CC.Data.answerDoubt(doubtId, text);
        showToast("Reply sent.");
        renderDoubtsQueue();
      });
    });
  }

  // ---- NOTICES -----------------------------------------------------
  function renderNoticesAdmin() {
    const notices = CC.Data.getNotices();
    const target = document.getElementById("notices-admin-list");
    if (notices.length === 0) {
      target.innerHTML = `<div class="empty-state">No notices posted yet.</div>`;
      return;
    }
    target.innerHTML = notices
      .map(
        (n) => `
      <article class="notice-card" data-notice-id="${n.id}">
        <div class="notice-top">
          <div>
            <span class="category-tag ${n.category}">${escapeHtml(n.category)}</span>
            <h3>${escapeHtml(n.title)}</h3>
          </div>
          <span class="date">${formatDate(n.createdAt)}</span>
        </div>
        <p>${escapeHtml(n.body)}</p>
        <button class="btn btn-danger btn-sm delete-notice-btn">Delete</button>
      </article>`
      )
      .join("");

    target.querySelectorAll(".delete-notice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest("[data-notice-id]");
        if (!confirm("Delete this notice?")) return;
        CC.Data.deleteNotice(card.dataset.noticeId);
        renderNoticesAdmin();
      });
    });
  }

  document.getElementById("add-notice-form").addEventListener("submit", (e) => {
    e.preventDefault();
    CC.Data.addNotice({
      id: CC.Data.uid("notice"),
      title: document.getElementById("no-title").value.trim(),
      body: document.getElementById("no-body").value.trim(),
      category: document.getElementById("no-category").value,
      createdAt: new Date().toISOString(),
    });
    e.target.reset();
    showToast("Notice posted.");
    renderNoticesAdmin();
  });

  // ---- go --------------------------------------------------------------
  renderStudents();
  renderContentTable();
  renderAssignmentsAdmin();
  renderDoubtsQueue();
  renderNoticesAdmin();
})();
