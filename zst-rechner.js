 /*
  * Zählerstand-Rechner
  *
  * Autor: Thomas Boettcher @ztatement <github [at] ztatement [dot] com>
  * Lizenz: MIT (https://opensource.org/licenses/MIT)
  * Repository: https://github.com/ztatement/ZST-Rechner
  * Erstellt: Tue Apr 01 2025 07:33:03 GMT+0200
  * Letzte Änderung: Mon May 12 2025
  * Version: 2.0
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
  * - Berechnung des durchschnittlichen Tagesverbrauchs
  * - Präzise Interpolation/Extrapolation von Zählerständen mit optionalem Wintermodus,
  *   der unterschiedliche Tagesverbräuche für Sommer- und Wintermonate berücksichtigt.
  * - Korrekte Verbrauchsberechnung für alle Perioden, inklusive Überlaufbehandlung.
  * - Optionale Winteranpassung (Standard: +2% für Nov, Dez, Jan, Feb).
  * - Einstellbare Rundungsoptionen für die Ausgabe.
  * - Einstellbare Anzahl der Vorkommastellen des Zählers (beeinflusst max. Wert).
  * - Initialisierung von Bootstrap Tooltips für Hilfetexte.
  *
  * Nutzung:
  * - Pflichtfelder (Start-ZST, End-ZST, Start-Datum, End-Datum) müssen ausgefüllt sein.
  * - Berechnungen werden bei jeder gültigen Eingabeänderung automatisch aktualisiert.
  */

document.addEventListener("DOMContentLoaded", function () {

  // *** Globale Konfiguration ********************************************* //

  const CONFIG = {
    maxValue: 999999, // Standard-Maximalwert für 6 Vorkommastellen. Wird dynamisch angepasst.
    winterFactor: 1.02, // Faktor für den Mehrverbrauch in Wintermonaten (1.02 = +2%)
    winterMonths: [11, 12, 1, 2], // Monate, die als Wintermonate gelten (1 = Jan, ..., 12 = Dez)
  };

  // *** Bootstrap Tooltip Initialisierung ********************************* //

  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
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
  const vorkommastellenOption = document.getElementById(
    "vorkommastellenOption"
  );
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
    console.warn(`[Warnung]: ${message}`);
  };

/**
  * Schreibt eine Debug-Meldung in die Konsole.
  * @param {string} message - Die Debug-Meldung.
  */
  const logDebug = (message) => {
    console.log(`[Debug]: ${message}`);
  };

  // Verhindere Formular-Submit bei Enter in Eingabefeldern
  const inputFieldsForEnterPrevention = [
    zstOldInput,
    zstNewInput,
    datOldInput,
    datNewInput,
    datFutureInput,
    datBetweenInput,
  ];
  inputFieldsForEnterPrevention.forEach((input) => {
    if (input) { // Stelle sicher, dass das Element existiert
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.keyCode === 13) {
          event.preventDefault();
        }
      });
    }
  });

  // *** Initialisierung *************************************************** //

  // Setzt einen Standardwert für den ältesten Zählerstand, falls das Feld leer ist.
  if (zstOldInput && !zstOldInput.value.trim()) {
    zstOldInput.value = "0,0";
  }

  // *** Fehleranzeige-Funktionen ****************************************** //

/**
  * Zeigt eine Fehlermeldung unterhalb eines Eingabefeldes an und markiert das Feld rot.
  * @param {string} inputElementId - Die ID des Eingabefeldes.
  * @param {string} message - Die anzuzeigende Fehlermeldung.
  */
  const showError = (inputElementId, message) => {
    const inputField = document.getElementById(inputElementId);
    const feedbackElement = document.getElementById(inputElementId + "Feedback");

    if (inputField) {
      inputField.classList.add("is-invalid");
      inputField.setAttribute("aria-invalid", "true");
    }
    if (feedbackElement) {
      feedbackElement.textContent = message;
      feedbackElement.style.display = "block";
    }
  };

/**
  * Versteckt die Fehlermeldung und entfernt die rote Markierung eines Eingabefeldes.
  * @param {string} inputElementId - Die ID des Eingabefeldes.
  */
  const hideError = (inputElementId) => {
    const inputField = document.getElementById(inputElementId);
    const feedbackElement = document.getElementById(inputElementId + "Feedback");

    if (inputField) {
      inputField.classList.remove("is-invalid");
      inputField.removeAttribute("aria-invalid");
    }
    if (feedbackElement) {
      feedbackElement.style.display = "none";
      feedbackElement.textContent = "";
    }
  };

  // *** Validierung und Parsing des Zählerstandes ************************* //

