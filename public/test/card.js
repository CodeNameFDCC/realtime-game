const containers = document.querySelectorAll(".container");

containers.forEach((container) => {
  const overlay = container.querySelector(".overlay");
  overlay.style.filter = "opacity(0)";

  container.addEventListener("mousemove", function (e) {
    const x = e.offsetX;
    const y = e.offsetY;
    const rotateY = (-1 / 5) * x + 20;
    const rotateX = (4 / 30) * y - 20;

    overlay.style.backgroundPosition = `${x / 5 + y / 5}%`;
    overlay.style.filter = "opacity(1)";
    container.style.transform = `perspective(350px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  container.addEventListener("mouseout", function () {
    overlay.style.filter = "opacity(0)";
    container.style.transform =
      "perspective(350px) rotateY(0deg) rotateX(0deg)";
  });
});
