// pick-server.mjs — 画像候補から「これにする」を押した写真を picked/ に保存する
// ローカル専用の小さなサーバー。Next.js のアプリ本体とは独立していて、
// このファイルを実行している間だけ動きます。
//
//   node pick-server.mjs
//   → http://localhost:4321 をブラウザで開く
//
// 保存されるもの:
//   picked/<placementのid>.jpg   選んだ写真（例: picked/10-1.jpg）
//   picked/credits.txt           撮影者 / サイト名などのクレジット
//   picked/picks.json            どれを選んだかの記録（credits.txt の元データ）

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PICKED = path.join(ROOT, "picked");
const HTML = path.join(ROOT, "image_candidates.html");
const DATA = path.join(ROOT, "image_candidates.json");
const PICKS = path.join(PICKED, "picks.json");
const CREDITS = path.join(PICKED, "credits.txt");
const PORT = Number(process.env.PORT || 4321);

const SITE = {
  Unsplash: "Unsplash", Pexels: "Pexels",
  Pixabay: "Pixabay", Openverse: "Openverse",
};

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; }
}

// 保存してよいのは image_candidates.json に載っている画像だけに限定する。
// （任意のURLを取りに行かせないため）
async function allowedImages() {
  const data = await readJson(DATA, null);
  const map = new Map();
  if (!data) return map;
  for (const post of data.posts || []) {
    for (const pl of post.placements || []) {
      for (const c of pl.candidates || []) {
        map.set(`${pl.id}|${c.image_url}`, { ...c, placement_id: pl.id });
      }
    }
  }
  return map;
}

// image_candidates.json に入っているのは表示用（Unsplash 1080px / Pexels 940px など）の
// URLなので、CDNのパラメータを書き換えてできるだけ大きい版を取りに行く。
// Pixabay と Openverse は返ってくるURLがそのまま最大なので触らない。
const TARGET_W = 2400;
function upsize(url, source) {
  try {
    const u = new URL(url);
    if (source === "Unsplash" && u.hostname === "images.unsplash.com") {
      u.searchParams.set("w", String(TARGET_W));
      u.searchParams.delete("h");
      u.searchParams.set("q", "85");
      return u.toString();
    }
    if (source === "Pexels" && u.hostname === "images.pexels.com") {
      u.searchParams.set("w", String(TARGET_W));
      u.searchParams.delete("h");
      return u.toString();
    }
    return url;
  } catch { return url; }
}

function creditLine(p) {
  const who = p.author && p.author !== "(表記なし)" ? p.author : "撮影者表記なし";
  return `${p.file}  (${p.width}×${p.height})  ${who} / ${SITE[p.source] || p.source}  —  ${p.license}  —  ${p.page_url}`;
}

async function writeCredits(picks) {
  const ids = Object.keys(picks).sort();
  const body = ids.map((id) => creditLine(picks[id])).join("\n");
  const head =
    "note転載記事 画像クレジット\n" +
    "picked/ に保存した写真の撮影者とサイト名です。\n" +
    "記事に載せるときは各サイトの規約にしたがって表記してください。\n" +
    `最終更新: ${new Date().toISOString()}\n` +
    "----------------------------------------------------------------\n";
  await fs.writeFile(CREDITS, head + body + (body ? "\n" : ""), "utf8");
}

async function savePick(body) {
  const { placement_id, image_url } = body;
  if (!placement_id || !image_url) throw new Error("placement_id と image_url が必要です");
  if (!/^[A-Za-z0-9_-]+$/.test(placement_id)) throw new Error("placement_id の形式が不正です");

  const allow = await allowedImages();
  const hit = allow.get(`${placement_id}|${image_url}`);
  if (!hit) throw new Error("image_candidates.json に載っていない画像です");

  async function grab(u) {
    const r = await fetch(u, {
      redirect: "follow",
      headers: { "User-Agent": "free-image-search/1.0", Accept: "image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) throw new Error(`画像を取得できません (HTTP ${r.status})`);
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length < 1000) throw new Error("画像が小さすぎます（取得に失敗した可能性）");
    return b;
  }

  const big = upsize(image_url, hit.source);
  let buf;
  try {
    buf = await grab(big);
  } catch (err) {
    if (big === image_url) throw err;
    buf = await grab(image_url); // 大きい版が駄目なら元のURLに戻す
  }

  await fs.mkdir(PICKED, { recursive: true });
  const file = `${placement_id}.jpg`;
  const dest = path.join(PICKED, file);
  const info = await sharp(buf).jpeg({ quality: 92 }).toFile(dest);

  const picks = await readJson(PICKS, {});
  picks[placement_id] = {
    placement_id, file,
    source: hit.source, author: hit.author, license: hit.license,
    license_url: hit.license_url, page_url: hit.page_url, image_url,
    width: info.width, height: info.height,
    picked_at: new Date().toISOString(),
  };
  await fs.writeFile(PICKS, JSON.stringify(picks, null, 2), "utf8");
  await writeCredits(picks);

  return { ok: true, file: `picked/${file}`, width: info.width, height: info.height };
}

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/image_candidates.html")) {
      const html = await fs.readFile(HTML);
      return send(res, 200, "text/html; charset=utf-8", html);
    }
    if (req.method === "GET" && url.pathname === "/image_candidates.json") {
      return send(res, 200, "application/json; charset=utf-8", await fs.readFile(DATA));
    }
    if (req.method === "GET" && url.pathname === "/picked") {
      return send(res, 200, "application/json; charset=utf-8",
        JSON.stringify({ ok: true, picks: await readJson(PICKS, {}) }));
    }
    if (req.method === "POST" && url.pathname === "/pick") {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 1e6) throw new Error("リクエストが大きすぎます");
      }
      const out = await savePick(JSON.parse(raw || "{}"));
      console.log(`saved ${out.file}  (${out.width}x${out.height})`);
      return send(res, 200, "application/json; charset=utf-8", JSON.stringify(out));
    }
    send(res, 404, "application/json; charset=utf-8", JSON.stringify({ ok: false, error: "not found" }));
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    console.error("error:", msg);
    send(res, 400, "application/json; charset=utf-8", JSON.stringify({ ok: false, error: msg }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`画像ピッカーを起動しました → http://localhost:${PORT}`);
  console.log(`保存先: ${PICKED}`);
  console.log("終了するには Ctrl+C");
});
