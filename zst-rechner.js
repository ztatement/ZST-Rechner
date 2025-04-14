 /*
  * Zählerstand-Rechner - (mit Initialisierungs-Check)
  *
  * Dieses Skript berechnet und zeigt interpolierte Zählerstände sowie den Verbrauch 
  * basierend auf den Benutzereingaben (Datum und Zählerstände) an.
  * Unterstützt das deutsche Format TT.MM.JJJJ für Datum und 1.234,567 für Zählerstände.
  *
  * Funktionen:
  * - Validierung der Eingaben (Zählerstand und Datum).
  * - Fehleranzeige via Bootstrap (Fehlermeldungen, CSS-Klassen).
  * - Interpolation des Zählerstandes zwischen zwei Zeitpunkten.
  * - Verbrauchsberechnung unter Berücksichtigung eines eventuellen Überlaufs.
  * - Anwendung einer optionalen Winteranpassung (2% Mehrverbrauch).
  * - Dynamische Rundungsoptionen (kaufmännisch, abrunden oder keine Rundung).
  * - Initialisierung von Bootstrap Tooltips.
  *
  * Hinweis: Vor der Validierung wird geprüft, ob alle Pflichtfelder (z. B. aktueller Zählerstand,
  * Start- und Enddatum) einen Wert besitzen. Fehlen diese Eingaben, bleibt die Anzeige leer.
  */