/**
  * Prüft die Gültigkeit der Vorkommastellen eines Zählerstands.
  * @param {string} value - Der eingegebene Zählerstand (z.B. "1.234,567").
  * @param {number} expectedVorkommastellen - Maximal erlaubte Anzahl Vorkommastellen.
  * @returns {boolean} - True, wenn gültig, sonst False.
  */
  const checkVorkommastellen = (value, expectedVorkommastellen) => {
    // Leere Werte werden nicht hier validiert.
    if (!value || !value.trim()) return true;

    // Standardisiere Dezimaltrennzeichen und entferne Tausenderpunkte
    const cleanedForParsing = value.replace(/\./g, "").replace(",", ".");
    const numericValue = parseFloat(cleanedForParsing);
    if (!isNaN(numericValue) && numericValue === 0) return true;

    const parts = value.replace(/\./g, "").split(",");
    const vorkommaPart = parts[0].replace(/^0+/, "") || "0"; // Führende Nullen entfernen, "0" wenn leer
    const nachkommaPart = parts[1] || "";

    if (vorkommaPart.length > expectedVorkommastellen && vorkommaPart !== "0") {
      // Erlaube mehr Stellen, wenn der Wert effektiv kleiner ist (z.B. 000123,45 bei 3 VKS ist ok)
      // Diese Logik ist komplex, daher prüfen wir die Länge des numerischen Teils
      const numVorkomma = Math.floor(Math.abs(numericValue)).toString();
      if (numVorkomma.length > expectedVorkommastellen && numVorkomma !== "0") {
        logError(`Zu viele Vorkommastellen: ${numVorkomma.length} > ${expectedVorkommastellen}`);
        return false;
      }
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
  * @param {HTMLInputElement} inputElement - Das zu validierende Input-Element.
  * @param {number} vorkommastellen - Die maximal erlaubte Anzahl Vorkommastellen.
  * @returns {boolean} - True, wenn die Eingabe gültig ist, sonst False.
  */
  const validateZaehlerstandInput = (inputElement, vorkommastellen) => {
    const value = inputElement.value.trim();
    if (!value) {
      hideError(inputElement.id);
      return true; // Leere Eingabe ist für sich kein Fehler, wird in updateCalculation behandelt
    }

    // Erlaubt: 123 | 123,4 | 1.234 | 1.234,567 | 0,123 | 1234,56 | 123456
    // Erlaubt auch nur Ziffern ohne Tausenderpunkte.
    const regex = /^(0|[1-9]\d{0,2}(\.\d{3})*|\d+)(,\d{1,3})?$/;
    if (!regex.test(value) && value !== "0") { // "0" ist ein Sonderfall, der oft ohne Komma eingegeben wird
      const simpleNumRegex = /^\d+(,\d{1,3})?$/; // Erlaube auch Zahlen ohne Tausenderpunkte wie 12345,67
      if (!simpleNumRegex.test(value)) {
        showError(inputElement.id, "Ungültiges Format. Erwartet z.B. 1.234,567 oder 1234,56");
        logWarn("Ungültiges Zählerstand-Format: " + value);
        return false;
      }
    }

    if (!checkVorkommastellen(value, vorkommastellen)) {
      showError(inputElement.id, `Maximal ${vorkommastellen} Vorkommastellen und 3 Nachkommastellen erlaubt.`);
      logWarn("Vorkommastellen-Validierung fehlgeschlagen für: " + value);
      return false;
    }
    hideError(inputElement.id);
    return true;
  };

/**
  * Wandelt einen formatierten Zählerstand-String in eine Zahl um.
  * @param {string} value - Der formatierte String.
  * @returns {number | string} - Die Zahl oder "-", wenn ungültig/leer.
  */
  const parseValue = (value) => {
    if (!value || !value.trim()) return "-";
    // Entferne Tausenderpunkte, ersetze Komma durch Punkt für parseFloat
    const cleanedValue = value.replace(/\./g, "").replace(/,/, ".");
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? "-" : number;
  };

/**
  * Formatiert eine Zählerstand-Eingabe ins deutsche Format (Tausenderpunkt, Komma).
  * @param {string} rawValue - Die Roh-Eingabe.
  * @returns {string} - Der formatierte Wert oder der Originalwert bei Fehler.
  */
  function formatZaehlerstandOnBlur(rawValue) {
    if (!rawValue || !rawValue.trim()) return "";
    let cleaned = rawValue.replace(/\s/g, ""); // Alle Leerzeichen entfernen

    // Ersetze mehrfache Punkte/Kommas oder ungültige Zeichen, bevor wir parsen
    cleaned = cleaned.replace(/,{2,}/g, ',').replace(/\.{2,}/g, '.');

    // Wenn sowohl Punkt als auch Komma vorkommen, behandle Punkt als Tausendertrennzeichen
    if (cleaned.includes('.') && cleaned.includes(',')) {
      // Wenn Komma nach dem letzten Punkt, dann ist Komma Dezimaltrennzeichen
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        cleaned = cleaned.replace(/\./g, ""); // Punkte als Tausendertrenner entfernen
      } else {
        // Wenn Punkt nach dem letzten Komma (ungewöhnlich für DE),
        // oder umgekehrt, behandle Komma als Tausendertrenner
        cleaned = cleaned.replace(/,/g, ""); // Kommas als Tausendertrenner entfernen
      }
    }
    // Jetzt sollte nur noch ein Dezimaltrennzeichen (Komma oder Punkt) vorhanden sein
    cleaned = cleaned.replace(/,/, "."); // Komma zu Punkt für parseFloat

    let num = parseFloat(cleaned);
    if (isNaN(num)) return rawValue; // Bei Fehler Originalwert zurückgeben

    // Runden auf 3 Nachkommastellen vor der Formatierung
    // num = Math.round(num * 1000) / 1000; // Standardrundung
    // Beibehaltung von bis zu 3 Nachkommastellen ohne Rundung der Eingabe
    const numStr = num.toString();
    const parts = numStr.split('.');
    if (parts.length > 1 && parts[1].length > 3) {
      num = parseFloat(parts[0] + '.' + parts[1].substring(0, 3));
    }

    // Formatieren mit toLocaleString
    let formatted = num.toLocaleString("de-DE", {
      minimumFractionDigits: 0, // Zeige mindestens eine Nachkommastelle, wenn welche vorhanden sind
      maximumFractionDigits: 3,
    });

    // Sicherstellen, dass immer ein Komma und mind. eine Null angezeigt wird, wenn es ein Ganzzahlwert ist, außer bei 0
    // Aber nur wenn der Nutzer nicht explizit z.B. "123" ohne Komma eingegeben hat und es so belassen will
    // Die Anforderung war "Automatisch ",0" hinzufügen"
    if (!formatted.includes(",")) {
        formatted += ",0";
    }

    return formatted;
  }

  // *** Datum Validierung und Parsing ************************************* //

/**
  * Prüft, ob ein String ein gültiges Datum im Format TT.MM.JJJJ ist.
  * @param {string} dateString - Der zu prüfende Datumsstring.
  * @returns {boolean} - True, wenn gültig, sonst False.
  */
  const isValidGermanDate = (dateString) => {
    if (!dateString || !dateString.trim()) return false;
    const normalized = normalizeGermanDate(dateString.trim());
    if (!normalized) return false; // Konnte nicht normalisiert werden

    const regex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!regex.test(normalized)) return false;

    const [day, month, year] = normalized.split(".").map(Number);
    if (year < 1900 || year > 2100 || month < 1 || month > 12) return false;

    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

/**
  * Wandelt einen gültigen deutschen Datumsstring (TT.MM.JJJJ) in ein Date-Objekt um.
  * @param {string} dateString - Der Datumsstring.
  * @returns {Date | null} - Das Date-Objekt oder null bei ungültigem Format.
  */
  const parseGermanDate = (dateString) => {
    if (!dateString || !dateString.trim()) return null;
    const normalized = normalizeGermanDate(dateString.trim());
    if (!isValidGermanDate(normalized)) return null; // Erneute Prüfung mit normalisiertem Wert
    
    const [day, month, year] = normalized.split(".").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0); // Setze Uhrzeit auf Mitternacht
  };

