// client/src/js/transaction.js
const API_BASE_URL = "http://127.0.0.1:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transactionForm");
  const amountInput = document.getElementById("transactionAmount");
  const descriptionInput = document.getElementById("transactionDescription");
  const dateInput = document.getElementById("transactionDate");
  const categorySelect = document.getElementById("transactionCategory");
  const messageDisplay = document.getElementById("transactionMessage");

  const expenseTab = document.getElementById("expense-tab");
  const incomeTab = document.getElementById("income-tab");

  // Khởi tạo loại giao dịch mặc định là 'expense'
  let currentType = "expense";

  // Hàm hiển thị thông báo
  function showMessage(msg, type) {
    messageDisplay.textContent = msg;
    messageDisplay.style.color = type === "error" ? "red" : "green";
  }

  // Hàm tải danh mục từ Backend
  async function loadCategories(type) {
    const response = await fetch(`${API_BASE_URL}/categories?type=${type}`);

    if (response.ok) {
      const result = await response.json();
      const categories = result.categories;

      // Xóa các tùy chọn cũ
      categorySelect.innerHTML =
        '<option value="">-- Chọn Danh mục --</option>';

      // Thêm các tùy chọn mới
      categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.category_id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
      });
      return true;
    } else {
      showMessage("Lỗi: Không tải được danh mục.", "error");
      categorySelect.innerHTML = '<option value="">Lỗi tải danh mục</option>';
      return false;
    }
  }

  // --- Xử lý Tabs ---
  function switchTab(type) {
    currentType = type;
    // 1. Cập nhật trạng thái Active của Tabs
    expenseTab.classList.remove("active");
    incomeTab.classList.remove("active");

    if (type === "expense") {
      expenseTab.classList.add("active");
    } else {
      incomeTab.classList.add("active");
    }
    loadCategories(type);

    // Cập nhật màu nút Submit dựa trên loại giao dịch
    const submitBtn = form.querySelector(".submit-btn");
    const isIncome = type === "income";

    submitBtn.textContent = `Ghi nhận ${isIncome ? "Thu nhập" : "Chi tiêu"}`;

    if (isIncome) {
      submitBtn.classList.remove("green-bg");
      submitBtn.classList.add("red-bg"); // Cần thêm style .red-bg trong CSS
    } else {
      // income
      submitBtn.classList.remove("red-bg");
      submitBtn.classList.add("green-bg");
    }
    showMessage("", null); // Xóa thông báo khi chuyển tab
    // TODO: Cần thêm logic tải lại danh mục theo type (sẽ làm ở US03)
  }

  expenseTab.addEventListener("click", () => switchTab("expense"));
  incomeTab.addEventListener("click", () => switchTab("income"));

  // Đặt ngày hiện tại làm mặc định
  dateInput.valueAsDate = new Date();

  // --- Xử lý Submit Form ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value;
    const transaction_date = dateInput.value;
    const category_id = categorySelect.value;

    // Lấy user_id từ localStorage (được lưu sau khi login thành công)
    const user_id = localStorage.getItem("user_id");

    if (!amount || amount <= 0) {
      showMessage("Lỗi: Số tiền không hợp lệ.", "error");
      return;
    }
    if (!category_id || category_id === "") {
    showMessage("Lỗi: Vui lòng chọn một danh mục.", "error");
    return;
    }
    // 1) Cập nhật ngay phần Tổng Thu / Tổng Chi / Số Dư theo số tiền người dùng nhập
    //    (hoạt động kể cả khi chưa có backend hoặc chưa đăng nhập)
    try {
      updateOverviewClientSide(currentType, amount);
    } catch (e) {
      console.warn("Không thể cập nhật overview client-side:", e);
    }

    // 2) Nếu không có user_id → chạy như chế độ "máy tính" chỉ tính trên giao diện, không gọi API
    if (!user_id) {
      showMessage(
        "Đã tính toán Thu/Chi/Số dư trên giao diện (chưa lưu vào hệ thống vì thiếu User ID).",
        "success"
      );
      form.reset();
      dateInput.valueAsDate = new Date();
      return;
    }

    showMessage("Đang ghi nhận giao dịch...", "success");

    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user_id,
          type: currentType,
          amount: amount,
          description: description,
          transaction_date: transaction_date,
          category_id: category_id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(`Ghi nhận ${currentType} thành công!`, "success");
        form.reset();
        dateInput.valueAsDate = new Date(); // Reset ngày về ngày hiện tại
        // Cập nhật giao diện: tổng số dư và notifications (dùng dữ liệu thật từ backend nếu có)
        try {
          await updateUIAfterChange(user_id);
          // Làm mới dashboard nếu hàm có sẵn (từ dashboard.js)
          if (typeof window.refreshDashboard === 'function') {
            await window.refreshDashboard(user_id);
          }
        } catch (uiErr) {
          console.error("Lỗi khi cập nhật UI sau khi tạo giao dịch:", uiErr);
        }
      } else {
        showMessage("Lỗi Server: " + result.message, "error");
      }
    } catch (error) {
      console.error("Lỗi kết nối API:", error);
      showMessage("Lỗi kết nối Server. Vui lòng kiểm tra Back-end.", "error");
    }
  });

  // Khởi tạo trạng thái tab ban đầu
  switchTab("expense");
});

