
const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");
const uploadBtn = document.getElementById("uploadBtn");
const pdfList = document.getElementById("pdfList");

async function checkAdmin() {
  try {
    const response = await fetch("/api/auth/profile");

    if (!response.ok) {
      window.location.href = "/admin/login";
      return false;
    }

    const data = await response.json();

    document.getElementById("adminName").textContent =
      data.admin.name;

    return true;
  } catch (error) {
    window.location.href = "/admin/login";
    return false;
  }
}

async function loadPdfs() {
  pdfList.innerHTML = "<p>Loading documents...</p>";

  try {
    const response = await fetch("/api/pdfs/admin");
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      throw new Error(data.message || "Unable to load documents");
    }

    const pdfs = data.pdfs || [];

    if (!pdfs.length) {
      pdfList.innerHTML = `
        <div class="empty-state">
          <h3>No documents uploaded yet</h3>
          <p>Upload your first PDF to manage it here.</p>
        </div>
      `;
      return;
    }

    pdfList.innerHTML = pdfs.map(pdf => `
      <article class="pdf-card">
        <div class="pdf-icon">PDF</div>

        <h3>${escapeHTML(pdf.title || "Untitled Document")}</h3>

        <p>${escapeHTML(pdf.description || "No description available")}</p>

        <small>
          Uploaded: ${formatDate(pdf.createdAt)}
        </small>

        <div class="pdf-admin-actions">
          <button
            type="button"
            class="view-btn"
            data-action="view"
            data-id="${escapeHTML(pdf._id)}"
          >
            View PDF
          </button>

          <button
            type="button"
            class="password-btn"
            data-action="password"
            data-id="${escapeHTML(pdf._id)}"
          >
            Update Password
          </button>

          <button
            type="button"
            class="delete-btn"
            data-action="delete"
            data-id="${escapeHTML(pdf._id)}"
            data-title="${escapeHTML(pdf.title || "this document")}"
          >
            Delete
          </button>
        </div>
      </article>
    `).join("");

  } catch (error) {
    pdfList.innerHTML = `
      <p class="error">${escapeHTML(error.message)}</p>
    `;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(date) {
  if (!date) return "Recently uploaded";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently uploaded";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Upload PDF
uploadForm.addEventListener("submit", async event => {
  event.preventDefault();

  const formData = new FormData(uploadForm);

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";
  uploadMessage.textContent = "";

  try {
    const response = await fetch("/api/pdfs/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    uploadMessage.textContent =
      data.message || "PDF uploaded successfully.";

    uploadMessage.className = "message success";

    uploadForm.reset();
    await loadPdfs();

  } catch (error) {
    uploadMessage.textContent = error.message;
    uploadMessage.className = "message error";
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload Document";
  }
});

// Document actions
pdfList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;

  if (!id) return;

  if (action === "view") {
    window.open(
      `/api/pdfs/${encodeURIComponent(id)}/admin-view`,
      "_blank",
      "noopener"
    );
    return;
  }

  if (action === "password") {
    await updatePdfPassword(id, button);
    return;
  }

  if (action === "delete") {
    await deletePdf(id, button.dataset.title || "this document");
  }
});

// Update PDF password
async function updatePdfPassword(id, button) {
  const newPassword = prompt(
    "Enter the new PDF access password (minimum 6 characters):"
  );

  if (newPassword === null) return;

  if (newPassword.trim().length < 6) {
    alert("Password must contain at least 6 characters.");
    return;
  }

  button.disabled = true;

  try {
    const response = await fetch(
      `/api/pdfs/${encodeURIComponent(id)}/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: newPassword
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Password update failed");
    }

    alert(data.message || "PDF password updated successfully.");

  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

// Delete PDF
async function deletePdf(id, title) {
  const confirmed = confirm(
    `Are you sure you want to delete "${title}"?\n\nThis will permanently delete the PDF file and its record.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `/api/pdfs/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Delete failed");
    }

    alert(data.message || "PDF deleted successfully.");

    await loadPdfs();

  } catch (error) {
    alert(error.message);
  }
}

// Refresh
document.getElementById("refreshBtn").addEventListener("click", loadPdfs);

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Logout failed");
    }

    window.location.href = "/admin/login";

  } catch (error) {
    alert("Unable to logout. Please try again.");
  }
});

// Initial load
(async function initializeDashboard() {
  const isAdmin = await checkAdmin();

  if (isAdmin) {
    await loadPdfs();
  }
})();
