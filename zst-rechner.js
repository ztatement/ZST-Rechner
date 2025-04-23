 /*
  * Zählerstand-Rechner
  *
  * Autor: Thomas Boettcher @ztatement <github [at] ztatement [dot] com>
  * Lizenz: MIT (https://opensource.org/licenses/MIT)
  * Repository: https://github.com/ztatement/ZST-Rechner
  * Erstellt: Tue Apr 01 2025 07:33:03 GMT+0200
  * Letzte Änderung: Wed Apr 23 2025 14:31:54 GMT+0200
  *
  * Beschreibung:
  * Dieses Skript berechnet und zeigt interpolierte/extrapolierte Zählerstände
  * sowie den Verbrauch für verschiedene Zeitpunkte basierend auf Benutzereingaben an.
  * Es unterstützt das deutsche Format TT.MM.JJJJ für Datum und 1.234,567 für Zählerstände.
  * Ein Zählerüberlauf (z.B. von 999.999 auf 000.001) wird berücksichtigt.
  *
  * Kernfunktionen:
  * - Eingabevalidierung (Zählerstand-Format, Datumsformat, logische Reihenfolge)
  * - Fehleranzeige über Bootstrap-Klassen und Feedback-Elemente
  * - Berechnung des durchschnittlichen Tagesverbrauchs (ggf. mit Winteranpassung)
  * - Interpolation des Zählerstands für ein Datum zwischen Start- und Enddatum ("Dazwischen")
  * - Extrapolation des Zählerstands für ein zukünftiges Datum ("Zukunft")
  * - Korrekte Verbrauchsberechnung für alle Perioden, inklusive Überlaufbehandlung
  * - Optionale Winteranpassung (Standard: +2% für Nov, Dez, Jan, Feb)
  * - Einstellbare Rundungsoptionen für die Ausgabe
  * - Einstellbare Anzahl der Vorkommastellen des Zählers (beeinflusst max. Wert)
  * - Initialisierung von Bootstrap Tooltips für Hilfetexte
  *
  * Nutzung:
  * - Pflichtfelder (Start-ZST, End-ZST, Start-Datum, End-Datum) müssen ausgefüllt sein.
  * - Berechnungen werden bei jeder gültigen Eingabeänderung automatisch aktualisiert.
 */

