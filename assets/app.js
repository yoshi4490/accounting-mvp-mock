(() => {
  const K = {
    entries: "accounting_mock_journal_entries_v1",
    grades: "accounting_mock_journal_grades_v1",
    docReviews: "accounting_mock_document_reviews_v1",
    fixedAssets: "accounting_mock_fixed_assets_v1",
    bankRecon: "accounting_mock_bank_reconcile_v1"
  };

  const DOC_MASTER = {
    "D-001": { kind: "請求書", title: "売上請求（青葉）", date: "2026-01-05", partner: "青葉デザイン", amount: 120000, pdf: "assets/docs/D001_invoice_aoba.pdf" },
    "D-002": { kind: "請求書", title: "売上請求（北川）", date: "2026-01-09", partner: "北川商店", amount: 88000, pdf: "assets/docs/D002_invoice_kitagawa.pdf" },
    "D-004": { kind: "請求書", title: "外注費計上（Studio K）", date: "2026-01-15", partner: "Studio K", amount: 66000, pdf: "assets/docs/D004_bill_studiok.pdf" },
    "D-005": { kind: "請求書", title: "外注費計上（TOTO）", date: "2026-01-22", partner: "TOTO制作", amount: 44000, pdf: "assets/docs/D005_bill_toto.pdf" },
    "D-007": { kind: "請求書", title: "家賃支払", date: "2026-01-15", partner: "銀座ビル管理", amount: 180000, pdf: "assets/docs/D007_rent_ginza.pdf" },
    "D-009": { kind: "領収書", title: "交通費精算", date: "2026-01-12", partner: "JR東日本", amount: 4820, pdf: "assets/docs/D009_receipt_jr.pdf" },
    "D-010": { kind: "領収書", title: "消耗品購入", date: "2026-01-22", partner: "オフィスデポ", amount: 3200, pdf: "assets/docs/placeholder.pdf" },
    "D-011": { kind: "請求書", title: "ノートPC購入", date: "2026-01-18", partner: "PC DEPOT", amount: 96000, pdf: "assets/docs/D011_pc_purchase.pdf" },
    "D-012": { kind: "保険証券", title: "年間保険料支払", date: "2026-01-20", partner: "東京海上サンプル", amount: 36000, pdf: "assets/docs/D012_insurance.pdf" },
    "BK-001": { kind: "通帳明細", title: "銀行手数料", date: "2026-01-31", partner: "みずほ銀行", amount: 440, pdf: "assets/docs/BK_2026_01_statement.pdf" }
  };

  const TRAINING_DOCS = [
    "D-001", "D-002", "D-004", "D-005", "D-007",
    "D-009", "D-011", "D-012", "BK-001"
  ];

  const BANK_STATEMENT_ROWS = [
    { id: "BK-20260115-01", date: "2026-01-15", description: "銀座ビル管理 家賃振込", amount: -180000 },
    { id: "BK-20260120-01", date: "2026-01-20", description: "東京海上サンプル 保険料", amount: -36000 },
    { id: "BK-20260129-01", date: "2026-01-29", description: "Studio K 送金", amount: -60000 },
    { id: "BK-20260130-01", date: "2026-01-30", description: "青葉デザイン 入金", amount: 120000 },
    { id: "BK-20260131-01", date: "2026-01-31", description: "振込手数料", amount: -440 },
    { id: "BK-20260204-01", date: "2026-02-04", description: "北川商店 入金", amount: 88000 }
  ];

  const ORDER = [
    "現金", "普通預金", "売掛金", "前払費用", "工具器具備品",
    "減価償却累計額",
    "外注費", "地代家賃", "旅費交通費", "支払手数料", "消耗品費", "減価償却費",
    "売上高", "買掛金", "未払金"
  ];

  const META = {
    現金: { c: "asset", bs: "current" },
    普通預金: { c: "asset", bs: "current" },
    売掛金: { c: "asset", bs: "current" },
    前払費用: { c: "asset", bs: "current" },
    工具器具備品: { c: "asset", bs: "fixed" },
    減価償却累計額: { c: "asset", bs: "fixed" },
    外注費: { c: "expense", pl: 1 },
    地代家賃: { c: "expense", pl: 1 },
    旅費交通費: { c: "expense", pl: 1 },
    支払手数料: { c: "expense", pl: 1 },
    消耗品費: { c: "expense", pl: 1 },
    減価償却費: { c: "expense", pl: 1 },
    売上高: { c: "revenue", pl: 1 },
    買掛金: { c: "liability", bs: "liability" },
    未払金: { c: "liability", bs: "liability" }
  };

  const parseAmount = (raw) => {
    const s = String(raw || "").replace(/[^\d.-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : 0;
  };
  const fmt = (n) => Number(n || 0).toLocaleString("ja-JP");
  const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
  const read = (k) => {
    try {
      const v = JSON.parse(localStorage.getItem(k) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch {
      return {};
    }
  };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  };
  const setStatus = (el, type, txt) => {
    if (!el) return;
    el.classList.remove("ok", "pending", "ng");
    el.classList.add(type);
    el.textContent = txt;
  };

  const isDiffClosed = (diff) =>
    Boolean(diff && (diff.status === "closed" || diff.status === "posted"));

  const getMetrics = () => {
    const entriesMap = read(K.entries);
    const entries = Object.values(entriesMap);
    const grades = read(K.grades);
    const reviews = read(K.docReviews);
    const fixedAssets = read(K.fixedAssets);
    const bankState = read(K.bankRecon);
    const matches = bankState && typeof bankState.matches === "object" ? bankState.matches : {};
    const diffs = bankState && typeof bankState.diffs === "object" ? bankState.diffs : {};

    const docsDone = TRAINING_DOCS.filter((docNo) => reviews[docNo] && reviews[docNo].completed).length;
    const journalsDone = TRAINING_DOCS.filter((docNo) => Boolean(entriesMap[docNo])).length;

    const depEntries = entries.filter((e) => e && e.source === "fixed-assets").length;
    const fixedAssetsCount = Object.keys(fixedAssets).length;

    const unresolvedStatements = BANK_STATEMENT_ROWS.filter((row) => {
      if (matches[row.id]) return false;
      return !isDiffClosed(diffs[row.id]);
    });

    const bankMatched = BANK_STATEMENT_ROWS.filter((row) => Boolean(matches[row.id])).length;
    const bankUnresolved = unresolvedStatements.length;
    const bankUnresolvedAmount = unresolvedStatements.reduce(
      (sum, row) => sum + Math.abs(parseAmount(row.amount)),
      0
    );

    const arTargets = ["BK-20260130-01", "BK-20260204-01"];
    const apTargets = ["BK-20260115-01", "BK-20260120-01", "BK-20260129-01"];
    const arDone = arTargets.filter((id) => Boolean(matches[id]) || isDiffClosed(diffs[id])).length;
    const apDone = apTargets.filter((id) => Boolean(matches[id]) || isDiffClosed(diffs[id])).length;

    const closeChecklist = [
      { key: "docs", done: docsDone === TRAINING_DOCS.length },
      { key: "journals", done: journalsDone === TRAINING_DOCS.length },
      { key: "ar", done: arDone === arTargets.length },
      { key: "ap", done: apDone === apTargets.length },
      { key: "fixed", done: fixedAssetsCount > 0 && depEntries > 0 },
      { key: "bank", done: bankUnresolved === 0 }
    ];
    const closeDoneCount = closeChecklist.filter((item) => item.done).length;
    const closeTotal = closeChecklist.length;
    const closeDone = closeDoneCount === closeTotal;

    const steps = [
      { key: "documents", label: "証憑確認", href: "scenario-documents.html", done: docsDone === TRAINING_DOCS.length, doneCount: docsDone, total: TRAINING_DOCS.length, blockerWeight: 8 },
      { key: "journals", label: "仕訳入力", href: "scenario-journals.html", done: journalsDone === TRAINING_DOCS.length, doneCount: journalsDone, total: TRAINING_DOCS.length, blockerWeight: 8 },
      { key: "fixed", label: "固定資産管理", href: "scenario-fixed-assets.html", done: fixedAssetsCount > 0 && depEntries > 0, doneCount: Math.min(depEntries, 1), total: 1, blockerWeight: 7 },
      { key: "ar", label: "売掛消込", href: "scenario-ar.html", done: arDone === arTargets.length, doneCount: arDone, total: arTargets.length, blockerWeight: 9 },
      { key: "ap", label: "買掛消込", href: "scenario-ap.html", done: apDone === apTargets.length, doneCount: apDone, total: apTargets.length, blockerWeight: 9 },
      { key: "bank", label: "銀行照合", href: "scenario-bank.html", done: bankUnresolved === 0, doneCount: bankMatched, total: BANK_STATEMENT_ROWS.length, blockerWeight: 10 },
      { key: "close", label: "月次締め", href: "scenario-close.html", done: closeDone, doneCount: closeDoneCount, total: closeTotal, blockerWeight: 10 },
      { key: "reports", label: "試算表/PL/BS", href: "scenario-reports.html", done: closeDone && entries.length > 0, doneCount: closeDone && entries.length > 0 ? 1 : 0, total: 1, blockerWeight: 6 }
    ];

    const overallDone = steps.filter((step) => step.done).length;
    const overallTotal = steps.length;
    const overallRate = Math.round((overallDone / Math.max(overallTotal, 1)) * 100);

    let latestScore = null;
    let latestScoreDocNo = "";
    let latestScoreAt = 0;
    entries.forEach((entry) => {
      if (!entry || !entry.docNo) return;
      const ts = new Date(entry.savedAt || 0).getTime();
      if (!Number.isFinite(ts) || ts <= 0) return;
      const grade = grades[entry.docNo];
      if (!grade) return;
      if (ts > latestScoreAt) {
        latestScoreAt = ts;
        latestScore = grade;
        latestScoreDocNo = entry.docNo;
      }
    });

    const remainingDocs = Math.max(TRAINING_DOCS.length - docsDone, 0);
    const remainingJournals = Math.max(TRAINING_DOCS.length - journalsDone, 0);
    const remainingAr = Math.max(arTargets.length - arDone, 0);
    const remainingAp = Math.max(apTargets.length - apDone, 0);
    const remainingFixed = fixedAssetsCount > 0 && depEntries > 0 ? 0 : 1;
    const remainingBank = bankUnresolved;
    const remainingClose = Math.max(closeTotal - closeDoneCount, 0);

    const remainingMins =
      remainingDocs * 2 +
      remainingJournals * 3 +
      remainingAr * 5 +
      remainingAp * 5 +
      remainingFixed * 8 +
      remainingBank * 4 +
      remainingClose * 2;

    return {
      docsDone,
      docsTotal: TRAINING_DOCS.length,
      journalsDone,
      journalsTotal: TRAINING_DOCS.length,
      fixedAssetsCount,
      depEntries,
      bankMatched,
      bankTotal: BANK_STATEMENT_ROWS.length,
      bankUnresolved,
      bankUnresolvedAmount,
      arDone,
      arTotal: arTargets.length,
      apDone,
      apTotal: apTargets.length,
      closeDone,
      closeDoneCount,
      closeTotal,
      steps,
      overallDone,
      overallTotal,
      overallRate,
      entriesCount: entries.length,
      latestScore,
      latestScoreDocNo,
      remainingMins,
      estimateBasis: "固定見積り（各タスク標準時間: 証憑2分・仕訳3分・消込5分）",
      bankState: { matches, diffs }
    };
  };

  const applySidebarMeta = (metrics) => {
    const brand = document.querySelector(".brand-text");
    if (brand) {
      brand.innerHTML = "シナリオ001：サービス業<small>2026年1月</small>";
    }

    const navMap = {
      "scenario-documents.html": `${metrics.docsDone}/${metrics.docsTotal}`,
      "scenario-journals.html": `${metrics.journalsDone}/${metrics.journalsTotal}`,
      "scenario-fixed-assets.html": `${Math.min(metrics.depEntries, 1)}/1`,
      "scenario-ar.html": `${metrics.arDone}/${metrics.arTotal}`,
      "scenario-ap.html": `${metrics.apDone}/${metrics.apTotal}`,
      "scenario-bank.html": `${metrics.bankTotal - metrics.bankUnresolved}/${metrics.bankTotal}`,
      "scenario-close.html": `${metrics.closeDoneCount}/${metrics.closeTotal}`
    };

    document.querySelectorAll(".nav a").forEach((link) => {
      const old = link.querySelector(".nav-count");
      if (old) old.remove();
      const href = String(link.getAttribute("href") || "").split("?")[0];
      if (!navMap[href]) return;
      const badge = document.createElement("span");
      badge.className = "nav-count";
      badge.textContent = navMap[href];
      link.appendChild(badge);
    });
  };

  // menu
  const topbar = document.querySelector(".topbar");
  const sidebar = document.querySelector(".sidebar");
  if (topbar && sidebar) {
    const SIDEBAR_SCROLL_KEY = "accounting_mock_sidebar_scroll_v1";
    const saveSidebarScroll = () => {
      try {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(sidebar.scrollTop));
      } catch {}
    };
    const restoreSidebarScroll = () => {
      try {
        const raw = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
        const pos = Number(raw);
        if (Number.isFinite(pos) && pos >= 0) {
          sidebar.scrollTop = pos;
        }
      } catch {}
    };

    // Restore once immediately and once after first paint for stable layout timing.
    restoreSidebarScroll();
    requestAnimationFrame(restoreSidebarScroll);

    let rafId = 0;
    sidebar.addEventListener(
      "scroll",
      () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(saveSidebarScroll);
      },
      { passive: true }
    );
    window.addEventListener("beforeunload", saveSidebarScroll);
    sidebar.querySelectorAll("a[href]").forEach((link) => {
      link.addEventListener("click", saveSidebarScroll);
    });

    const left = document.createElement("div");
    left.className = "topbar-group";
    const btn = document.createElement("button");
    btn.className = "menu-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "メニューを開く");
    btn.innerHTML =
      '<span class="menu-toggle-icon" aria-hidden="true">' +
      "<span></span><span></span><span></span>" +
      "</span>";
    btn.addEventListener("click", () => document.body.classList.toggle("nav-open"));
    const first = topbar.firstElementChild;
    topbar.prepend(left);
    left.appendChild(btn);
    if (first) left.appendChild(first);
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!document.body.classList.contains("nav-open")) return;
      if (t.closest(".sidebar") || t.closest(".menu-toggle")) return;
      document.body.classList.remove("nav-open");
    });
  }

  applySidebarMeta(getMetrics());

  document.querySelectorAll(".card, .landing-header, .step").forEach((el, i) => {
    el.classList.add("reveal");
    setTimeout(() => el.classList.add("show"), 40 + i * 26);
  });

  document.querySelectorAll(".progress").forEach((bar) => {
    const m = (bar.getAttribute("style") || "").match(/width\s*:\s*([\d.]+%)/i);
    if (!m) return;
    bar.style.width = "0";
    requestAnimationFrame(() => (bar.style.width = m[1]));
  });

  // dashboard page
  const dashboardRoot = document.querySelector("[data-dashboard-root]");
  if (dashboardRoot) {
    const metrics = getMetrics();
    const openTasksBadge = dashboardRoot.querySelector("[data-dash-open-tasks]");
    const estimateBadge = dashboardRoot.querySelector("[data-dash-estimate]");
    const nextSummary = dashboardRoot.querySelector("[data-next-summary]");
    const nextPriority = dashboardRoot.querySelector("[data-next-priority]");
    const nextEta = dashboardRoot.querySelector("[data-next-eta]");
    const nextReason = dashboardRoot.querySelector("[data-next-reason]");
    const nextLink = dashboardRoot.querySelector("[data-next-link]");
    const overallText = dashboardRoot.querySelector("[data-dash-overall-text]");
    const overallProgress = dashboardRoot.querySelector("[data-dash-overall-progress]");
    const breakdown = dashboardRoot.querySelector("[data-dash-breakdown]");
    const estimateBasis = dashboardRoot.querySelector("[data-dash-estimate-basis]");
    const scoreEl = dashboardRoot.querySelector("[data-dash-score]");
    const entryCountEl = dashboardRoot.querySelector("[data-dash-entry-count]");
    const bankStatusEl = dashboardRoot.querySelector("[data-dash-bank-status]");
    const causeEl = dashboardRoot.querySelector("[data-dash-cause]");
    const prescriptionEl = dashboardRoot.querySelector("[data-dash-prescription]");
    const taskBody = dashboardRoot.querySelector("[data-dash-task-body]");
    const stepCards = dashboardRoot.querySelector("[data-dash-step-cards]");
    const deliverableBody = dashboardRoot.querySelector("[data-dash-deliverable-body]");

    const hasFeeGap = !metrics.bankState.matches["BK-20260131-01"] &&
      !isDiffClosed(metrics.bankState.diffs["BK-20260131-01"]);
    const hasPrepaidAdjust = Object.values(read(K.entries)).some((entry) =>
      String(entry.memo || "").includes("前払振替") || String(entry.docNo || "").includes("ADJ-PREPAID")
    );
    const memoMissingCount = Object.values(read(K.entries)).reduce((sum, entry) => {
      if (!entry || !Array.isArray(entry.lines)) return sum;
      return sum + entry.lines.filter((line) => {
        const amt = parseAmount(line.debit) + parseAmount(line.credit);
        return amt > 0 && !String(line.memo || "").trim();
      }).length;
    }, 0);

    const tasks = [
      {
        key: "ar-inv-002",
        type: "消込",
        priority: "高",
        title: "INV-002 入金消込",
        condition: "売掛残高 88,000 が 0 になる",
        eta: 5,
        done: metrics.arDone >= 2,
        reason: "未消込だと月次締めが進まない",
        href: "scenario-ar.html?focus=INV-002"
      },
      {
        key: "bank-fee",
        type: "起票",
        priority: "高",
        title: "振込手数料を処理",
        condition: "銀行照合の未解決件数が 0 件",
        eta: 3,
        done: !hasFeeGap,
        reason: "銀行照合のブロッカー",
        href: "scenario-bank.html?focus=BK-20260131-01"
      },
      {
        key: "prepaid-adjust",
        type: "振替",
        priority: "中",
        title: "前払保険料の月次振替",
        condition: "前払振替仕訳が1件登録される",
        eta: 4,
        done: hasPrepaidAdjust,
        reason: "計上月ミスを減らせる",
        href: "scenario-close.html?focus=前払"
      },
      {
        key: "memo-fix",
        type: "修正",
        priority: "中",
        title: "摘要の記載不足を修正",
        condition: "摘要空欄が 0 件",
        eta: 6,
        done: memoMissingCount === 0,
        reason: "採点の減点要因",
        href: "scenario-journals.html?focus=摘要"
      },
      {
        key: "deliverable-check",
        type: "出力",
        priority: "低",
        title: "提出物の最終確認",
        condition: "必須成果物がすべて確定",
        eta: 7,
        done: metrics.closeDone && metrics.bankUnresolved === 0,
        reason: "提出前チェック",
        href: "scenario-reports.html"
      }
    ];

    const priorityWeight = { 高: 3, 中: 2, 低: 1 };
    const nextTask = tasks
      .filter((task) => !task.done)
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || a.eta - b.eta)[0];

    const remainingTasks = tasks.filter((task) => !task.done);
    if (openTasksBadge) {
      openTasksBadge.textContent = `未完了タスク: ${remainingTasks.length}件`;
    }
    if (estimateBadge) {
      estimateBadge.textContent = `完了見込み: あと${metrics.remainingMins}分`;
    }
    if (estimateBasis) {
      estimateBasis.textContent = `見込み時間の根拠: ${metrics.estimateBasis}`;
    }

    if (nextTask) {
      if (nextSummary) nextSummary.textContent = `次は「${nextTask.title}」を進めましょう。`;
      if (nextPriority) nextPriority.textContent = `優先度: ${nextTask.priority}`;
      if (nextEta) nextEta.textContent = `目安: ${nextTask.eta}分`;
      if (nextReason) nextReason.textContent = `理由: ${nextTask.reason}`;
      if (nextLink instanceof HTMLAnchorElement) {
        nextLink.textContent = `続きから再開（${nextTask.title}）`;
        nextLink.href = nextTask.href;
      }
    } else {
      if (nextSummary) nextSummary.textContent = "主要タスクは完了しています。提出物の確定に進んでください。";
      if (nextPriority) nextPriority.textContent = "優先度: -";
      if (nextEta) nextEta.textContent = "目安: 3分";
      if (nextReason) nextReason.textContent = "理由: 提出前の最終確認";
      if (nextLink instanceof HTMLAnchorElement) {
        nextLink.textContent = "続きから再開（提出物確認）";
        nextLink.href = "scenario-reports.html";
      }
    }

    if (overallText) {
      overallText.textContent = `${metrics.overallRate}%（${metrics.overallDone} / ${metrics.overallTotal}ステップ）`;
    }
    if (overallProgress instanceof HTMLElement) {
      overallProgress.style.width = `${metrics.overallRate}%`;
    }
    if (breakdown) {
      breakdown.innerHTML = metrics.steps.map((step) => {
        const st = step.done ? '<span class="status ok">完了</span>' : '<span class="status pending">未完了</span>';
        return (
          "<div class=\"dash-breakdown-row\">" +
          `<span>${step.label}</span>` +
          `<span>${step.doneCount}/${step.total}</span>` +
          `<span>${st}</span>` +
          "</div>"
        );
      }).join("");
    }

    if (scoreEl) {
      scoreEl.textContent = metrics.latestScore ? `${metrics.latestScore.score}点` : "--点";
    }
    if (entryCountEl) {
      entryCountEl.textContent = `${metrics.entriesCount}件`;
    }
    if (bankStatusEl) {
      bankStatusEl.textContent = metrics.bankUnresolved === 0 ? "完了" : `未解決${metrics.bankUnresolved}件`;
    }

    if (causeEl && prescriptionEl) {
      if (!metrics.latestScore) {
        causeEl.textContent = "ミス原因: まだ採点データがありません。";
        prescriptionEl.textContent = "次の加点ポイント: 証憑1件を入力して採点を実行しましょう。";
      } else {
        const c = metrics.latestScore.criteria || {};
        const misses = [];
        if (!c.dateOk) misses.push("計上月判定");
        if (!c.accountOk) misses.push("勘定科目");
        if (!c.amountOk) misses.push("金額");
        if (!c.taxOk) misses.push("税区分");
        if (!c.partnerOk) misses.push("取引先");
        const topMiss = misses[0] || "摘要";
        causeEl.textContent = `ミス原因: ${topMiss}の判定で減点（最新: ${metrics.latestScoreDocNo || "-"}）。`;
        prescriptionEl.textContent = `次の加点ポイント: ${topMiss}ルールを1問復習して再入力（+5〜10点見込み）。`;
      }
    }

    if (taskBody) {
      const statusBadge = (done) => done ? '<span class="status ok">✅完了</span>' : '<span class="status pending">未完了</span>';
      const rows = tasks.map((task) => (
        `<tr class="task-row-link${task.done ? " is-done" : ""}" tabindex="0" role="link" data-task-href="${task.href}">` +
        `<td><span class="task-tag">${task.type}</span><span class="task-priority">${task.priority}</span></td>` +
        `<td>${task.title}</td>` +
        `<td>${task.condition}</td>` +
        `<td>${statusBadge(task.done)}</td>` +
        `<td>${task.eta}分</td>` +
        "</tr>"
      ));
      taskBody.innerHTML = rows.join("");

      const activateRow = (row) => {
        if (!(row instanceof HTMLElement)) return;
        const href = row.getAttribute("data-task-href");
        if (!href) return;
        window.location.href = href;
      };

      taskBody.querySelectorAll(".task-row-link").forEach((row) => {
        row.addEventListener("click", () => activateRow(row));
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateRow(row);
          }
        });
      });
    }

    if (stepCards) {
      const sorted = metrics.steps.slice().sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.blockerWeight - a.blockerWeight;
      });
      stepCards.innerHTML = sorted.map((step) => (
        `<article class="card ${step.done ? "" : "tinted"}">` +
        "<div class=\"body\">" +
        `<h3>${step.label}</h3>` +
        `<div class="kpi">${step.doneCount}/${step.total}</div>` +
        `${step.done ? '<span class="status ok">完了</span>' : '<span class="status pending">要対応</span>'}` +
        `<div class="panel-actions" style="margin-top: 10px;"><a class="btn" href="${step.href}">開く</a></div>` +
        "</div></article>"
      )).join("");
    }

    if (deliverableBody) {
      const requiredLabel = '<span class="deliverable-required">必須</span>';
      const optionalLabel = '<span class="deliverable-optional">任意</span>';
      const deliverables = [
        { name: "試算表", required: true, done: metrics.closeDone, condition: "月次締め 6/6 完了", href: "scenario-reports.html" },
        { name: "PL / BS", required: true, done: metrics.closeDone, condition: "月次締め 6/6 完了", href: "scenario-reports.html" },
        { name: "銀行照合結果", required: true, done: metrics.bankUnresolved === 0, condition: "銀行差異 0 件", href: "scenario-bank.html" },
        { name: "仕訳一覧", required: true, done: metrics.journalsDone === metrics.journalsTotal, condition: `仕訳入力 ${metrics.journalsTotal}/${metrics.journalsTotal}`, href: "scenario-journals.html" },
        { name: "学習証跡", required: false, done: metrics.closeDone && metrics.latestScore !== null, condition: "必須成果物の確定後に出力", href: "scenario-review.html" }
      ];
      deliverableBody.innerHTML = deliverables.map((item) => (
        "<tr>" +
        `<td>${item.name}</td>` +
        `<td>${item.required ? requiredLabel : optionalLabel}</td>` +
        `<td>${item.done ? '<span class="status ok">確定</span>' : '<span class="status pending">下書き</span>'}</td>` +
        `<td>${item.condition}</td>` +
        `<td><a class="btn" href="${item.href}">開く</a></td>` +
        "</tr>"
      )).join("");
    }
  }

  // heading consistency for scenario pages
  const mainRoot = document.querySelector("main.main");
  if (mainRoot && !mainRoot.querySelector("h1")) {
    const h1 = document.createElement("h1");
    h1.className = "sr-only";
    h1.textContent = String(document.title || "").split("|")[0].trim() || "経理実務シミュレーション";
    mainRoot.prepend(h1);
  }

  // legacy doc frame
  const frame = document.querySelector("[data-doc-frame]");
  const title = document.querySelector("[data-doc-title]");
  const open = document.querySelector("[data-doc-open]");
  const frameBtns = document.querySelectorAll("[data-doc-src]");
  if (frame && frameBtns.length) {
    frameBtns.forEach((b) => {
      b.addEventListener("click", () => {
        const src = b.getAttribute("data-doc-src");
        if (!src) return;
        frame.setAttribute("src", src);
        if (title) title.textContent = b.getAttribute("data-doc-title") || "証憑PDF";
        if (open) open.setAttribute("href", src);
      });
    });
    const init = document.querySelector(".doc-row.is-active [data-doc-src]") || frameBtns[0];
    if (init instanceof HTMLElement) init.click();
  }

  // documents list page
  const docsRoot = document.querySelector("[data-documents-root]");
  if (docsRoot) {
    const rows = Array.from(docsRoot.querySelectorAll("tr[data-doc-no]"));
    const badge = docsRoot.querySelector("[data-doc-complete]");

    const renderDocStatuses = () => {
      const reviews = read(K.docReviews);
      let completedCount = 0;

      rows.forEach((row) => {
        const docNo = row.getAttribute("data-doc-no") || "";
        const statusEl = row.querySelector("[data-doc-status]");
        const review = reviews[docNo];

        if (review && review.completed) {
          setStatus(statusEl, "ok", "確認済み");
          completedCount += 1;
        } else if (review && review.savedAt) {
          setStatus(statusEl, "pending", "入力中");
        } else {
          setStatus(statusEl, "pending", "未確認");
        }
      });

      if (badge) {
        badge.textContent =
          "確認済み " + String(completedCount) + " / " + String(rows.length);
      }
    };

    renderDocStatuses();
    window.addEventListener("pageshow", renderDocStatuses);
  }

  // document verify page
  const verifyRoot = document.querySelector("[data-doc-verify-root]");
  if (verifyRoot) {
    const queryDoc = (new URLSearchParams(window.location.search).get("doc") || "").toUpperCase();
    const master = DOC_MASTER[queryDoc];

    const titleEl = verifyRoot.querySelector("[data-verify-title]");
    const subtitleEl = verifyRoot.querySelector("[data-verify-subtitle]");
    const docLabelEl = verifyRoot.querySelector("[data-verify-doc-label]");
    const completeLabelEl = verifyRoot.querySelector("[data-verify-complete-label]");
    const messageEl = verifyRoot.querySelector("[data-verify-message]");
    const saveBtn = verifyRoot.querySelector("[data-verify-save]");
    const openPdf = verifyRoot.querySelector("[data-verify-open-pdf]");
    const frameEl = verifyRoot.querySelector("[data-verify-frame]");

    const getField = (name) => verifyRoot.querySelector('[data-verify-field="' + name + '"]');
    const required = [
      "docKind",
      "tradeType",
      "docNumber",
      "issueDate",
      "partnerName",
      "accountingMethod",
      "taxRate",
      "grossAmount",
      "netAmount",
      "taxAmount"
    ];

    const amountFields = ["grossAmount", "netAmount", "taxAmount"];
    amountFields.forEach((name) => {
      const input = getField(name);
      if (!(input instanceof HTMLInputElement)) return;
      input.addEventListener("focus", () => {
        input.value = String(parseAmount(input.value));
      });
      input.addEventListener("blur", () => {
        input.value = fmt(parseAmount(input.value));
      });
    });

    const setCompleteLabel = (completed) => {
      if (!completeLabelEl) return;
      completeLabelEl.textContent = completed ? "状態: 確認済み" : "状態: 未完了";
    };

    const setMessage = (type, text) => {
      setStatus(messageEl, type, text);
    };

    if (!queryDoc || !master) {
      if (titleEl) titleEl.textContent = "対象証憑が見つかりません";
      if (subtitleEl) subtitleEl.textContent = "一覧ページから証憑確認を開いてください。";
      if (docLabelEl) docLabelEl.textContent = "対象: -";
      setCompleteLabel(false);
      setMessage("ng", "doc パラメータが不正です。");
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
    } else {
      if (titleEl) titleEl.textContent = queryDoc + " " + master.title + " の分類入力";
      if (subtitleEl) subtitleEl.textContent = "必須項目を入力して保存すると、この証憑は確認済みになります。";
      if (docLabelEl) docLabelEl.textContent = "対象: " + queryDoc;
      if (openPdf) openPdf.setAttribute("href", master.pdf);
      if (frameEl) frameEl.setAttribute("src", master.pdf);

      const reviews = read(K.docReviews);
      const saved = reviews[queryDoc] || {};

      const defaults = {
        docKind: "",
        tradeType: "",
        docNumber: queryDoc,
        issueDate: master.date,
        periodFrom: "",
        periodTo: "",
        partnerName: master.partner,
        registrationNo: "",
        invoiceClass: "適格",
        paymentMethod: "振込",
        accountingMethod: "",
        taxRate: "",
        grossAmount: "",
        netAmount: "",
        taxAmount: "",
        memo: ""
      };

      Object.keys(defaults).forEach((name) => {
        const el = getField(name);
        if (!el) return;
        const value = Object.prototype.hasOwnProperty.call(saved, name)
          ? saved[name]
          : defaults[name];
        if (amountFields.includes(name)) {
          if (value === "" || value === null || value === undefined) el.value = "";
          else el.value = fmt(parseAmount(value));
        } else {
          el.value = value || "";
        }
      });

      setCompleteLabel(Boolean(saved.completed));
      if (saved.completed) {
        setMessage("ok", "この証憑は確認済みです。必要なら修正して再保存できます。");
      } else {
        setMessage("pending", "必須項目を入力して保存してください。");
      }

      const isFilled = (name) => {
        const el = getField(name);
        if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return false;
        if (name === "taxAmount") return parseAmount(el.value) >= 0 && String(el.value).trim() !== "";
        if (name === "grossAmount" || name === "netAmount") return parseAmount(el.value) > 0 && String(el.value).trim() !== "";
        if (amountFields.includes(name)) return parseAmount(el.value) >= 0 && String(el.value).trim() !== "";
        return String(el.value || "").trim().length > 0;
      };

      const collect = () => {
        const values = { docNo: queryDoc, savedAt: new Date().toISOString() };
        [
          "docKind",
          "tradeType",
          "docNumber",
          "issueDate",
          "periodFrom",
          "periodTo",
          "partnerName",
          "registrationNo",
          "invoiceClass",
          "paymentMethod",
          "accountingMethod",
          "taxRate",
          "grossAmount",
          "netAmount",
          "taxAmount",
          "memo"
        ].forEach((name) => {
          const el = getField(name);
          if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return;
          values[name] = amountFields.includes(name) ? parseAmount(el.value) : String(el.value || "").trim();
        });
        values.completed = required.every((name) => isFilled(name));
        return values;
      };

      if (saveBtn instanceof HTMLButtonElement) {
        saveBtn.addEventListener("click", () => {
          const current = collect();
          const nextReviews = read(K.docReviews);
          nextReviews[queryDoc] = current;
          write(K.docReviews, nextReviews);

          setCompleteLabel(Boolean(current.completed));
          if (current.completed) {
            setMessage("ok", "保存しました。一覧ページで状態が確認済みになります。");
          } else {
            setMessage("pending", "保存しました。必須項目が不足しているため状態は未完了です。");
          }
        });
      }
    }
  }

  // journal page
  const root = document.querySelector("[data-journal-practice]");
  if (root) {
    const docBtns = Array.from(root.querySelectorAll("[data-doc-button]"));
    const workspace = root.querySelector("[data-journal-workspace]");
    const body = root.querySelector("[data-lines-body]");
    const addBtn = root.querySelector("[data-add-line]");
    const removeBtn = root.querySelector("[data-remove-line]");
    const regBtns = root.querySelectorAll("[data-register-button], [data-register-toolbar]");
    const progress = root.querySelector("[data-doc-progress]");

    const slip = root.querySelector("[data-journal-slip]");
    const memo = root.querySelector("[data-journal-memo]");
    const date = root.querySelector("[data-journal-date]");
    const docNoInput = root.querySelector("[data-journal-doc]");

    const totalD = root.querySelector("[data-total-debit]");
    const totalC = root.querySelector("[data-total-credit]");
    const stBal = root.querySelector("[data-balance-status]");
    const stReq = root.querySelector("[data-required-status]");
    const ckBal = root.querySelector("[data-check-balance]");
    const ckBalTxt = root.querySelector("[data-check-balance-text]");
    const ckReq = root.querySelector("[data-check-required]");
    const ckReqTxt = root.querySelector("[data-check-required-text]");
    const ckEmp = root.querySelector("[data-check-empty]");
    const ckEmpTxt = root.querySelector("[data-check-empty-text]");

    const sDocNo = root.querySelector("[data-summary-doc-no]");
    const sKind = root.querySelector("[data-summary-kind]");
    const sTitle = root.querySelector("[data-summary-title]");
    const sPartner = root.querySelector("[data-summary-partner]");
    const sDate = root.querySelector("[data-summary-date]");
    const sAmount = root.querySelector("[data-summary-amount]");
    const sPriority = root.querySelector("[data-summary-priority]");
    const wsTitle = root.querySelector("[data-workspace-title]");
    const wsSub = root.querySelector("[data-workspace-subtitle]");
    const openDoc = root.querySelector("[data-open-current-doc]");

    const gScore = root.querySelector("[data-grade-score]");
    const gStatus = root.querySelector("[data-grade-status]");
    const gMessage = root.querySelector("[data-grade-message]");
    const gDate = root.querySelector("[data-grade-date]");
    const gAccount = root.querySelector("[data-grade-account]");
    const gAmount = root.querySelector("[data-grade-amount]");
    const gTax = root.querySelector("[data-grade-tax]");
    const gPartner = root.querySelector("[data-grade-partner]");

    let entries = read(K.entries);
    let grades = read(K.grades);
    let activeDoc = "";
    let answer = null;
    let rowTemplate = null;
    if (body) {
      const r = body.querySelector("tr");
      if (r instanceof HTMLTableRowElement) rowTemplate = r.cloneNode(true);
    }

    const resetGrade = () => {
      if (gScore) gScore.textContent = "スコア -- / 100";
      setStatus(gStatus, "pending", "未判定");
      if (gMessage) gMessage.textContent = "登録すると、この証憑の正誤判定が表示されます。";
      [gDate, gAccount, gAmount, gTax, gPartner].forEach((el) => el && (el.textContent = "未判定"));
    };

    const fillGradeCell = (el, ok) => {
      if (!el) return;
      el.innerHTML = ok ? '<span class="status ok">OK</span>' : '<span class="status ng">NG</span>';
    };

    const showGrade = (grade) => {
      if (!grade) return resetGrade();
      if (gScore) gScore.textContent = `スコア ${grade.score} / 100`;
      if (grade.status === "correct") setStatus(gStatus, "ok", "正解");
      else if (grade.status === "close") setStatus(gStatus, "pending", "要調整");
      else setStatus(gStatus, "ng", "再入力");
      if (gMessage) gMessage.textContent = grade.message;
      fillGradeCell(gDate, grade.criteria.dateOk);
      fillGradeCell(gAccount, grade.criteria.accountOk);
      fillGradeCell(gAmount, grade.criteria.amountOk);
      fillGradeCell(gTax, grade.criteria.taxOk);
      fillGradeCell(gPartner, grade.criteria.partnerOk);
    };

    const bindAmount = (inp) => {
      if (!(inp instanceof HTMLInputElement)) return;
      if (inp.dataset.bound === "1") return;
      inp.dataset.bound = "1";
      inp.addEventListener("focus", () => (inp.value = String(parseAmount(inp.value))));
      inp.addEventListener("blur", () => {
        inp.value = fmt(parseAmount(inp.value));
        evaluate();
      });
      inp.addEventListener("input", evaluate);
    };

    const bindAmounts = () => root.querySelectorAll(".entry-debit, .entry-credit").forEach(bindAmount);

    const clearRow = (row) => {
      if (!(row instanceof HTMLTableRowElement)) return;
      row.querySelectorAll("input").forEach((i) => {
        if (i.classList.contains("entry-debit") || i.classList.contains("entry-credit")) i.value = "0";
        else i.value = "";
      });
      row.querySelectorAll("select").forEach((s) => (s.selectedIndex = 0));
    };

    const updateIndexes = () => {
      if (!body) return;
      body.querySelectorAll("tr").forEach((r, i) => {
        const c = r.querySelector("[data-row-index]");
        if (c) c.textContent = String(i + 1);
      });
    };

    const ensureRows = (n) => {
      if (!body || !(rowTemplate instanceof HTMLTableRowElement)) return;
      const rows = body.querySelectorAll("tr").length;
      if (rows < n) {
        for (let i = rows; i < n; i += 1) {
          const c = rowTemplate.cloneNode(true);
          if (c instanceof HTMLTableRowElement) {
            clearRow(c);
            body.appendChild(c);
          }
        }
      } else if (rows > n) {
        for (let i = rows; i > n; i -= 1) {
          const last = body.querySelector("tr:last-child");
          if (last) last.remove();
        }
      }
      bindAmounts();
      updateIndexes();
    };

    const rowsData = () => {
      if (!body) return [];
      return Array.from(body.querySelectorAll("tr")).map((row) => {
        const dAcc = row.querySelector('[data-role="debit-account"]');
        const cAcc = row.querySelector('[data-role="credit-account"]');
        const tax = row.querySelector('[data-role="tax-category"]');
        const partner = row.querySelector('[data-role="partner"]');
        const lm = row.querySelector('[data-role="line-memo"]');
        const d = row.querySelector(".entry-debit");
        const c = row.querySelector(".entry-credit");
        return {
          debitAccount: dAcc instanceof HTMLSelectElement ? dAcc.value : "(空)",
          creditAccount: cAcc instanceof HTMLSelectElement ? cAcc.value : "(空)",
          tax: tax instanceof HTMLSelectElement ? tax.value : "対象外",
          partner: partner instanceof HTMLInputElement ? partner.value.trim() : "",
          memo: lm instanceof HTMLInputElement ? lm.value.trim() : "",
          debit: parseAmount(d instanceof HTMLInputElement ? d.value : 0),
          credit: parseAmount(c instanceof HTMLInputElement ? c.value : 0)
        };
      });
    };

    const collectEntry = () => {
      const lines = rowsData().filter((l) => {
        const hasAcc = l.debitAccount !== "(空)" || l.creditAccount !== "(空)";
        const hasAmt = l.debit > 0 || l.credit > 0;
        const hasTxt = l.partner || l.memo;
        return hasAcc || hasAmt || hasTxt;
      });
      return {
        docNo: activeDoc,
        documentNo: docNoInput instanceof HTMLInputElement ? docNoInput.value.trim() : "",
        slipNo: slip instanceof HTMLInputElement ? slip.value.trim() : "",
        date: date instanceof HTMLInputElement ? date.value.trim() : "",
        memo: memo instanceof HTMLInputElement ? memo.value.trim() : "",
        lines,
        savedAt: new Date().toISOString()
      };
    };

    const grade = (entry, ans) => {
      const dTotal = entry.lines.reduce((s, l) => s + l.debit, 0);
      const cTotal = entry.lines.reduce((s, l) => s + l.credit, 0);
      const exp = parseAmount(ans.amount || 0);
      const dateOk = entry.date === (ans.date || "");
      const accountOk = entry.lines.some((l) => norm(l.debitAccount) === norm(ans.debit) && norm(l.creditAccount) === norm(ans.credit));
      const amountOk = dTotal === exp && cTotal === exp;
      const taxOk = entry.lines.some((l) => norm(l.tax) === norm(ans.tax));
      const partnerOk = entry.lines.some((l) => norm(l.partner).includes(norm(ans.partner)));
      let score = 0;
      if (dateOk) score += 20;
      if (accountOk) score += 30;
      if (amountOk) score += 30;
      if (taxOk) score += 10;
      if (partnerOk) score += 10;
      let status = "retry";
      let message = "主要項目に誤りがあります。証憑を見直して再入力してください。";
      if (score >= 95) {
        status = "correct";
        message = "正解です。BS/PLで反映結果を確認してください。";
      } else if (score >= 70) {
        status = "close";
        message = "おしいです。NG項目だけ修正して再登録しましょう。";
      }
      return { score, status, message, criteria: { dateOk, accountOk, amountOk, taxOk, partnerOk } };
    };

    const refreshDocStates = () => {
      docBtns.forEach((b) => {
        const d = b.dataset.docNo || "";
        b.classList.toggle("done", Boolean(entries[d]));
      });
    };

    const updateProgress = () => {
      if (!progress) return;
      const done = Object.keys(entries).length;
      progress.textContent = activeDoc
        ? `入力済 ${done} / ${docBtns.length} | 選択中 ${activeDoc}`
        : `証憑を選択してください（入力済 ${done} / ${docBtns.length}）`;
    };

    const evaluate = () => {
      const lines = rowsData();
      let dSum = 0;
      let cSum = 0;
      let active = 0;
      let empty = 0;
      let partnerMissing = 0;

      lines.forEach((l) => {
        dSum += l.debit;
        cSum += l.credit;
        const hasAcc = l.debitAccount !== "(空)" || l.creditAccount !== "(空)";
        const hasAmt = l.debit > 0 || l.credit > 0;
        const hasTxt = l.partner || l.memo;
        if (hasAcc || hasAmt || hasTxt) {
          active += 1;
          if (!l.partner && hasAmt) partnerMissing += 1;
        } else empty += 1;
      });

      if (totalD) totalD.textContent = fmt(dSum);
      if (totalC) totalC.textContent = fmt(cSum);

      const balOk = dSum > 0 && dSum === cSum;
      if (balOk) {
        setStatus(stBal, "ok", "貸借一致");
        setStatus(ckBal, "ok", "OK");
        if (ckBalTxt) ckBalTxt.textContent = `借方 ${fmt(dSum)} = 貸方 ${fmt(cSum)}`;
      } else if (dSum === 0 && cSum === 0) {
        setStatus(stBal, "pending", "未入力");
        setStatus(ckBal, "pending", "判定中");
        if (ckBalTxt) ckBalTxt.textContent = "金額を入力してください";
      } else {
        setStatus(stBal, "ng", "不一致");
        setStatus(ckBal, "ng", "NG");
        if (ckBalTxt) ckBalTxt.textContent = `差額 ${fmt(Math.abs(dSum - cSum))} を調整してください`;
      }

      const headOk =
        slip instanceof HTMLInputElement &&
        memo instanceof HTMLInputElement &&
        date instanceof HTMLInputElement &&
        docNoInput instanceof HTMLInputElement &&
        slip.value.trim() && memo.value.trim() && date.value.trim() && docNoInput.value.trim();

      const reqOk = Boolean(headOk) && active > 0 && partnerMissing === 0;
      if (reqOk) {
        setStatus(stReq, "ok", "必須項目OK");
        setStatus(ckReq, "ok", "OK");
        if (ckReqTxt) ckReqTxt.textContent = "伝票ヘッダと取引先情報が入力済みです";
      } else {
        setStatus(stReq, "pending", "必須項目未完了");
        setStatus(ckReq, "pending", "要確認");
        if (ckReqTxt) {
          const m = [];
          if (!headOk) m.push("伝票ヘッダに未入力あり");
          if (active === 0) m.push("金額行が未入力");
          if (partnerMissing > 0) m.push("取引先未入力行あり");
          ckReqTxt.textContent = m.join(" / ");
        }
      }

      if (empty > 0) {
        setStatus(ckEmp, "pending", "注意");
        if (ckEmpTxt) ckEmpTxt.textContent = `空行 ${empty} 行（必要なければ削除推奨）`;
      } else {
        setStatus(ckEmp, "ok", "OK");
        if (ckEmpTxt) ckEmpTxt.textContent = "空行はありません";
      }

      const can = Boolean(activeDoc) && balOk && reqOk;
      regBtns.forEach((b) => b instanceof HTMLButtonElement && (b.disabled = !can));
    };

    const loadSaved = (entry) => {
      ensureRows(Math.max(entry.lines.length, 1));
      if (slip instanceof HTMLInputElement) slip.value = entry.slipNo || "";
      if (date instanceof HTMLInputElement) date.value = entry.date || "";
      if (memo instanceof HTMLInputElement) memo.value = entry.memo || "";
      if (docNoInput instanceof HTMLInputElement) docNoInput.value = entry.documentNo || entry.docNo || "";

      const rows = body ? Array.from(body.querySelectorAll("tr")) : [];
      rows.forEach((r, i) => {
        const l = entry.lines[i];
        if (!l) return clearRow(r);
        const dA = r.querySelector('[data-role="debit-account"]');
        const cA = r.querySelector('[data-role="credit-account"]');
        const t = r.querySelector('[data-role="tax-category"]');
        const p = r.querySelector('[data-role="partner"]');
        const m = r.querySelector('[data-role="line-memo"]');
        const d = r.querySelector('.entry-debit');
        const c = r.querySelector('.entry-credit');
        if (dA instanceof HTMLSelectElement) dA.value = l.debitAccount || "(空)";
        if (cA instanceof HTMLSelectElement) cA.value = l.creditAccount || "(空)";
        if (t instanceof HTMLSelectElement) t.value = l.tax || "対象外";
        if (p instanceof HTMLInputElement) p.value = l.partner || "";
        if (m instanceof HTMLInputElement) m.value = l.memo || "";
        if (d instanceof HTMLInputElement) d.value = fmt(l.debit || 0);
        if (c instanceof HTMLInputElement) c.value = fmt(l.credit || 0);
      });
    };

    const activate = (btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const preset = {
        slipNo: btn.dataset.slipNo || "",
        docNo: btn.dataset.docNo || "",
        date: btn.dataset.date || "",
        memo: btn.dataset.memo || "",
        debit: btn.dataset.debit || "",
        credit: btn.dataset.credit || "",
        amount: btn.dataset.amount || "0",
        tax: btn.dataset.tax || "",
        partner: btn.dataset.partner || "",
        kind: btn.dataset.kind || "",
        title: btn.dataset.title || "",
        priority: btn.dataset.priority || "",
        pdf: btn.dataset.pdf || ""
      };

      activeDoc = preset.docNo;
      answer = preset;
      if (workspace instanceof HTMLElement) workspace.hidden = false;
      docBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (sDocNo) sDocNo.textContent = preset.docNo || "-";
      if (sKind) sKind.textContent = preset.kind || "-";
      if (sTitle) sTitle.textContent = preset.title || "-";
      if (sPartner) sPartner.textContent = preset.partner || "-";
      if (sDate) sDate.textContent = preset.date || "-";
      if (sAmount) sAmount.textContent = fmt(preset.amount || 0);
      if (sPriority) sPriority.textContent = preset.priority || "-";
      if (wsTitle) wsTitle.textContent = `${preset.docNo || "-"} ${preset.title || "対象証憑"}`;
      if (wsSub) wsSub.textContent = `${preset.kind || "証憑"} / ${preset.partner || "-"} / ${preset.date || "-"}`;
      if (openDoc && preset.pdf) openDoc.setAttribute("href", preset.pdf);

      if (entries[preset.docNo]) loadSaved(entries[preset.docNo]);
      else {
        ensureRows(1);
        const r = body ? body.querySelector("tr") : null;
        if (r instanceof HTMLTableRowElement) clearRow(r);
        if (slip instanceof HTMLInputElement) slip.value = preset.slipNo || "";
        if (date instanceof HTMLInputElement) date.value = preset.date || "";
        if (docNoInput instanceof HTMLInputElement) docNoInput.value = preset.docNo || "";
        if (memo instanceof HTMLInputElement) memo.value = "";
      }

      showGrade(grades[preset.docNo]);
      updateProgress();
      evaluate();
    };

    const register = () => {
      if (!activeDoc || !answer) return;
      const entry = collectEntry();
      const gr = grade(entry, answer);
      entry.grade = gr;
      entries[activeDoc] = entry;
      grades[activeDoc] = gr;
      write(K.entries, entries);
      write(K.grades, grades);
      showGrade(gr);
      refreshDocStates();
      updateProgress();
    };

    if (addBtn instanceof HTMLButtonElement && body) {
      addBtn.addEventListener("click", () => {
        if (!(rowTemplate instanceof HTMLTableRowElement)) return;
        const c = rowTemplate.cloneNode(true);
        if (!(c instanceof HTMLTableRowElement)) return;
        clearRow(c);
        body.appendChild(c);
        bindAmounts();
        updateIndexes();
        evaluate();
      });
    }

    if (removeBtn instanceof HTMLButtonElement && body) {
      removeBtn.addEventListener("click", () => {
        const rows = body.querySelectorAll("tr");
        if (rows.length > 1) rows[rows.length - 1].remove();
        else if (rows[0] instanceof HTMLTableRowElement) clearRow(rows[0]);
        updateIndexes();
        evaluate();
      });
    }

    regBtns.forEach((b) => b instanceof HTMLButtonElement && b.addEventListener("click", register));
    [slip, memo, date, docNoInput].forEach((i) => i instanceof HTMLInputElement && i.addEventListener("input", evaluate));
    if (body) {
      body.addEventListener("change", evaluate);
      body.addEventListener("input", (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.classList.contains("entry-debit") || t.classList.contains("entry-credit")) return;
        evaluate();
      });
    }

    bindAmounts();
    updateIndexes();
    refreshDocStates();
    updateProgress();
    resetGrade();
    evaluate();

    docBtns.forEach((b) => b.addEventListener("click", () => activate(b)));
    const req = (new URLSearchParams(window.location.search).get("doc") || "").toUpperCase();
    if (req) {
      const t = docBtns.find((b) => (b.dataset.docNo || "").toUpperCase() === req);
      if (t) activate(t);
    }
  }

  // bank reconcile page
  const bankRoot = document.querySelector("[data-bank-root]");
  if (bankRoot) {
    const badgeMatch = bankRoot.querySelector("[data-bank-badge-match]");
    const badgeOpen = bankRoot.querySelector("[data-bank-badge-open]");
    const badgeDiff = bankRoot.querySelector("[data-bank-badge-diff]");
    const messageEl = bankRoot.querySelector("[data-bank-message]");
    const statementBody = bankRoot.querySelector("[data-bank-statement-body]");
    const ledgerBody = bankRoot.querySelector("[data-bank-ledger-body]");
    const diffBody = bankRoot.querySelector("[data-bank-diff-body]");
    const logBody = bankRoot.querySelector("[data-bank-log-body]");
    const selectedStatementEl = bankRoot.querySelector("[data-bank-selected-statement]");
    const selectedLedgerEl = bankRoot.querySelector("[data-bank-selected-ledger]");

    const autoMatchBtn = bankRoot.querySelector("[data-bank-auto-match]");
    const reloadBtn = bankRoot.querySelector("[data-bank-reload]");
    const matchBtn = bankRoot.querySelector("[data-bank-match]");
    const unmatchBtn = bankRoot.querySelector("[data-bank-unmatch]");
    const markDiffBtn = bankRoot.querySelector("[data-bank-mark-diff]");
    const diffReason = bankRoot.querySelector("[data-bank-diff-reason]");
    const diffNote = bankRoot.querySelector("[data-bank-diff-note]");

    const statementRows = BANK_STATEMENT_ROWS.map((row) => ({ ...row }));

    const seedLedgerRows = [
      { id: "S-001", date: "2026-01-15", memo: "1月分家賃支払", amount: -180000, counter: "地代家賃", docNo: "D-007", source: "seed" },
      { id: "S-002", date: "2026-01-20", memo: "年間保険料支払", amount: -36000, counter: "前払費用", docNo: "D-012", source: "seed" },
      { id: "S-003", date: "2026-01-29", memo: "買掛金支払 Studio K", amount: -60000, counter: "買掛金", docNo: "BILL-011", source: "seed" },
      { id: "S-004", date: "2026-01-30", memo: "売掛金回収 青葉デザイン", amount: 120000, counter: "売掛金", docNo: "INV-001", source: "seed" },
      { id: "S-005", date: "2026-02-04", memo: "売掛金回収 北川商店", amount: 88000, counter: "売掛金", docNo: "INV-002", source: "seed" }
    ];

    const esc = (s) =>
      String(s || "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch] || ch));
    const fmtSigned = (n) => `${n < 0 ? "-" : ""}${fmt(Math.abs(parseAmount(n)))}`;
    const setMessage = (type, text) => setStatus(messageEl, type, text);
    const parseYmd = (raw) => {
      const d = new Date(String(raw || "") + "T00:00:00");
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const dayDiff = (a, b) => {
      const da = parseYmd(a);
      const db = parseYmd(b);
      if (!da || !db) return 999;
      return Math.abs(Math.floor((da.getTime() - db.getTime()) / 86400000));
    };

    let selectedStatementId = "";
    let selectedLedgerId = "";
    let ledgerRows = [];
    let bankState = read(K.bankRecon);

    const ensureBankState = () => {
      if (!bankState || typeof bankState !== "object") bankState = {};
      if (!bankState.matches || typeof bankState.matches !== "object") bankState.matches = {};
      if (!bankState.diffs || typeof bankState.diffs !== "object") bankState.diffs = {};
      if (!Array.isArray(bankState.logs)) bankState.logs = [];
    };
    ensureBankState();

    const saveBankState = () => write(K.bankRecon, bankState);

    const buildLedgerRows = () => {
      const entriesMap = read(K.entries);
      const rows = [];

      Object.values(entriesMap).forEach((entry, eIndex) => {
        if (!entry || !Array.isArray(entry.lines)) return;
        entry.lines.forEach((line, lIndex) => {
          const debit = parseAmount(line.debit);
          const credit = parseAmount(line.credit);
          let amount = 0;
          let counter = "";
          if (line.debitAccount === "普通預金" && debit > 0) {
            amount = debit;
            counter = line.creditAccount || "";
          } else if (line.creditAccount === "普通預金" && credit > 0) {
            amount = -credit;
            counter = line.debitAccount || "";
          } else {
            return;
          }

          const baseDoc = String(entry.docNo || entry.documentNo || entry.slipNo || ("ENTRY" + String(eIndex)))
            .replace(/[^A-Za-z0-9_-]/g, "");
          rows.push({
            id: `E-${baseDoc}-${lIndex}`,
            date: String(entry.date || "").slice(0, 10),
            memo: line.memo || entry.memo || "-",
            amount,
            counter,
            docNo: entry.docNo || entry.documentNo || "-",
            source: "entry"
          });
        });
      });

      const existingKeys = new Set(rows.map((r) => `${r.date}|${r.amount}`));
      seedLedgerRows.forEach((seed) => {
        const key = `${seed.date}|${seed.amount}`;
        if (!existingKeys.has(key)) rows.push(seed);
      });

      return rows.sort((a, b) => {
        if (a.date === b.date) return a.id.localeCompare(b.id);
        return a.date.localeCompare(b.date);
      });
    };

    const ledgerById = (id) => ledgerRows.find((row) => row.id === id);
    const statementById = (id) => statementRows.find((row) => row.id === id);

    const reverseMatchMap = () => {
      const rev = {};
      Object.keys(bankState.matches).forEach((sid) => {
        const lid = bankState.matches[sid];
        if (lid) rev[lid] = sid;
      });
      return rev;
    };

    const addLog = (action, type, result) => {
      bankState.logs.unshift({
        at: new Date().toISOString(),
        action,
        type,
        result
      });
      bankState.logs = bankState.logs.slice(0, 30);
      saveBankState();
    };

    const sanitizeBankState = () => {
      const validStatementIds = new Set(statementRows.map((row) => row.id));
      const validLedgerIds = new Set(ledgerRows.map((row) => row.id));
      Object.keys(bankState.matches).forEach((sid) => {
        const lid = bankState.matches[sid];
        if (!validStatementIds.has(sid) || !validLedgerIds.has(lid)) {
          delete bankState.matches[sid];
        }
      });
      Object.keys(bankState.diffs).forEach((sid) => {
        if (!validStatementIds.has(sid)) delete bankState.diffs[sid];
      });
      saveBankState();
    };

    const renderSelection = () => {
      const st = statementById(selectedStatementId);
      const ld = ledgerById(selectedLedgerId);
      if (selectedStatementEl) {
        selectedStatementEl.textContent = st
          ? `${st.id} / ${st.date} / ${st.description} / ${fmtSigned(st.amount)}`
          : "-";
      }
      if (selectedLedgerEl) {
        selectedLedgerEl.textContent = ld
          ? `${ld.id} / ${ld.date} / ${ld.memo} / ${fmtSigned(ld.amount)}`
          : "-";
      }
    };

    const renderSummary = () => {
      const matchedCount = Object.keys(bankState.matches).length;
      let openCount = 0;
      let openAmount = 0;
      statementRows.forEach((st) => {
        if (bankState.matches[st.id]) return;
        const diff = bankState.diffs[st.id];
        const closed = Boolean(diff && (diff.status === "closed" || diff.status === "posted"));
        if (!closed) {
          openCount += 1;
          openAmount += Math.abs(st.amount);
        }
      });

      if (badgeMatch) badgeMatch.textContent = `一致 ${matchedCount} / ${statementRows.length}`;
      if (badgeOpen) badgeOpen.textContent = `未解決 ${openCount}件`;
      if (badgeDiff) badgeDiff.textContent = `未解決金額 ${fmt(openAmount)}円`;
    };

    const renderStatementTable = () => {
      if (!statementBody) return;
      const rows = statementRows.map((st) => {
        const matchedLedgerId = bankState.matches[st.id];
        const diff = bankState.diffs[st.id];
        const isSelected = selectedStatementId === st.id;

        let statusHtml = '<span class="status pending">未照合</span>';
        if (matchedLedgerId) {
          statusHtml = `<span class="status ok">一致 (${esc(matchedLedgerId)})</span>`;
        } else if (diff && (diff.status === "closed" || diff.status === "posted")) {
          statusHtml = '<span class="status ok">差異対応済み</span>';
        } else if (diff) {
          statusHtml = '<span class="status pending">差異登録済み</span>';
        }

        const rowClass = [
          isSelected ? "bank-row-selected" : "",
          matchedLedgerId ? "bank-row-matched" : "",
          !matchedLedgerId && diff && diff.status !== "closed" && diff.status !== "posted" ? "bank-row-open" : ""
        ].join(" ").trim();

        return (
          `<tr class="${rowClass}">` +
          `<td><button class="btn" data-bank-select-statement="${st.id}">選択</button></td>` +
          `<td>${esc(st.date)}</td>` +
          `<td>${esc(st.description)}</td>` +
          `<td class="num">${fmtSigned(st.amount)}</td>` +
          `<td>${statusHtml}</td>` +
          "</tr>"
        );
      });
      statementBody.innerHTML = rows.join("");
    };

    const renderLedgerTable = () => {
      if (!ledgerBody) return;
      const rev = reverseMatchMap();
      if (!ledgerRows.length) {
        ledgerBody.innerHTML = '<tr><td colspan="5" class="muted">普通預金を含む仕訳がまだありません。</td></tr>';
        return;
      }
      const rows = ledgerRows.map((ld) => {
        const matchedStatementId = rev[ld.id];
        const isSelected = selectedLedgerId === ld.id;
        const rowClass = [
          isSelected ? "bank-row-selected" : "",
          matchedStatementId ? "bank-row-matched" : ""
        ].join(" ").trim();
        const statusHtml = matchedStatementId
          ? `<span class="status ok">一致 (${esc(matchedStatementId)})</span>`
          : '<span class="status pending">未照合</span>';
        return (
          `<tr class="${rowClass}">` +
          `<td><button class="btn" data-bank-select-ledger="${ld.id}">選択</button></td>` +
          `<td>${esc(ld.date || "-")}</td>` +
          `<td>${esc(ld.memo || "-")}</td>` +
          `<td class="num">${fmtSigned(ld.amount)}</td>` +
          `<td>${statusHtml}</td>` +
          "</tr>"
        );
      });
      ledgerBody.innerHTML = rows.join("");
    };

    const renderDiffTable = () => {
      if (!diffBody) return;
      const unresolved = statementRows.filter((st) => !bankState.matches[st.id]);
      if (!unresolved.length) {
        diffBody.innerHTML = '<tr><td colspan="5" class="muted">差異はありません。</td></tr>';
        return;
      }

      const rows = unresolved.map((st) => {
        const diff = bankState.diffs[st.id];
        const reason = diff ? diff.reason : "-";
        const note = diff ? diff.note : "未登録";
        const status = diff
          ? (diff.status === "closed" || diff.status === "posted"
            ? '<span class="status ok">対応済み</span>'
            : '<span class="status pending">対応中</span>')
          : '<span class="status ng">未対応</span>';

        let actionHtml = `<button class="btn" data-bank-focus-statement="${st.id}">この行を選択</button>`;
        if (
          diff &&
          diff.reason === "未記帳（仕訳漏れ）" &&
          diff.status !== "posted" &&
          /手数料/.test(st.description)
        ) {
          actionHtml =
            `<button class="btn warn" data-bank-post-fee="${st.id}">手数料仕訳を起票</button>`;
        } else if (diff && diff.postedDocNo) {
          actionHtml = `<span class="status ok">起票済み ${esc(diff.postedDocNo)}</span>`;
        }

        return (
          "<tr>" +
          `<td>${esc(st.date)} ${esc(st.description)} (${fmtSigned(st.amount)})</td>` +
          `<td>${esc(reason)}</td>` +
          `<td>${esc(note)}</td>` +
          `<td>${status}</td>` +
          `<td>${actionHtml}</td>` +
          "</tr>"
        );
      });
      diffBody.innerHTML = rows.join("");
    };

    const renderLogTable = () => {
      if (!logBody) return;
      if (!bankState.logs.length) {
        logBody.innerHTML = '<tr><td colspan="3" class="muted">ログはまだありません。</td></tr>';
        return;
      }
      const rows = bankState.logs.map((log) => {
        const status = log.type === "ok"
          ? '<span class="status ok">成功</span>'
          : log.type === "ng"
            ? '<span class="status ng">失敗</span>'
            : '<span class="status pending">記録</span>';
        return (
          "<tr>" +
          `<td>${new Date(log.at).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>` +
          `<td>${esc(log.action)}</td>` +
          `<td>${status} ${esc(log.result || "")}</td>` +
          "</tr>"
        );
      });
      logBody.innerHTML = rows.join("");
    };

    const renderAll = () => {
      renderSummary();
      renderSelection();
      renderStatementTable();
      renderLedgerTable();
      renderDiffTable();
      renderLogTable();
    };

    const applyMatch = (statementId, ledgerId, source) => {
      const st = statementById(statementId);
      const ld = ledgerById(ledgerId);
      if (!st || !ld) {
        setMessage("ng", "照合対象が見つかりません。");
        return false;
      }

      const rev = reverseMatchMap();
      if (rev[ledgerId] && rev[ledgerId] !== statementId) {
        setMessage("ng", "選択した元帳行は別の通帳明細と照合済みです。");
        return false;
      }
      if (parseAmount(st.amount) !== parseAmount(ld.amount)) {
        setMessage("ng", "金額が一致しません。差異登録で原因を記録してください。");
        return false;
      }
      if (dayDiff(st.date, ld.date) > 7) {
        setMessage("ng", "日付差が大きすぎます。計上タイミング差として扱ってください。");
        return false;
      }

      bankState.matches[statementId] = ledgerId;
      delete bankState.diffs[statementId];
      saveBankState();
      addLog(`${source}照合`, "ok", `${statementId} ⇔ ${ledgerId}`);
      setMessage("ok", `照合しました: ${statementId} ⇔ ${ledgerId}`);
      renderAll();
      return true;
    };

    const unmatchStatement = (statementId) => {
      if (!statementId || !bankState.matches[statementId]) {
        setMessage("pending", "照合解除する行を選択してください。");
        return;
      }
      const ledgerId = bankState.matches[statementId];
      delete bankState.matches[statementId];
      saveBankState();
      addLog("照合解除", "pending", `${statementId} ⇔ ${ledgerId}`);
      setMessage("pending", `照合を解除しました: ${statementId}`);
      renderAll();
    };

    const markDiff = () => {
      const st = statementById(selectedStatementId);
      if (!st) {
        setMessage("pending", "先に通帳明細を1件選択してください。");
        return;
      }
      const reason = diffReason instanceof HTMLSelectElement ? diffReason.value : "未記帳（仕訳漏れ）";
      const note = diffNote instanceof HTMLInputElement ? diffNote.value.trim() : "";
      if (bankState.matches[st.id]) delete bankState.matches[st.id];
      bankState.diffs[st.id] = {
        reason,
        note,
        status: reason === "計上タイミング差" ? "closed" : "open",
        updatedAt: new Date().toISOString()
      };
      saveBankState();
      addLog("差異登録", "pending", `${st.id} / ${reason}`);
      setMessage("pending", `差異登録しました: ${st.id} / ${reason}`);
      renderAll();
    };

    const postFeeEntry = (statementId) => {
      const st = statementById(statementId);
      if (!st) return;
      const diff = bankState.diffs[statementId];
      if (!diff || diff.reason !== "未記帳（仕訳漏れ）") {
        setMessage("pending", "差異理由が未記帳の明細に対して実行してください。");
        return;
      }

      const entriesMap = read(K.entries);
      const amount = Math.abs(parseAmount(st.amount));
      const docNo = diff.postedDocNo || `BKFEE-${st.date.replace(/-/g, "")}-${statementId.slice(-2)}`;
      entriesMap[docNo] = {
        docNo,
        documentNo: statementId,
        slipNo: `BK-${st.date.replace(/-/g, "")}-${statementId.slice(-2)}`,
        date: st.date,
        memo: `銀行手数料 ${statementId}`,
        lines: [
          {
            debitAccount: "支払手数料",
            creditAccount: "普通預金",
            tax: "対象外",
            partner: "みずほ銀行",
            memo: "銀行照合で起票",
            debit: amount,
            credit: amount
          }
        ],
        source: "bank-reconcile",
        savedAt: new Date().toISOString()
      };
      write(K.entries, entriesMap);

      diff.status = "posted";
      diff.postedDocNo = docNo;
      diff.updatedAt = new Date().toISOString();
      saveBankState();

      ledgerRows = buildLedgerRows();
      sanitizeBankState();
      const rev = reverseMatchMap();
      const candidate = ledgerRows.find((row) =>
        !rev[row.id] &&
        parseAmount(row.amount) === parseAmount(st.amount) &&
        row.date === st.date
      );
      if (candidate) {
        bankState.matches[statementId] = candidate.id;
        delete bankState.diffs[statementId];
        saveBankState();
      }

      addLog("手数料仕訳起票", "ok", `${statementId} / ${docNo}`);
      setMessage("ok", `手数料仕訳を起票しました（${docNo}）。`);
      renderAll();
    };

    const runAutoMatch = () => {
      let matched = 0;
      const rev = reverseMatchMap();

      statementRows.forEach((st) => {
        if (bankState.matches[st.id]) return;
        let best = null;
        ledgerRows.forEach((ld) => {
          if (rev[ld.id]) return;
          if (parseAmount(ld.amount) !== parseAmount(st.amount)) return;
          const diffDays = dayDiff(st.date, ld.date);
          if (diffDays > 3) return;
          if (!best || diffDays < best.diffDays) {
            best = { ledgerId: ld.id, diffDays };
          }
        });
        if (best) {
          bankState.matches[st.id] = best.ledgerId;
          delete bankState.diffs[st.id];
          rev[best.ledgerId] = st.id;
          matched += 1;
        }
      });

      saveBankState();
      addLog("自動突合", matched > 0 ? "ok" : "pending", `${matched}件一致`);
      if (matched > 0) setMessage("ok", `自動突合で ${matched} 件を一致させました。`);
      else setMessage("pending", "自動突合で一致する明細はありませんでした。");
      renderAll();
    };

    if (statementBody) {
      statementBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const select = target.closest("[data-bank-select-statement]");
        if (select instanceof HTMLElement) {
          selectedStatementId = select.getAttribute("data-bank-select-statement") || "";
          renderSelection();
          renderStatementTable();
          return;
        }
      });
    }

    if (ledgerBody) {
      ledgerBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const select = target.closest("[data-bank-select-ledger]");
        if (select instanceof HTMLElement) {
          selectedLedgerId = select.getAttribute("data-bank-select-ledger") || "";
          renderSelection();
          renderLedgerTable();
          return;
        }
      });
    }

    if (diffBody) {
      diffBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const feeBtn = target.closest("[data-bank-post-fee]");
        if (feeBtn instanceof HTMLElement) {
          postFeeEntry(feeBtn.getAttribute("data-bank-post-fee") || "");
          return;
        }
        const focusBtn = target.closest("[data-bank-focus-statement]");
        if (focusBtn instanceof HTMLElement) {
          selectedStatementId = focusBtn.getAttribute("data-bank-focus-statement") || "";
          renderAll();
        }
      });
    }

    if (matchBtn instanceof HTMLButtonElement) {
      matchBtn.addEventListener("click", () => {
        if (!selectedStatementId || !selectedLedgerId) {
          setMessage("pending", "通帳明細と元帳を1件ずつ選択してください。");
          return;
        }
        applyMatch(selectedStatementId, selectedLedgerId, "手動");
      });
    }

    if (unmatchBtn instanceof HTMLButtonElement) {
      unmatchBtn.addEventListener("click", () => {
        if (!selectedStatementId) {
          setMessage("pending", "照合解除する通帳明細を選択してください。");
          return;
        }
        unmatchStatement(selectedStatementId);
      });
    }

    if (markDiffBtn instanceof HTMLButtonElement) {
      markDiffBtn.addEventListener("click", markDiff);
    }
    if (autoMatchBtn instanceof HTMLButtonElement) {
      autoMatchBtn.addEventListener("click", runAutoMatch);
    }
    if (reloadBtn instanceof HTMLButtonElement) {
      reloadBtn.addEventListener("click", () => {
        ledgerRows = buildLedgerRows();
        sanitizeBankState();
        setMessage("ok", "普通預金元帳を再読込しました。");
        renderAll();
      });
    }

    ledgerRows = buildLedgerRows();
    sanitizeBankState();
    const bankFocus = (new URLSearchParams(window.location.search).get("focus") || "").toUpperCase();
    if (bankFocus) {
      const focused = statementRows.find((row) =>
        row.id.toUpperCase() === bankFocus ||
        row.description.toUpperCase().includes(bankFocus)
      );
      if (focused) selectedStatementId = focused.id;
    }
    setMessage("pending", "通帳明細と普通預金元帳を選択して照合してください。");
    renderAll();
  }

  // generic focus highlight from dashboard links
  const focusText = (new URLSearchParams(window.location.search).get("focus") || "").toUpperCase();
  if (focusText) {
    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    const hit = rows.find((row) => String(row.textContent || "").toUpperCase().includes(focusText));
    if (hit instanceof HTMLTableRowElement) {
      hit.classList.add("row-focus");
      hit.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // fixed assets page
  const fixedRoot = document.querySelector("[data-fixed-assets-root]");
  if (fixedRoot) {
    const candidateBody = fixedRoot.querySelector("[data-fa-candidate-body]");
    const registerBody = fixedRoot.querySelector("[data-fa-register-body]");
    const targetMonthInput = fixedRoot.querySelector("[data-fa-target-month]");
    const targetAssetSelect = fixedRoot.querySelector("[data-fa-target-asset]");
    const postDepBtn = fixedRoot.querySelector("[data-fa-post-dep]");
    const messageEl = fixedRoot.querySelector("[data-fa-message]");
    const countBadge = fixedRoot.querySelector("[data-fa-count]");
    const depStatusBadge = fixedRoot.querySelector("[data-fa-dep-status]");

    const detailCost = fixedRoot.querySelector("[data-fa-detail-cost]");
    const detailLife = fixedRoot.querySelector("[data-fa-detail-life]");
    const detailMonthly = fixedRoot.querySelector("[data-fa-detail-monthly]");
    const detailTarget = fixedRoot.querySelector("[data-fa-detail-target]");

    const editFields = {
      assetId: fixedRoot.querySelector('[data-fa-field="assetId"]'),
      name: fixedRoot.querySelector('[data-fa-field="name"]'),
      acquisitionDate: fixedRoot.querySelector('[data-fa-field="acquisitionDate"]'),
      cost: fixedRoot.querySelector('[data-fa-field="cost"]'),
      residual: fixedRoot.querySelector('[data-fa-field="residual"]'),
      lifeMonths: fixedRoot.querySelector('[data-fa-field="lifeMonths"]'),
      startMonth: fixedRoot.querySelector('[data-fa-field="startMonth"]'),
      method: fixedRoot.querySelector('[data-fa-field="method"]')
    };

    const saveEditBtn = fixedRoot.querySelector("[data-fa-save-edit]");
    const resetEditBtn = fixedRoot.querySelector("[data-fa-reset-edit]");

    let entriesMap = read(K.entries);
    let assetsMap = read(K.fixedAssets);
    let selectedAssetId = "";

    const setMessage = (type, text) => setStatus(messageEl, type, text);

    const listCandidates = () => {
      const candidates = [];
      const seen = new Set();
      Object.values(entriesMap).forEach((entry) => {
        if (!entry || !Array.isArray(entry.lines)) return;
        entry.lines.forEach((line) => {
          if (line.debitAccount !== "工具器具備品") return;
          if (parseAmount(line.debit) <= 0) return;
          const docNo = String(entry.docNo || entry.documentNo || "").trim();
          if (!docNo || seen.has(docNo)) return;
          seen.add(docNo);
          candidates.push({
            docNo,
            date: entry.date || "",
            memo: entry.memo || "",
            amount: parseAmount(line.debit)
          });
        });
      });
      return candidates.sort((a, b) => a.docNo.localeCompare(b.docNo));
    };

    const findAssetByDoc = (docNo) => {
      return Object.values(assetsMap).find((asset) => asset.sourceDocNo === docNo);
    };

    const assetMonthlyDep = (asset) => {
      const cost = parseAmount(asset.cost);
      const residual = parseAmount(asset.residual);
      const life = Math.max(parseAmount(asset.lifeMonths), 1);
      return Math.max(Math.floor((cost - residual) / life), 0);
    };

    const depEntryDocNo = (assetId, month) => {
      return "DEP-" + assetId + "-" + String(month).replace("-", "");
    };

    const renderCandidates = () => {
      if (!candidateBody) return;
      const candidates = listCandidates();
      if (!candidates.length) {
        candidateBody.innerHTML =
          '<tr><td colspan="6" class="muted">固定資産候補がありません。仕訳入力で「工具器具備品」を登録してください。</td></tr>';
        return;
      }

      const rows = candidates.map((item) => {
        const asset = findAssetByDoc(item.docNo);
        const status = asset
          ? '<span class="status ok">登録済み</span>'
          : '<span class="status pending">未登録</span>';
        const action = asset
          ? '<button class="btn" data-fa-select="' + asset.assetId + '">台帳を開く</button>'
          : '<button class="btn primary" data-fa-register="' + item.docNo + '">台帳登録</button>';
        return (
          "<tr>" +
          "<td>" + item.docNo + "</td>" +
          "<td>" + (item.date || "-") + "</td>" +
          "<td>" + (item.memo || "-") + "</td>" +
          '<td class="num">' + fmt(item.amount) + "</td>" +
          "<td>" + status + "</td>" +
          "<td>" + action + "</td>" +
          "</tr>"
        );
      });
      candidateBody.innerHTML = rows.join("");
    };

    const renderAssetOptions = () => {
      if (!(targetAssetSelect instanceof HTMLSelectElement)) return;
      const assets = Object.values(assetsMap).sort((a, b) => a.assetId.localeCompare(b.assetId));
      let html = '<option value="">選択してください</option>';
      assets.forEach((asset) => {
        html +=
          '<option value="' +
          asset.assetId +
          '">' +
          asset.assetId +
          " / " +
          (asset.name || asset.sourceDocNo) +
          "</option>";
      });
      targetAssetSelect.innerHTML = html;
    };

    const renderRegisterTable = () => {
      if (!registerBody) return;
      const assets = Object.values(assetsMap).sort((a, b) => a.assetId.localeCompare(b.assetId));
      if (!assets.length) {
        registerBody.innerHTML =
          '<tr><td colspan="8" class="muted">台帳データがありません。</td></tr>';
      } else {
        const rows = assets.map((asset) => {
          const monthly = assetMonthlyDep(asset);
          return (
            "<tr>" +
            "<td>" + asset.assetId + "</td>" +
            "<td>" + (asset.name || "-") + "</td>" +
            "<td>" + (asset.acquisitionDate || "-") + "</td>" +
            '<td class="num">' + fmt(asset.cost || 0) + "</td>" +
            '<td class="num">' + fmt(asset.residual || 0) + "</td>" +
            '<td class="num">' + fmt(asset.lifeMonths || 0) + "</td>" +
            '<td class="num">' + fmt(monthly) + "</td>" +
            '<td><button class="btn" data-fa-select="' + asset.assetId + '">編集</button></td>' +
            "</tr>"
          );
        });
        registerBody.innerHTML = rows.join("");
      }

      if (countBadge) {
        countBadge.textContent = "台帳登録 " + String(Object.keys(assetsMap).length) + " 件";
      }
      renderAssetOptions();
    };

    const fillEditForm = (assetId) => {
      const asset = assetsMap[assetId];
      selectedAssetId = asset ? assetId : "";
      if (!asset) {
        Object.values(editFields).forEach((el) => {
          if (el instanceof HTMLInputElement) el.value = "";
          if (el instanceof HTMLSelectElement) el.selectedIndex = 0;
        });
        return;
      }

      if (editFields.assetId instanceof HTMLInputElement) editFields.assetId.value = asset.assetId || "";
      if (editFields.name instanceof HTMLInputElement) editFields.name.value = asset.name || "";
      if (editFields.acquisitionDate instanceof HTMLInputElement) editFields.acquisitionDate.value = asset.acquisitionDate || "";
      if (editFields.cost instanceof HTMLInputElement) editFields.cost.value = fmt(asset.cost || 0);
      if (editFields.residual instanceof HTMLInputElement) editFields.residual.value = fmt(asset.residual || 0);
      if (editFields.lifeMonths instanceof HTMLInputElement) editFields.lifeMonths.value = String(asset.lifeMonths || "");
      if (editFields.startMonth instanceof HTMLInputElement) editFields.startMonth.value = asset.startMonth || "";
      if (editFields.method instanceof HTMLSelectElement) editFields.method.value = asset.method || "定額法";

      if (targetAssetSelect instanceof HTMLSelectElement) {
        targetAssetSelect.value = asset.assetId;
      }
      updateDepPreview();
    };

    const updateDepPreview = () => {
      const month =
        targetMonthInput instanceof HTMLInputElement ? targetMonthInput.value : "";
      const assetId =
        targetAssetSelect instanceof HTMLSelectElement
          ? targetAssetSelect.value
          : "";
      const asset = assetsMap[assetId];
      if (!asset) {
        if (detailCost) detailCost.textContent = "0";
        if (detailLife) detailLife.textContent = "0";
        if (detailMonthly) detailMonthly.textContent = "0";
        if (detailTarget) detailTarget.textContent = "0";
        if (depStatusBadge) depStatusBadge.textContent = "償却仕訳 未反映";
        return;
      }

      const monthly = assetMonthlyDep(asset);
      const startMonth = String(asset.startMonth || "").slice(0, 7);
      const target = month && startMonth && month >= startMonth ? monthly : 0;

      if (detailCost) detailCost.textContent = fmt(asset.cost || 0);
      if (detailLife) detailLife.textContent = fmt(asset.lifeMonths || 0);
      if (detailMonthly) detailMonthly.textContent = fmt(monthly);
      if (detailTarget) detailTarget.textContent = fmt(target);

      const depDocNo = depEntryDocNo(asset.assetId, month || "");
      const depExists = Boolean(entriesMap[depDocNo]);
      if (depStatusBadge) {
        depStatusBadge.textContent = depExists
          ? "償却仕訳 反映済み"
          : "償却仕訳 未反映";
      }
    };

    const registerFromCandidate = (docNo) => {
      const candidate = listCandidates().find((item) => item.docNo === docNo);
      if (!candidate) return;
      const existing = findAssetByDoc(docNo);
      if (existing) {
        fillEditForm(existing.assetId);
        setMessage("pending", "この証憑はすでに台帳登録済みです。");
        return;
      }

      const safeDoc = docNo.replace(/[^A-Za-z0-9-]/g, "");
      const assetId = "FA-" + safeDoc;
      const month = String(candidate.date || "2026-01-01").slice(0, 7);
      assetsMap[assetId] = {
        assetId,
        sourceDocNo: docNo,
        name: candidate.memo || ("固定資産 " + docNo),
        acquisitionDate: candidate.date || "2026-01-01",
        cost: candidate.amount || 0,
        residual: 0,
        lifeMonths: 36,
        startMonth: month || "2026-01",
        method: "定額法",
        status: "active",
        updatedAt: new Date().toISOString()
      };
      write(K.fixedAssets, assetsMap);
      renderCandidates();
      renderRegisterTable();
      fillEditForm(assetId);
      setMessage("ok", "固定資産台帳に登録しました。耐用月数を確認してください。");
    };

    const saveAssetEdit = () => {
      if (!selectedAssetId || !assetsMap[selectedAssetId]) {
        setMessage("pending", "編集対象の資産を選択してください。");
        return;
      }
      const asset = assetsMap[selectedAssetId];
      if (editFields.name instanceof HTMLInputElement) asset.name = editFields.name.value.trim();
      if (editFields.acquisitionDate instanceof HTMLInputElement) {
        asset.acquisitionDate = editFields.acquisitionDate.value;
      }
      if (editFields.cost instanceof HTMLInputElement) asset.cost = parseAmount(editFields.cost.value);
      if (editFields.residual instanceof HTMLInputElement) {
        asset.residual = parseAmount(editFields.residual.value);
      }
      if (editFields.lifeMonths instanceof HTMLInputElement) {
        asset.lifeMonths = Math.max(parseAmount(editFields.lifeMonths.value), 1);
      }
      if (editFields.startMonth instanceof HTMLInputElement) {
        asset.startMonth = editFields.startMonth.value;
      }
      if (editFields.method instanceof HTMLSelectElement) asset.method = editFields.method.value;
      asset.updatedAt = new Date().toISOString();

      write(K.fixedAssets, assetsMap);
      renderRegisterTable();
      updateDepPreview();
      setMessage("ok", "固定資産台帳を更新しました。");
    };

    const postDepEntry = () => {
      const month =
        targetMonthInput instanceof HTMLInputElement ? targetMonthInput.value : "";
      const assetId =
        targetAssetSelect instanceof HTMLSelectElement
          ? targetAssetSelect.value
          : "";
      const asset = assetsMap[assetId];
      if (!asset || !month) {
        setMessage("pending", "対象月と対象資産を選択してください。");
        return;
      }
      const monthly = assetMonthlyDep(asset);
      const startMonth = String(asset.startMonth || "").slice(0, 7);
      const amount = month >= startMonth ? monthly : 0;
      if (amount <= 0) {
        setMessage("pending", "この月は償却対象外です。対象月を見直してください。");
        return;
      }

      const depDocNo = depEntryDocNo(asset.assetId, month);
      entriesMap = read(K.entries);
      entriesMap[depDocNo] = {
        docNo: depDocNo,
        documentNo: depDocNo,
        slipNo: "DEP-" + month.replace("-", "") + "-" + asset.assetId,
        date: month + "-28",
        memo: "減価償却 " + (asset.name || asset.assetId) + " " + month,
        lines: [
          {
            debitAccount: "減価償却費",
            creditAccount: "減価償却累計額",
            tax: "対象外",
            partner: "",
            memo: "固定資産償却",
            debit: amount,
            credit: amount
          }
        ],
        savedAt: new Date().toISOString(),
        source: "fixed-assets"
      };
      write(K.entries, entriesMap);
      updateDepPreview();
      setMessage("ok", "償却仕訳を反映しました（" + depDocNo + "）。");
    };

    if (candidateBody) {
      candidateBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const registerBtn = target.closest("[data-fa-register]");
        if (registerBtn instanceof HTMLElement) {
          registerFromCandidate(registerBtn.getAttribute("data-fa-register") || "");
          return;
        }
        const selectBtn = target.closest("[data-fa-select]");
        if (selectBtn instanceof HTMLElement) {
          fillEditForm(selectBtn.getAttribute("data-fa-select") || "");
        }
      });
    }

    if (registerBody) {
      registerBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const selectBtn = target.closest("[data-fa-select]");
        if (selectBtn instanceof HTMLElement) {
          fillEditForm(selectBtn.getAttribute("data-fa-select") || "");
        }
      });
    }

    if (saveEditBtn instanceof HTMLButtonElement) {
      saveEditBtn.addEventListener("click", saveAssetEdit);
    }
    if (resetEditBtn instanceof HTMLButtonElement) {
      resetEditBtn.addEventListener("click", () => {
        selectedAssetId = "";
        fillEditForm("");
        setMessage("pending", "編集欄をクリアしました。");
      });
    }
    if (targetAssetSelect instanceof HTMLSelectElement) {
      targetAssetSelect.addEventListener("change", () => {
        updateDepPreview();
      });
    }
    if (targetMonthInput instanceof HTMLInputElement) {
      targetMonthInput.addEventListener("change", () => {
        updateDepPreview();
      });
    }
    if (postDepBtn instanceof HTMLButtonElement) {
      postDepBtn.addEventListener("click", postDepEntry);
    }

    renderCandidates();
    renderRegisterTable();
    updateDepPreview();
  }

  // reports page
  const reports = document.querySelector("[data-reports-root]");
  if (reports) {
    const tb = reports.querySelector("[data-trial-body]");
    const up = reports.querySelector("[data-report-updated]");
    const st = reports.querySelector("[data-report-status]");
    const note = reports.querySelector("[data-report-note]");
    const plSales = reports.querySelector("[data-pl-sales]");
    const plExp = reports.querySelector("[data-pl-expenses]");
    const plProfit = reports.querySelector("[data-pl-profit]");
    const bsCur = reports.querySelector("[data-bs-current-assets]");
    const bsFix = reports.querySelector("[data-bs-fixed-assets]");
    const bsLiab = reports.querySelector("[data-bs-liabilities]");
    const bsEq = reports.querySelector("[data-bs-equity]");
    const bsAT = reports.querySelector("[data-bs-assets-total]");
    const bsLET = reports.querySelector("[data-bs-liability-equity-total]");

    const entries = Object.values(read(K.entries));
    const by = {};
    ORDER.forEach((a) => (by[a] = { debit: 0, credit: 0 }));

    entries.forEach((e) => {
      if (!e || !Array.isArray(e.lines)) return;
      e.lines.forEach((l) => {
        const dA = l.debitAccount || "";
        const cA = l.creditAccount || "";
        const d = parseAmount(l.debit);
        const c = parseAmount(l.credit);
        if (dA) {
          if (!by[dA]) by[dA] = { debit: 0, credit: 0 };
          by[dA].debit += d;
        }
        if (cA) {
          if (!by[cA]) by[cA] = { debit: 0, credit: 0 };
          by[cA].credit += c;
        }
      });
    });

    const bal = (a) => {
      const row = by[a] || { debit: 0, credit: 0 };
      const m = META[a];
      if (!m) return row.debit - row.credit;
      return m.c === "liability" || m.c === "revenue"
        ? row.credit - row.debit
        : row.debit - row.credit;
    };
    const fmtSigned = (n) => `${n < 0 ? "-" : ""}${fmt(Math.abs(n))}`;

    if (tb) {
      let dT = 0;
      let cT = 0;
      const rows = ORDER.map((a) => {
        const r = by[a] || { debit: 0, credit: 0 };
        dT += r.debit;
        cT += r.credit;
        return `<tr><td>${a}</td><td class="num">${fmt(r.debit)}</td><td class="num">${fmt(r.credit)}</td></tr>`;
      });
      rows.push(`<tr><td><strong>合計</strong></td><td class="num"><strong>${fmt(dT)}</strong></td><td class="num"><strong>${fmt(cT)}</strong></td></tr>`);
      tb.innerHTML = rows.join("");
    }

    const sales = Math.max(bal("売上高"), 0);
    const exp = Math.max(bal("外注費"), 0) + Math.max(bal("地代家賃"), 0) + Math.max(bal("旅費交通費"), 0) + Math.max(bal("支払手数料"), 0) + Math.max(bal("消耗品費"), 0) + Math.max(bal("減価償却費"), 0);
    const profit = sales - exp;

    if (plSales) plSales.textContent = fmt(sales);
    if (plExp) plExp.textContent = fmtSigned(-exp);
    if (plProfit) plProfit.textContent = fmtSigned(profit);

    const curA = bal("現金") + bal("普通預金") + bal("売掛金") + bal("前払費用");
    const fixA = bal("工具器具備品") + bal("減価償却累計額");
    const liab = bal("買掛金") + bal("未払金");
    const eq = profit;
    const aTotal = curA + fixA;
    const leTotal = liab + eq;
    const diff = aTotal - leTotal;

    if (bsCur) bsCur.textContent = fmtSigned(curA);
    if (bsFix) bsFix.textContent = fmtSigned(fixA);
    if (bsLiab) bsLiab.textContent = fmtSigned(liab);
    if (bsEq) bsEq.textContent = fmtSigned(eq);
    if (bsAT) bsAT.textContent = fmtSigned(aTotal);
    if (bsLET) bsLET.textContent = fmtSigned(leTotal);

    const ts = entries.map((e) => new Date(e.savedAt || 0).getTime()).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => b - a)[0];
    if (up) up.textContent = ts
      ? `更新日時 ${new Date(ts).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`
      : "更新日時 -";

    if (st) st.textContent = `ステータス: 自動集計（仕訳 ${entries.length} 件反映）`;
    if (note) {
      if (!entries.length) note.textContent = "仕訳データ未登録のため0表示です。仕訳入力画面で登録してください。";
      else if (Math.abs(diff) <= 1) note.textContent = "登録済み仕訳を反映済みです。資産合計と負債純資産合計は一致しています。";
      else note.textContent = `登録済み仕訳を反映しました。資産と負債純資産の差額 ${fmt(Math.abs(diff))} を確認してください。`;
    }
  }
})();
