(function () {
  const api = window.MediCareAPI;
  if (!api) return;
  if (!api.isLoggedIn()) {
    location.replace("../pages/doctor-login.html");
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const text = value => value === null || value === undefined || value === "" ? "—" : String(value);
  const escapeValue = value => text(value);
  const date = value => value ? String(value).slice(0, 10) : "—";
  const time = value => value ? String(value).slice(0, 5) : "—";
  const dateTime = value => value ? String(value).replace("T", " ").slice(0, 16) : "—";
  const configs = [
    {
      id: "appointments",
      endpoint: "appointments",
      title: "appointments",
      columns: [
        ["Patient", row => row.patient_name],
        ["Date", row => date(row.appointment_date)],
        ["Time", row => time(row.appointment_time)],
        ["Status", row => row.status],
        ["Reason", row => row.reason],
        ["Admin notes", row => row.admin_remarks],
      ],
    },
    {
      id: "patients",
      endpoint: "patients",
      title: "patients",
      columns: [
        ["Patient ID", row => row.code],
        ["Name", row => row.full_name],
        ["Age", row => row.age],
        ["Phone", row => row.phone],
        ["Email", row => row.email],
        ["Blood group", row => row.blood_group],
        ["Allergies", row => row.allergies],
        ["Medical history", row => row.medical_history],
      ],
    },
    {
      id: "admissions",
      endpoint: "admissions",
      title: "admissions",
      columns: [
        ["Patient", row => row.patient_name],
        ["Room", row => row.room_number],
        ["Admitted", row => dateTime(row.admission_date)],
        ["Discharged", row => dateTime(row.discharge_date)],
        ["Status", row => row.status],
        ["Diagnosis", row => row.diagnosis],
        ["Reason", row => row.reason],
        ["Notes", row => row.notes],
      ],
    },
    {
      id: "prescriptions",
      endpoint: "prescriptions",
      title: "prescriptions",
      columns: [
        ["Patient", row => row.patient_name],
        ["Diagnosis", row => row.diagnosis],
        ["Medicines", row => (row.items || []).map(item =>
          `${item.medicine_name}: ${item.dosage}, ${item.frequency} for ${item.duration_days} day(s)`
        ).join("; ")],
        ["Notes", row => row.notes],
        ["Date", row => dateTime(row.created_at)],
      ],
    },
  ];

  function showError(element, message) {
    element.textContent = message;
    element.setAttribute("role", "alert");
  }

  function renderProfile(doctor) {
    const name = doctor.full_name || doctor.username || "Doctor";
    $("#doctor-name").textContent = name;
    $("#avatar").textContent = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    $("#specialization").textContent = doctor.specialization || "Doctor";
    $("#doctor-department").textContent = doctor.department_name || "Department not assigned";

    const details = [
      ["Username", doctor.username],
      ["Email", doctor.email],
      ["Phone", doctor.phone],
      ["Department", doctor.department_name],
      ["Specialization", doctor.specialization],
      ["Qualification", doctor.qualification],
      ["Experience", doctor.experience_years === undefined ? "" : `${doctor.experience_years} years`],
      ["Available days", doctor.available_days],
      ["Consultation fee", doctor.consultation_fee === undefined ? "" : `Rs ${doctor.consultation_fee}`],
    ];
    const profile = $("#doctor-profile");
    profile.replaceChildren();
    details.forEach(([label, value]) => {
      const row = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      row.append(strong, document.createTextNode(escapeValue(value)));
      profile.append(row);
    });
  }

  function renderSummary(summary) {
    const metrics = [
      ["Appointments", summary.total_appointments, "c-blue"],
      ["Upcoming appointments", summary.upcoming_appointments, "c-teal"],
      ["Today", summary.todays_appointments, "c-green"],
      ["Pending", summary.pending_appointments, "c-orange"],
      ["My patients", summary.total_patients, "c-purple"],
      ["Active admissions", summary.active_admissions, "c-blue"],
      ["Prescriptions", summary.total_prescriptions, "c-teal"],
    ];
    const cards = $("#summary");
    cards.replaceChildren();
    metrics.forEach(([label, count, color]) => {
      const card = document.createElement("div");
      card.className = `card metric ${color}`;
      const title = document.createElement("span");
      title.textContent = label;
      const value = document.createElement("strong");
      value.textContent = text(count);
      card.append(title, value);
      cards.append(card);
    });
  }

  async function loadDashboard() {
    const status = $("#dashboard-status");
    try {
      const result = await api.get("/doctor/dashboard/");
      const data = result.data || result;
      renderProfile(data.doctor);
      renderSummary(data.summary);
    } catch (error) {
      showError(status, `Could not load your doctor dashboard: ${error.message}`);
    }
  }

  async function loadCollection(config, page) {
    const section = document.getElementById(config.id);
    const status = $("[data-section-status]", section);
    const table = $("table", section);
    const pager = $("[data-pager]", section);
    status.textContent = `Loading ${config.title}…`;
    table.replaceChildren();
    pager.replaceChildren();

    try {
      const result = await api.get(`/doctor/${config.endpoint}/?page=${page}&page_size=20`);
      const rows = api.records(result);
      const body = document.createElement("tbody");
      if (!rows.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = config.columns.length;
        cell.textContent = `No ${config.title} found.`;
        row.append(cell);
        body.append(row);
      } else {
        rows.forEach(record => {
          const row = document.createElement("tr");
          config.columns.forEach(([, getValue]) => {
            const cell = document.createElement("td");
            cell.textContent = escapeValue(getValue(record));
            row.append(cell);
          });
          body.append(row);
        });
      }

      const head = document.createElement("thead");
      const heading = document.createElement("tr");
      config.columns.forEach(([label]) => {
        const cell = document.createElement("th");
        cell.textContent = label;
        heading.append(cell);
      });
      head.append(heading);
      table.replaceChildren(head, body);
      status.textContent = "";

      const pagination = result.pagination || {};
      const currentPage = pagination.current_page || page;
      const totalPages = pagination.total_pages || 1;
      const previous = document.createElement("button");
      previous.className = "btn btn-light";
      previous.type = "button";
      previous.textContent = "Previous";
      previous.disabled = !pagination.previous;
      previous.addEventListener("click", () => loadCollection(config, currentPage - 1));
      const pageLabel = document.createElement("span");
      pageLabel.style.padding = "8px";
      pageLabel.textContent = `Page ${currentPage} of ${totalPages} (${pagination.count || rows.length} total)`;
      const next = document.createElement("button");
      next.className = "btn btn-light";
      next.type = "button";
      next.textContent = "Next";
      next.disabled = !pagination.next;
      next.addEventListener("click", () => loadCollection(config, currentPage + 1));
      pager.replaceChildren(previous, pageLabel, next);
    } catch (error) {
      showError(status, `Could not load ${config.title}: ${error.message}`);
    }
  }

  loadDashboard();
  configs.forEach(config => loadCollection(config, 1));

  $("#logout").addEventListener("click", async event => {
    event.preventDefault();
    const status = $("#dashboard-status");
    try {
      await api.logout();
      location.href = "../pages/doctor-login.html";
    } catch (error) {
      showError(status, `Logout failed: ${error.message}`);
    }
  });
}());
