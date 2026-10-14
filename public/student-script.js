document.addEventListener("DOMContentLoaded", () => {
  const schoolTypeSelect = document.getElementById("schoolTypeSelect"); // Element for Primary / Secondary selection
  const schoolSelect = document.getElementById("schoolSelect"); // The actual school dropdown

  if (schoolTypeSelect && schoolSelect) {
    schoolTypeSelect.addEventListener("change", async (e) => {
      const selectedType = e.target.value; // 'Primary' or 'Secondary'

      // Reset and disable if no level is chosen
      if (!selectedType) {
        schoolSelect.innerHTML =
          '<option value="">-- Select a School --</option>';
        schoolSelect.disabled = true;
        return;
      }

      try {
        // Fetch filtered schools from your Node/Express backend
        const response = await fetch(`/api/schools?type=${selectedType}`);
        const data = await response.json();

        if (data.success && data.schools.length > 0) {
          schoolSelect.innerHTML =
            '<option value="">-- Select a School --</option>';

          data.schools.forEach((school) => {
            const option = document.createElement("option");
            option.value = school.id;
            option.textContent = school.school_name;
            schoolSelect.appendChild(option);
          });

          // Activate / enable the dropdown
          schoolSelect.disabled = false;
        } else {
          schoolSelect.innerHTML =
            '<option value="">No schools available</option>';
          schoolSelect.disabled = true;
        }
      } catch (error) {
        console.error("Error fetching schools:", error);
        schoolSelect.innerHTML =
          '<option value="">Error loading schools</option>';
        schoolSelect.disabled = true;
      }
    });
  }
});
