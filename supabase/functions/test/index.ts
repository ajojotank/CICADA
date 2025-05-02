// /supabase/functions/cleoChat.ts       (v3.3)
// Cleo – multi-turn chat + RAG (Gemini-2.0-Flash) – UUID source IDs
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ──────────────────── Supabase & Gemini keys ────────────────────
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent?key=${GEMINI_KEY}`;
// ──────────────────── Prompt / tools / CORS ─────────────────────
const SYSTEM_PROMPT = `
You are **Cleo**, CICADA's friendly constitutional research assistant.
- ALWAYS use the "get_relevant_documents" function for substantive constitutional questions.
- Cite retrieved docs inline as [1], [2], [3] in order.
- Be concise, quote directly when helpful, and never guess beyond sources.
`.trim();
const tools = [
  {
    functionDeclarations: [
      {
        name: "get_relevant_documents",
        description: "Return up to three documents relevant to the user's question.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Semantic query"
            }
          },
          required: [
            "query"
          ]
        }
      }
    ]
  }
];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};
// ──────────────────── Helper utilities ──────────────────────────
function looksLikeUUID(str = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
async function fetchJsonOrThrow(url, init, label) {
  const res = await fetch(url, init);
  const ctype = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = ctype.includes("json") ? await res.json() : await res.text();
    throw new Error(`${label} ${res.status}: ${JSON.stringify(body)}`);
  }
  return ctype.includes("json") ? res.json() : res;
}
function sse(ctrl, ev, data) {
  ctrl.enqueue(new TextEncoder().encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`));
}
function mapRow(row) {
  const d = row.document || {};
  const title = d.title ?? d.file_name ?? "Untitled";
  const domain = d.source ?? (d.file_url ? new URL(d.file_url).hostname : "unknown");
  const snippet = (d.ai_summary ?? d.description ?? "").slice(0, 80) || "(no preview)";
  return {
    id: row.document_id,
    title,
    domain,
    snippet,
    preview: snippet + "…"
  };
}
// ──────────────────── Edge entry point ───────────────────────────
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("OK", {
    headers: CORS
  });
  try {
    const body = await req.json();
    const query = body.query;
    const user_id = body.user_id ?? "anonymous";
    const history = body.history ?? [];
    if (!query) throw new Error("Body requires 'query' field");
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: SYSTEM_PROMPT
          }
        ]
      },
      ...history.map((m)=>({
          role: m.role,
          parts: [
            {
              text: m.text
            }
          ]
        })),
      {
        role: "user",
        parts: [
          {
            text: query
          }
        ]
      }
    ];
    // 1️⃣ first Gemini streaming call
    const firstResp = await fetchJsonOrThrow(GEMINI_STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents,
        tools
      })
    }, "Gemini streamGenerateContent");
    if (!firstResp.body) throw new Error("Gemini SSE missing body");
    // 2️⃣ stream to browser
    const stream = new ReadableStream({
      async start (ctrl) {
        const reader = firstResp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "", collected = "", toolDone = false, sources = [];
        let last = Date.now();
        const timeoutMs = 60_000;
        const watchdog = setInterval(()=>{
          if (Date.now() - last > timeoutMs) {
            console.error("⏱️ upstream timeout");
            sse(ctrl, "error", {
              error: "Upstream timeout"
            });
            ctrl.close();
          }
        }, 10_000);
        try {
          while(true){
            const { value, done } = await reader.read();
            if (done) break;
            last = Date.now();
            buf += decoder.decode(value, {
              stream: true
            });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const l of lines){
              if (!l.startsWith("data:")) continue;
              const payload = l.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              const j = JSON.parse(payload);
              const pr = j?.candidates?.[0]?.content?.parts ?? [];
              const fc = pr[0]?.functionCall;
              // — tool branch
              if (fc && fc.name === "get_relevant_documents" && !toolDone) {
                toolDone = true;
                try {
                  const rag = await performRag(fc.args.query, user_id);
                  sources = rag.rows.map(mapRow);
                  sse(ctrl, "sources", sources);
                  const cont = await continueGemini(contents, fc, rag);
                  await pipeContinuation(cont, ctrl, (txt)=>collected += txt);
                } catch (e) {
                  console.error("🔴 RAG error", e);
                  sse(ctrl, "error", {
                    error: e.message
                  });
                }
                break; // exit reading loop
              }
              // — normal token
              pr.forEach((p)=>{
                if (p.text) {
                  collected += p.text;
                  sse(ctrl, "data", p.text);
                }
              });
            }
          }
          sse(ctrl, "result", {
            text: collected.trim(),
            sources
          });
          sse(ctrl, "end", "[DONE]");
        } finally{
          clearInterval(watchdog);
          ctrl.close();
        }
      }
    });
    return new Response(stream, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache"
      }
    });
  } catch (err) {
    console.error("❌ edge error", err);
    return new Response(`event: error\ndata: ${JSON.stringify({
      error: err.message
    })}\n\n`, {
      status: 500,
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream"
      }
    });
  }
});
// ──────────────────── RAG helpers ────────────────────────────────
async function performRag(question, user_id) {
  const embJson = await fetchJsonOrThrow(GEMINI_EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "models/gemini-embedding-exp-03-07",
      content: {
        parts: [
          {
            text: question
          }
        ]
      },
      taskType: "RETRIEVAL_QUERY"
    })
  }, "Gemini embedContent");
  const embed = embJson.embedding?.values?.slice(0, 2000);
  if (!embed?.length) throw new Error("Embedding empty");
  const base = {
    query_embedding: embed,
    match_count: 3,
    similarity_threshold: 0.75
  };
  // public vectors (always)
  const pub = await supabase.rpc("match_documents", {
    ...base,
    table_name: "public_vectors"
  });
  if (pub.error) throw new Error(`RPC public: ${pub.error.message}`);
  // private vectors (only if user_id is UUID)
  let privRows = [];
  if (looksLikeUUID(user_id)) {
    const priv = await supabase.rpc("match_documents", {
      ...base,
      table_name: "private_vectors",
      current_user_id: user_id
    });
    if (priv.error) throw new Error(`RPC private: ${priv.error.message}`);
    privRows = priv.data;
  }
  const rows = [
    ...privRows,
    ...pub.data
  ].sort((a, b)=>b.similarity - a.similarity).slice(0, 3);
  return {
    rows
  };
}
async function continueGemini(contents, fc, rag) {
  const resp = await fetchJsonOrThrow(GEMINI_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        ...contents,
        {
          role: "model",
          parts: [
            {
              functionCall: fc
            }
          ]
        },
        {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: "get_relevant_documents",
                response: {
                  documents: rag.rows
                }
              }
            }
          ]
        }
      ],
      tools
    })
  }, "Gemini continuation");
  if (!resp.body) throw new Error("Continuation missing body");
  return resp.body.getReader();
}
async function pipeContinuation(reader, ctrl, collect) {
  const dec = new TextDecoder();
  let buf = "";
  while(true){
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, {
      stream: true
    });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines){
      if (!l.startsWith("data:")) continue;
      const p = l.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      JSON.parse(p)?.candidates?.[0]?.content?.parts?.forEach((part)=>{
        if (part.text) {
          collect(part.text);
          sse(ctrl, "data", part.text);
        }
      });
    }
  }
}
