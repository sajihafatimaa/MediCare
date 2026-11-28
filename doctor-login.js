(function () {
  const target = document.getElementById("additional-doctors");
  if (!target) return;

  const builtInNames = new Set([
    "dr. imran qureshi",
    "dr. farah siddiqui",
    "dr. bilal ahmed",
    "dr. sana malik",
  ]);
  let doctors;
  try {
    doctors = JSON.parse(localStorage.getItem("medicare_doctor_login_options") || "[]");
  } catch (_) {
    target.textContent = "Doctor list is unavailable. Please contact the administrator.";
    target.setAttribute("role", "alert");
    return;
  }

  const additions = Array.isArray(doctors)
    ? doctors.filter(doctor => doctor && doctor.username && doctor.full_name &&
      !builtInNames.has(doctor.full_name.trim().toLowerCase()))
    : [];
  additions.forEach(doctor => {
    const name = doctor.full_name.trim();
    const params = new URLSearchParams({
      username: doctor.username,
      name,
      specialization: doctor.specialization || "",
    });
    const link = document.createElement("a");
    link.className = "choice";
    link.href = `doctor-login-user.html?${params}`;

    const heading = document.createElement("b");
    heading.textContent = /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
    const specialty = document.createElement("span");
    specialty.textContent = doctor.specialization || "Doctor";
    link.append(heading, specialty);
    target.append(link);
  });
}());
