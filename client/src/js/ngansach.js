const DUONG_DAN_API = "http://127.0.0.1:5000/api/ngansach";

// 1. CHẠY KHI VỪA MỞ TRANG WEB
window.onload = function () {
  // Tự động điền tháng hiện tại (Ví dụ: 08)
  const oChonThang = document.getElementById("chonThang");
  if (oChonThang) {
    oChonThang.value = String(new Date().getMonth() + 1).padStart(2, "0");
  }
  taiDanhSach();
};

// 2. TẢI DANH SÁCH
async function taiDanhSach() {
  try {
    const phanHoi = await fetch(DUONG_DAN_API + "/list");
    const ketQua = await phanHoi.json();
    if (ketQua.status === "success") {
      hienThiBang(ketQua.data);
    }
  } catch (loi) {
    console.error("Lỗi:", loi);
  }
}

// 3. VẼ BẢNG (Logic mới: Hiển thị trực tiếp, không cắt gọt gì cả)
function hienThiBang(danhSach) {
  const html = danhSach
    .map((muc) => {
      const soTien = parseInt(muc.amount).toLocaleString("vi-VN") + " ₫";

      const hienThiCanhBao =
        muc.alert_threshold > 0
          ? '<span style="color:green; font-weight:bold">🔔 Đã bật</span>'
          : '<span style="color:gray">Tắt</span>';

      // LOGIC MỚI: Database lưu "01" -> Hiển thị "Tháng 01" luôn
      // (Không cần split hay cắt chuỗi nữa vì không có năm)
      const hienThiThang = muc.month ? `Tháng ${muc.month}` : "---";

      return `
            <tr>
                <td><b>${hienThiThang}</b></td>
                <td>${muc.name}</td>
                <td>${soTien}</td>
                <td>${hienThiCanhBao}</td>
            </tr>`;
    })
    .join("");

  const bang = document.getElementById("bangHienThi");
  if (bang) bang.innerHTML = html;
}

// 4. LƯU NGÂN SÁCH (Logic mới: BỎ HẲN NĂM)
async function luuNganSach() {
  const soTienNhap = document.getElementById("nhapSoTien").value;
  // Lấy thẳng giá trị "01", "02"... từ ô chọn
  const thangChiTiet = document.getElementById("chonThang").value;

  if (!soTienNhap) {
    alert("⚠️ Vui lòng nhập số tiền!");
    return;
  }

  // LOGIC MỚI: Không ghép năm nữa. Gửi thẳng "01" đi.
  const duLieuGuiDi = {
    danh_muc_id: document.getElementById("chonDanhMuc").value,
    so_tien: soTienNhap,
    thang_ap_dung: thangChiTiet, // Chỉ gửi "01", "02"...
    bat_canh_bao: document.getElementById("batCanhBao").checked,
  };

  try {
    const phanHoi = await fetch(DUONG_DAN_API + "/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duLieuGuiDi),
    });

    const ketQua = await phanHoi.json();

    if (ketQua.status === "success") {
      alert("✅ " + ketQua.message);
      taiDanhSach();
    } else {
      alert("❌ Lỗi: " + ketQua.message);
    }
  } catch (loi) {
    alert("❌ Lỗi kết nối Server!");
  }
}
