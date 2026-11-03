/**
 * auth.js — login, signup, and session handling.
 *
 * IMPORTANT, said plainly: this is a client-only prototype. There is no
 * server to verify anything against, so "authentication" here just means
 * checking a password string against one stored in localStorage and
 * remembering a user id in another localStorage key. It is NOT a security
 * boundary — anyone with devtools open can read every password or forge a
 * session. That's fine for a demo that runs entirely in one browser, but a
 * real deployment needs server-side session verification (see README.md
 * for how this would map onto real Workers AI / backend auth).
 */

var CC = window.CC || (window.CC = {});

(function (CC) {
  CC.Auth = {
    currentUser() {
      return CC.Data.getSession();
    },

    login(loginId, password) {
      const user = CC.Data.getUserByLoginId(String(loginId || "").trim());
      if (!user) {
        return { ok: false, error: "We couldn't find an account with that ID. Check the spelling and try again." };
      }
      if (user.password !== password) {
        return { ok: false, error: "That password doesn't match. Try again, or check with your teacher." };
      }
      CC.Data.setSession(user.id);
      return { ok: true, user };
    },

    logout() {
      CC.Data.clearSession();
    },

    // code is the SIGNUP_CODE shared by the teacher. Everything else is
    // plain form validation.
    signup({ name, loginId, className, section, password, code }) {
      name = String(name || "").trim();
      loginId = String(loginId || "").trim();
      className = String(className || "").trim();
      section = String(section || "").trim().toUpperCase();
      password = String(password || "");

      if (code !== CC.SIGNUP_CODE) {
        return { ok: false, error: "That sign up code isn't right. Ask your teacher for the current code." };
      }
      if (!name || !loginId || !className || !section || !password) {
        return { ok: false, error: "Please fill in every field." };
      }
      if (password.length < 4) {
        return { ok: false, error: "Choose a password with at least 4 characters." };
      }
      if (CC.Data.getUserByLoginId(loginId)) {
        return { ok: false, error: "That roll number is already registered. Try logging in instead." };
      }

      const user = {
        id: CC.Data.uid("user"),
        name,
        role: "student",
        loginId,
        password,
        className,
        section,
        house: null,
        createdAt: new Date().toISOString(),
      };
      CC.Data.addUser(user);
      CC.Data.setSession(user.id);
      return { ok: true, user };
    },

    // Call at the top of a protected page. Redirects away and returns null
    // if there's no session, or the session's role doesn't match.
    requireRole(role) {
      const user = CC.Auth.currentUser();
      if (!user || user.role !== role) {
        window.location.href = "index.html";
        return null;
      }
      return user;
    },
  };
})(CC);
