// dashboard.js

async function updateNotificationCount() {
  try {
    // Gọi đúng API lấy danh sách
    const response = await fetch("http://127.0.0.1:5000/api/transaction/list");

    if (response.ok) {
      const transactions = await response.json();

      // 1. Đếm số lượng
      const count = transactions.length;

      // 2. Cập nhật Badge
      const badge = document.querySelector(".badge");
      if (badge) {
        badge.innerText = count;

        if (count > 0) {
          badge.style.backgroundColor = "#e74c3c"; // Đỏ
          badge.style.color = "white";
        } else {
          badge.style.backgroundColor = "#e0e0e0"; // Xám nếu không có gì
          badge.style.color = "#333";
        }
      }
    }
  } catch (error) {
    console.error("Lỗi tải thông báo:", error);
  }
}

// Chạy khi tải trang
document.addEventListener("DOMContentLoaded", updateNotificationCount);