/**
  * Normalisiert verschiedene Datumsformate in das Format TT.MM.JJJJ.
  * @param {string} input - Das eingegebene Datum.
  * @returns {string|null} - Das normalisierte Datum oder null.
  */
  const normalizeGermanDate = (input) => {
    if (!input) return null;
    const match = input.match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{2,4})$/); // Erlaube ., -, /
    if (match) {
      let [_, day, month, year] = match;
      if (year.length === 2) {
        year = (parseInt(year, 10) < 70 ? "20" : "19") + year; // 70 als Grenzwert für 20xx vs 19xx
      }
      day = day.padStart(2, "0");
      month = month.padStart(2, "0");
      return `${day}.${month}.${year}`;
    }
    return null; // Format nicht erkannt
  };
  
/**
  * Prüft, ob das Datum in einem Wintermonat liegt.
  * @param {Date} dateObject - Ein Date-Objekt.
  * @returns {boolean} - True, wenn Wintermonat, sonst False.
  */
  const isWinterMonth = (dateObject) => {
    if (!(dateObject instanceof Date) || isNaN(dateObject.getTime())) return false;
    const month = dateObject.getMonth() + 1; // getMonth() ist 0-basiert
    return CONFIG.winterMonths.includes(month);
  };

/**
  * Validiert ein Datums-Eingabefeld.
  * @param {HTMLInputElement} inputElement - Das zu validierende Input-Element.
  */
 /* const validateInputDate = (inputElement) => {
    const value = inputElement.value.trim();
    if (!value) {
      hideError(inputElement.id);
      inputElement.setCustomValidity("");
      return; // Leere Eingabe ist ok, wird in updateCalculation behandelt
    }

    const normalized = normalizeGermanDate(value);
    if (normalized && normalized !== value) {
        inputElement.value = normalized; // Korrigiere das Format direkt im Feld
    }

    if (!isValidGermanDate(inputElement.value)) { // Prüfe den (potenziell korrigierten) Wert
      showError(inputElement.id,"Ungültiges Format. Erwartet: TT.MM.JJJJ");
      inputElement.setCustomValidity("Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.");
    } else {
      hideError(inputElement.id);
      inputElement.setCustomValidity("");
    }
  };*/
/**
  * Prüft, ob ein String nur erlaubte Zeichen für eine Datumseingabe enthält.
  * @param {string} value - Der zu prüfende String.
  * @returns {boolean} - True, wenn nur Ziffern und erlaubte Trennzeichen enthalten sind.
  */
  const hasValidDateChars = (value) => {
    // Erlaube Ziffern, Punkt, Minus, Slash. Passe dies ggf. an.
    return /^[0-9\.\-\/]*$/.test(value);
  };

/**
  * Validiert ein Datums-Eingabefeld WÄHREND der Eingabe (Live-Feedback).
  * Setzt nur Styling-Klassen, ändert nicht den Wert.
  * @param {HTMLInputElement} inputElement - Das zu validierende Input-Element.
  */
  const validateInputDateLive = (inputElement) => {
    const value = inputElement.value.trim();
    if (!value) {
      // Feld ist leer, entferne mögliche Fehlermarkierung vom letzten Blur
      inputElement.classList.remove("is-invalid");
      inputElement.removeAttribute("aria-invalid");
      // Verstecke auch die Text-Fehlermeldung, falls sichtbar
       const feedbackElement = document.getElementById(inputElement.id + "Feedback");
       if (feedbackElement) {
          feedbackElement.style.display = "none";
          feedbackElement.textContent = "";
       }
      return;
    }

    // Prüfe nur auf ungültige Zeichen während der Eingabe
    if (!hasValidDateChars(value)) {
      inputElement.classList.add("is-invalid");
      inputElement.setAttribute("aria-invalid", "true");
      // Zeige hier noch keine Text-Fehlermeldung an, nur die Umrandung
    } else {
      // Gültige Zeichen, entferne die Markierung
      inputElement.classList.remove("is-invalid");
      inputElement.removeAttribute("aria-invalid");
    }
  };

