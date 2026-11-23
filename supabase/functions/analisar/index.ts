// Diário do Prato: análise de fotos (prato, rótulo, receita escrita) com o Gemini.
// Usada pela versão fora do Claude (GitHub Pages). Só atende quem está logado no app.
// Secrets no Supabase: GEMINI_API_KEY (obrigatório) e GEMINI_MODEL (opcional).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_B64 = 6_000_000; // cerca de 4,5 MB por imagem
const MAX_PROMPT = 60_000;

const reply = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  // 1. Confere se quem chamou está logado (token de sessão do Supabase Auth).
  const auth = req.headers.get("authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? "";
  if (!auth.startsWith("Bearer ")) return reply(401, { error: "not_signed_in" });
  const who = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!who.ok) return reply(401, { error: "not_signed_in" });

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return reply(503, { error: "missing_key" });

  // 2. Valida o pedido.
  let body: { prompt?: unknown; images?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "bad_request" }); }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const images = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
  if (!prompt || prompt.length > MAX_PROMPT) return reply(400, { error: "bad_request" });
  const parts: unknown[] = [{ text: prompt }];
  for (const img of images) {
    const mime = String(img?.mime ?? ""), data = String(img?.data ?? "");
    if (!MIMES.has(mime) || !data || data.length > MAX_IMAGE_B64) return reply(400, { error: "bad_image" });
    parts.push({ inline_data: { mime_type: mime, data } });
  }

  // 3. Chama o Gemini pedindo resposta em JSON.
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (r.status === 429) return reply(429, { error: "rate_limited" });
  if (!r.ok) {
    const t = await r.text();
    console.error("gemini", r.status, t.slice(0, 800));
    const invalid = (r.status === 400 || r.status === 403) && /api key|API_KEY|permission/i.test(t);
    return reply(502, { error: invalid ? "invalid_key" : "gemini_error", status: r.status });
  }
  const out = await r.json();
  const text: string = (out?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  try {
    return reply(200, { data: JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")) });
  } catch {
    console.error("saida nao-JSON", text.slice(0, 400));
    return reply(502, { error: "bad_output" });
  }
});
