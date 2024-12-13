function logout() {
  // 로그아웃 API 호출
  const reToken = window.sessionStorage.getItem("refreshToken");
  const accessToken = window.sessionStorage.getItem("accessToken");
  alert(reToken);
  fetch("/logout", {
    method: "DELETE",
    headers: {
      // headers 객체 내에 포함
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`, // 대문자로 'Authorization' 사용
    },
    body: JSON.stringify({ refreshToken: reToken }),
  })
    .then((response) => {
      if (response.ok) {
        // 로그아웃 성공 시 메인 페이지로 리다이렉트
        window.sessionStorage.setItem("userName", "");
        window.location.href = "../index.html";
      } else {
        alert("로그아웃에 실패했습니다. 다시 시도해주세요.");
      }
    })
    .catch((error) => {
      console.error("오류:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    });
}
