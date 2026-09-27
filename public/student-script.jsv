document.addEventListener('DOMContentLoaded', () => {
    const gradeLevelSelect = document.getElementById('gradeLevel');
    const schoolSelect = document.getElementById('schoolPlacement');
    const subjectsBox = document.getElementById('student-subjects-box');
    const studentForm = document.getElementById('studentRegisterForm');

    if (gradeLevelSelect) {
        gradeLevelSelect.addEventListener('change', async function() {
            const selectedLevel = this.value;

            if (!selectedLevel) {
                schoolSelect.innerHTML = '<option value="">-- Select Grade Level First --</option>';
                schoolSelect.disabled = true;
                subjectsBox.innerHTML = '<span style="color: #777;">Select grade level first</span>';
                return;
            }

            try {
                // 1. Fetch Schools based on level
                const schoolRes = await fetch(`/api/schools?level=${encodeURIComponent(selectedLevel)}`);
                const schools = await schoolRes.json();
                
                schoolSelect.innerHTML = '<option value="">-- Select School --</option>';
                schools.forEach(school => {
                    schoolSelect.innerHTML += `<option value="${school.name}">${school.name}</option>`;
                });
                schoolSelect.disabled = false;

                // 2. Fetch Subjects based on level
                const subjectRes = await fetch(`/api/subjects?level=${encodeURIComponent(selectedLevel)}`);
                const subjects = await subjectRes.json();
                
                let subjectHtml = '';
                if (subjects.length === 0) {
                    subjectHtml = '<p>No subjects found for this level.</p>';
                } else {
                    subjects.forEach(sub => {
                        subjectHtml += `<label style="display: block; margin-bottom: 5px;"><input type="checkbox" name="subjects" value="${sub.name}"> ${sub.name}</label>`;
                    });
                }
                subjectsBox.innerHTML = subjectHtml;

            } catch (err) {
                console.error('Error fetching student registration fields:', err);
            }
        });
    }

    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(studentForm);
            const data = Object.fromEntries(formData.entries());

            // Grab selected subjects
            const selectedSubjects = [];
            document.querySelectorAll('input[name="subjects"]:checked').forEach(cb => {
                selectedSubjects.push(cb.value);
            });
            data.subjects = selectedSubjects;

            try {
                const response = await fetch('/api/student-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Student registered successfully!');
                    window.location.href = '/login.html';
                } else {
                    alert('Registration failed: ' + (result.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('Submission error:', err);
                alert('Network error while registering student.');
            }
        });
    }
});