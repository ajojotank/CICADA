import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_UPLOAD_URL = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent?key=${GEMINI_API_KEY}`;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, Referer, User-Agent, Accept, Range, X-Session-Id, X-Supabase-Client",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "Content-Range, Range"
};
serve(async (req)=>{
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const { document_id, file_path, bucket, is_public, user_id } = await req.json();
    if (!document_id || !file_path || !bucket || !user_id) {
      return new Response("Missing required fields", {
        status: 400,
        headers: corsHeaders
      });
    }
    const docTable = is_public ? "documents_public" : "documents_private";
    const vectorsTable = is_public ? "public_vectors" : "private_vectors";
    // Ensure document exists
    const { data: existingDoc, error: fetchError } = await supabase.from(docTable).select("id").eq("id", document_id).maybeSingle();
    if (fetchError || !existingDoc) {
      return new Response("Document not found", {
        status: 404,
        headers: corsHeaders
      });
    }
    // Generate Supabase signed/public URL
    let pdfUrl;
    if (is_public) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(file_path);
      pdfUrl = data.publicUrl;
    } else {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(file_path, 3600);
      if (error || !data) {
        return new Response("Failed to create signed URL", {
          status: 500,
          headers: corsHeaders
        });
      }
      pdfUrl = data.signedUrl;
    }
    // Download the PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return new Response("Failed to download PDF", {
        status: 500,
        headers: corsHeaders
      });
    }
    const buffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(buffer);
    const mimeType = pdfResponse.headers.get("Content-Type") || "application/pdf";
    const numBytes = pdfBytes.length;
    // Gemini file upload: init resumable session
    const uploadInit = await fetch(GEMINI_UPLOAD_URL, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": numBytes.toString(),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        file: {
          display_name: file_path.split("/").pop()
        }
      })
    });
    const uploadUrl = uploadInit.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      return new Response("Failed to initiate Gemini upload", {
        status: 500,
        headers: corsHeaders
      });
    }
    // Upload bytes to Gemini
    const uploadFinal = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": numBytes.toString(),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
      },
      body: pdfBytes
    });
    const uploadResult = await uploadFinal.json();
    const fileUri = uploadResult?.file?.uri;
    if (!fileUri) {
      return new Response("Upload failed", {
        status: 500,
        headers: corsHeaders
      });
    }
    // Prompt Gemini with file
    const promptText = `You are an AI assistant helping parse legal and constitutional PDF documents.
Your task is to return a very detailed analysis of the document in plain text. Follow this exact format:

Summary:
(Write 8–12 sentences summarizing the document’s purpose, context, and structure. Be detailed.)

Key Sections:
(List 6–10 bullet points. Each bullet must describe a different section, law, or concept.)

Citations:
(List all legal references, statutes, or case law mentioned.)

Please follow the structure exactly: Summary:, Key Sections:, Citations:.`;
    const genResponse = await fetch(GEMINI_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              },
              {
                file_data: {
                  mime_type: "application/pdf",
                  file_uri: fileUri
                }
              }
            ]
          }
        ]
      })
    });
    const genResult = await genResponse.json();
    const fullText = genResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const summary = fullText.split("Summary:")[1]?.split("Key Sections:")[0]?.trim() || "";
    const keySections = fullText.split("Key Sections:")[1]?.split("Citations:")[0]?.trim() || "";
    const citations = fullText.split("Citations:")[1]?.trim() || "";
    // Chunking
    const words = fullText.split(/\s+/);
    const chunks = [];
    for(let i = 0; i < words.length; i += 200){
      chunks.push(words.slice(i, i + 200).join(" "));
    }
    // Embed chunks
    let successfullyInsertedChunks = 0;
    for (const chunk of chunks){
      const embedRes = await fetch(GEMINI_EMBED_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "models/gemini-embedding-exp-03-07",
          content: {
            parts: [
              {
                text: chunk
              }
            ]
          },
          taskType: "RETRIEVAL_DOCUMENT"
        })
      });
      const embedJson = await embedRes.json();
      const vector = embedJson?.embedding?.values;
      if (!vector || !Array.isArray(vector)) continue;
      const truncated = vector.slice(0, 2000);
      const insertData = {
        content: chunk,
        embedding: truncated,
        metadata: {
          length: chunk.length,
          vector_dimensions: truncated.length
        },
        document_id
      };
      if (!is_public) insertData.user_id = user_id;
      const { error } = await supabase.from(vectorsTable).insert([
        insertData
      ]);
      if (!error) successfullyInsertedChunks++;
    }
    // Update document with insights
    const { error: updateError } = await supabase.from(docTable).update({
      ai_summary: summary,
      ai_key_sections: keySections,
      ai_citations: citations
    }).eq("id", document_id);
    if (updateError) {
      return new Response("Failed to update document", {
        status: 500,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      status: "ok",
      document_id,
      ai_summary: summary,
      ai_key_sections: keySections,
      ai_citations: citations,
      chunks_produced: chunks.length,
      chunks_inserted: successfullyInsertedChunks,
      raw_text: fullText,
      raw_ai_response: genResult
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders
    });
  }
});
