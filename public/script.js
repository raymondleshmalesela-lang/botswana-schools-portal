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
