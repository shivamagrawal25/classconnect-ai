// Serves the static site, plus two endpoints backed by Cloudflare Workers AI.
// The model runs on Cloudflare through the AI binding — no API key lives anywhere.

const MODEL = "@cf/google/gemma-4-26b-a4b-it";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (request.method !== "POST") return json({ error: "Use POST" }, 405);
      try {
        if (url.pathname === "/api/doubt") return await doubt(request, env);
        if (url.pathname === "/api/studykit") return await studyKit(request, env);
        return json({ error: "Not found" }, 404);
      } catch (err) {
        return json({ error: "AI request failed", detail: String(err && err.message || err) }, 502);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

async function runModel(env, messages, maxTokens) {
  const out = await env.AI.run(MODEL, { messages, max_tokens: maxTokens, temperature: 0.4 });
  const text =
    typeof out === "string" ? out : (out && (out.response ?? out.choices?.[0]?.message?.content)) || "";
  return String(text).replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

async function doubt(request, env) {
  const body = await readBody(request);
  const subject = clean(body.subject, 60) || "General";
  const question = clean(body.question, 1000);
  if (!question) return json({ error: "Question is required" }, 400);

  const answer = await runModel(
    env,
    [
      {
        role: "system",
        content:
          "You are a patient tutor helping an Indian school student (CBSE, classes 6-12). " +
          "Give a clear first-pass answer to their doubt in under 120 words, in plain text with no markdown headings. " +
          "Be accurate. If you are not sure, say so and suggest they wait for their teacher's reply.",
      },
      { role: "user", content: `Subject: ${subject}\nDoubt: ${question}` },
    ],
    400
  );
  if (!answer) {
    const raw = await env.AI.run(MODEL, { messages: [{ role: "user", content: "Say hello." }], max_tokens: 200 });
    return json({ error: "Empty answer", debug: JSON.stringify(raw).slice(0, 1500) }, 502);
  }
  return json({ answer });
}

async function studyKit(request, env) {
  const body = await readBody(request);
  const topic = clean(body.topic, 2000);
  if (!topic) return json({ error: "Topic is required" }, 400);

  const raw = await runModel(
    env,
    [
      {
        role: "system",
        content:
          "You make study kits for Indian school students (CBSE, classes 6-12). Reply with ONLY a JSON object, no other text, in exactly this shape: " +
          '{"topic": string, "summary": string (4-5 sentences), "simplified": string (2-3 very simple sentences), ' +
          '"flashcards": [6 items of {"front": string, "back": string}], ' +
          '"quiz": [5 items of {"question": string, "options": [4 strings], "correct": index 0-3 of the right option, "explanation": string}]}. ' +
          "Every fact must be accurate.",
      },
      { role: "user", content: `Topic or notes: ${topic}` },
    ],
    2500
  );

  const kit = parseKit(raw);
  if (!kit) return json({ error: "Could not build a study kit" }, 502);
  return json(kit);
}

function parseKit(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let data;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }

  const flashcards = (Array.isArray(data.flashcards) ? data.flashcards : [])
    .filter((c) => c && c.front && c.back)
    .slice(0, 6)
    .map((c) => ({ front: String(c.front), back: String(c.back) }));

  const quiz = (Array.isArray(data.quiz) ? data.quiz : [])
    .filter(
      (q) =>
        q && q.question && Array.isArray(q.options) && q.options.length === 4 &&
        Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3
    )
    .slice(0, 5)
    .map((q) => ({
      question: String(q.question),
      options: q.options.map(String),
      correct: q.correct,
      explanation: String(q.explanation || ""),
    }));

  if (!data.summary || flashcards.length < 3 || quiz.length < 3) return null;
  return {
    topic: String(data.topic || "Study kit"),
    summary: String(data.summary),
    simplified: String(data.simplified || ""),
    flashcards,
    quiz,
  };
}
