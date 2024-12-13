function invisableButton() {
  const loginSession = sessionStorage.getItem("userName");
  if (loginSession) {
    document.getElementById("login-Btn").style.display = "none";
  }
  if (!loginSession) {
    document.getElementById("nav").style.display = "none";
    document.getElementById("logout-Btn").style.display = "none";
  }
}
invisableButton();
