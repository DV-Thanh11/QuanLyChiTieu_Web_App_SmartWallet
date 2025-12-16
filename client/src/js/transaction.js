document.addEventListener("DOMContentLoaded", function () {
  // === 1. CẤU HÌNH DANH SÁCH ===
  const categories = {
    expense: [
      "Ăn uống",
      "Học tập",
      "Vui chơi",
      "Quần áo",
      "Cưới vợ",
      "Di chuyển",
      "Tiền nhà",
      "Khác",
    ],
    income: ["Lương", "Thưởng", "Lãi tiết kiệm", "Được tặng", "Khác"],
  };

  let currentType = "expense";

  // === 2. LẤY THẺ HTML ===
  const expenseTab = document.getElementById("expense-tab");
  const incomeTab = document.getElementById("income-tab");
  const categorySelect = document.getElementById("transactionCategory");
  const form = document.getElementById("transactionForm");
  const dateInput = document.getElementById("transactionDate");
  const btnSubmit = document.getElementById("btnSubmit");

  // === 3. HÀM XỬ LÝ ===
  function loadCategories(type) {
    categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
    if (categories[type]) {
      categories[type].forEach((catName) => {
        const option = document.createElement("option");
        option.value = catName;
        option.textContent = catName;
        categorySelect.appendChild(option);
      });
    }
  }

  function setToday() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  function switchTab(type) {
    currentType = type;
    if (type === "expense") {
      expenseTab.classList.add("active");
      incomeTab.classList.remove("active");
      document.body.classList.remove("mode-income");
      if (btnSubmit) btnSubmit.innerText = "Lưu khoản Chi";
    } else {
      incomeTab.classList.add("active");
      expenseTab.classList.remove("active");
      document.body.classList.add("mode-income");
      if (btnSubmit) btnSubmit.innerText = "Lưu khoản Thu";
    }
    loadCategories(type);
  }

  // === 4. SỰ KIỆN ===
  if (expenseTab)
    expenseTab.addEventListener("click", () => switchTab("expense"));
  if (incomeTab) incomeTab.addEventListener("click", () => switchTab("income"));

  // SỰ KIỆN SUBMIT FORM (Đã sửa lỗi cú pháp tại đây)
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const amount = document.getElementById("transactionAmount").value;
      const category = categorySelect.value;
      const date = dateInput.value;
      const note = document.getElementById("transactionDescription").value;

      if (!amount || amount <= 0) {
        alert("Vui lòng nhập số tiền hợp lệ!");
        return;
      }
      if (!category) {
        alert("Vui lòng chọn danh mục!");
        return;
      }

      const formData = {
        amount: amount,
        category: category,
        transaction_date: date,
        description: note,
        type: currentType,
      };

      try {
        // LƯU Ý: Dùng đường dẫn đầy đủ http://127.0.0.1:5000
        const response = await fetch(
          "http://127.0.0.1:5000/api/transaction/add",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );

        if (response.ok) {
          alert("✅ Đã lưu thành công!");

          // Reset form
          document.getElementById("transactionAmount").value = "";
          document.getElementById("transactionDescription").value = "";
          categorySelect.value = "";
          setToday();

          // --- GỌI HÀM CẬP NHẬT SỐ THÔNG BÁO ---
          if (typeof updateNotificationCount === "function") {
            updateNotificationCount();
          } else {
            console.warn(
              "Không tìm thấy hàm updateNotificationCount, reload trang..."
            );
            window.location.reload();
          }
        } else {
          const result = await response.json();
          alert("❌ Lỗi: " + (result.message || "Lỗi khi lưu dữ liệu!"));
        }
      } catch (error) {
        console.error(error);
        alert("⚠️ Lỗi kết nối Server! (Hãy kiểm tra Python app.py)");
      }
    });
  }

  // === 5. KHỞI TẠO ===
  loadCategories("expense");
  setToday();
});