document.addEventListener("DOMContentLoaded", function () {

  // *** Globale Konfiguration ********************************************* //

  const CONFIG = {
    // Standard-Maximalwert für 6 Vorkommastellen. Wird später dynamisch angepasst.
    maxValue: 999999,
    // Faktor für den Mehrverbrauch in Wintermonaten (1.02 = +2%)
    winterFactor: 1.02,
    // Monate, die als Wintermonate gelten (1 = Januar, ..., 12 = Dezember)
    winterMonths: [11, 12, 1, 2],
  };

  // *** Bootstrap Tooltip Initialisierung ********************************* //

  // Aktiviert alle Tooltips auf der Seite, die das Attribut 'data-bs-toggle="tooltip"' haben.
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach((tooltipTriggerEl) => {
    new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // *** DOM-Elemente Caching ********************************************** //

  // Eingabefelder
  const zstOldInput = document.getElementById("zstOldInput");
  const zstNewInput = document.getElementById("zstNewInput");
  const datOldInput = document.getElementById("datOldInput");
  const datNewInput = document.getElementById("datNewInput");
  const datFutureInput = document.getElementById("datFutureInput");
  const datBetweenInput = document.getElementById("datBetweenInput");

  // Einstellungs-Elemente
  const roundingOption = document.getElementById("roundingOption");
  const vorkommastellenOption = document.getElementById("vorkommastellenOption");
  const winterModeCheckbox = document.getElementById("winterModeCheckbox");

  // Ausgabe-Felder (für berechnete Werte)
  const zstBetween = document.getElementById("zstBetween");
  const zstFuture = document.getElementById("zstFuture");
  const daysFuture = document.getElementById("daysFuture");
  const daysNew = document.getElementById("daysNew");
  const daysBetween = document.getElementById("daysBetween");
  const verbrauchFuture = document.getElementById("verbrauchFuture");
  const verbrauchNew = document.getElementById("verbrauchNew");
  const verbrauchBetween = document.getElementById("verbrauchBetween");

  // *** Hilfsfunktionen für Logging *************************************** //

/**
  * Schreibt eine Fehlermeldung in die Konsole.
  * @param {string} message - Die Fehlermeldung.
  */
  const logError = (message) => {
    console.error(`[Fehler]: ${message}`);
  };

/**
  * Schreibt eine Warnung in die Konsole.
  * @param {string} message - Die Warnungsmeldung.
  */
  const logWarn = (message) => {
    console.warn(`[Warnung]: ${message}`); // Hier console.warn verwenden
  };

/**
  * Schreibt eine Debug-Meldung in die Konsole.
  * @param {string} message - Die Debug-Meldung.
  */
  const logDebug = (message) => {
    console.log(`[Debug]: ${message}`);
  };

  // *** Initialisierung *************************************************** //

  // Setzt einen Standardwert für den ältesten Zählerstand, falls das Feld leer ist.
  if (!zstOldInput.value.trim()) {
    zstOldInput.value = "0,0"; // Mit Komma für Konsistenz
  }

  // *** Fehleranzeige-Funktionen ****************************************** //

/**
  * Zeigt eine Fehlermeldung unterhalb eines Eingabefeldes an und markiert das Feld rot.
  * @param {string} message - Die anzuzeigende Fehlermeldung.
  * @param {string} inputElementId - Die ID des Eingabefeldes, bei dem der Fehler auftrat.
  */
  const showError = (inputElementId, message) => {
    const feedbackElement = document.getElementById(inputElementId + "Feedback");
    if (feedbackElement) {
      feedbackElement.textContent = message;
      feedbackElement.style.display = "block"; // Sicherstellen, dass es sichtbar ist
      inputField.setAttribute('aria-invalid', 'true');
    }
    const inputField = document.getElementById(inputElementId);
    if (inputField) {
      inputField.classList.add("is-invalid");
      inputField.setAttribute('aria-invalid', 'false'); // Oder ganz entfernen: inputField.removeAttribute('aria-invalid');
    }
  };

/**
  * Versteckt die Fehlermeldung unterhalb eines Eingabefeldes und entfernt die rote Markierung.
  * @param {string} inputElementId - Die ID des Eingabefeldes.
  */
  const hideError = (inputElementId) => {
    const feedbackElement = document.getElementById(inputElementId + "Feedback");
    if (feedbackElement) {
      feedbackElement.style.display = "none"; // Verstecken
      feedbackElement.textContent = ""; // Inhalt leeren
    }
    const inputField = document.getElementById(inputElementId);
    if (inputField) {
      inputField.classList.remove("is-invalid");
    }
  };

  // *** Validierung und Parsing des Zählerstandes ************************* //

/**
  * Prüft die Gültigkeit eines Zählerstands basierend auf Format und Vorkommastellen.
  * - Entfernt Tausenderpunkte.
  * - Akzeptiert Komma als Dezimaltrennzeichen.
  * - Prüft die Anzahl der Vorkommastellen gegen die Benutzerauswahl.
  * - Erlaubt maximal 3 Nachkommastellen.
  *
  * @param {string} value - Der eingegebene Zählerstand (z.B. "1.234,567" oder "1234,5").
  * @param {number} expectedVorkommastellen - Die maximal erlaubte Anzahl an Vorkommastellen.
  * @returns {boolean} - True, wenn gültig, sonst False.
  */
  const checkVorkommastellen = (value, expectedVorkommastellen) => {
    // Leere Werte werden nicht hier validiert.
    if (!value || !value.trim()) return true;

    // Standardisiere Dezimaltrennzeichen und entferne Tausenderpunkte
    const cleanedForParsing = value.replace(/\./g, "").replace(",", ".");
    const numericValue = parseFloat(cleanedForParsing);

    // Gültig, wenn 0 (unabhängig von Vorkommastellen-Einstellung)
    if (!isNaN(numericValue) && numericValue === 0) {
      return true;
    }

    // Trenne Vor- und Nachkommastellen
    const parts = value.replace(/\./g, "").split(","); // Entferne Tausenderpunkte, splitte am Komma
    const vorkommaPart = parts[0].replace(/^0+/, ""); // Entferne führende Nullen
    const nachkommaPart = parts[1] || "";

    logDebug(`Vorkomma-Prüfung: Roh='${parts[0]}', Bereinigt='${vorkommaPart}', Erwartet=${expectedVorkommastellen}`);

    // Prüfe Anzahl Vorkommastellen (Länge des bereinigten Teils)
    if (vorkommaPart.length > expectedVorkommastellen) {
      logError(`Zu viele Vorkommastellen: ${vorkommaPart.length} > ${expectedVorkommastellen}`);
      return false;
    }

    // Prüfe Anzahl Nachkommastellen
    if (nachkommaPart.length > 3) {
      logError(`Zu viele Nachkommastellen: ${nachkommaPart.length} > 3`);
      return false;
    }

    return true;
  };

/**
  * Validiert das Format und die Vorkommastellen eines Zählerstand-Eingabefeldes.
  * Zeigt ggf. eine Fehlermeldung an oder versteckt sie.
  * @param {HTMLInputElement} inputElement - Das zu validierende Input-Element.
  * @param {number} vorkommastellen - Die maximal erlaubte Anzahl Vorkommastellen.
  * @returns {boolean} - True, wenn die Eingabe gültig ist, sonst False.
  */
  const validateZaehlerstandInput = (inputElement, vorkommastellen) => {
    const value = inputElement.value.trim();
    // Leere Eingabe ist erstmal ok (wird in updateCalculation geprüft)
    if (!value) {
      hideError(inputElement.id);
      return true; // Nicht 'false', da kein *Fehler* vorliegt, nur fehlende Eingabe
    }

    // Regex prüft auf: Ziffern, optionale Tausenderpunkte, optionales Komma mit bis zu 3 Nachkommastellen.
    // Erlaubt z.B.: 123 | 123,4 | 1.234 | 1.234,567 | 0,123
    const regex = /^(0|[1-9]\d{0,2}(\.\d{3})*)(,\d{1,3})?$/;

    if (!regex.test(value)) {
      showError(inputElement.id, "Ungültiges Format. Erwartet: 1.234,567");
      logWarn("Ungültiges Zählerstand-Format: " + value);
      return false;
    }

    if (!checkVorkommastellen(value, vorkommastellen)) {
      showError(inputElement.id, `Maximal ${vorkommastellen} Vorkommastellen erlaubt.`);
      logWarn("Vorkommastellen-Validierung fehlgeschlagen für: " + value);
      return false;
    }

    // Wenn alles passt, Fehler verstecken
    hideError(inputElement.id);
    return true;
  };

/**
  * Wandelt einen formatierten Zählerstand-String (z.B. "1.234,56") in eine Zahl um.
  * @param {string} value - Der formatierte String.
  * @returns {number | string} - Die Zahl oder "-", wenn die Eingabe ungültig/leer ist.
  */
  const parseValue = (value) => {
    if (!value || !value.trim()) return "-";
    // Entferne Tausenderpunkte, ersetze Komma durch Punkt für parseFloat
    const cleanedValue = value.replace(/\./g, "").replace(/,/, ".");
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? "-" : number;
  };

  // *** Datum Validierung und Parsing ************************************* //

/**
  * Prüft, ob ein String ein gültiges Datum im Format TT.MM.JJJJ ist.
  * @param {string} dateString - Der zu prüfende Datumsstring.
  * @returns {boolean} - True, wenn gültig, sonst False.
  */
  const isValidGermanDate = (dateString) => {
    if (!dateString) return false;
    const regex = /^\d{2}\.\d{2}\.\d{4}$/; // TT.MM.JJJJ
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split('.').map(Number);
    // Prüfe auf plausible Werte (Monat 1-12, Tag 1-31 etc.) - einfache Prüfung
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }
    // Erzeuge ein Date-Objekt und prüfe, ob es dem Input entspricht (verhindert ungültige Tage wie 31.04.)
    const date = new Date(year, month - 1, day); // Monat ist 0-basiert in Date()
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

/**
  * Wandelt einen gültigen deutschen Datumsstring (TT.MM.JJJJ) in ein Date-Objekt um.
  * @param {string} dateString - Der Datumsstring.
  * @returns {Date | null} - Das Date-Objekt oder null bei ungültigem Format.
  */
  const parseGermanDate = (dateString) => {
    if (!isValidGermanDate(dateString)) return null;
    const [day, month, year] = dateString.split('.').map(Number);
    // Wichtig: new Date(year, monthIndex, day) - monthIndex ist 0-basiert!
    return new Date(year, month - 1, day);
  };

/**
  * Prüft, ob das Datum in einem Wintermonat liegt (definiert in CONFIG.winterMonths).
  * @param {string | Date} dateInput - Ein Datumsstring (TT.MM.JJJJ) oder ein Date-Objekt.
  * @returns {boolean} - True, wenn es ein Wintermonat ist, sonst False.
  */
  const isWinterMonth = (dateInput) => {
    let date;
    if (typeof dateInput === 'string') {
      date = parseGermanDate(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return false; // Ungültiger Input
    }

    if (!date || isNaN(date.getTime())) return false; // Prüfen ob Datum gültig ist

    const month = date.getMonth() + 1; // getMonth() ist 0-basiert, daher +1
    return CONFIG.winterMonths.includes(month);
  };
  
/**
  * Validiert ein Datums-Eingabefeld auf das Format TT.MM.JJJJ.
  * Setzt ggf. die 'is-invalid' Klasse und eine Custom Validity Message.
  * @param {HTMLInputElement} inputElement - Das zu validierende Datums-Input-Element.
  */
  const validateInputDate = (inputElement) => {
    const value = inputElement.value.trim();
    // Leere Eingabe ist ok (wird in updateCalculation behandelt)
    if (!value) {
      inputElement.classList.remove("is-invalid");
      inputElement.setCustomValidity("");
      hideError(inputElement.id); // Auch Feedback-Element zurücksetzen
      return;
    }

    if (!isValidGermanDate(value)) {
      inputElement.classList.add("is-invalid");
      // Setze CustomValidity für Browser-Feedback (z.B. bei Formular-Submit)
      inputElement.setCustomValidity("Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.");
      // Zeige auch das Bootstrap-Feedback-Element an
      showError(inputElement.id, "Ungültiges Format. Erwartet: TT.MM.JJJJ");
    } else {
      inputElement.classList.remove("is-invalid");
      inputElement.setCustomValidity("");
      hideError(inputElement.id); // Fehler ausblenden, wenn gültig
    }
  };

  // Fügt Event Listener für die Live-Validierung der Datumseingaben hinzu.
  [datOldInput, datNewInput, datFutureInput, datBetweenInput].forEach((element) => {
    element.addEventListener("input", () => validateInputDate(element));
  });

  // *** Zusätzliche Validierung/Formatierung für Zählerstände beim Verlassen des Feldes *** //
  [zstOldInput, zstNewInput].forEach(input => {
    input.addEventListener("change", () => {
      let value = input.value.trim();
      // Versuche, die aktuelle Anzahl Vorkommastellen zu bekommen
      const currentVorkommastellen = parseInt(vorkommastellenOption.value, 10);
      // Validieren mit der aktuellen Einstellung
      if (!validateZaehlerstandInput(input, currentVorkommastellen)) {
        // Wenn ungültig, mache nichts weiter hier (Fehler wird schon angezeigt)
        return;
      }
      // Automatisch ",0" hinzufügen, wenn keine Nachkommastellen eingegeben wurden
      // und der Wert nicht nur aus Punkten besteht (passiert bei leerem Input -> wird zu ".")
      if (value && !value.includes(",") && !/^\.+$/.test(value.replace(/\d/g,''))) {
        // Nur hinzufügen, wenn es sich nicht um den Wert "0" handelt
        if (parseValue(value) !== 0) {
          input.value = value + ",0";
        } else {
          // Falls der Wert 0 ist, als "0,0" formatieren
          input.value = "0,0";
        }
      }
    });
  });

  // *** Berechnungsfunktionen ********************************************* //

/**
  * Berechnet den Verbrauch zwischen zwei Zählerständen, berücksichtigt Überlauf.
  * Der Überlauf passiert, wenn oldValue > newValue.
  * @param {number} oldValue - Der vorherige Zählerstand (als Zahl).
  * @param {number} newValue - Der aktuelle Zählerstand (als Zahl).
  * @param {number} maxValue - Der maximale Wert des Zählers vor dem Überlauf (z.B. 999999).
  * @returns {number | string} - Der berechnete Verbrauch oder "-" bei ungültigen Eingaben.
  */
  const calculateConsumption = (oldValue, newValue, maxValue) => {
    // Sicherstellen, dass beide Werte gültige Zahlen sind
    if (typeof oldValue !== 'number' || isNaN(oldValue) || typeof newValue !== 'number' || isNaN(newValue)) {
      logError(`Ungültige Werte für Verbrauchsrechnung: Alt=${oldValue}, Neu=${newValue}`);
      return "-"; // Oder 0 oder NaN, je nach gewünschtem Fehlerhandling
    }

    if (oldValue > newValue) {
      // Überlauf erkannt
      logDebug(`Überlauf bei Verbrauchsberechnung! Alt: ${oldValue}, Neu: ${newValue}, Max: ${maxValue}`);
      // Formel: (Rest bis Maximum) + Neuer Wert + 1 (für den Schritt über den Nullpunkt)
      return (maxValue - oldValue) + newValue + 1;
    } else {
      // Kein Überlauf, einfache Differenz
      return newValue - oldValue;
    }
  };

/**
  * Berechnet optional einen angepassten Verbrauch mit Winterzuschlag.
  * Wendet einen prozentualen Zuschlag (CONFIG.winterFactor) auf den Verbrauch an,
  * der anteilig auf die Tage in Wintermonaten (CONFIG.winterMonths) entfällt.
  *
  * @param {string} startDateStr - Startdatum im Format TT.MM.JJJJ.
  * @param {string} endDateStr - Enddatum im Format TT.MM.JJJJ.
  * @param {number} baseConsumption - Der ursprüngliche Verbrauch im Gesamtzeitraum.
  * @returns {{adjustedConsumption: number, winterDays: number}} - Objekt mit angepasstem Verbrauch und Anzahl der Wintertage.
  */
  const calculateWinterAdjustedConsumption = (startDateStr, endDateStr, baseConsumption) => {
    const start = parseGermanDate(startDateStr);
    const end = parseGermanDate(endDateStr);

    // Prüfe Inputs
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || typeof baseConsumption !== 'number' || isNaN(baseConsumption) || baseConsumption < 0) {
      logDebug("Winteranpassung übersprungen: Ungültige Daten oder Verbrauch.");
      return { adjustedConsumption: baseConsumption, winterDays: 0 };
    }
    if (start >= end) {
       logDebug("Winteranpassung übersprungen: Startdatum liegt nicht vor Enddatum.");
       return { adjustedConsumption: baseConsumption, winterDays: 0 };
    }


    let winterDaysCount = 0;
    let totalDaysCount = 0;
    const oneDay = 1000 * 60 * 60 * 24; // Millisekunden pro Tag

    // Iteriere durch jeden Tag im Zeitraum (inklusive Start- und Endtag)
    for (let d = new Date(start); d <= end; d.setTime(d.getTime() + oneDay)) {
      totalDaysCount++;
      // Kopie des Datums für isWinterMonth erstellen, um Original nicht zu verändern
      if (isWinterMonth(new Date(d))) {
        winterDaysCount++;
      }
    }
    // Korrektur: Der letzte Tag wird in der Schleife übersprungen, wenn d <= end verwendet wird.
    // Alternative: calculateDays verwenden
    totalDaysCount = calculateDays(startDateStr, endDateStr);
    // Manuelle Zählung der Wintertage bleibt genauer
    winterDaysCount = 0; // Neu zählen
    if (totalDaysCount > 0) {
      let currentDate = new Date(start);
      for (let i = 0; i < totalDaysCount; i++) {
        if (isWinterMonth(currentDate)) {
          winterDaysCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      totalDaysCount = 0; // Sicherstellen, dass es nicht negativ ist
    }

    logDebug(`Wintertage gezählt: ${winterDaysCount} von ${totalDaysCount} Gesamttagen.`);

    if (totalDaysCount <= 0 || winterDaysCount === 0) {
      // Keine Anpassung nötig, wenn keine Tage oder keine Wintertage im Zeitraum liegen
      return { adjustedConsumption: baseConsumption, winterDays: winterDaysCount };
    }

    // Berechne den durchschnittlichen Tagesverbrauch (Basis)
    const averageDailyConsumption = baseConsumption / totalDaysCount;

    // Berechne den zusätzlichen Verbrauch nur für die Wintertage
    // Zusatz = Tagesverbrauch * Anzahl Wintertage * (Winterfaktor - 1)
    // Beispiel: 10 Einheiten/Tag * 30 Wintertage * (1.02 - 1) = 10 * 30 * 0.02 = 6 Einheiten extra
    const additionalWinterConsumption = averageDailyConsumption * winterDaysCount * (CONFIG.winterFactor - 1);

    // Addiere den zusätzlichen Verbrauch zum Basisverbrauch
    const finalAdjustedConsumption = baseConsumption + additionalWinterConsumption;

    logDebug(`Winteranpassung: Basis=${baseConsumption.toFixed(3)}, Zusatz=${additionalWinterConsumption.toFixed(3)}, Angepasst=${finalAdjustedConsumption.toFixed(3)}`);

    return {
      adjustedConsumption: finalAdjustedConsumption,
      winterDays: winterDaysCount // Gebe die gezählten Wintertage zurück
    };
  };

/**
  * Berechnet die Anzahl der Tage zwischen zwei Daten (inklusive Enddatum).
  * @param {string} startDateStr - Startdatum (TT.MM.JJJJ).
  * @param {string} endDateStr - Enddatum (TT.MM.JJJJ).
  * @returns {number | string} - Anzahl der Tage oder "-" bei ungültigen Daten.
  */
  const calculateDays = (startDateStr, endDateStr) => {
    const start = parseGermanDate(startDateStr);
    const end = parseGermanDate(endDateStr);

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      logError(`Ungültige Daten für Tagesberechnung: Start=${startDateStr}, Ende=${endDateStr}`);
      return "-";
    }
    // Differenz in Millisekunden / Millisekunden pro Tag. +1 um das Enddatum einzuschließen.
    const diffTime = Math.abs(end - start);
    // Math.ceil, um sicherzustellen, dass auch Bruchteile eines Tages als voller Tag zählen (obwohl bei Mitternacht zu Mitternacht nicht nötig)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 Inklusive Endtag

    // Korrektur: Wenn start und end am gleichen Tag sind, ist die Differenz 0, Ergebnis sollte 1 sein.
    // Wenn end einen Tag nach start ist, ist die Differenz 1 Tag (in ms), Ergebnis sollte 2 sein.
    // Die Formel `Math.ceil(diffTime / msPerDay) + 1` scheint korrekt zu sein.

    return diffDays;
  };

  // *** Formatierungs- und Rundungsfunktionen ***************************** //

/**
  * Formatiert eine Zahl nach deutschen Regeln (Tausenderpunkte, Komma als Dezimaltrennzeichen).
  * @param {number} value - Die zu formatierende Zahl.
  * @returns {string} - Der formatierte String.
  */
  const formatNumber = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return "-";
    // Mindestens 0, maximal 3 Nachkommastellen anzeigen
    return value.toLocaleString("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

/**
  * Rundet einen Wert basierend auf der Benutzerauswahl (Standard, Abrunden, Keine).
  * Formatiert das Ergebnis anschließend.
  * @param {number | string} value - Der zu rundende Wert.
  * @returns {string} - Der gerundete und formatierte Wert als String, oder "-" bei ungültiger Eingabe.
  */
  const roundValue = (value) => {
    const number = typeof value === 'string' ? parseValue(value) : value; // Sicherstellen, dass es eine Zahl ist

    if (number === "-" || typeof number !== 'number' || isNaN(number)) {
      return "-";
    }

    const roundingMethod = roundingOption.value || "standard"; // 'standard', 'floor', 'none'
    let roundedValue;

    switch (roundingMethod) {
      case "floor":
        roundedValue = Math.floor(number);
        break;
      case "none":
        // parseFloat(toFixed(3)) entfernt unnötige Nullen, behält aber bis zu 3 Stellen
        roundedValue = parseFloat(number.toFixed(3));
        break;
      case "standard":
      default:
        roundedValue = Math.round(number);
        break;
    }
    // Formatiere das gerundete Ergebnis für die Anzeige
    return formatNumber(roundedValue);
  };

/**
  * Setzt CSS-Klassen 'negative' oder 'overflow' basierend auf dem Wert.
  * @param {HTMLElement} element - Das DOM-Element, das gestylt werden soll.
  * @param {number | string} value - Der numerische Wert oder "-".
  * @param {number} maxValue - Der Maximalwert des Zählers für die Overflow-Prüfung.
  */
  const setClassByValue = (element, value, maxValue) => {
    // Entferne zuerst alle relevanten Klassen
    element.classList.remove("negative", "overflow");

    if (typeof value === 'number' && !isNaN(value)) {
      if (value < 0) {
        element.classList.add("negative");
      }
      // 'overflow' Klasse wird hier nicht direkt gesetzt, da der Zählerstand selbst
      // nach Überlauf wieder klein ist. Overflow wird nur geloggt.
      // Diese Funktion ist primär für 'negative' gedacht.
      // else if (value > maxValue) { // Diese Bedingung trifft nach Überlauf nicht zu.
      //   element.classList.add("overflow");
      // }
    }
  };

  // *** Hauptfunktion zur Aktualisierung der Berechnungen und der Anzeige *** //

  const updateCalculation = () => {
    logDebug("--- Starte Neuberechnung ---");

    // *** 1. Eingaben sammeln und Validierung der Grundvoraussetzungen *** //

    const oldDateStr = datOldInput.value.trim();
    const newDateStr = datNewInput.value.trim();
    const futureDateStr = datFutureInput.value.trim();
    const betweenDateStr = datBetweenInput.value.trim();

    const zstOldStr = zstOldInput.value.trim();
    const zstNewStr = zstNewInput.value.trim();

    const vorkommastellen = parseInt(vorkommastellenOption.value, 10); // Als Zahl holen
    const maxValue = Math.pow(10, vorkommastellen) - 1; // Berechne maxValue dynamisch

    // Deklariere zstBetweenVal und zstFutureVal am Anfang mit einem Standardwert
    let zstBetweenVal = "-";
    let zstFutureVal = "-";

    // Prüfung auf vollständige Pflichteingaben
    if (!zstOldStr || !zstNewStr || !oldDateStr || !newDateStr) {
      logDebug("Berechnung abgebrochen: Pflichtfelder nicht vollständig ausgefüllt.");
      // Optional: Ausgabefelder leeren oder Meldung anzeigen
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

    // Validierung der Zählerstände und Daten direkt hier, bevor Werte geparst werden
    let inputsValid = true;
    if (!validateZaehlerstandInput(zstOldInput, vorkommastellen)) inputsValid = false;
    if (!validateZaehlerstandInput(zstNewInput, vorkommastellen)) inputsValid = false;
    if (!isValidGermanDate(oldDateStr)) inputsValid = false; // validateInputDate wurde schon per Listener getriggert
    if (!isValidGermanDate(newDateStr)) inputsValid = false;
    if (futureDateStr && !isValidGermanDate(futureDateStr)) inputsValid = false;
    if (betweenDateStr && !isValidGermanDate(betweenDateStr)) inputsValid = false;

    // Datumslogik prüfen: newDate > oldDate etc.
    const oldDate = parseGermanDate(oldDateStr);
    const newDate = parseGermanDate(newDateStr);
    if (!oldDate || !newDate || newDate <= oldDate) {
      showError(datNewInput.id, "Das 'Neue Datum' muss nach dem 'Alten Datum' liegen.");
      inputsValid = false;
    } else {
      hideError(datNewInput.id); // Fehler entfernen, falls vorher vorhanden
    }

    const betweenDate = parseGermanDate(betweenDateStr);
    if (betweenDate && (betweenDate <= oldDate || betweenDate >= newDate)) {
      showError(datBetweenInput.id, "Das 'Dazwischen Datum' muss zwischen dem alten und neuen Datum liegen.");
      inputsValid = false;
    } else if (betweenDate) {
      hideError(datBetweenInput.id);
    }

    const futureDate = parseGermanDate(futureDateStr);
    if (futureDate && futureDate <= newDate) {
      showError(datFutureInput.id, "Das 'Zukunftsdatum' muss nach dem 'aktuellen Datum' liegen.");
      inputsValid = false;
    } else if (futureDate) {
      hideError(datFutureInput.id);
    }

    if (!inputsValid) {
      logWarn("Berechnung abgebrochen: Eingaben sind ungültig.");
      // Optional: Sicherstellen, dass alle Ausgaben leer/neutral sind
      // (wird meist schon durch frühere Checks erledigt)
      return;
    }

    // *** 2. Werte parsen *** //

    const zstOldVal = parseValue(zstOldStr);
    const zstNewVal = parseValue(zstNewStr);

    // Wenn Parsing fehlschlägt (sollte durch Validierung oben verhindert werden)
    if (zstOldVal === "-" || zstNewVal === "-") {
      logError("Fehler beim Parsen der Zählerstände trotz Validierung.");
      return;
    }

    // *** 3. Tage berechnen *** //

    const daysTotalOldToNew = calculateDays(oldDateStr, newDateStr);
    const daysOldToBetween = betweenDate ? calculateDays(oldDateStr, betweenDateStr) : "-";
    const daysNewToFuture = futureDate ? calculateDays(newDateStr, futureDateStr) : "-";
    // Tage zwischen 'Between' und 'New' (nur intern benötigt, falls ZST dazwischen berechnet wird)
    const daysBetweenToNew = betweenDate ? calculateDays(betweenDateStr, newDateStr) : "-";

    // *** 4. Korrekten Gesamtverbrauch und Tagesverbrauch berechnen *** //

    // Dieser Schritt MUSS vor der Interpolation/Extrapolation erfolgen!
    // *** 4a. Korrekten Gesamtverbrauch zwischen oldDate und newDate berechnen (mit Überlauf) *** //
    const totalConsumptionCorrected = calculateConsumption(zstOldVal, zstNewVal, maxValue);
    if (totalConsumptionCorrected === "-") {
      logError("Berechnung abgebrochen: Fehler bei der Gesamtverbrauchs-Berechnung.");
      return; // Abbruch, wenn Basisverbrauch nicht ermittelt werden kann
    }

    // *** 4b. Tagesverbrauch berechnen (Basis: korrigierter Gesamtverbrauch) *** //
    let dailyConsumption = 0;
    let adjustedConsumption = totalConsumptionCorrected; // Startwert, wird ggf. angepasst
    let winterDays = 0; // Zurückgegebene Wintertage

    if (daysTotalOldToNew > 0) {
      // Winteranpassung ANWENDEN, falls Checkbox aktiv ist
      if (winterModeCheckbox.checked) {
        const winterResult = calculateWinterAdjustedConsumption(oldDateStr, newDateStr, totalConsumptionCorrected);
        adjustedConsumption = winterResult.adjustedConsumption; // Verwende angepassten Verbrauch
        winterDays = winterResult.winterDays; // Merke dir Anzahl Wintertage
        logDebug(`Winteranpassung aktiv: Angepasster Gesamtverbrauch = ${adjustedConsumption.toFixed(3)}, Wintertage = ${winterDays}`);
      } else {
        logDebug(`Winteranpassung deaktiviert.`);
        // adjustedConsumption bleibt gleich totalConsumptionCorrected
      }

      // Finalen Tagesverbrauch aus dem (ggf. angepassten) Verbrauch berechnen
      dailyConsumption = adjustedConsumption / daysTotalOldToNew;

      // Sicherheitscheck für Tagesverbrauch
      if (dailyConsumption < 0 || isNaN(dailyConsumption)) {
        logError(`Fehler: Berechneter Tagesverbrauch ist ungültig (${dailyConsumption}). Setze auf 0.`);
        dailyConsumption = 0;
      } else {
        logDebug(`Finaler Tagesverbrauch berechnet: ${dailyConsumption.toFixed(5)}`);
      }

    } else {
      logError("Fehlerhafte Werte: Gesamttage zwischen Alt und Neu sind 0 oder negativ.");
      dailyConsumption = 0; // Keine Berechnung möglich
    }

    // *** 5. Zählerstände interpolieren/extrapolieren *** //

    // 5a. Zählerstand "Dazwischen" berechnen
    if (betweenDate && daysOldToBetween !== "-" && daysOldToBetween > 0 && dailyConsumption !== "-") {
      // Berechne erwarteten Zählerstand: Alter Stand + (Tagesverbrauch * Tage bis Dazwischen)
      const predictedBetweenValue = zstOldVal + dailyConsumption * daysOldToBetween;

      // Überlaufbehandlung für den Zwischenwert
      if (predictedBetweenValue > maxValue) {
        // Modulo-Arithmetik für Überlauf (angenommen, Zähler springt von maxValue auf 1)
        zstBetweenVal = (predictedBetweenValue - 1) % maxValue + 1;
        logDebug(`Überlauf beim Zwischenwert erkannt! Berechnet: ${predictedBetweenValue.toFixed(3)}, Korrigiert auf: ${zstBetweenVal.toFixed(3)}`);
      } else if (predictedBetweenValue < 0) {
        logError("Negativer Zwischen-Zählerstand vorhergesagt.");
        zstBetweenVal = "-"; // Fehlerwert
      } else {
        zstBetweenVal = predictedBetweenValue; // Kein Überlauf
      }
    } else if (betweenDate) {
      logWarn("Zwischen-Zählerstand konnte nicht berechnet werden (ungültige Tage oder Tagesverbrauch).");
    }

    // *** 5b. Zählerstand "Zukunft" berechnen *** //
    ///let zstFutureVal = "-";
    if (futureDate && daysNewToFuture !== "-" && daysNewToFuture > 0 && dailyConsumption !== "-") {
      // Berechne erwarteten Zählerstand: Neuer Stand + (Tagesverbrauch * Tage bis Zukunft)
      const predictedFutureValue = zstNewVal + dailyConsumption * daysNewToFuture;

      // Überlaufbehandlung für den Zukunftswert
      if (predictedFutureValue > maxValue) {
        zstFutureVal = (predictedFutureValue - 1) % maxValue + 1; // Modulo
        logDebug(`Überlauf beim Zukunftswert erkannt! Berechnet: ${predictedFutureValue.toFixed(3)}, Korrigiert auf: ${zstFutureVal.toFixed(3)}`);
      } else if (predictedFutureValue < 0) {
        logError("Negativer Zukunfts-Zählerstand vorhergesagt.");
        zstFutureVal = "-"; // Fehlerwert
      } else {
        zstFutureVal = predictedFutureValue; // Kein Überlauf
      }
    } else if (futureDate) {
      logWarn("Zukunfts-Zählerstand konnte nicht berechnet werden (ungültige Tage oder Tagesverbrauch).");
    }

    // *** 6. Verbräuche für die einzelnen Perioden berechnen *** //
    // Verwende IMMER calculateConsumption für Konsistenz und Überlaufbehandlung

    // Verbrauch von Alt bis Neu (Gesamtverbrauch der Eingabeperiode)
    ///const verbrauchToNew = calculateConsumption(zstOldVal, zstNewVal, maxValue);
    // Verbrauch von "Alt" bis "Neu" ODER "Dazwischen" bis "Neu", abhängig davon, ob ein "Dazwischen"-Datum vorliegt
    const verbrauchToNew = (betweenDate && zstBetweenVal !== "-")
      ? calculateConsumption(zstBetweenVal, zstNewVal, maxValue)
      : calculateConsumption(zstOldVal, zstNewVal, maxValue);

    // Verbrauch von Alt bis Dazwischen
    const verbrauchToBetween = (betweenDate && zstBetweenVal !== "-") ? calculateConsumption(zstOldVal, zstBetweenVal, maxValue) : "-";

    // Verbrauch von Neu bis Zukunft
    const verbrauchToFuture = (futureDate && zstFutureVal !== "-") ? calculateConsumption(zstNewVal, zstFutureVal, maxValue) : "-";

    // *** 7. Ergebnisse im DOM anzeigen *** //

    // Tage anzeigen
    daysNew.textContent = betweenDate && zstBetweenVal !== "-" ? daysBetweenToNew : (isNaN(daysTotalOldToNew) ? "-" : daysTotalOldToNew);

    daysBetween.textContent = isNaN(daysOldToBetween) ? "-" : daysOldToBetween;
    daysFuture.textContent = isNaN(daysNewToFuture) ? "-" : daysNewToFuture;

    // Berechnete Zählerstände anzeigen (gerundet und formatiert)
    zstBetween.textContent = roundValue(zstBetweenVal);
    zstFuture.textContent = roundValue(zstFutureVal);

    // Berechnete Verbräuche anzeigen (gerundet und formatiert)
    verbrauchNew.textContent = roundValue(verbrauchToNew);
    verbrauchBetween.textContent = roundValue(verbrauchToBetween);
    verbrauchFuture.textContent = roundValue(verbrauchToFuture);

    // CSS Klassen für negative Werte setzen (optional für Overflow, da der Wert selbst nicht > maxValue ist)
    setClassByValue(zstBetween, zstBetweenVal === "-" ? NaN : zstBetweenVal, maxValue);
    setClassByValue(zstFuture, zstFutureVal === "-" ? NaN : zstFutureVal, maxValue);
    setClassByValue(verbrauchNew, verbrauchToNew === "-" ? NaN : verbrauchToNew, maxValue);
    setClassByValue(verbrauchBetween, verbrauchToBetween === "-" ? NaN : verbrauchToBetween, maxValue);
    setClassByValue(verbrauchFuture, verbrauchToFuture === "-" ? NaN : verbrauchToFuture, maxValue);

    // *** 8. Debug-Logs *** //
    logDebug(`--- Berechnungsergebnisse ---`);
    logDebug(`Eckdaten: Alt (${oldDateStr}): ${zstOldVal}, Neu (${newDateStr}): ${zstNewVal}, MaxWert: ${maxValue}`);
    logDebug(`Tage: Alt->Neu=${daysTotalOldToNew}, Alt->Zwischen=${daysOldToBetween}, Neu->Zukunft=${daysNewToFuture}`);
    logDebug(`Tage zwischen Alt->Neu=${daysTotalOldToNew}, Alt->Zwischen=${daysOldToBetween}, Neu->Dazwischen=${daysBetweenToNew}`);
    logDebug(`Verbrauch Gesamt (Alt->Neu): ${totalConsumptionCorrected.toFixed(3)}`);
    logDebug(`Wintermodus: ${winterModeCheckbox.checked}, Wintertage: ${winterDays}, Angepasster Verbrauch (für TV): ${adjustedConsumption.toFixed(3)}`);
    logDebug(`Tagesverbrauch (final): ${dailyConsumption.toFixed(5)}`);
    logDebug(`Zwischen-Datum (${betweenDateStr || '-'}): ZST=${(typeof zstBetweenVal === 'number' ? zstBetweenVal.toFixed(3) : '-')}, Verbrauch (Alt->Zw)=${(typeof verbrauchToBetween === 'number' ? verbrauchToBetween.toFixed(3) : '-')}`);
    logDebug(`Zukunfts-Datum (${futureDateStr || '-'}): ZST=${(typeof zstFutureVal === 'number' ? zstFutureVal.toFixed(3) : '-')}, Verbrauch (Neu->Zu)=${(typeof verbrauchToFuture === 'number' ? verbrauchToFuture.toFixed(3) : '-')}`);
    logDebug(`---------------------------`);
  };

  // *** Event-Listener für alle relevanten Eingaben und Optionen ********** //

  const inputElements = [
    datOldInput, datNewInput, datFutureInput, datBetweenInput,
    zstOldInput, zstNewInput,
    roundingOption, vorkommastellenOption, winterModeCheckbox
  ];

  inputElements.forEach((element) => {
    // 'input' für Text/Datum, 'change' für Select/Checkbox
    const eventType = (element.tagName === 'SELECT' || element.type === 'checkbox') ? 'change' : 'input';
    element.addEventListener(eventType, updateCalculation);
  });

  // *** Initiale Berechnung beim Laden der Seite *************************** //

  // Sicherstellen, dass initiale Validierungen (z.B. für Datum) einmal laufen
  validateInputDate(datOldInput);
  validateInputDate(datNewInput);
  validateInputDate(datFutureInput);
  validateInputDate(datBetweenInput);
  // Dann die erste Berechnung auslösen
  updateCalculation();

}); // Ende DOMContentLoaded
