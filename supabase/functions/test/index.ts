// /supabase/functions/cleoChat.ts       (v3.4)
// Cleo – multi-turn chat + RAG  (Gemini-2.0-Flash)  — robust UUID handling
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ──────────────────── Supabase & Gemini keys ────────────────────
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent?key=${GEMINI_KEY}`;
// ──────────────────── Prompt / tools / CORS ─────────────────────
const SYSTEM_PROMPT = `
You are **Cleo** – CICADA's constitutional research assistant with two modes:  
🔹 **Default**: Friendly and engaging (emojis, light humor)  
🔹 **Serious Mode**: No-nonsense tone for grave topics  

### 🚀 Core Rules:  
1. **Function Triggers** 🤖  
   - *Always* use \`get_relevant_documents\` for:  
     • Constitutional/legal queries  
     • Historical cases  
   - *Never* for off-topic/personal advice.  

2. **Serious Mode Activation** ⚠️  
   Switch to **formal, zero-emoji** responses when users mention: violent crimes,  
   human-rights violations, or active emergencies.  

3. **Citation Protocol** 📜  
   Inline numbered refs [1][2][3] – quote key phrases when helpful.  

4. **Tone Guidelines**  
   Default: light & helpful – Serious Mode: flat & factual.  

### 🚫 Absolute Limits  
- No emergency advice: “Contact authorities immediately.”  
- No hypotheticals about violence/abuse.  
- No editorialising beyond sources.  
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
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};
// ──────────────────── Helper utilities ──────────────────────────
const uuidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (s)=>!!s && uuidRE.test(s);
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
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: CORS_HEADERS
    });
  }
  try {
    const body = await req.json();
    if (!body?.query) throw new Error("Body requires ‘query’ field");
    // ── user_id logic ──
    const user_id = isUUID(body.user_id) ? body.user_id : null;
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: SYSTEM_PROMPT
          }
        ]
      },
      ...(body.history ?? []).map((m)=>({
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
            text: body.query
          }
        ]
      }
    ];
    // 1️⃣ initial Gemini call
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
      async start (controller) {
        const reader = firstResp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let collected = "";
        let toolDone = false;
        let sources = [];
        const watchdogMs = 60_000;
        let lastTick = Date.now();
        const watchdog = setInterval(()=>{
          if (Date.now() - lastTick > watchdogMs) {
            console.error("⏱️ upstream timeout");
            sse(controller, "error", {
              error: "Upstream timeout"
            });
            controller.close();
          }
        }, 10_000);
        try {
          while(true){
            const { value, done } = await reader.read();
            if (done) break;
            lastTick = Date.now();
            buf += decoder.decode(value, {
              stream: true
            });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines){
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              const j = JSON.parse(payload);
              const parts = j?.candidates?.[0]?.content?.parts ?? [];
              const fc = parts[0]?.functionCall;
              // ── tool branch ──
              if (fc?.name === "get_relevant_documents" && !toolDone) {
                toolDone = true;
                try {
                  const rag = await performRag(fc.args.query, user_id);
                  sources = rag.rows.map(mapRow);
                  sse(controller, "sources", sources);
                  const contReader = await continueGemini(contents, fc, rag);
                  await pipeContinuation(contReader, controller, (txt)=>collected += txt);
                } catch (e) {
                  console.error("🔴 RAG error", e);
                  sse(controller, "error", {
                    error: e.message
                  });
                }
                break; // stop processing initial stream
              }
              // ── normal token ──
              parts.forEach((p)=>{
                if (p.text) {
                  collected += p.text;
                  sse(controller, "data", p.text);
                }
              });
            }
          }
          sse(controller, "result", {
            text: collected.trim(),
            sources
          });
          sse(controller, "end", "[DONE]");
        } finally{
          clearInterval(watchdog);
          controller.close();
        }
      }
    });
    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
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
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream"
      }
    });
  }
});
// ──────────────────── RAG helpers ────────────────────────────────
async function performRag(question, user_id) {
  // 1. embed question
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
  // 2. public vectors (always)
  const pub = await supabase.rpc("match_documents", {
    ...base,
    table_name: "public_vectors"
  });
  if (pub.error) throw new Error(`RPC public: ${pub.error.message}`);
  // 3. private vectors (call either with or without user id)
  const privParams = {
    ...base,
    table_name: "private_vectors"
  };
  if (user_id) privParams.current_user_id = user_id;
  const priv = await supabase.rpc("match_documents", privParams);
  if (priv.error) throw new Error(`RPC private: ${priv.error.message}`);
  // 4. merge & rank
  const rows = [
    ...priv.data,
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
    for (const line of lines){
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
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