// --- Public helper functions (không thay đổi giao diện) ---
// Các hàm này có thể được gọi từ UI hiện có hoặc console để thực thi chức năng
async function loadTransactionsForUser(user_id) {
  try {
    const resp = await fetch(`${API_BASE_URL}/transactions?user_id=${user_id}`);
    if (!resp.ok) {
      const r = await resp.json();
      console.error("Lỗi khi tải giao dịch:", r.message);
      return null;
    }
    const data = await resp.json();
    return data.transactions;
  } catch (err) {
    console.error("Lỗi kết nối khi tải giao dịch:", err);
    return null;
  }
}

// update badge count helper
function updateNotificationBadge(count) {
  const b = document.getElementById("notifBadge");
  if (!b) return;
  b.textContent = String(Number(count) || 0);
}

async function getBalanceForUser(user_id) {
  try {
    const resp = await fetch(`${API_BASE_URL}/balance?user_id=${user_id}`);
    if (!resp.ok) {
      const r = await resp.json();
      console.error("Lỗi khi lấy balance:", r.message);
      return null;
    }
    const data = await resp.json();
    return {
      balance: data.balance,
      income: data.income,
      expense: data.expense,
    };
  } catch (err) {
    console.error("Lỗi kết nối khi lấy balance:", err);
    return null;
  }
}