/**
  * Normalisiert, validiert und setzt den Wert eines Datumsfeldes beim Verlassen (Blur).
  * Zeigt finale Fehlermeldungen an.
  * @param {HTMLInputElement} inputElement - Das zu validierende Input-Element.
  */
  const normalizeAndValidateDateOnBlur = (inputElement) => {
    const value = inputElement.value.trim();
    let normalized = value; // Starte mit dem Originalwert

    if (!value) {
      hideError(inputElement.id); // Verstecke Fehler, wenn Feld geleert wird
      inputElement.setCustomValidity("");
      return; // Leere Eingabe ist ok
    }

    // Versuche zu normalisieren, auch wenn es noch nicht TT.MM.JJJJ ist
    const potentialNormalization = normalizeGermanDate(value);
    if (potentialNormalization) {
      normalized = potentialNormalization; // Nutze normalisierten Wert für finale Prüfung
      // Schreibe den normalisierten Wert zurück ins Feld, nur wenn er sich geändert hat
      // und potenziell gültig aussieht (um zu vermeiden, dass "abc" zu "null" wird)
      if (normalized !== value) {
         inputElement.value = normalized;
      }
    } else {
      // Konnte nicht normalisiert werden (z.B. "abc")
      // normalized bleibt der Originalwert
    }

    // Finale Validierung mit dem (ggf. normalisierten) Wert
    if (!isValidGermanDate(normalized)) {
      // Zeige Fehler nur an, wenn das Feld nicht leer ist
      showError(inputElement.id,"Ungültiges Datum oder Format. Erwartet: TT.MM.JJJJ");
      inputElement.setCustomValidity(
        "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben."
      );
    } else {
      // Gültiges Datum nach Normalisierung
      hideError(inputElement.id);
      inputElement.setCustomValidity("");
      // Stelle sicher, dass der korrekt normalisierte Wert im Feld steht (falls oben nicht geschehen)
      if(inputElement.value !== normalized) {
          inputElement.value = normalized;
      }
    }
  };

  // *** Event-Listener für Datumsfelder (Angepasste Version) ***

  [datOldInput, datNewInput, datFutureInput, datBetweenInput].forEach(
    (element) => {
      if (element) {
        // 1. Live-Validierung (nur Styling für ungültige Zeichen) während der Eingabe
        element.addEventListener("input", () => validateInputDateLive(element));

        // 2. Finale Normalisierung, Validierung und Neuberechnung beim Verlassen
        element.addEventListener("blur", () => {
          normalizeAndValidateDateOnBlur(element); // Normalisiert Wert und validiert final
          updateCalculation(); // Neuberechnung auslösen
        });
      }
    }
  );

  // Live-Validierung und Formatierung für Datumseingaben
 /* [datOldInput, datNewInput, datFutureInput, datBetweenInput].forEach(
    (element) => {
      if (element) {
        element.addEventListener("input", () => validateInputDate(element)); // Validierung während der Eingabe
        element.addEventListener("blur", () => { // Normalisierung beim Verlassen
            validateInputDate(element); // Stellt sicher, dass normalisiert wird und Fehler ggf. angezeigt werden
            updateCalculation(); // Neuberechnung nach Formatänderung
        });
      }
    }
  );*/

  // Formatierung für Zählerstände beim Verlassen des Feldes
  [zstOldInput, zstNewInput].forEach((input) => {
    if (input) {
      input.addEventListener("blur", () => { // "blur" statt "change" für direkteres Feedback
        const currentVorkommastellen = parseInt(vorkommastellenOption.value, 10);
        if (validateZaehlerstandInput(input, currentVorkommastellen)) {
          if (input.value.trim()) {
            input.value = formatZaehlerstandOnBlur(input.value);
          }
        }
        updateCalculation(); // Immer neu berechnen nach potenzieller Formatierung
      });
    }
  });


  // *** Berechnungsfunktionen ********************************************* //

/**
  * Berechnet den Verbrauch zwischen zwei Zählerständen, berücksichtigt Überlauf.
  * @param {number} oldValue - Der vorherige Zählerstand.
  * @param {number} newValue - Der aktuelle Zählerstand.
  * @param {number} maxValue - Der maximale Wert des Zählers.
  * @returns {number | string} - Der berechnete Verbrauch oder "-".
  */
  const calculateConsumption = (oldValue, newValue, maxValue) => {
    if (oldValue === "-" || newValue === "-") return "-";
    if (newValue >= oldValue) {
      return newValue - oldValue;
    } else {
      // Überlauf: (Maximalwert - alter Wert) + neuer Wert + 1 (für den Sprung von maxValue auf 0)
      return maxValue - oldValue + newValue + 1;
    }
  };

/**
  * Berechnet die exakte Dauer zwischen zwei Zeitpunkten (angenommen Mitternacht) in Tagen.
  * Entspricht der Definition Start 00:00:01 bis Ende 00:00:00.
  * @param {Date} startDate - Das Startdatum als Date-Objekt (00:00:00).
  * @param {Date} endDate - Das Enddatum als Date-Objekt (00:00:00).
  * @returns {number | string} - Exakte Dauer in Tagen oder "-".
  */
  const calculateDurationInDays = (startDate, endDate) => {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime()) ||
        !(endDate instanceof Date) || isNaN(endDate.getTime()) ||
        startDate.getTime() > endDate.getTime()) { // Erlaube startDate == endDate (Dauer 0)
        if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
            return 0; // Dauer ist 0, wenn Start und Ende gleich
        }
        logError(`Ungültige Daten für Dauerberechnung: Start=<span class="math-inline">\{startDate\}, Ende\=</span>{endDate}`);
        return "-";
    }
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    // Normalerweise exakte ganze Zahl, wenn Zeitpunkte Mitternacht sind.
    // Zur Sicherheit auf Rundungsfehler prüfen und ggf. runden?
    // return Math.round(diffDays * 1e6) / 1e6; // Runde auf 6 Nachkommastellen
    return diffDays; // Meistens ist keine Rundung nötig
  };

