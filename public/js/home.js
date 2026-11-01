
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const resultsHeading = document.getElementById("resultsHeading");

let allDocuments = [];

async function fetchDocuments(query = "") {
  try {
    searchResults.innerHTML = "<p>Loading documents...</p>";

    const url = query.trim()
      ? `/api/pdfs/search?q=${encodeURIComponent(query.trim())}`
      : `/api/pdfs/search`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to fetch documents");
    }

    allDocuments = data.pdfs || [];

    resultsHeading.textContent = query.trim()
      ? `Search Results (${allDocuments.length})`
      : `All Documents (${allDocuments.length})`;

    displayDocuments(allDocuments);

  } catch (error) {
    console.error("PDF Fetch Error:", error);

    searchResults.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load documents</h3>
        <p>Please check your connection and try again.</p>
      </div>
    `;
  }
}

function displayDocuments(documents) {
  if (!documents.length) {
    searchResults.innerHTML = `
      <div class="empty-state">
        <h3>No documents found</h3>
        <p>Try another search or check back later.</p>
      </div>
    `;
    return;
  }

  searchResults.innerHTML = documents.map(pdf => `
    <article class="pdf-card">
      <div class="pdf-icon">PDF</div>

      <div class="pdf-card-content">
        <h3>${escapeHTML(pdf.title || "Untitled Document")}</h3>

        <p>${escapeHTML(
          pdf.description || "No description available."
        )}</p>

        <div class="pdf-meta">
          <span>PDF Document</span>
          <span>${formatDate(pdf.createdAt)}</span>
        </div>

        <button
          type="button"
          class="view-pdf-btn"
          data-id="${escapeHTML(pdf._id)}"
        >
          View Document
        </button>
      </div>
    </article>
  `).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(date) {
  if (!date) return "Recently uploaded";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently uploaded";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Open password-protected PDF page
searchResults.addEventListener("click", event => {
  const button = event.target.closest(".view-pdf-btn");

  if (!button) return;

  const pdfId = button.dataset.id;

  if (pdfId) {
    window.location.href = `/pdf/${encodeURIComponent(pdfId)}`;
  }
});

// Search documents
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  fetchDocuments(searchInput.value);
});

// Automatically fetch all PDFs when page opens
document.addEventListener("DOMContentLoaded", () => {
  fetchDocuments();
});