document.addEventListener("DOMContentLoaded", function () {
  // - Bootstrap Tooltip Initialisierung -
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach((tooltipTriggerEl) => {
    new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // - DOM-Elemente und Eingabefelder -
  const zstOldInput = document.getElementById("zstOldInput"); // Ältester Zählerstand
  const zstNewInput = document.getElementById("zstNewInput"); // Aktueller Zählerstand
  const datOldInput = document.getElementById("datOldInput"); // Datum des ältesten Zählerstands
  const datNewInput = document.getElementById("datNewInput"); // Datum des aktuellen Zählerstands
  const datFutureInput = document.getElementById("datFutureInput"); // Datum in der Zukunft
  const datBetweenInput = document.getElementById("datBetweenInput"); // Benutzerinput: Datum "Dazwischen"

  const roundingOption = document.getElementById("roundingOption"); // Rundungsoption
  const vorkommastellenOption = document.getElementById("vorkommastellenOption"); // Vorkommastellen-Auswahl

  // Ausgabe-Felder
  const zstBetween = document.getElementById("zstBetween"); // Interpolierter Zählerstand für "Dazwischen"
  const zstFuture = document.getElementById("zstFuture"); // Interpolierter Zählerstand für "Zukunft"
  const daysFuture = document.getElementById("daysFuture");
  const daysNew = document.getElementById("daysNew");
  const daysBetween = document.getElementById("daysBetween");
  const verbrauchFuture = document.getElementById("verbrauchFuture"); // Ausgabe des berechneten Verbrauchs für die Zukunft
  const verbrauchNew = document.getElementById("verbrauchNew");
  const verbrauchBetween = document.getElementById("verbrauchBetween");

  // Standardwert für den ältesten Zählerstand setzen, falls leer.
  if (!zstOldInput.value.trim()) {
    zstOldInput.value = "0";
  }

  // - Fehleranzeige-Funktionen -

  const showError = (message, inputElement) => {
    const feedbackElement = document.getElementById(inputElement + "Feedback");
    if (feedbackElement) {
      feedbackElement.textContent = message;
      feedbackElement.style.display = "block";
    }
    const inputField = document.getElementById(inputElement);
    if (inputField) {
      inputField.classList.add("is-invalid");
    }
  };

  const hideError = (inputElement) => {
    const feedbackElement = document.getElementById(inputElement + "Feedback");
    if (feedbackElement) {
      feedbackElement.style.display = "none";
    }
    const inputField = document.getElementById(inputElement);
    if (inputField) {
      inputField.classList.remove("is-invalid");
    }
  };

  // - Validierung und Parsing des Zählerstandes -

  /**
   * Prüft, ob der eingegebene Zählerstand maximal die erwartete Anzahl an Vorkommastellen
   * (ohne Punkte und führende Nullen) und maximal drei Nachkommastellen enthält.
   * Der Wert "0" (Null) wird als gültig akzeptiert.
   *
   * @param {string} value - Der eingegebene Zählerstand.
   * @param {string} vorkommastellen - Erwartete maximale Anzahl der Vorkommastellen.
   * @returns {boolean} - True, wenn gültig, sonst false.
   */
  const validateVorkommastellen = (value, vorkommastellen) => {
    // Falls der eingetragene Wert numerisch 0 ist, akzeptieren wir ihn direkt.
    const numericValue = parseFloat(value.replace(/\./g, "").replace(",", "."));
    if (!isNaN(numericValue) && numericValue === 0) {
      return true;
    }

    // Falls kein Wert eingetragen wurde, wird hier nichts validiert.
    if (!value.trim()) return true;

    // Entferne Tausenderpunkte und führende Nullen, um den Vorkommateil zu ermitteln.
    const cleanedValue = value.replace(/\./g, "").replace(/^0+/, "").split(",")[0];
    const decimalPart = value.split(",")[1] || "";
    console.log("Eingabe ohne führende Nullen:", cleanedValue);
    console.log("Länge der Vorkommastellen:", cleanedValue.length, "Erwartet:", vorkommastellen);
    if (decimalPart.length > 3) {
      console.warn("Zu viele Nachkommastellen!");
      return false;
    }
    // Erlaubt sind Eingaben, bei denen die Anzahl der Ziffern im Vorkommabereich maximal dem Dropdown-Wert entspricht.
    return cleanedValue.length <= parseInt(vorkommastellen, 10);
  };


  const validateZaehlerstand = (inputElement, vorkommastellen) => {
    const value = inputElement.value.trim();
    // Wenn kein Wert eingetragen wurde, wird erstmal keine Fehlermeldung gezeigt.
    if (!value) {
      hideError(inputElement.id);
      return false;
    }
    const regex = /^\d{1,3}(\.\d{3})*(,\d{1,3})?$/;
    if (!regex.test(value) || !validateVorkommastellen(value, vorkommastellen)) {
      showError("Bitte gib einen gültigen Zählerstand im Format 1.234,567 ein.", inputElement.id);
      console.warn("Ungültige Eingabe: " + value);
      return false;
    } else {
      hideError(inputElement.id);
      return true;
    }
  };

  const parseValue = (value) => {
    if (!value) return "-";
    const cleanedValue = value.replace(/\./g, "").replace(/,/, ".");
    return parseFloat(cleanedValue);
  };

  // - Datum Validierung und Parsing -

  const isValidGermanDate = (dateString) => {
    const regex = /^\d{2}\.\d{2}\.\d{4}$/; // Prüft auf TT.MM.JJJJ
    if (!regex.test(dateString)) return false;
    const [day, month, year] = dateString.split('.').map(Number);
    const date = new Date(year, month - 1, day); // Monat ist nullbasiert
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const parseGermanDate = (dateString) => {
    if (!isValidGermanDate(dateString)) return null;
    const [day, month, year] = dateString.split('.').map(Number);
    return new Date(year, month - 1, day);
  };

  const isWinterMonth = (dateString) => {
    const date = parseGermanDate(dateString);
    if (!date) return false;
    const month = date.getMonth() + 1;
    return [11, 12, 1, 2].includes(month);
    console.log("Winterfaktor für Monat 11, 12, 1 und 2.");
  };

  const validateInputDate = (inputElement) => {
    const value = inputElement.value;
    if (!isValidGermanDate(value)) {
      inputElement.classList.add("is-invalid");
      inputElement.setCustomValidity("Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.");
    } else {
      inputElement.classList.remove("is-invalid");
      inputElement.setCustomValidity("");
    }
  };

  [datOldInput, datNewInput, datFutureInput, datBetweenInput].forEach((element) => {
    element.addEventListener("input", () => validateInputDate(element));
  });

  // - Zusätzliche Validierung für den aktuellen Zählerstand -
  zstNewInput.addEventListener("change", () => {
    let value = zstNewInput.value.trim();
    const regex = /^\d{1,3}(\.\d{3})*(,\d{1,3})?$/;
    if (!regex.test(value)) {
      alert("Bitte geben Sie einen gültigen Zählerstand im Format 1.234,567 ein.");
      zstNewInput.value = "";
    } else if (!value.includes(",")) {
      zstNewInput.value += ",0";
    }
    console.log("Regex-Prüfung erfolgreich:", regex.test(value));
  });

  // - Berechnungsfunktionen -

  const calculateConsumption = (oldValue, newValue, maxValue) => {
    if (oldValue > newValue) {
      return (maxValue - oldValue) + newValue + 1;
    }
    return newValue - oldValue;
  };

  const calculateDays = (startDate, endDate) => {
    const start = parseGermanDate(startDate);
    const end = parseGermanDate(endDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return "-";
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const formatNumber = (value) => {
    return value.toLocaleString("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

  const roundValue = (value) => {
    if (isNaN(value)) return "-";
    const roundingMethod = roundingOption.value || "standard";
    let roundedValue = value;
    if (roundingMethod === "floor") {
      roundedValue = Math.floor(value);
    } else if (roundingMethod === "none") {
      roundedValue = parseFloat(value.toFixed(3));
    } else {
      roundedValue = Math.round(value);
    }
    return formatNumber(roundedValue);
  };

  // - Aktualisierung der Berechnungen -

  const updateCalculation = () => {
    // Sicherstellen, dass alle nötigen Eingaben vorhanden sind.
    if (
      !zstOldInput.value.trim() ||
      !zstNewInput.value.trim() ||
      !datOldInput.value.trim() ||
      !datNewInput.value.trim()
    ) {
      // Falls wichtige Eingaben fehlen, leere Ausgaben setzen.
      zstBetween.textContent = "-";
      zstFuture.textContent = "-";
      verbrauchFuture.textContent = "-";
      verbrauchNew.textContent = "-";
      verbrauchBetween.textContent = "-";
      daysNew.textContent = "-";
      daysBetween.textContent = "-";
      daysFuture.textContent = "-";
      return;
    }

    // Dynamisches Auslesen der aktuellen Werte und Dropdown-Einstellungen
    const oldDate = datOldInput.value;
    const newDate = datNewInput.value;
    const futureDate = datFutureInput.value;
    const betweenDate = datBetweenInput.value;
    const vorkommastellen = vorkommastellenOption.value;
    const maxValue = vorkommastellen === "5" ? 99999 : 999999;

    // Validierung der Zählerstände
    if (!validateZaehlerstand(zstOldInput, vorkommastellen) ||
      !validateZaehlerstand(zstNewInput, vorkommastellen)) {
      zstBetween.textContent = "-";
      zstFuture.textContent = "-";
      verbrauchFuture.textContent = "-";
      verbrauchNew.textContent = "-";
      verbrauchBetween.textContent = "-";
      return;
    }

    const zstOldVal = parseValue(zstOldInput.value);
    const zstNewVal = parseValue(zstNewInput.value);

    // Konsistenzprüfung: Neues Datum muss nach altem Datum liegen.
    if (parseGermanDate(newDate) <= parseGermanDate(oldDate)) {
      showError("Das neue Datum muss nach dem alten Datum liegen!", datNewInput.id);
      return;
    }

    // Berechnung der Tage zwischen den Daten
    let daysOldToBetween, daysBetweenToNew, daysTotalOldToNew, daysNewToFuture;
    if (betweenDate) {
      // Wenn ein "Dazwischen"-Datum vorhanden ist, aufteilen in:
      // Tage von altem Datum bis "Dazwischen" und von "Dazwischen" bis neuem Datum
      daysOldToBetween = calculateDays(oldDate, betweenDate);
      daysBetweenToNew = calculateDays(betweenDate, newDate);
      daysTotalOldToNew = daysOldToBetween + daysBetweenToNew;
    } else {
      // Kein Zwischen-Datum: Gesamttage von altem bis neuem Datum
      daysTotalOldToNew = calculateDays(oldDate, newDate);
      daysOldToBetween = "-";
      daysBetweenToNew = daysTotalOldToNew;
    }

    // Berechnung der Tage von neuem Datum bis zum Zukunftsdatum
    daysNewToFuture = futureDate ? calculateDays(newDate, futureDate) : "-";

    // Berechne den Tagesverbrauch basierend auf dem Zeitraum oldDate bis newDate
    let dailyConsumption = (zstNewVal - zstOldVal) / daysTotalOldToNew;

    // Winteranpassung (2% Mehrverbrauch) falls der Monat des neuen Datums in die Winterperiode fällt.
    const winterFactor = 1.02;

    // Wenn der Zeitraum in eine Winterperiode fällt (z. B. anhand newDate), wende den Winterfaktor an.
    if (isWinterMonth(newDate)) {
      dailyConsumption *= winterFactor;
      console.log("Winterfaktor aktiv: Tagesverbrauch für Future wurde um 2% erhöht.");
    }

    // Extrapoliere den zukünftigen Zählerstand ab zstNewVal
    let zstFutureVal = futureDate !== "" ? zstNewVal + dailyConsumption * daysNewToFuture : "-";


    // Ausgabe: "Aktuell" zeigt hier die Gesamttage (old-new),
    // "Dazwischen" zeigt die Tage von altem Datum bis Zwischen-Datum (falls vorhanden),
    // "Zukunft" zeigt die Tage von neuem Datum bis Zukunftsdatum.
    daysNew.textContent = isNaN(daysTotalOldToNew) ? "-" : daysTotalOldToNew;
    daysBetween.textContent = (betweenDate ? daysOldToBetween : "-");
    daysFuture.textContent = (daysNewToFuture === "-" ? "-" : daysNewToFuture);


    // Interpolation der Zählerstände
    //let zstBetweenVal = (zstNewVal - zstOldVal) / daysTotalOldToNew * daysBetweenToNew + zstOldVal;
    let zstBetweenVal;
    if (betweenDate) {
      // Interpolieren für das Zwischen-Datum anhand der Tage von alt bis "Dazwischen"
      zstBetweenVal = (zstNewVal - zstOldVal) / daysTotalOldToNew * daysOldToBetween + zstOldVal;
    } else {
      // Ohne Zwischen-Datum: zstBetween entspricht einfach dem aktuellen Zählerstand
      zstBetweenVal = (zstNewVal - zstOldVal) / daysTotalOldToNew * daysTotalOldToNew + zstOldVal;
    }

    //let zstFutureVal = futureDate !== "" ?  (zstNewVal - zstOldVal) / daysTotalOldToNew * daysToFuture + zstOldVal  : "-";
    ///let zstFutureVal = futureDate !== "" ? zstNewVal + ((zstNewVal - zstOldVal) / daysTotalOldToNew) * daysNewToFuture : "-";

    // Verbrauchsberechnung: Je nachdem, ob ein "Dazwischen"-Datum vorhanden ist.
    let verbrauchToNew;
    if (!betweenDate) {
      verbrauchToNew = calculateConsumption(zstOldVal, zstNewVal, maxValue);
    } else {
      verbrauchToNew = calculateConsumption(zstBetweenVal, zstNewVal, maxValue);
    }
    const verbrauchToBetween = betweenDate ? calculateConsumption(zstOldVal, zstBetweenVal, maxValue) : "-";
    //let verbrauchToFuture = (zstFutureVal !== "-" && futureDate !== "") ? calculateConsumption(zstNewVal, zstFutureVal, maxValue) : "-";
    let verbrauchToFuture;
    if (zstFutureVal === "-" || futureDate === "") {
      verbrauchToFuture = "-";
    } else {
      // Wenn der aktuelle Zählerstand (zstNewVal) unterhalb des definierten maxValue liegt,
      // soll kein Überlauf berechnet werden – einfache Differenzbildung:
      if (zstNewVal < maxValue) {
        verbrauchToFuture = zstFutureVal - zstNewVal;
      } else {
        // Falls zstNewVal den maxValue erreicht hat oder überschreitet:
        if (zstFutureVal > zstNewVal) {
          verbrauchToFuture = zstFutureVal - zstNewVal;
        } else {
          verbrauchToFuture = (maxValue - zstNewVal) + zstFutureVal + 1;
        }
      }
    }

    // Setze CSS-Klassen je nach Wert (negative oder Überlauf).
    const setClassByValue = (element, value, maxValue) => {
      if (value < 0) {
        element.classList.add("negative");
        element.classList.remove("overflow");
      } else if (value > maxValue) {
        element.classList.add("overflow");
        element.classList.remove("negative");
      } else {
        element.classList.remove("negative", "overflow");
      }
    };

    setClassByValue(zstFuture, zstFutureVal, maxValue);
    setClassByValue(zstBetween, zstBetweenVal, maxValue);
    setClassByValue(verbrauchFuture, verbrauchToFuture, maxValue);
    setClassByValue(verbrauchNew, verbrauchToNew, maxValue);
    setClassByValue(verbrauchBetween, verbrauchToBetween, maxValue);

    // Ausgabe der Ergebnisse im DOM
    zstFuture.textContent = (zstFutureVal === "-" ? "-" : roundValue(zstFutureVal));
    zstBetween.textContent = roundValue(zstBetweenVal);
    verbrauchFuture.textContent = (verbrauchToFuture === "-" ? "-" : roundValue(verbrauchToFuture));
    verbrauchNew.textContent = roundValue(verbrauchToNew);
    verbrauchBetween.textContent = (verbrauchToBetween === "-" ? "-" : roundValue(verbrauchToBetween));
  };

  // ----- Event-Listener -----
  [datOldInput, datNewInput, datFutureInput, datBetweenInput, zstOldInput, zstNewInput].forEach((element) => {
    element.addEventListener("input", updateCalculation);
  });
  roundingOption.addEventListener("change", updateCalculation);
  vorkommastellenOption.addEventListener("change", updateCalculation);

  // Initiale Berechnung beim Laden der Seite.
  updateCalculation();
});
