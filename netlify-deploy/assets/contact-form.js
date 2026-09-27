(() => {
  const form = document.querySelector("[data-event-contact-form]");
  if (!form) return;

  const dateField = form.elements.eventDate;
  const status = form.querySelector("[data-contact-status]");
  if (dateField && !dateField.min) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateField.min = today.toISOString().slice(0, 10);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const details = new FormData(form);
    const message = [
      "היי אלי, אשמח לבדוק זמינות לאירוע:",
      `שם: ${details.get("fullName")}`,
      `טלפון: ${details.get("phone")}`,
      `סוג האירוע: ${details.get("eventType")}`,
      `תאריך: ${details.get("eventDate") || "עדיין לא נקבע"}`,
      `מקום או עיר: ${details.get("location") || "עדיין לא נקבע"}`,
    ].join("\n");

    if (status) status.textContent = "הפרטים מוכנים, פותח לכם שיחה בוואטסאפ…";
    window.open(`https://wa.me/972507324480?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  });
})();

