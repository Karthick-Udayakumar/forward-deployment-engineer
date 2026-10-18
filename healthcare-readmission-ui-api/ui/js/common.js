// Helpers shared by the pages in ui/. Hand-written; the API client itself is compiled from client.ts.

// ---- Lists used by more than one page. Change them here only. ----

// "Assigned To" roles. The value is what gets stored; the label is what people see.
export const TEAM_ROLES = [
    { value: "CARE_MANAGER", label: "Care Manager (RN)" },
    { value: "CASE_MANAGER", label: "Case Manager / Social Worker" },
    { value: "PHARMACIST", label: "Clinical Pharmacist" },
    { value: "DIABETES_EDUCATOR", label: "Diabetes Educator" },
    { value: "DIETITIAN", label: "Dietitian" },
    { value: "PHYSICIAN", label: "Physician / Attending" },
];

export const INTERVENTION_STATUSES = [
    { value: "PENDING_REVIEW", label: "Pending review" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "CONTACTED", label: "Contacted" },
    { value: "FOLLOW_UP_SCHEDULED", label: "Follow-up scheduled" },
    { value: "CLOSED", label: "Closed" },
];

// 30-day outcome. NO = not readmitted, <30 = within 30 days, >30 = after 30 days.
export const READMISSION_OPTIONS = [
    { value: "NO", label: "Not readmitted" },
    { value: "<30", label: "Readmitted within 30 days" },
    { value: ">30", label: "Readmitted after 30 days" },
];

// Age brackets used in the dataset
export const AGE_BRACKETS = [
    "[0-10)", "[10-20)", "[20-30)", "[30-40)", "[40-50)",
    "[50-60)", "[60-70)", "[70-80)", "[80-90)", "[90-100)",
];

// Labels by stored value, for display
export const TEAM_LABELS = Object.fromEntries(TEAM_ROLES.map((role) => [role.value, role.label]));

// Fills a <select>. Options can be {value, label} objects or plain strings.
// An optional placeholder becomes the first option, with an empty value.
export function fillSelect(select, options, placeholder = null) {
    const items = placeholder !== null ? [{ value: "", label: placeholder }] : [];
    for (const option of options) {
        items.push(typeof option === "string" ? { value: option, label: option } : option);
    }
    select.innerHTML = items
        .map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`)
        .join("");
}

// Escape text before it goes into HTML, so stored values can't inject markup
export function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

export function statusLabel(status) {
    return status ? status.replace(/_/g, " ") : "Not started";
}

export function teamLabel(value) {
    return value ? (TEAM_LABELS[value] ?? value) : "Unassigned";
}

// "2026-10-18T18:12:00" -> "18 Oct 2026, 18:12".
// The database stores timestamps without a time zone, so they're read as local time. Storing them with a
// time zone is the proper fix (see the schema notes).
export function formatTimestamp(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// Styled replacement for window.confirm. Resolves to true when the user confirms, false otherwise.
export function confirmDialog(message, { confirmLabel = "Confirm", cancelLabel = "Cancel" } = {}) {
    return new Promise((resolve) => {
        const dialog = document.createElement("dialog");
        dialog.className = "app-dialog";
        dialog.innerHTML = `
            <form method="dialog">
                <p>${esc(message)}</p>
                <div class="dialog-actions">
                    <button type="button" class="secondary" data-action="cancel">${esc(cancelLabel)}</button>
                    <button type="submit" value="confirm">${esc(confirmLabel)}</button>
                </div>
            </form>`;
        document.body.appendChild(dialog);

        dialog.addEventListener("close", () => {
            const confirmed = dialog.returnValue === "confirm";
            dialog.remove();
            resolve(confirmed);
        }, { once: true });
        dialog.querySelector('[data-action="cancel"]').addEventListener("click", () => dialog.close("cancel"));

        dialog.showModal();
    });
}

// Highlights the navigation link for the current page.
// Pass the page name when a page isn't in the navigation (e.g. the update page sits under High-Risk).
export function markActiveNav(page = window.location.pathname.split("/").pop()) {
    document.querySelectorAll(".app-nav a").forEach((link) => {
        if (link.getAttribute("href") === page) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}
