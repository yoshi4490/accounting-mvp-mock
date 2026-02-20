(() => {
  const K = {
    entries: "accounting_mock_journal_entries_v1",
    grades: "accounting_mock_journal_grades_v1",
    docReviews: "accounting_mock_document_reviews_v1",
    fixedAssets: "accounting_mock_fixed_assets_v1"
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
    btn.textContent = "メニュー";
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
