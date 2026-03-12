// Filter Gallery Items
const filterContainer = document.querySelector(".filter-buttons");
const filterButtons = filterContainer.querySelectorAll("button");
const galleryItems = document.querySelectorAll(".gallery-item");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons
    filterButtons.forEach((btn) => btn.classList.remove("primary-button"));

    // Add active class to the clicked button
    button.classList.add("primary-button");

    // Get the filter value from the button's data-filter attribute
    const filter = button.getAttribute("data-filter");

    // Show or hide gallery items based on the filter
    galleryItems.forEach((item) => {
      if (filter === "all" || item.classList.contains(filter)) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  });
});

// Modal Functionality
function openModal(imageSrc, title, size, medium, description, url = "") {
  const modal = document.getElementById("imageModal");
  const modalBackground = document.querySelector(".modal");
  const modalImage = document.getElementById("modalImage");
  const modalBlur = document.getElementById("modalBlur");
  const modalButton = document.getElementById("modalButton");
  const modalTitle = document.getElementById("modalTitle");
  const modalSize = document.getElementById("modalSize");
  const modalMedium = document.getElementById("modalMedium");
  const modalDescription = document.getElementById("modalDescription");
  const modalUrl = document.getElementById("modalUrl");
  const close = document.querySelector(".close");
  const modalContent = document.querySelector(".modal-content");

  modalImage.src = imageSrc;
  modalBlur.src = imageSrc;
  modalButton.href = imageSrc;
  modalTitle.textContent = title;
  modalSize.textContent = size;
  modalMedium.textContent = medium;
  modalDescription.textContent = description;

  if (url) {
    modalUrl.href = url;
    modalUrl.style.display = "block";
  } else {
    modalUrl.style.display = "none";
  }

  document.body.classList.add("no-scroll");

  modal.style.display = "flex";
  setTimeout(() => {
    modalContent.classList.add("show");
    modalBackground.classList.add("show");
    close.classList.add("show");
  }, 10);
}

function closeModal() {
  const modal = document.getElementById("imageModal");
  const modalContent = document.querySelector(".modal-content");
  const modalBackground = document.querySelector(".modal");
  const close = document.querySelector(".close");

  modalContent.classList.remove("show");
  modalBackground.classList.remove("show");
  close.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
    // Remove modal-open class from body
    document.body.classList.remove("no-scroll");
  }, 500);
}

// Close modal when clicking outside the modal content
window.onclick = function (event) {
  const modal = document.getElementById("imageModal");
  const modalContent = document.querySelector(".modal-content");
  const modalBackground = document.querySelector(".modal");
  const close = document.querySelector(".close");

  if (event.target === modal) {
    modalContent.classList.remove("show");
    modalBackground.classList.remove("show");
    close.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      // Remove modal-open class from body
      document.body.classList.remove("no-scroll");
    }, 500);
  }
};
// Theme Toggle Script
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Check for saved theme in localStorage
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  body.classList.add(savedTheme);
  themeToggle.checked = savedTheme === "dark-mode";
}

// Toggle theme on switch click
themeToggle.addEventListener("change", () => {
  if (themeToggle.checked) {
    body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark-mode");
  } else {
    body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light-mode");
  }
});

// Burger Menu Toggle
const burgerMenu = document.getElementById("burger-menu");
const nav = document.getElementById("nav");
const closeIcon = document.getElementById("close-icon");

// Add event listener to the burger menu
burgerMenu.addEventListener("click", () => {
  if (nav.classList.contains("active")) {
    // Close the menu
    nav.style.transition = "all 0.5s cubic-bezier(0.215, 0.61, 0.355, 1)";
    nav.classList.remove("active");
    closeIcon.classList.remove("active");

    // Enable scrolling
    body.classList.remove("no-scroll");

    // Wait for the transition to complete before hiding the menu
    setTimeout(() => {
      nav.style.transition = "none"; // Reset transition
    }, 500); // Match the transition duration (300ms)
  } else {
    // Open the menu
    nav.style.transition = "all 0.5s cubic-bezier(0.215, 0.61, 0.355, 1)";
    nav.classList.add("active");
    closeIcon.classList.add("active");

    // Disable scrolling
    body.classList.add("no-scroll");
  }
});

// Add event listener to the close icon
closeIcon.addEventListener("click", () => {
  // Close the menu
  nav.style.transition = "all 0.5s cubic-bezier(0.215, 0.61, 0.355, 1)";
  nav.classList.remove("active");

  // Enable scrolling
  body.classList.remove("no-scroll");

  // Wait for the transition to complete before hiding the menu
  setTimeout(() => {
    nav.style.transition = "none"; // Reset transition
  }, 500); // Match the transition duration (300ms)
});

// Add event listener to the document to close the menu on click outside
document.addEventListener("click", (e) => {
  if (
    nav.classList.contains("active") &&
    !nav.contains(e.target) &&
    !burgerMenu.contains(e.target)
  ) {
    // Close the menu
    nav.style.transition = "all 0.5s cubic-bezier(0.215, 0.61, 0.355, 1)";
    nav.classList.remove("active");

    // Enable scrolling
    body.classList.remove("no-scroll");

    // Wait for the transition to complete before hiding the menu
    setTimeout(() => {
      nav.style.transition = "none"; // Reset transition
    }, 500); // Match the transition duration (300ms)
  }
});
