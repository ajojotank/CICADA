import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.120.0/http/server.ts";
// Supabase client with service role
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
serve(async (req)=>{
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Total document count
  const { count: privateCount } = await supabase.from("documents_private").select("id", {
    count: "exact",
    head: true
  });
  const { count: publicCount } = await supabase.from("documents_public").select("id", {
    count: "exact",
    head: true
  });
  // Recent uploads in the last 7 days
  const { count: recentPrivate } = await supabase.from("documents_private").select("id", {
    count: "exact",
    head: true
  }).gte("created_at", sevenDaysAgo);
  const { count: recentPublic } = await supabase.from("documents_public").select("id", {
    count: "exact",
    head: true
  }).gte("created_at", sevenDaysAgo);
  // Storage used (approximate from metadata field)
  const { data: docs, error } = await supabase.from("documents_private").select("metadata");
  const totalBytes = docs?.reduce((acc, doc)=>{
    const sizeStr = doc.metadata?.size || "0KB";
    const kb = parseFloat(sizeStr.replace("KB", "")) || 0;
    return acc + kb * 1024;
  }, 0) || 0;
  // Popular searches from logs (top 5)
  const { data: searches } = await supabase.from("logs").select("event_data").eq("event_type", "search");
  const frequency = {};
  searches?.forEach(({ event_data })=>{
    const query = event_data?.query?.toLowerCase().trim();
    if (query) {
      frequency[query] = (frequency[query] || 0) + 1;
    }
  });
  const popularSearches = Object.entries(frequency).sort(([, a], [, b])=>b - a).slice(0, 5).map(([term])=>term);
  return new Response(JSON.stringify({
    documentCount: (privateCount || 0) + (publicCount || 0),
    recentUploads: (recentPrivate || 0) + (recentPublic || 0),
    storageUsed: `${(totalBytes / 1024 ** 3).toFixed(2)}GB`,
    totalStorage: "8GB",
    popularSearches
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
});