async function deleteTransactionById(tx_id) {
  try {
    const resp = await fetch(`${API_BASE_URL}/transactions/${tx_id}`, {
      method: "DELETE",
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Xóa thất bại:", data.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Lỗi khi xóa giao dịch:", err);
    return false;
  }
}

async function updateTransactionById(tx_id, payload) {
  try {
    const resp = await fetch(`${API_BASE_URL}/transactions/${tx_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Cập nhật thất bại:", data.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Lỗi khi cập nhật giao dịch:", err);
    return false;
  }
}

// --- UI update helpers ---
function formatCurrency(amount) {
  try {
    const abs = Math.abs(Number(amount) || 0);
    return new Intl.NumberFormat("vi-VN").format(abs) + "đ";
  } catch (e) {
    return (amount || 0) + "đ";
  }
}

function updateBalanceDisplay(balanceValue) {
  const el = document.getElementById("totalBalance");
  if (!el) return;
  const num = Number(balanceValue) || 0;
  const sign = num >= 0 ? "+" : "-";
  el.textContent = `${sign}${formatCurrency(num)}`;
}

function updateNotificationList(transactions) {
  const listEl = document.getElementById("notificationList");
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!Array.isArray(transactions) || transactions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Không có thông báo";
    listEl.appendChild(li);
    return;
  }

  const latest = transactions.slice(0, 5);
  latest.forEach((tx) => {
    const li = document.createElement("li");
    li.className = "notification-item";
    li.dataset.txId = tx.transaction_id || tx.id || "";

    // left: icon/label for income vs expense
    const typeSpan = document.createElement("span");
    typeSpan.className = "tx-type";
    if (tx.type === "income") {
      typeSpan.textContent = "Thu+";
      typeSpan.classList.add("tx-income");
    } else {
      typeSpan.textContent = "Chi-";
      typeSpan.classList.add("tx-expense");
    }

    // description and date
    const descSpan = document.createElement("span");
    descSpan.className = "tx-desc";
    const desc =
      tx.description || tx.category_name || tx.category || "Giao dịch";
    const date = tx.transaction_date ? ` (${tx.transaction_date})` : "";
    descSpan.textContent = `${desc}${date}`;

    // amount
    const amountSpan = document.createElement("span");
    amountSpan.className = "tx-amount";
    const amount = Number(tx.amount) || 0;
    const sign = tx.type === "income" || amount >= 0 ? "+" : "-";
    amountSpan.textContent = `${sign}${formatCurrency(amount)}`;

    // delete button
    const delBtn = document.createElement("button");
    delBtn.className = "tx-delete-btn";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = li.dataset.txId;
      if (!id) return;
      const ok = confirm("Xác nhận xóa giao dịch?");
      if (!ok) return;
      try {
        const okDel = await deleteTransactionById(id);
        if (okDel) {
          // refresh UI after deletion
          const uid = localStorage.getItem("user_id");
          if (uid) await updateUIAfterChange(uid);
        } else {
          alert("Xóa thất bại");
        }
      } catch (err) {
        console.error("Lỗi khi xóa giao dịch:", err);
        alert("Lỗi khi xóa giao dịch");
      }
    });

    // layout
    li.appendChild(typeSpan);
    li.appendChild(descSpan);
    li.appendChild(amountSpan);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  });
}

// --- CẬP NHẬT TỔNG THU / TỔNG CHI / SỐ DƯ Ở DASHBOARD (CLIENT-SIDE) ---
function parseCurrencyText(text) {
  if (!text) return 0;
  // Loại bỏ ký tự không phải số hoặc dấu trừ
  const cleaned = text
    .toString()
    .replace(/[^\d\-]/g, "")
    .trim();
  return Number(cleaned || 0);
}

function updateOverviewClientSide(type, amount) {
  const incomeEl = document.getElementById("totalIncome");
  const expenseEl = document.getElementById("totalExpense");
  const balanceEl = document.getElementById("mainBalance");

  if (!incomeEl || !expenseEl || !balanceEl) return;

  const currentIncome = parseCurrencyText(incomeEl.textContent);
  const currentExpense = parseCurrencyText(expenseEl.textContent);

  let newIncome = currentIncome;
  let newExpense = currentExpense;

  if (type === "income") {
    newIncome = currentIncome + Number(amount || 0);
  } else {
    newExpense = currentExpense + Number(amount || 0);
  }

  const newBalance = newIncome - newExpense;

  incomeEl.textContent = formatCurrency(newIncome);
  expenseEl.textContent = formatCurrency(newExpense);
  balanceEl.textContent = formatCurrency(newBalance);

  // Đổi màu số dư theo âm/dương
  if (newBalance >= 0) {
    balanceEl.style.color = "#27ae60";
  } else {
    balanceEl.style.color = "#e74c3c";
  }
}

async function updateUIAfterChange(user_id) {
  if (!user_id) return;
  const bal = await getBalanceForUser(user_id);
  if (bal && typeof bal.balance !== "undefined") {
    updateBalanceDisplay(bal.balance);
  }
  const txs = await loadTransactionsForUser(user_id);
  if (txs) {
    updateNotificationList(txs);
    updateNotificationBadge(txs.length);
  }
}

// Category manager removed (user uses default categories only)

// Gắn lên global để UI hiện có có thể gọi: e.g., window.loadTransactionsForUser(user_id)
window.loadTransactionsForUser = loadTransactionsForUser;
window.getBalanceForUser = getBalanceForUser;
window.deleteTransactionById = deleteTransactionById;
window.updateTransactionById = updateTransactionById;
window.updateBalanceDisplay = updateBalanceDisplay;
window.updateNotificationList = updateNotificationList;
window.updateUIAfterChange = updateUIAfterChange;

// On page load, try to populate balance and notifications for logged user
document.addEventListener("DOMContentLoaded", async () => {
  const uid = localStorage.getItem("user_id");
  if (uid) {
    try {
      await updateUIAfterChange(uid);
    } catch (err) {
      console.error("Lỗi khi khởi tạo UI:", err);
    }
  }
});
// ============================================================
// [BỔ SUNG MỚI] LOGIC ĐẾM SỐ GIAO DỊCH RIÊNG BIỆT
// ============================================================

// 1. Hàm gọi API đếm và cập nhật giao diện
async function updateTransactionCounter() {
  const user_id = localStorage.getItem("user_id");
  if (!user_id) return;

  try {
    // Gọi API đếm mới thêm ở backend
    const response = await fetch(
      `${API_BASE_URL}/transactions/count?user_id=${user_id}`
    );
    const data = await response.json();

    // Tìm thẻ hiển thị số (đã đặt id ở Bước 2)
    const badge = document.getElementById("transaction-count");

    if (badge && data.count !== undefined) {
      badge.textContent = data.count;

      // Hiệu ứng nhỏ: Nếu có dữ liệu thì đổi màu để gây chú ý
      if (data.count > 0) {
        badge.style.backgroundColor = "#ff4757"; // Màu đỏ
        badge.style.color = "white";
      } else {
        badge.style.backgroundColor = "#ccc"; // Màu xám nếu là 0
      }
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật số đếm:", error);
  }
}

// 2. Kích hoạt đếm ngay khi tải trang
document.addEventListener("DOMContentLoaded", () => {
  updateTransactionCounter();
});

// 3. "Móc" vào hàm submit cũ để cập nhật số ngay sau khi thêm
// (Chúng ta ghi đè nhẹ sự kiện submit để chèn thêm hàm updateTransactionCounter)
const originalForm = document.getElementById("transactionForm");
if (originalForm) {
  // Lắng nghe sự kiện submit, nhưng chạy ở pha sau cùng để đảm bảo data đã lưu
  originalForm.addEventListener("submit", async () => {
    // Đợi 1 chút để request chính (add transaction) hoàn thành rồi mới đếm lại
    setTimeout(() => {
      updateTransactionCounter();
    }, 800);
  });
}

// Gán vào window để các phần khác có thể gọi nếu cần
window.updateTransactionCounter = updateTransactionCounter;
