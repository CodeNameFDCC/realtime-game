document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (response.ok) {

    const userName = result.username;
    const accessToken = result.accessToken;
    const refreshToken = result.refreshToken;
    sessionStorage.setItem("userName", userName);
    sessionStorage.setItem("accessToken", accessToken);
    sessionStorage.setItem("refreshToken", refreshToken);
    // 리프레쉬 특수한 방법 사용해야함
    console.log(result);
    alert("로그인 성공!" + response.json());
    window.location.href = "../index.html";
  } else {
    alert(result.message || "로그인 실패!");
  }
});
