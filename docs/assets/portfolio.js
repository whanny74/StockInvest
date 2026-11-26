(() => {
  const root = document.querySelector("[data-portfolio]");
  if (!root) return;

  const ui = Object.fromEntries([...root.querySelectorAll("[data-pf]")].map(node => [node.dataset.pf, node]));
  const money = new Intl.NumberFormat("ko-KR");
  const krw = value => money.format(value) + "원";
  const storageKey = "stockinvest.family-code.v1";
  const localOrigin = "http://127.0.0.1:8766";
  const apiRoot = location.origin === localOrigin
    ? "http://127.0.0.1:8787"
    : /^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(window.stockInvestPortfolioApi)
      ? window.stockInvestPortfolioApi : "";
  const field = (form, name) => form.elements.namedItem(name);
  const view = { code: "", people: [], person: null, records: [], editing: null, busy: false };

  function report(text, error = false) {
    ui.status.textContent = text;
    ui.status.dataset.error = String(error);
    if (error) {
      ui.status.tabIndex = -1;
      ui.status.focus();
    }
  }

  function remember(code) {
    try {
      if (code) localStorage.setItem(storageKey, code);
      else localStorage.removeItem(storageKey);
      return true;
    } catch {
      return false;
    }
  }

  async function request(path, method = "GET", data, code = view.code) {
    const headers = { Authorization: "Bearer " + code };
    if (data !== undefined) headers["Content-Type"] = "application/json";
    let response;
    try {
      response = await fetch(apiRoot + path, {
        method, headers, body: data === undefined ? undefined : JSON.stringify(data),
        credentials: "omit", cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new Error("기록 서버에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.");
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("기록 서버 응답을 읽을 수 없습니다.");
    }
    if (!response.ok) {
      const error = new Error(body.error || "요청을 처리하지 못했습니다.");
      error.status = response.status;
      throw error;
    }
    return body;
  }

  async function run(action) {
    if (view.busy) return;
    view.busy = true;
    root.setAttribute("aria-busy", "true");
    const controls = [...root.querySelectorAll("button:not([disabled]), select:not([disabled])")];
    controls.forEach(control => { control.disabled = true; });
    report("처리 중입니다.");
    try {
      await action();
    } catch (error) {
      if (error.status === 401 && view.code) closeWorkspace();
      report(error.message, true);
    } finally {
      controls.forEach(control => { control.disabled = false; });
      view.busy = false;
      root.removeAttribute("aria-busy");
    }
  }

  function peopleOptions() {
    ui.people.replaceChildren(
      ...(view.people.length ? view.people.map(person => new Option(person.name, person.id))
        : [new Option("등록된 사람이 없습니다", "")])
    );
    ui.people.value = view.person?.id ?? "";
  }

  function recordsPath(person = view.person) {
    return "/people/" + person.id + "/records";
  }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function actionButton(text, action, id) {
    const button = element("button", text);
    button.type = "button";
    button.dataset.recordAction = action;
    button.dataset.id = id;
    return button;
  }

  function drawRecords() {
    ui.selected.hidden = !view.person;
    ui["person-heading"].textContent = view.person ? view.person.name + "님의 기록" : "";
    ui.empty.hidden = view.records.length > 0 || Boolean(view.editing);
    ui.records.hidden = Boolean(view.editing);
    ui.records.replaceChildren(...view.records.map(record => {
      const card = element("article", undefined, "pf-record");
      const heading = element("h3", record.recordDate + " · " + record.week + "주차");
      const total = element("p", "평가액 " + krw(record.total) + " · 현금 " + krw(record.cash), "pf-total");
      const assets = element("ul");
      record.holdings.forEach(asset => {
        assets.append(element("li", asset.name + " · " + money.format(asset.quantity) + "주 × " +
          krw(asset.price) + " = " + krw(asset.quantity * asset.price)));
      });
      const actions = element("div", undefined, "pf-row");
      actions.append(actionButton("수정", "edit", record.id), actionButton("삭제", "delete", record.id));
      card.append(heading, total);
      if (assets.childElementCount) card.append(assets);
      if (record.note) card.append(element("p", record.note));
      card.append(actions);
      return card;
    }));
  }

  async function loadWorkspace(preferredId) {
    const people = await request("/people");
    const person = people.find(item => item.id === preferredId) ?? people[0] ?? null;
    const records = person ? await request(recordsPath(person)) : [];
    view.people = people;
    view.person = person;
    view.records = records;
    peopleOptions();
    closeEditor();
  }

  function closeEditor() {
    view.editing = null;
    ui.editor.reset();
    ui.assets.replaceChildren();
    ui.editor.hidden = true;
    ui["new-record"].hidden = false;
    drawRecords();
  }

  function closeWorkspace() {
    remember("");
    view.code = "";
    view.people = [];
    view.person = null;
    view.records = [];
    ui.access.reset();
    ui["add-person"].reset();
    peopleOptions();
    closeEditor();
    ui.workspace.hidden = true;
    ui.access.hidden = false;
  }

  function canLeaveEditor() {
    return !view.editing || window.confirm("저장하지 않은 편집 내용을 닫을까요?");
  }

  function readAssets() {
    return [...ui.assets.children].map(row => ({
      name: row.querySelector('[name="assetName"]').value.trim(),
      quantity: row.querySelector('[name="quantity"]').valueAsNumber,
      price: row.querySelector('[name="price"]').valueAsNumber,
    }));
  }

  function updateTotal() {
    const cash = field(ui.editor, "cash").valueAsNumber;
    const total = readAssets().reduce((sum, asset) => sum + asset.quantity * asset.price, cash);
    ui.total.value = Number.isSafeInteger(total) && total <= 1e12 ? krw(total) : "현금과 단가·수량을 확인해 주세요";
  }

  function addAsset(asset = {}) {
    const row = ui["asset-template"].content.firstElementChild.cloneNode(true);
    row.querySelector('[name="assetName"]').value = asset.name ?? "";
    row.querySelector('[name="quantity"]').value = asset.quantity ?? "";
    row.querySelector('[name="price"]').value = asset.price ?? "";
    ui.assets.append(row);
    updateTotal();
    return row;
  }

  function dateToday() {
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map(part => String(part).padStart(2, "0")).join("-");
  }

  function openEditor(record) {
    const last = view.records[0];
    view.editing = record ?? { id: crypto.randomUUID(), revision: null };
    ui.editor.reset();
    field(ui.editor, "week").value = record?.week ?? Math.min((last?.week ?? 0) + 1, 8);
    field(ui.editor, "recordDate").value = record?.recordDate ?? dateToday();
    field(ui.editor, "cash").value = record?.cash ?? last?.cash ?? 10_000_000;
    field(ui.editor, "note").value = record?.note ?? "";
    ui.assets.replaceChildren();
    for (const asset of record?.holdings ?? last?.holdings ?? []) addAsset(asset);
    updateTotal();
    ui["editor-title"].textContent = record ? "기록 수정" : "새 기록";
    ui.editor.hidden = false;
    ui["new-record"].hidden = true;
    drawRecords();
    ui["editor-title"].focus();
  }

  function unlock(code, saveCode) {
    return run(async () => {
      view.code = code;
      try {
        await loadWorkspace();
      } catch (error) {
        view.code = "";
        if (error.status === 401) remember("");
        throw error;
      }
      const remembered = remember(saveCode ? code : "");
      ui.access.reset();
      ui.access.hidden = true;
      ui.workspace.hidden = false;
      report(saveCode && !remembered ? "기록을 열었습니다. 이 기기에는 코드를 저장할 수 없습니다."
        : "가족 기록을 열었습니다.");
    });
  }

  if (!apiRoot) {
    report("온라인 기록을 준비 중입니다. 아래에서 작성 예시를 볼 수 있습니다.");
    return;
  }
  ui.access.hidden = false;
  report("이 기기에서 사용할 가족 공용 코드를 입력해 주세요.");

  ui.access.addEventListener("submit", event => {
    event.preventDefault();
    const code = field(ui.access, "code").value.trim();
    if (code) unlock(code, field(ui.access, "remember").checked);
  });
  ui["add-person"].addEventListener("submit", event => {
    event.preventDefault();
    if (!canLeaveEditor()) return;
    run(async () => {
      const name = field(ui["add-person"], "personName").value.trim();
      const person = await request("/people", "POST", { name });
      view.people.push(person);
      view.person = person;
      view.records = [];
      peopleOptions();
      closeEditor();
      ui["add-person"].reset();
      report(person.name + "님을 추가했습니다.");
    });
  });
  ui.people.addEventListener("change", () => {
    const person = view.people.find(item => item.id === ui.people.value);
    ui.people.value = view.person?.id ?? "";
    if (!person || person === view.person || !canLeaveEditor()) return;
    run(async () => {
      const records = await request(recordsPath(person));
      view.person = person;
      view.records = records;
      peopleOptions();
      closeEditor();
      report(person.name + "님의 기록을 불러왔습니다.");
    });
  });
  ui.refresh.addEventListener("click", () => {
    if (!canLeaveEditor()) return;
    run(async () => {
      await loadWorkspace(view.person?.id);
      report("최신 기록을 불러왔습니다.");
    });
  });
  ui.lock.addEventListener("click", () => {
    if (!canLeaveEditor()) return;
    closeWorkspace();
    report("가족 기록을 닫았습니다.");
    field(ui.access, "code").focus();
  });
  ui["new-record"].addEventListener("click", () => openEditor(null));
  ui.cancel.addEventListener("click", () => {
    if (!canLeaveEditor()) return;
    closeEditor();
    report("편집을 취소했습니다.");
    ui["new-record"].focus();
  });
  ui["add-asset"].addEventListener("click", () => {
    if (ui.assets.children.length >= 20) {
      report("보유 자산은 20개까지 추가할 수 있습니다.", true);
      return;
    }
    addAsset().querySelector("input").focus();
  });
  ui.assets.addEventListener("click", event => {
    if (event.target.matches("[data-remove-asset]")) {
      event.target.closest(".pf-asset").remove();
      updateTotal();
      ui["add-asset"].focus();
    }
  });
  ui.editor.addEventListener("input", updateTotal);
  ui.editor.addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
      const editing = view.editing;
      const data = {
        id: editing.id,
        revision: editing.revision,
        week: field(ui.editor, "week").valueAsNumber,
        cash: field(ui.editor, "cash").valueAsNumber,
        recordDate: field(ui.editor, "recordDate").value,
        holdings: readAssets(),
        note: field(ui.editor, "note").value,
      };
      const path = recordsPath() + (editing.revision ? "/" + editing.id : "");
      const saved = await request(path, editing.revision ? "PUT" : "POST", data);
      view.records = [saved, ...view.records.filter(record => record.id !== saved.id)].sort(
        (a, b) => b.recordDate.localeCompare(a.recordDate) || b.updatedAt.localeCompare(a.updatedAt)
      );
      closeEditor();
      report("기록을 저장했습니다. 전체 평가액 " + krw(saved.total) + ".");
      ui["new-record"].focus();
    });
  });
  ui.records.addEventListener("click", event => {
    const button = event.target.closest("[data-record-action]");
    if (!button) return;
    const record = view.records.find(item => item.id === button.dataset.id);
    if (!record) return;
    if (button.dataset.recordAction === "edit") {
      openEditor(record);
    } else if (window.confirm(view.person.name + "님의 " + record.recordDate + " 기록을 삭제할까요?")) {
      run(async () => {
        await request(recordsPath() + "/" + record.id, "DELETE", { revision: record.revision });
        view.records = view.records.filter(item => item.id !== record.id);
        drawRecords();
        report("기록을 삭제했습니다.");
      });
    }
  });
  ui.export.addEventListener("click", () => {
    const data = { version: 1, person: view.person.name, exportedAt: new Date().toISOString(), records: view.records };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = element("a");
    link.href = url;
    const filename = view.person.name.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "portfolio";
    link.download = filename + "-" + dateToday() + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    report("선택한 사람의 기록을 JSON으로 내보냈습니다.");
  });

  let savedCode;
  try {
    savedCode = localStorage.getItem(storageKey);
  } catch {
    // The record server still works in browsers that block local storage.
  }
  if (savedCode) unlock(savedCode, true);
})();
