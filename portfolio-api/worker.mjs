const maxAmount = 1_000_000_000_000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const codePattern = /^[A-Za-z0-9_-]{24,128}$/;
const encoder = new TextEncoder();

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireValue(condition, message) {
  if (!condition) throw new ApiError(400, message);
}

async function hasAccess(request, secret) {
  const auth = request.headers.get("Authorization") ?? "";
  const code = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!codePattern.test(code)) return false;
  const [actual, expected] = await Promise.all(
    [code, secret].map(value => crypto.subtle.digest("SHA-256", encoder.encode(value)))
  );
  // The Cloudflare extension compares digests without a data-dependent early exit.
  return crypto.subtle.timingSafeEqual(actual, expected);
}

async function readJson(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json") || !request.body) {
    throw new ApiError(400, "입력 형식을 확인해 주세요.");
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let contents = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        throw new ApiError(413, "입력이 너무 깁니다.");
      }
      contents += decoder.decode(value, { stream: true });
    }
    const data = JSON.parse(contents + decoder.decode());
    requireValue(data && typeof data === "object" && !Array.isArray(data), "입력 형식을 확인해 주세요.");
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "입력 형식을 확인해 주세요.");
  } finally {
    reader.releaseLock();
  }
}

function checkedDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isInt(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function recordInput(data) {
  requireValue(checkedDate(data.recordDate), "기록 날짜를 확인해 주세요.");
  requireValue(isInt(data.week, 1, 8), "주차는 1~8 사이로 입력해 주세요.");
  requireValue(isInt(data.cash, 0, maxAmount), "남은 현금을 원 단위 정수로 입력해 주세요.");
  requireValue(Array.isArray(data.holdings) && data.holdings.length <= 20, "보유 자산은 20개까지 입력할 수 있습니다.");
  requireValue(typeof data.note === "string" && data.note.length <= 2000, "메모는 2,000자까지 입력할 수 있습니다.");

  let total = data.cash;
  const holdings = data.holdings.map(row => {
    requireValue(row && typeof row.name === "string", "자산 이름을 입력해 주세요.");
    const name = row.name.trim();
    requireValue(name.length > 0 && name.length <= 60, "자산 이름은 1~60자로 입력해 주세요.");
    requireValue(isInt(row.quantity, 1, maxAmount) && isInt(row.price, 0, maxAmount),
      "수량은 1 이상, 단가는 0 이상인 정수로 입력해 주세요.");
    total += row.quantity * row.price;
    requireValue(isInt(total, 0, maxAmount), "전체 평가액은 1조 원까지 기록할 수 있습니다.");
    return { name, quantity: row.quantity, price: row.price };
  });
  return [data.recordDate, data.week, data.cash, JSON.stringify(holdings), data.note.trim()];
}

function formatRecord(row) {
  const holdings = JSON.parse(row.holdings);
  return {
    id: row.id,
    recordDate: row.record_date,
    week: row.week,
    cash: row.cash,
    holdings,
    total: holdings.reduce((sum, asset) => sum + asset.quantity * asset.price, row.cash),
    note: row.note,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

async function dispatch(request, db, path, json) {
  if (path === "/people" && request.method === "GET") {
    const { results } = await db.prepare("SELECT id, name FROM people ORDER BY rowid").all();
    return json(results);
  }
  if (path === "/people" && request.method === "POST") {
    const data = await readJson(request);
    requireValue(typeof data.name === "string", "이름을 입력해 주세요.");
    const name = data.name.trim().normalize("NFKC");
    requireValue(name.length > 0 && name.length <= 40, "이름은 1~40자로 입력해 주세요.");
    const id = crypto.randomUUID();
    const result = await db.prepare("INSERT INTO people (id, name, name_key) VALUES (?, ?, ?) ON CONFLICT(name_key) DO NOTHING")
      .bind(id, name, name.toLowerCase()).run();
    if (!result.meta.changes) throw new ApiError(409, "이미 등록된 이름입니다.");
    return json({ id, name }, 201);
  }

  const [, collection, personId, records, recordId, extra] = path.split("/");
  if (collection !== "people" || records !== "records" || extra !== undefined ||
      !uuid.test(personId ?? "") || (recordId !== undefined && !uuid.test(recordId))) {
    throw new ApiError(404, "요청한 항목을 찾을 수 없습니다.");
  }
  if (!await db.prepare("SELECT id FROM people WHERE id = ?").bind(personId).first()) {
    throw new ApiError(404, "선택한 사람을 찾을 수 없습니다.");
  }

  if (!recordId && request.method === "GET") {
    const { results } = await db.prepare(
      "SELECT * FROM records WHERE person_id = ? ORDER BY record_date DESC, updated_at DESC, id"
    ).bind(personId).all();
    return json(results.map(formatRecord));
  }

  if (!recordId && request.method === "POST") {
    const data = await readJson(request);
    requireValue(typeof data.id === "string" && uuid.test(data.id), "기록 식별자를 확인해 주세요.");
    const fields = recordInput(data);
    const inserted = await db.prepare(
      "INSERT INTO records (id, person_id, record_date, week, cash, holdings, note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING *"
    ).bind(data.id, personId, ...fields, new Date().toISOString()).first();
    if (inserted) return json(formatRecord(inserted), 201);
    const prior = await db.prepare("SELECT * FROM records WHERE id = ? AND person_id = ?").bind(data.id, personId).first();
    if (prior && [prior.record_date, prior.week, prior.cash, prior.holdings, prior.note].every((value, i) => value === fields[i])) {
      return json(formatRecord(prior));
    }
    throw new ApiError(409, "이미 저장된 기록입니다. 목록을 새로고침해 주세요.");
  }

  if (recordId && ["PUT", "DELETE"].includes(request.method)) {
    const data = await readJson(request);
    requireValue(isInt(data.revision, 1, Number.MAX_SAFE_INTEGER), "기록을 다시 불러와 주세요.");
    if (request.method === "PUT") {
      const updated = await db.prepare(
        "UPDATE records SET record_date = ?, week = ?, cash = ?, holdings = ?, note = ?, updated_at = ?, revision = revision + 1 WHERE id = ? AND person_id = ? AND revision = ? RETURNING *"
      ).bind(...recordInput(data), new Date().toISOString(), recordId, personId, data.revision).first();
      if (updated) return json(formatRecord(updated));
    } else {
      const deleted = await db.prepare("DELETE FROM records WHERE id = ? AND person_id = ? AND revision = ?")
        .bind(recordId, personId, data.revision).run();
      if (deleted.meta.changes) return json({ deleted: true });
    }
    throw new ApiError(409, "다른 기기에서 기록이 변경되었거나 삭제되었습니다. 목록을 새로고침해 주세요.");
  }
  throw new ApiError(405, "지원하지 않는 요청입니다.");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin",
    };
    if (origin && origin === env.SITE_ORIGIN) headers["Access-Control-Allow-Origin"] = origin;
    const json = (data, status = 200) => Response.json(data, { status, headers });
    if (!origin || origin !== env.SITE_ORIGIN) return json({ error: "허용되지 않은 사이트입니다." }, 403);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
      });
    }
    if (!env.DB || !codePattern.test(env.FAMILY_CODE ?? "")) return json({ error: "기록 서버를 준비하고 있습니다." }, 503);
    try {
      if (!await hasAccess(request, env.FAMILY_CODE)) return json({ error: "가족 공용 코드를 확인해 주세요." }, 401);
      return await dispatch(request, env.DB, new URL(request.url).pathname, json);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      console.error("Portfolio request failed", error.name);
      return json({ error: "기록을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, 500);
    }
  },
};