/**
  * Hilfsfunktion: Passt einen Zählerstandswert bei Überschreitung des Maximalwerts an (Überlauf).
  * @param {number} value - Der Rohwert des Zählerstands.
  * @param {number} maxValue - Der Maximalwert des Zählers.
  * @returns {number} - Der korrigierte Wert nach Überlauf.
  */
  const adjustForOverflow = (value, maxValue) => {
    // Beispiel: maxValue = 999. Zst = 998. Verbrauch = 5. Neu wäre 1003.
    // (1003 - 1) % 1000 + 1 = 1002 % 1000 + 1 = 2 + 1 = 3. Falsch.
    // maxValue ist der höchste anzeigbare Wert. Der Zähler geht von maxValue auf 0.
    // Wenn value = 1003, maxValue = 999.
    // Dann ist es (value - (maxValue + 1))
    // Korrekte Logik: Wenn Zähler von z.B. 999 auf 0 springt, ist der "Bereich" maxValue + 1.
    // Beispiel: Zähler max 999. Stand alt 998. Verbrauch 5. Stand neu sollte 3 sein.
    // 998 + 5 = 1003.  1003 % (999 + 1) = 1003 % 1000 = 3.
    if (value > maxValue) {
      return value % (maxValue + 1);
    }
    return value;
    // Die vorherige Logik war: return value > maxValue ? value - maxValue - 1 : value;
    // Diese ist für den Fall gedacht, dass ein Verbrauch addiert wird, der über maxValue hinausgeht.
    // Die Modulo-Operation ist hier generischer.
};


/**
  * Interpoliert/Extrapoliert den Zählerstand für ein Zieldatum. (Erneute Prüfung)
  * Berücksichtigt optional den Wintermodus für eine genauere Verbrauchsverteilung.
  * @param {number} zstRef1 - Referenz-Zählerstand 1 (z.B. zstOld).
  * @param {number} zstRef2 - Referenz-Zählerstand 2 (z.B. zstNew).
  * @param {Date} dateRef1 - Referenz-Datum 1 (als Date-Objekt).
  * @param {Date} dateRef2 - Referenz-Datum 2 (als Date-Objekt).
  * @param {Date} dateTarget - Zieldatum (als Date-Objekt).
  * @param {number} maxValue - Maximalwert des Zählers.
  * @param {boolean} isWinterModeActive - Ob der Wintermodus aktiv ist.
  * @param {object} config - Das CONFIG-Objekt mit winterFactor und winterMonths.
  * @returns {number | string} - Der interpolierte/extrapolierte Zählerstand oder "-".
  */
  const getZstAtTargetDate = (
    zstRef1, zstRef2, dateRef1, dateRef2, dateTarget,
    maxValue, isWinterModeActive, config
  ) => {
    // --- Eingangsvalidierung ---
    if (zstRef1 === "-" || zstRef2 === "-" ||
      !(dateRef1 instanceof Date) || isNaN(dateRef1.getTime()) ||
      !(dateRef2 instanceof Date) || isNaN(dateRef2.getTime()) ||
      !(dateTarget instanceof Date) || isNaN(dateTarget.getTime())) {
      logWarn("getZstAtTargetDate: Ungültige Eingabeparameter.");
      return "-";
    }

    // --- Dauer des Referenzzeitraums ---
    const durationRefPeriod = calculateDurationInDays(dateRef1, dateRef2); // <-- Geändert
    if (durationRefPeriod === "-" || durationRefPeriod < 0) { // Dauer kann 0 sein
      logWarn(`getZstAtTargetDate: Ungültiger Referenzzeitraum (${durationRefPeriod} Tage).`);
      return "-";
    }
    // Sonderfall 0 Dauer: Wenn Zieldatum gleich Start/Enddatum, gib zstRef1 zurück
    if (durationRefPeriod === 0) {
      return (dateTarget.getTime() === dateRef1.getTime()) ? zstRef1 : "-"; // Nur gültig, wenn Ziel = Start
    }

    // --- Gesamtverbrauch im Referenzzeitraum --- (bleibt gleich)
    const consumptionRefPeriod = calculateConsumption(zstRef1, zstRef2, maxValue);
    if (consumptionRefPeriod === "-") return "-";
    if (consumptionRefPeriod === 0) return zstRef1;

    // --- Dauer vom Referenzstart bis zum Zieldatum ---
    let durationFromRef1ToTarget;
    if (dateTarget.getTime() < dateRef1.getTime()) { // Ziel liegt vor Referenzstart
       durationFromRef1ToTarget = calculateDurationInDays(dateTarget, dateRef1); // Dauer ist positiv
       if (durationFromRef1ToTarget === "-") return "-";
       durationFromRef1ToTarget = -durationFromRef1ToTarget; // Mache sie negativ
    } else { // Ziel liegt nach oder auf Referenzstart
       durationFromRef1ToTarget = calculateDurationInDays(dateRef1, dateTarget); // Dauer ist positiv oder 0
       if (durationFromRef1ToTarget === "-") return "-";
    }

    // --- Verbrauch bis zum Zieldatum berechnen ---
    let consumptionToTarget;

    if (isWinterModeActive && config && config.winterFactor && config.winterMonths) {
      // --- Wintermodus ---
      let winterDaysInRefPeriod = 0;
      let tempDateRef = new Date(dateRef1);
      // Zähle Tage im Intervall [dateRef1, dateRef2) - exklusive Enddatum
      for (let i = 0; i < durationRefPeriod; i++) { // Iteriere durationRefPeriod mal
        if (isWinterMonth(tempDateRef)) {
            winterDaysInRefPeriod++;
        }
        tempDateRef.setDate(tempDateRef.getDate() + 1);
      }
      // ACHTUNG: Wenn durationRefPeriod nicht ganzzahlig ist, ist diese Schleife falsch.
      // Besser: Schleife bis tempDateRef.getTime() < dateRef2.getTime()
      winterDaysInRefPeriod = 0; // Neu zählen mit Zeitvergleich
      tempDateRef = new Date(dateRef1);
      while(tempDateRef.getTime() < dateRef2.getTime()){
        if (isWinterMonth(tempDateRef)) {
          winterDaysInRefPeriod++;
        }
        tempDateRef.setDate(tempDateRef.getDate() + 1);
      }
      // -----

      const summerDaysInRefPeriod = durationRefPeriod - winterDaysInRefPeriod; // Dauer kann float sein!

      // Korrektur: Die Anzahl der Tage ist die Dauer. Der Divisor braucht die effektive Anzahl Tage.
      const effectiveDaysInRefPeriod = summerDaysInRefPeriod + winterDaysInRefPeriod * config.winterFactor;

      if (effectiveDaysInRefPeriod === 0) {
          logWarn("getZstAtTargetDate: Wintermodus - effektive Tage sind 0.");
          return (consumptionRefPeriod === 0) ? zstRef1 : "-";
      }
      const baseRatePerEffectiveDay = consumptionRefPeriod / effectiveDaysInRefPeriod; // Verbrauch pro "Sommertag"

      // Zähle effektive Tage im Zeitraum bis zum Ziel [dateRef1, dateTarget)
      let effectiveDaysToTarget = 0;
      let tempDateTarget = new Date(dateRef1);

      if (durationFromRef1ToTarget > 0) { // Ziel nach Start
        // Schleife von dateRef1 bis dateTarget (exklusiv)
        while(tempDateTarget.getTime() < dateTarget.getTime()){
          let factor = isWinterMonth(tempDateTarget) ? config.winterFactor : 1;
          effectiveDaysToTarget += factor;
          tempDateTarget.setDate(tempDateTarget.getDate() + 1);
        }
      } else if (durationFromRef1ToTarget < 0) { // Ziel vor Start
        // Schleife von dateTarget bis dateRef1 (exklusiv)
        tempDateTarget = new Date(dateTarget);
        while(tempDateTarget.getTime() < dateRef1.getTime()){
          let factor = isWinterMonth(tempDateTarget) ? config.winterFactor : 1;
          effectiveDaysToTarget += factor;
          tempDateTarget.setDate(tempDateTarget.getDate() + 1);
        }
        effectiveDaysToTarget = -effectiveDaysToTarget; // Effektive "negative" Dauer
      }

      consumptionToTarget = baseRatePerEffectiveDay * effectiveDaysToTarget;

    } else {
      // --- Lineare Interpolation/Extrapolation ---
      // Verbrauch pro Tag = Gesamtverbrauch / Gesamtdauer
      const dailyRateLinear = consumptionRefPeriod / durationRefPeriod;
      consumptionToTarget = dailyRateLinear * durationFromRef1ToTarget;
    }

    // --- Finalen Zählerstand berechnen --- 
    if (isNaN(consumptionToTarget)) {
      logError("getZstAtTargetDate: consumptionToTarget ist NaN.");
      return "-"; 
    }

    let calculatedZst = zstRef1 + consumptionToTarget;

    // Rückwärts-Überlauf prüfen
    if (calculatedZst < 0 && zstRef1 >= 0 && consumptionToTarget < 0) {
        calculatedZst = (maxValue + 1) + calculatedZst;
    }

    // Wende normalen Überlauf an (Modulo)
    return adjustForOverflow(calculatedZst, maxValue);

  };

  // *** Formatierungs- und Rundungsfunktionen ***************************** //

