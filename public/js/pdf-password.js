const pdfId = window.location.pathname.split("/").pop();

const form = document.getElementById("pdfPasswordForm");
const message = document.getElementById("passwordMessage");
const button = document.getElementById("verifyBtn");

async function loadPdfDetails() {
  try {
    const response = await fetch(`/api/pdfs/${pdfId}/public-details`);
    const data = await response.json();

    if (response.ok) {
      document.getElementById("pdfTitle").textContent =
        data.pdf.title;
    }
  } catch (error) {
    console.error(error);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("pdfPassword").value;

  button.disabled = true;
  button.textContent = "Verifying...";
  message.textContent = "";

  try {
    const response = await fetch(
      `/api/pdfs/${pdfId}/verify-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    window.location.href = data.redirectUrl;

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";
  } finally {
    button.disabled = false;
    button.textContent = "Unlock PDF";
  }
});

loadPdfDetails();