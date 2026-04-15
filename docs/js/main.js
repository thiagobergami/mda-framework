// Sidebar toggle for mobile
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });

    // Close sidebar when clicking a link (mobile)
    sidebar.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 960) {
          sidebar.classList.remove("open");
        }
      });
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener("click", (e) => {
      if (
        window.innerWidth <= 960 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        sidebar.classList.remove("open");
      }
    });
  }

  // Collapsible nav groups
  document.querySelectorAll(".nav-group-title").forEach((title) => {
    title.addEventListener("click", () => {
      title.parentElement.classList.toggle("collapsed");
    });
  });

  // Mark active page in sidebar
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-items a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("active");
      // Ensure parent group is expanded
      const group = link.closest(".nav-group");
      if (group) group.classList.remove("collapsed");
    }
  });
});
