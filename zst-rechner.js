/*
 * Zählerstand-Rechner (mit Initialisierungs-Check)
 * 
 * Autor: Thomas Boettcher @ztatement <github [at] ztatement [dot] com>
 * Lizenz: MIT (https://opensource.org/licenses/MIT)
 * Repository: https://github.com/ztatement/ZST-Rechner
 * Erstellt: Tue Apr 01 2025 07:33:03 GMT+0200
 * Letzte Änderung: Thu Apr 17 2025 06:20:57 GMT+0200
 * 
 * Beschreibung:
 * Dieses Skript berechnet und zeigt interpolierte Zählerstände sowie den Verbrauch 
 * basierend auf den Benutzereingaben (Datum und Zählerstände) an.
 * Unterstützt das deutsche Format TT.MM.JJJJ für Datum und 1.234,567 für Zählerstände.
 * 
 * Funktionen:
 * - Validierung der Eingaben (Zählerstand und Datum)
 * - Fehleranzeige via Bootstrap (Fehlermeldungen, CSS-Klassen)
 * - Interpolation des Zählerstandes zwischen zwei Zeitpunkten
 * - Verbrauchsberechnung unter Berücksichtigung eines eventuellen Überlaufs
 * - Anwendung einer optionalen Winteranpassung (2% Mehrverbrauch)
 * - Dynamische Rundungsoptionen (kaufmännisch, abrunden oder keine Rundung)
 * - Initialisierung von Bootstrap Tooltips
 * 
 * Nutzung:
 * - Stelle sicher, dass alle notwendigen Eingaben gemacht wurden, bevor die Berechnung startet.
 * - Das Skript aktualisiert die Werte automatisch, wenn Änderungen an den Eingaben vorgenommen werden.
 * - Fehlerhafte Eingaben werden erkannt und durch visuelle Rückmeldungen angezeigt.
 * 
 * Hinweis:
 * Vor der Validierung wird geprüft, ob alle Pflichtfelder (z. B. aktueller Zählerstand,
 * Start- und Enddatum) einen Wert besitzen. Fehlen diese Eingaben, bleibt die Anzeige leer.
 */

