/**
 * ui.js — small DOM helpers shared by student.js and admin.js: escaping,
 * date formatting, a toast, a generic modal, and the tab-switcher used by
 * both dashboards. Pulled out here instead of copy-pasted twice, since
 * both dashboards need exactly the same behaviour.
 */

var CC = window.CC || (window.CC = {});

(function (CC) {
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function formatDate(iso, opts) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, opts || { day: "numeric", month: "short", year: "numeric" });
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
  }

  // Generic view-content modal (used for note/worksheet bodies).
  function openModal({ title, meta, body }) {
    let backdrop = document.getElementById("view-modal");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "view-modal";
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          <button class="modal-close" aria-label="Close">&times;</button>
          <h3 id="view-modal-title"></h3>
          <div class="modal-meta" id="view-modal-meta"></div>
          <pre id="view-modal-body"></pre>
        </div>`;
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeModal();
      });
      backdrop.querySelector(".modal-close").addEventListener("click", closeModal);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
      });
    }
    backdrop.querySelector("#view-modal-title").textContent = title;
    backdrop.querySelector("#view-modal-meta").textContent = meta || "";
    backdrop.querySelector("#view-modal-body").textContent = body;
    backdrop.classList.add("open");
  }

  function closeModal() {
    const backdrop = document.getElementById("view-modal");
    if (backdrop) backdrop.classList.remove("open");
  }

  // Wires up a .tabs / .tab-panel group: click handling, aria-selected,
  // and sliding the gold underline indicator to sit under the active tab.
  function setupTabs(tabsContainer) {
    const tabs = [...tabsContainer.querySelectorAll(".tab")];
    const indicator = document.createElement("div");
    indicator.className = "tab-indicator";
    tabsContainer.appendChild(indicator);

    function moveIndicator(tab) {
      indicator.style.left = `${tab.offsetLeft}px`;
      indicator.style.width = `${tab.offsetWidth}px`;
    }

    function activate(tab) {
      tabs.forEach((t) => t.setAttribute("aria-selected", t === tab ? "true" : "false"));
      document.querySelectorAll(`.tab-panel`).forEach((panel) => {
        panel.classList.toggle("active", panel.id === tab.dataset.panel);
      });
      moveIndicator(tab);
      try {
        localStorage.setItem("classconnect_last_tab_" + tabsContainer.id, tab.dataset.panel);
      } catch {
        /* localStorage can legitimately be unavailable (private mode); a
           remembered tab is a nice-to-have, not required, so just skip it. */
      }
    }

    tabs.forEach((tab) => tab.addEventListener("click", () => activate(tab)));
    window.addEventListener("resize", () => {
      const active = tabs.find((t) => t.getAttribute("aria-selected") === "true");
      if (active) moveIndicator(active);
    });

    let restored = null;
    try {
      const lastPanel = localStorage.getItem("classconnect_last_tab_" + tabsContainer.id);
      restored = tabs.find((t) => t.dataset.panel === lastPanel);
    } catch {
      /* ignore */
    }
    activate(restored || tabs[0]);
  }

  CC.UI = { escapeHtml, formatDate, initials, showToast, openModal, closeModal, setupTabs };
})(CC);
