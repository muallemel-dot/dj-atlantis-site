(function () {
  "use strict";

  var attributionKeys = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign"];
  var params = new URLSearchParams(window.location.search);
  var attribution = {};

  attributionKeys.forEach(function (key) {
    var value = params.get(key);
    if (value) attribution[key] = value;
  });

  if (Object.keys(attribution).length) {
    sessionStorage.setItem("dj_atlantis_attribution", JSON.stringify(attribution));
  }

  function track(eventName, details) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName, page_path: window.location.pathname }, details || {}));
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;

    if (link.href.indexOf("wa.me/") !== -1) {
      track("whatsapp_click", { location: link.dataset.conversionLocation || "page" });
    } else if (link.protocol === "tel:") {
      track("phone_click", { location: link.dataset.conversionLocation || "page" });
    }
  });

  document.addEventListener("submit", function (event) {
    var form = event.target.closest && event.target.closest("form[data-whatsapp-form]");
    if (!form) return;

    event.preventDefault();
    var data = new FormData(form);
    var message = [
      "היי אלי, אשמח לבדוק זמינות של DJ ATLANTIS לאירוע שלי.",
      "שם: " + data.get("name"),
      "טלפון: " + data.get("phone"),
      "תאריך האירוע: " + data.get("event_date"),
      "סוג האירוע: " + data.get("event_type")
    ].join("\n");

    track("lead_form_submit", { form_name: "paid_landing_whatsapp" });
    var status = form.querySelector("[data-form-status]");
    if (status) status.textContent = "הפרטים מוכנים. וואטסאפ נפתח להשלמת הפנייה.";
    window.open("https://wa.me/972507324480?text=" + encodeURIComponent(message), "_blank", "noopener");
  });
})();