document.addEventListener("DOMContentLoaded", function () {

  // Konfiguration
  const CONFIG = {
    maxValue: 999999,
    winterFactor: 1.02,
  };

  // *** Bootstrap Tooltip Initialisierung ********************************* */
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach((tooltipTriggerEl) => {
    new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // *** DOM-Elemente und Eingabefelder ************************************ */
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

  // Fehlerbehandlungen
  const logError = (message) => {
    console.error(`[Fehler]: ${message}`);
  };
  // Debugging-Meldungen
  const logDebug = (message) => {
    console.log(`[Debug]: ${message}`);
  };


  // Standardwert für den ältesten Zählerstand setzen, falls leer.
  if (!zstOldInput.value.trim()) {
    zstOldInput.value = "0";
  }

  // *** Fehleranzeige-Funktionen ****************************************** */

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

  // *** Validierung und Parsing des Zählerstandes ************************* */
  // Überprüft die Eingabeformate für Zählerstände, einschließlich Vorkommastellen und Nachkommastellen.
  // Stellt sicher, dass das Format den deutschen Konventionen entspricht (z. B. 1.234,567).

/**
  * Prüft die Gültigkeit eines Zählerstands basierend auf den erwarteten Vorkommastellen.
  * Entfernt Punkte und führende Nullen, um die Zählstruktur korrekt zu analysieren.
  * Akzeptiert maximal drei Nachkommastellen.
  * 
  * Beispiel:
  * - Eingabe: "001.234,567"
  * - Ergebnis: Gültig, wenn erwartete Vorkommastellen >= 4 sind.
  *
  * @param {string} value - Der eingegebene Zählerstand (z. B. "1.234,567").
  * @param {string} vorkommastellen - Maximale Anzahl der Vorkommastellen laut Auswahl.
  * @returns {boolean} - Gibt true zurück, wenn der Zählerstand gültig ist, andernfalls false.
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
    }
    else {
      hideError(inputElement.id);
      return true;
    }
  };

  const parseValue = (value) => {
    if (!value) return "-";
    const cleanedValue = value.replace(/\./g, "").replace(/,/, ".");
    return parseFloat(cleanedValue);
  };

  // *** Datum Validierung und Parsing ************************************* */

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
    }
    else {
      inputElement.classList.remove("is-invalid");
      inputElement.setCustomValidity("");
    }
  };

  [datOldInput, datNewInput, datFutureInput, datBetweenInput].forEach((element) => {
    element.addEventListener("input", () => validateInputDate(element));
  });

  // *** Zusätzliche Validierung für den aktuellen Zählerstand ************* */
  zstNewInput.addEventListener("change", () => {
    let value = zstNewInput.value.trim();
    const regex = /^\d{1,3}(\.\d{3})*(,\d{1,3})?$/;
    if (!regex.test(value)) {
      alert("Bitte geben Sie einen gültigen Zählerstand im Format 1.234,567 ein.");
      zstNewInput.value = "";
    }
    else if (!value.includes(",")) {
      zstNewInput.value += ",0";
    }
    console.log("Regex-Prüfung erfolgreich:", regex.test(value));
  });

  // *** Berechnungsfunktionen ********************************************* */
  // Diese Funktionen führen Kernberechnungen durch, darunter:
  // - Verbrauchsberechnung mit Überlaufbehandlung
  // - Anpassung des Verbrauchs für Wintertage (2 % Zuschlag bei Aktivierung)
  // - Berechnung der interpolierten Zählerstände (z. B. "Dazwischen" und "Zukunft")

/**
  * Berechnet den Verbrauch zwischen zwei Zählerständen unter Berücksichtigung eines Überlaufs.
  * 
  * Beispiel:
  * - Alter Zählerstand: 999.999
  * - Neuer Zählerstand: 1.234
  * - Maximalwert: 999.999
  * Ergebnis: (999.999 - 999.999) + 1.234 + 1 = 1.235
  *
  * @param {number} oldValue - Der vorherige Zählerstand.
  * @param {number} newValue - Der aktuelle Zählerstand.
  * @param {number} maxValue - Der maximale Zählerwert (z. B. 999.999).
  * @returns {number} - Der berechnete Verbrauch unter Berücksichtigung des Überlaufs.
  */
  const calculateConsumption = (oldValue, newValue, maxValue) => {
    if (oldValue > newValue) {
      console.log("Überlauf erkannt! Alter Wert: " + oldValue + ", Neuer Wert: " + newValue);
      return (maxValue - oldValue) + newValue;
    }
    return newValue - oldValue;
  };

  // Checkbox für Wintermodus auslesen
  const winterModeCheckbox = document.getElementById("winterModeCheckbox");

/**
  * Berechnet den angepassten Verbrauch, unter Berücksichtigung eines 2%-Zuschlags für Wintertage.
  * 
  * Der Wintermodus gilt für die Monate November, Dezember, Januar und Februar.
  * Der Verbrauch wird anteilig für die Wintertage berechnet.
  * 
  * Beispiel:
  * - Zeitraum: 01.11.2024 bis 28.02.2025
  * - Verbrauch: 1000 Einheiten
  * - Wintertage: 120 Tage (von 120 möglichen Tagen)
  * Ergebnis: +2 % Zuschlag nur für die Wintertage.
  *
  * @param {string} startDate - Startdatum im deutschen Format (TT.MM.JJJJ).
  * @param {string} endDate - Enddatum im deutschen Format (TT.MM.JJJJ).
  * @param {number} consumption - Verbrauch im Zeitraum.
  * @returns {object} - Enthält den angepassten Verbrauch und die Anzahl der Wintertage.
  */
  const calculateWinterAdjustedConsumption = (startDate, endDate, consumption) => {
    const start = parseGermanDate(startDate);
    const end = parseGermanDate(endDate);
    if (!start || !end || consumption <= 0) return {
      adjustedConsumption: consumption,
      winterDays: 0
    };

    let winterDays = 0;
    let totalDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      totalDays++;
      if (isWinterMonth(d.toLocaleDateString("de-DE"))) {
        winterDays++;
      }
    }

    console.log(`Wintertage: ${winterDays}, Gesamttage: ${totalDays}`);

    if (totalDays <= 0) {
      logError("Fehler: Gesamtanzahl der Tage ist 0 oder negativ. Berechnung nicht möglich.");
      return {
        adjustedConsumption: consumption,
        winterDays: 0
      };
    }

    const dailyConsumption = Math.abs(consumption) / totalDays;
    const winterConsumption = dailyConsumption * winterDays * 0.02;

    return {
      adjustedConsumption: consumption + winterConsumption,
      winterDays
    };
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
    }
    else if (roundingMethod === "none") {
      roundedValue = parseFloat(value.toFixed(3));
    }
    else {
      roundedValue = Math.round(value);
    }
    return formatNumber(roundedValue);
  };

  // *** Aktualisierung der Berechnungen *********************************** */

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
    }
    else {
      // Kein Zwischen-Datum: Gesamttage von altem bis neuem Datum
      daysTotalOldToNew = calculateDays(oldDate, newDate);
      daysOldToBetween = "-";
      daysBetweenToNew = daysTotalOldToNew;
    }

    // Berechnung der Tage von neuem Datum bis zum Zukunftsdatum
    daysNewToFuture = futureDate ? calculateDays(newDate, futureDate) : "-";

    // Berechne den Tagesverbrauch basierend auf dem Zeitraum oldDate bis newDate
    let dailyConsumption = (zstNewVal - zstOldVal) / daysTotalOldToNew;


    if ((zstNewVal - zstOldVal) < 0 || calculateDays(oldDate, newDate) <= 0) {
      logError("Fehlerhafte Werte: Verbrauch oder Tage sind negativ/null.");
      dailyConsumption = 0; // Neutralisieren fehlerhafte Werte
    }
    else {
      const {
        adjustedConsumption,
        winterDays
      } = calculateWinterAdjustedConsumption(oldDate, newDate, (zstNewVal - zstOldVal));
      dailyConsumption = adjustedConsumption / calculateDays(oldDate, newDate);
      console.log(`Tagesverbrauch mit Winteranpassung: ${dailyConsumption}, Wintertage: ${winterDays}`);
    }

    const {
      adjustedConsumption,
      winterDays
    } = calculateWinterAdjustedConsumption(oldDate, newDate, (zstNewVal - zstOldVal));
    dailyConsumption = adjustedConsumption / calculateDays(oldDate, newDate);
    console.log(`Tagesverbrauch mit Winteranpassung: ${dailyConsumption}, Wintertage: ${winterDays}`);

    if (adjustedConsumption < 0 || calculateDays(oldDate, newDate) <= 0) {
      logError("Fehlerhafte Werte: Verbrauch oder Tage sind negativ/null.");
      dailyConsumption = 0; // Setze den Tagesverbrauch auf 0, wenn fehlerhafte Werte erkannt werden
    }
    else {
      dailyConsumption = adjustedConsumption / calculateDays(oldDate, newDate);
    }

    if (dailyConsumption < 0 || isNaN(dailyConsumption)) {
      logError("Fehler: Tagesverbrauch ist negativ oder ungültig.");
      dailyConsumption = 0; // Falsche Werte neutralisieren
    }

    // Extrapoliere den zukünftigen Zählerstand ab zstNewVal
    ///let zstFutureVal = futureDate !== "" ? zstNewVal + dailyConsumption * daysNewToFuture : "-";
    // - Berechnung des zukünftigen Zählerstands -
    // Diese Funktion berechnet den erwarteten Zählerstand an einem zukünftigen Datum.
    // Berücksichtigt:
    // - Durchschnittlichen Tagesverbrauch
    // - Überlauf, falls der Zählerstand das Maximum überschreitet
    if (zstNewVal + dailyConsumption * daysNewToFuture > maxValue) {
      const overflow = (zstNewVal + dailyConsumption * daysNewToFuture) - maxValue;
      zstFutureVal = overflow + 1; // Überlaufbehandlung: Zurücksetzen ab 1
      console.log(`Überlauf erkannt! Zukunfts-Wert nach Korrektur: ${zstFutureVal}`);
    }
    else {
      zstFutureVal = zstNewVal + dailyConsumption * daysNewToFuture;
    }

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
    }
    else {
      // Ohne Zwischen-Datum: zstBetween entspricht einfach dem aktuellen Zählerstand
      zstBetweenVal = (zstNewVal - zstOldVal) / daysTotalOldToNew * daysTotalOldToNew + zstOldVal;
    }
    if (!betweenDate || isNaN(zstBetweenVal)) {
      zstBetweenVal = "-";
    }

    //let zstFutureVal = futureDate !== "" ?  (zstNewVal - zstOldVal) / daysTotalOldToNew * daysToFuture + zstOldVal  : "-";
    ///let zstFutureVal = futureDate !== "" ? zstNewVal + ((zstNewVal - zstOldVal) / daysTotalOldToNew) * daysNewToFuture : "-";

    // Verbrauchsberechnung: Je nachdem, ob ein "Dazwischen"-Datum vorhanden ist.
    let verbrauchToNew;
    if (!betweenDate) {
      verbrauchToNew = calculateConsumption(zstOldVal, zstNewVal, maxValue);
    }
    else {
      verbrauchToNew = calculateConsumption(zstBetweenVal, zstNewVal, maxValue);
    }

    const verbrauchToBetween = betweenDate ? calculateConsumption(zstOldVal, zstBetweenVal, maxValue) : "-";

    //let verbrauchToFuture = (zstFutureVal !== "-" && futureDate !== "") ? calculateConsumption(zstNewVal, zstFutureVal, maxValue) : "-";
    let verbrauchToFuture;
    if (zstFutureVal === "-" || futureDate === "") {
      verbrauchToFuture = "-";
    }
    else {
      // Wenn der aktuelle Zählerstand (zstNewVal) unterhalb des definierten maxValue liegt,
      // soll kein Überlauf berechnet werden – einfache Differenzbildung:
      if (zstNewVal < maxValue) {
        verbrauchToFuture = zstFutureVal - zstNewVal;
      }
      else {
        // Falls zstNewVal den maxValue erreicht hat oder überschreitet:
        if (zstFutureVal > zstNewVal) {
          verbrauchToFuture = zstFutureVal - zstNewVal;
        }
        else {
          verbrauchToFuture = (maxValue - zstNewVal) + zstFutureVal + 1;
        }
      }
    }

    // Setze CSS-Klassen je nach Wert (negative oder Überlauf).
    const setClassByValue = (element, value, maxValue) => {
      if (value < 0) {
        element.classList.add("negative");
        element.classList.remove("overflow");
      }
      else if (value > maxValue) {
        element.classList.add("overflow");
        element.classList.remove("negative");
      }
      else {
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

    // log's
    console.log(`Zwischenstände: Alter Wert: ${zstOldVal}, Neuer Wert: ${zstNewVal}, Verbrauch: ${verbrauchToNew}`);
    console.log(`Wintermodus: Tagesverbrauch = ${dailyConsumption}, Wintertage = ${winterDays}`);
    console.log(`Dazwischen-Wert: ${zstBetweenVal}, Zukunfts-Wert: ${zstFutureVal}`);
    console.log(`Berechnung Zukunfts-Wert: Neuer Zählerstand = ${zstNewVal}, Tagesverbrauch = ${dailyConsumption}, Tage bis Zukunft = ${daysNewToFuture}`);
    console.log(`Zukunfts-Wert nach Berechnung: ${zstFutureVal}`);

  };

  // *** Event-Listener **************************************************** */
  [datOldInput, datNewInput, datFutureInput, datBetweenInput, zstOldInput, zstNewInput].forEach((element) => {
    element.addEventListener("input", updateCalculation);
  });
  roundingOption.addEventListener("change", updateCalculation);
  vorkommastellenOption.addEventListener("change", updateCalculation);
  winterModeCheckbox.addEventListener("change", updateCalculation);

  // Initiale Berechnung beim Laden der Seite.
  updateCalculation();
});
