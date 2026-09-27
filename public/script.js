document.addEventListener("DOMContentLoaded", () => {
  const teachingLevelSelect = document.getElementById("teachingLevel");
  const schoolSelect = document.getElementById("schoolPlacement");
  const subjectsBox =
    document.getElementById("subjects-box") ||
    document.querySelector(".subjects-container");

  if (!teachingLevelSelect) return;

  teachingLevelSelect.addEventListener("change", async function () {
    const selectedLevel = this.value;

    // Reset fields if no valid level is selected
    if (!selectedLevel || selectedLevel.includes("Select")) {
      if (schoolSelect) {
        schoolSelect.innerHTML =
          '<option value="">-- Select Level First --</option>';
        schoolSelect.disabled = true;
      }
      if (subjectsBox) {
        subjectsBox.innerHTML =
          '<span style="color: red;">Select teaching level first</span>';
      }
      return;
    }

    try {
      // 1. Fetch Schools based on level
      if (schoolSelect) {
        const schoolRes = await fetch(
          `/api/schools?level=${encodeURIComponent(selectedLevel)}`,
        );
        const schools = await schoolRes.json();

        schoolSelect.innerHTML =
          '<option value="">-- Select School Placement --</option>';
        schools.forEach((school) => {
          schoolSelect.innerHTML += `<option value="${school.name}">${school.name}</option>`;
        });
        schoolSelect.disabled = false;
      }

      // 2. Fetch Subjects based on level
      if (subjectsBox) {
        const subjectRes = await fetch(
          `/api/subjects?level=${encodeURIComponent(selectedLevel)}`,
        );
        const subjects = await subjectRes.json();

        let subjectHtml = "";
        if (subjects.length === 0) {
          subjectHtml = "<p>No subjects found for this level.</p>";
        } else {
          subjects.forEach((sub) => {
            subjectHtml += `<label style="display: block; margin-bottom: 5px;"><input type="checkbox" name="subjects" value="${sub.name}"> ${sub.name}</label>`;
          });
        }
        subjectsBox.innerHTML = subjectHtml;
      }
    } catch (err) {
      console.error("Error loading dynamic dropdown data:", err);
    }
  });
});
// Handle Teacher/Staff Registration Submission
const registerForm =
  document.getElementById("registerForm") || document.querySelector("form");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Stop standard form refresh

    // Gather form data
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());

    // Handle checkboxes for subjects if multiple are selected
    const selectedSubjects = [];
    document
      .querySelectorAll('input[name="subjects"]:checked')
      .forEach((cb) => {
        selectedSubjects.push(cb.value);
      });
    data.subjects = selectedSubjects;

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Staff account registered successfully!");
        window.location.href = "/login.html"; // Redirect to login page or dashboard
      } else {
        alert("Registration failed: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error submitting registration:", err);
      alert("Network error. Please try again.");
    }
  });
}