/**
  * Formatiert eine Zahl nach deutschen Regeln.
  * @param {number} value - Die zu formatierende Zahl.
  * @returns {string} - Der formatierte String.
  */
  const formatNumberOutput = (value) => {
    if (typeof value !== "number" || isNaN(value)) return "-";
    return value.toLocaleString("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

/**
  * Rundet einen Wert basierend auf der Benutzerauswahl und formatiert ihn.
  * @param {number | string} value - Der zu rundende Wert.
  * @returns {string} - Der gerundete und formatierte Wert als String.
  */
  const roundValueForDisplay = (value) => {
    const number = typeof value === "string" ? parseValue(value) : value;
    if (number === "-" || typeof number !== "number" || isNaN(number)) {
      return "-";
    }

    const roundingMethod = roundingOption.value || "standard";
    let roundedValue;

    switch (roundingMethod) {
      case "floor":
        roundedValue = Math.floor(number);
        break;
      case "none":
        // Hier parseFloat(toFixed(3)) um unerwünschtes wissenschaftliches Format zu vermeiden und Nullen zu trimmen.
        // Wir wollen bis zu 3 Nachkommastellen beibehalten.
        roundedValue = parseFloat(number.toFixed(3));
        break;
      case "standard":
      default:
        roundedValue = Math.round(number);
        break;
    }
    return formatNumberOutput(roundedValue);
  };

/**
  * Setzt CSS-Klassen 'negative' basierend auf dem Wert.
  * @param {HTMLElement} element - Das DOM-Element.
  * @param {number | string} value - Der numerische Wert oder "-".
  */
  const setClassByValue = (element, value) => {
    element.classList.remove("negative");
    const numValue = typeof value === 'string' ? parseValue(value) : value;
    if (typeof numValue === "number" && !isNaN(numValue) && numValue < 0) {
      element.classList.add("negative");
    }
  };

  // *** Hauptfunktion zur Aktualisierung der Berechnungen und der Anzeige (Angepasst) *** //
  const updateCalculation = () => {
    logDebug("--- Starte Neuberechnung ---");

    // --- 1. Eingaben sammeln und Basisvalidierung ---
    const vorkommastellen = parseInt(vorkommastellenOption.value, 10);
    const currentMaxValue = Math.pow(10, vorkommastellen) - 1;
    // CONFIG.maxValue wird jetzt nicht mehr global gesetzt, da currentMaxValue lokal verwendet wird
    // und getZstAtTargetDate etc. den Wert als Parameter bekommen.

    const zstOldStr = zstOldInput.value.trim();
    const zstNewStr = zstNewInput.value.trim();
    const datOldStr = datOldInput.value.trim();
    const datNewStr = datNewInput.value.trim();
    const datBetweenStr = datBetweenInput.value.trim();
    const datFutureStr = datFutureInput.value.trim();

    // --- Standardwerte für Ausgaben ---
    const clearOutputs = () => {
    // Deklariere zstBetweenVal und zstFutureVal am Anfang mit einem Standardwert
    let zstBetweenVal = "-";
    let zstFutureVal = "-";
    };

    // --- 2. Validierung der Pflichteingaben und Formatkonsistenz ---
    let inputsValid = true;
        // Prüfung auf vollständige Pflichteingaben
    if (!zstOldStr || !zstNewStr || !datOldStr || !datNewStr) {
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
    if (!validateZaehlerstandInput(zstOldInput, vorkommastellen)) inputsValid = false;
    if (!validateZaehlerstandInput(zstNewInput, vorkommastellen)) inputsValid = false;
    if (!isValidGermanDate(datOldStr)) inputsValid = false;
    if (!isValidGermanDate(datNewStr)) inputsValid = false;
    if (datBetweenStr && !isValidGermanDate(datBetweenStr)) inputsValid = false;
    if (datFutureStr && !isValidGermanDate(datFutureStr)) inputsValid = false;

    // --- 3. Daten parsen ---
    const zstOldVal = parseValue(zstOldStr);
    const zstNewVal = parseValue(zstNewStr);
    const dateOld = parseGermanDate(datOldStr);
    const dateNew = parseGermanDate(datNewStr);
    const dateBetween = datBetweenStr ? parseGermanDate(datBetweenStr) : null;
    const dateFuture = datFutureStr ? parseGermanDate(datFutureStr) : null;

    if (zstOldVal === "-" || zstNewVal === "-" || !dateOld || !dateNew) {
      logError("Fehler beim Parsen der Zählerstände trotz Validierung.");
      return;
    }

    // --- 4. Logische Datumsprüfungen ---
    if (dateNew.getTime() <= dateOld.getTime()) {
      showError(datNewInput.id, "Das 'Neue Datum' muss nach dem 'Alten Datum' liegen.");
      inputsValid = false;
    } else { hideError(datNewInput.id); } // Fehler entfernen, falls vorher vorhanden
    if (dateBetween) {
      
      if (dateBetween.getTime() <= dateOld.getTime() || dateBetween.getTime() >= dateNew.getTime()) {
        showError(datBetweenInput.id, "Das 'Dazwischen Datum' muss zwischen dem alten und neuen Datum liegen.");
        inputsValid = false; } else { hideError(datBetweenInput.id); }
        }
    if (dateFuture) {
      
      if (dateFuture.getTime() <= dateNew.getTime()) { 
      showError(datFutureInput.id, "Das 'Zukunftsdatum' muss nach dem 'aktuellen Datum' liegen.");
      inputsValid = false; } else { hideError(datFutureInput.id); }
    }

    if (!inputsValid) {
      logWarn("Berechnung abgebrochen: Eingaben sind ungültig.");
      // Optional: Sicherstellen, dass alle Ausgaben leer/neutral sind
      // (wird meist schon durch frühere Checks erledigt)
      return;
    }

    // --- 5. Kernberechnungen ---
    const isWinterMode = winterModeCheckbox.checked;

    // --- Berechnung für "Dazwischen" ---
    let zstBetweenVal = "-";
    let consumptionOldToBetween = "-";
    let durationOldToBetweenVal = "-"; // Neuer Name
    if (dateBetween) {
      durationOldToBetweenVal = calculateDurationInDays(dateOld, dateBetween); // <-- Geändert
      if (durationOldToBetweenVal !== "-") {
        zstBetweenVal = getZstAtTargetDate(
          zstOldVal, zstNewVal, dateOld, dateNew, dateBetween,
          currentMaxValue, isWinterMode, CONFIG
        );
        if (zstBetweenVal !== "-") {
          consumptionOldToBetween = calculateConsumption(zstOldVal, zstBetweenVal, currentMaxValue);
        }
      }
    }

    // --- Berechnung für "Zukunft" ---
    let zstFutureVal = "-";
    let consumptionNewToFuture = "-";
    let durationNewToFutureVal = "-"; // Neuer Name
    if (dateFuture) {
      durationNewToFutureVal = calculateDurationInDays(dateNew, dateFuture); // <-- Geändert
      if (durationNewToFutureVal !== "-") {
        zstFutureVal = getZstAtTargetDate(
          zstOldVal, zstNewVal, dateOld, dateNew, dateFuture,
          currentMaxValue, isWinterMode, CONFIG
        );
        if (zstFutureVal !== "-") {
          consumptionNewToFuture = calculateConsumption(zstNewVal, zstFutureVal, currentMaxValue);
        }
      }
    }

    // --- Berechnung für die Anzeige "Neu" (abhängig von "Dazwischen") ---
    let displayDurationNew = "-"; // Neuer Name
    //let displayDaysNew = "-";
    let displayVerbrauchNew = "-";
    let displaySourceDateForNew = dateOld; // Standard: von Alt
    let displaySourceZstForNew = zstOldVal; // Standard: von Alt

    if (dateBetween && zstBetweenVal !== "-") {
      // Wenn Dazwischen existiert, bezieht sich "Neu" auf Dazwischen -> Neu
      displaySourceDateForNew = dateBetween;
      displaySourceZstForNew = zstBetweenVal;
    }
    // Berechne Tage und Verbrauch für den relevanten Abschnitt bis "Neu"
    displayDurationNew = calculateDurationInDays(displaySourceDateForNew, dateNew); // <-- Geändert
    if (displayDurationNew !== "-") {
      displayVerbrauchNew = calculateConsumption(displaySourceZstForNew, zstNewVal, currentMaxValue);
    }

    // --- 6. Ergebnisse im DOM anzeigen ---
    // Verwende duration statt days für IDs daysNew, daysBetween, daysFuture
    daysNew.textContent = displayDurationNew !== "-" ? displayDurationNew.toLocaleString('de-DE', {maximumFractionDigits: 0}) : "-"; // Anzeige ggf. formatieren
    verbrauchNew.textContent = roundValueForDisplay(displayVerbrauchNew);
    setClassByValue(verbrauchNew, displayVerbrauchNew);

    daysBetween.textContent = durationOldToBetweenVal !== "-" ? durationOldToBetweenVal.toLocaleString('de-DE', {maximumFractionDigits: 0}) : "-";
    zstBetween.textContent = roundValueForDisplay(zstBetweenVal);
    verbrauchBetween.textContent = roundValueForDisplay(consumptionOldToBetween);
    setClassByValue(zstBetween, zstBetweenVal);
    setClassByValue(verbrauchBetween, consumptionOldToBetween);

    daysFuture.textContent = durationNewToFutureVal !== "-" ? durationNewToFutureVal.toLocaleString('de-DE', {maximumFractionDigits: 0}) : "-";
    zstFuture.textContent = roundValueForDisplay(zstFutureVal);
    verbrauchFuture.textContent = roundValueForDisplay(consumptionNewToFuture);
    setClassByValue(zstFuture, zstFutureVal);
    setClassByValue(verbrauchFuture, consumptionNewToFuture);

    // --- 7. Debug-Logs ---
    logDebug(`--- Berechnungsergebnisse ---`);
    const debugGesamtVerbrauch = calculateConsumption(zstOldVal, zstNewVal, currentMaxValue);
    const debugGesamtDauer = calculateDurationInDays(dateOld, dateNew); // <-- Geändert
    logDebug(`Eckdaten: Alt (${datOldStr}): <span class="math-inline">\{zstOldVal\}, Neu \(</span>{datNewStr}): ${zstNewVal}, MaxWert: ${currentMaxValue}`);
    // Zeige Dauer mit mehr Nachkommastellen im Debug-Log
    logDebug(`Dauer: Alt->Neu=<span class="math-inline">\{debugGesamtDauer\}, Alt\-\>Zwischen\=</span>{durationOldToBetweenVal}, Dazw->Neu=<span class="math-inline">\{\(dateBetween && displayDurationNew \!\=\= '\-'\) ? displayDurationNew \: 'N/A'\}, Neu\-\>Zukunft\=</span>{durationNewToFutureVal}`);
    logDebug(`Verbrauch Gesamt (Alt->Neu): ${typeof debugGesamtVerbrauch === 'number' ? debugGesamtVerbrauch.toFixed(3) : '-'}`);
    logDebug(`Wintermodus: ${isWinterMode}`);
    logDebug(`Zwischen-Datum (<span class="math-inline">\{datBetweenStr \|\| '\-'\}\)\: ZST\=</span>{(typeof zstBetweenVal === 'number' ? zstBetweenVal.toFixed(3) : '-')}, Verbrauch (Alt->Zw)=${(typeof consumptionOldToBetween === 'number' ? consumptionOldToBetween.toFixed(3) : '-')}`);
    logDebug(`Anzeige Periode "Neu": Verbrauch=<span class="math-inline">\{\(typeof displayVerbrauchNew \=\=\= 'number' ? displayVerbrauchNew\.toFixed\(3\) \: '\-'\)\}, Dauer\=</span>{displayDurationNew}`); // <-- Geändert
    logDebug(`Zukunfts-Datum (<span class="math-inline">\{datFutureStr \|\| '\-'\}\)\: ZST\=</span>{(typeof zstFutureVal === 'number' ? zstFutureVal.toFixed(3) : '-')}, Verbrauch (Neu->Zu)=${(typeof consumptionNewToFuture === 'number' ? consumptionNewToFuture.toFixed(3) : '-')}`);
    logDebug(`---------------------------`);

  };


  // *** Event-Listener für alle relevanten Eingaben und Optionen ********** //

  const allInputElements = [
    datOldInput, datNewInput, datFutureInput, datBetweenInput,
    zstOldInput, zstNewInput,
    roundingOption, vorkommastellenOption, winterModeCheckbox,
  ];

  allInputElements.forEach((element) => {
    if (element) { // Nur Listener hinzufügen, wenn Element existiert
      const eventType =
        element.tagName === "SELECT" || element.type === "checkbox"
          ? "change"
          : "input";
      element.addEventListener(eventType, updateCalculation);
    } else {
        // logWarn(`Ein DOM-Element für EventListener wurde nicht gefunden.`); // Optional: Warnung wenn ein Element fehlt
    }
  });

  // *** Initiale Berechnung und Validierung beim Laden der Seite ************ //
  if (datOldInput) validateInputDateLive(datOldInput);
  if (datNewInput) validateInputDateLive(datNewInput);
  if (datFutureInput) validateInputDateLive(datFutureInput);
  if (datBetweenInput) validateInputDateLive(datBetweenInput);
  
  // Einmalige initiale Formatierung für bereits gefüllte Zählerstandsfelder (z.B. durch Browser AutoFill)
  if (zstOldInput && zstOldInput.value.trim()) {
    zstOldInput.value = formatZaehlerstandOnBlur(zstOldInput.value);
  }
  if (zstNewInput && zstNewInput.value.trim()) {
    zstNewInput.value = formatZaehlerstandOnBlur(zstNewInput.value);
  }
  
  updateCalculation(); // Erste Berechnung auslösen
}); // Ende DOMContentLoaded
