// gddk.js - Quản lý giao dịch định kỳ (client-side localStorage)
(function () {
  const RECUR_KEY_PREFIX = "smartwallet_recurring_";
  const TX_KEY_PREFIX = "smartwallet_transactions_";

  const DEFAULT_CATEGORIES = {
    expense: [
      { category_id: 6, name: "Ăn uống" },
      { category_id: 8, name: "Di chuyển" },
      { category_id: 9, name: "Mua sắm" },
      { category_id: 11, name: "Giải trí" },
      { category_id: 7, name: "Tiền nhà/Phòng" },
    ],
    income: [
      { category_id: 1, name: "Lương" },
      { category_id: 2, name: "Thưởng" },
    ],
  };

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getUserId() {
    let userId = localStorage.getItem("user_id");
    if (!userId) {
      userId = "demo_" + generateId();
      localStorage.setItem("user_id", userId);
      localStorage.setItem("user_name", "Người dùng Demo");
    }
    return userId;
  }

  function getRecurringKey(userId) {
    return RECUR_KEY_PREFIX + userId;
  }

  function getTransactionsKey(userId) {
    return TX_KEY_PREFIX + userId;
  }

  function loadRecurring(userId) {
    const raw = localStorage.getItem(getRecurringKey(userId));
    return raw ? JSON.parse(raw) : [];
  }

  function saveRecurring(userId, arr) {
    localStorage.setItem(getRecurringKey(userId), JSON.stringify(arr));
  }

  function getTransactions(userId) {
    const raw = localStorage.getItem(getTransactionsKey(userId));
    return raw ? JSON.parse(raw) : [];
  }

  function saveTransactions(userId, arr) {
    localStorage.setItem(getTransactionsKey(userId), JSON.stringify(arr));
  }

  async function addTransactionToStorage(userId, tx) {
    // Try to POST to API first (same behaviour as dashboard.js)
    const API_BASE_URL = "http://127.0.0.1:5000/api";
    let savedToApi = false;
    try {
      const resp = await fetch(`${API_BASE_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx),
        signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
      });
      if (resp.ok) savedToApi = true;
    } catch (e) {
      savedToApi = false;
    }

    if (!savedToApi) {
      const transactions = getTransactions(userId);
      tx.transaction_id = generateId();
      tx.created_at = new Date().toISOString();
      transactions.unshift(tx);
      saveTransactions(userId, transactions);
      return tx;
    }
    return tx;
  }

  // Date helpers
  function addInterval(date, freq, interval) {
    const d = new Date(date);
    interval = Number(interval) || 1;
    if (freq === "daily") d.setDate(d.getDate() + interval);
    else if (freq === "weekly") d.setDate(d.getDate() + 7 * interval);
    else if (freq === "monthly") d.setMonth(d.getMonth() + interval);
    else if (freq === "yearly") d.setFullYear(d.getFullYear() + interval);
    return d;
  }

  function formatDateISO(d) {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function renderCategoryOptions(type) {
    const sel = document.getElementById("recCategory");
    sel.innerHTML = "";
    const cats = DEFAULT_CATEGORIES[type] || [];
    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.category_id;
      opt.textContent = c.name;
      opt.dataset.name = c.name;
      sel.appendChild(opt);
    });
  }

  function renderRecurringList() {
    const userId = getUserId();
    const list = loadRecurring(userId);
    const tbody = document.getElementById("recList");
    tbody.innerHTML = "";
    list.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.type === "income" ? "Thu" : "Chi"}</td>
        <td>${Number(r.amount).toLocaleString()}đ</td>
        <td>${r.category_name || "-"}</td>
        <td>${r.frequency}${r.interval && r.interval>1?" x"+r.interval:""}</td>
        <td>${r.start_date}</td>
        <td>${r.end_date||"-"}</td>
        <td>
          <button class="btnApply" data-id="${r.id}">Áp dụng</button>
          <button class="btnDelete" data-id="${r.id}">Xóa</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // actions
    document.querySelectorAll(".btnDelete").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.id;
        const userId = getUserId();
        let arr = loadRecurring(userId);
        arr = arr.filter((x) => x.id !== id);
        saveRecurring(userId, arr);
        renderRecurringList();
      };
    });

    document.querySelectorAll(".btnApply").forEach((b) => {
      b.onclick = async () => {
        const id = b.dataset.id;
        await processOneRecurring(id);
        alert("Đã áp dụng những lần đến hôm nay.");
        renderRecurringList();
      };
    });
  }

  async function processOneRecurring(id) {
    const userId = getUserId();
    let arr = loadRecurring(userId);
    const rule = arr.find((r) => r.id === id);
    if (!rule) return;
    const created = createOccurrencesForRule(userId, rule);
    if (created.lastRun) {
      rule.last_run = created.lastRun;
      saveRecurring(userId, arr);
    }
  }

  // Process all recurring rules up to today
  function processDueRecurrences() {
    const userId = getUserId();
    const rules = loadRecurring(userId);
    let updated = false;
    rules.forEach((r) => {
      const res = createOccurrencesForRule(userId, r);
      if (res.createdCount > 0) {
        r.last_run = res.lastRun;
        updated = true;
      }
    });
    if (updated) saveRecurring(userId, rules);
    return rules.length;
  }

  // Create transaction occurrences for a single rule up to today
  function createOccurrencesForRule(userId, rule) {
    const today = new Date();
    let last = rule.last_run ? new Date(rule.last_run) : null;
    let next = last ? addInterval(last, rule.frequency, rule.interval || 1) : new Date(rule.start_date);
    let createdCount = 0;
    let lastCreated = null;

    while (next <= today) {
      // stop if end_date set and next > end_date
      if (rule.end_date) {
        const end = new Date(rule.end_date);
        if (next > end) break;
      }

      // create transaction for 'next'
      const tx = {
        user_id: userId,
        type: rule.type,
        amount: Number(rule.amount),
        category_id: rule.category_id,
        category_name: rule.category_name,
        transaction_date: formatDateISO(next),
        description: rule.description || rule.category_name || "Giao dịch định kỳ",
      };
      addTransactionToStorage(userId, tx);
      createdCount++;
      lastCreated = new Date(next);

      // advance
      next = addInterval(next, rule.frequency, rule.interval || 1);
    }

    return { createdCount, lastRun: lastCreated ? formatDateISO(lastCreated) : rule.last_run };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const userId = getUserId();
    // default UI
    renderCategoryOptions("expense");

    const tabExpense = document.getElementById("tabExpense");
    const tabIncome = document.getElementById("tabIncome");

    tabExpense.onclick = () => {
      tabExpense.classList.add("active");
      tabIncome.classList.remove("active");
      renderCategoryOptions("expense");
    };
    tabIncome.onclick = () => {
      tabIncome.classList.add("active");
      tabExpense.classList.remove("active");
      renderCategoryOptions("income");
    };

    // Set start date default
    const startInput = document.getElementById("recStartDate");
    startInput.valueAsDate = new Date();

    // load list
    renderRecurringList();

    // form handler
    const form = document.getElementById("recurringForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const type = document.querySelector(".tab-btn.active").dataset.type || "expense";
      const amount = Number(document.getElementById("recAmount").value);
      const categoryId = document.getElementById("recCategory").value;
      const categoryName = document.getElementById("recCategory").selectedOptions[0].dataset.name || "Khác";
      const start_date = document.getElementById("recStartDate").value;
      const frequency = document.getElementById("recFrequency").value;
      const interval = Number(document.getElementById("recInterval").value) || 1;
      const end_date = document.getElementById("recEndDate").value || null;
      const description = document.getElementById("recDescription").value || categoryName;
      const msg = document.getElementById("recMessage");

      if (!amount || amount <= 0) {
        msg.textContent = "❌ Số tiền không hợp lệ"; msg.style.color = "red"; return;
      }
      if (!categoryId) {
        msg.textContent = "❌ Vui lòng chọn danh mục"; msg.style.color = "red"; return;
      }

      const rule = {
        id: generateId(),
        user_id: userId,
        type,
        amount,
        category_id: categoryId,
        category_name: categoryName,
        start_date,
        frequency,
        interval,
        end_date,
        description,
        last_run: null,
      };

      const arr = loadRecurring(userId);
      arr.push(rule);
      saveRecurring(userId, arr);

      msg.textContent = "✅ Đã lưu giao dịch định kỳ"; msg.style.color = "green";
      setTimeout(() => (msg.textContent = ""), 3000);

      form.reset();
      startInput.valueAsDate = new Date();
      renderCategoryOptions("expense");
      renderRecurringList();
    });

    document.getElementById("runNow").onclick = () => {
      const count = processDueRecurrences();
      alert("Đã xử lý giao dịch định kỳ. Số mẫu đã có: " + count);
      renderRecurringList();
    };

    // Auto-run once on load to ensure past-due recurrences are applied when user visits this page
    processDueRecurrences();
  });
})();
