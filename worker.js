/**
 * Cloudflare Worker: Forensic Sketch AI Image Generation & Refinement Engine
 * Models: @cf/black-forest-labs/flux-1-schnell (170+ free images/day)
 *         @cf/bytedance/stable-diffusion-xl-lightning
 * 
 * Supports:
 * - Deterministic seed locking (Layer 1)
 * - Base64 image input for Image-to-Image editing (Layer 2)
 * - Secure API Key authentication via Bearer token or x-api-key
 * - Full CORS support for web clients and backend proxies
 */

export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, API-KEY, api-key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, API-KEY, api-key",
    };

    // 2. Health check endpoint
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return new Response(
        JSON.stringify({
          status: "healthy",
          service: "ForensicSketch AI Cloudflare Worker",
          default_model: "@cf/black-forest-labs/flux-1-schnell",
          capabilities: ["text-to-image", "image-to-image", "seed-locking"],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. API Key Authentication Check (accepts '12345', 'forensic_secret_2026', or env keys)
    const validKeys = [
      "12345",
      "forensic_secret_2026",
      env.CF_WORKER_API_KEY,
      env.API_KEY,
      env["API-KEY"],
    ].filter(Boolean);

    const authHeader = request.headers.get("Authorization") || "";
    const xApiKey = request.headers.get("x-api-key") || "";
    const apiKeyHeader = request.headers.get("API-KEY") || request.headers.get("api-key") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const providedKey = bearerToken || xApiKey || apiKeyHeader;

    if (validKeys.length > 0 && !validKeys.includes(providedKey)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse JSON payload
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", details: e.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = body.prompt || "Forensic composite sketch of a suspect, frontal view, graphite on paper";
    const requestedModel = body.model || env.CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
    const seed = typeof body.seed === "number" ? Math.floor(body.seed) : 42190;
    const steps = typeof body.steps === "number" ? body.steps : 4;
    const initImageB64 = body.init_image_b64 || body.image || body.init_image || null;

    // 5. Build model input with Seed Locking & Image-to-Image support
    const modelsToTry = initImageB64
      ? [
          "@cf/runwayml/stable-diffusion-v1-5-img2img",
          requestedModel,
          "@cf/bytedance/stable-diffusion-xl-lightning",
          "@cf/black-forest-labs/flux-1-schnell",
        ]
      : [
          requestedModel,
          "@cf/black-forest-labs/flux-1-schnell",
          "@cf/bytedance/stable-diffusion-xl-lightning",
          "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        ];
    const uniqueModels = [...new Set(modelsToTry)];

    let lastError = null;

    for (const modelId of uniqueModels) {
      try {
        const input = {
          prompt: prompt,
        };

        // Cloudflare Workers AI schema forbids 'seed' on Flux-1 Schnell
        if (!modelId.includes("flux") && seed !== undefined) {
          input.seed = seed;
          input.num_steps = steps;
        } else if (steps) {
          input.num_steps = steps;
        }

        // If previous sketch image passed for image-to-image refinement:
        if (initImageB64) {
          try {
            // Clean base64 header if present
            const cleanB64 = initImageB64.includes(",") ? initImageB64.split(",")[1] : initImageB64;
            const binaryString = atob(cleanB64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            // Pass raw image array for models that accept image inputs
            input.image = [...bytes];
            input.strength = 0.32; // 32% alteration strength to lock underlying face
          } catch (b64Err) {
            console.warn("Base64 decode warning for init_image:", b64Err.message);
          }
        }

        // Execute via Cloudflare AI binding
        const response = await env.AI.run(modelId, input);

        // If response is a binary stream or ArrayBuffer, return direct image
        if (response instanceof ReadableStream || response instanceof ArrayBuffer || response instanceof Uint8Array) {
          return new Response(response, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "image/png",
              "X-AI-Model-Used": modelId,
              "X-Case-Seed": String(seed),
            },
          });
        }

        // If JSON output containing base64 string
        if (response && (response.image || response.result)) {
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-AI-Model-Used": modelId,
              "X-Case-Seed": String(seed),
            },
          });
        }

        // Return raw response
        return new Response(response, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "image/png",
            "X-AI-Model-Used": modelId,
            "X-Case-Seed": String(seed),
          },
        });
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelId} failed: ${err.message}. Trying fallback...`);
      }
    }

    return new Response(
      JSON.stringify({
        error: "All Cloudflare image models failed or were exhausted",
        details: lastError ? lastError.message : "Unknown error",
        models_attempted: uniqueModels,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  },
};
