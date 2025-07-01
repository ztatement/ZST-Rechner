 /*
  * Zählerstand-Rechner
  *
  * Autor: Thomas Boettcher @ztatement <github [at] ztatement [dot] com>
  * Lizenz: MIT (https://opensource.org/licenses/MIT)
  * Repository: https://github.com/ztatement/ZST-Rechner
  * Erstellt: Tue Apr 01 2025 07:33:03 GMT+0200
  * Letzte Änderung: Mittwoch, Juni 18 2025
  * Version: 3.5
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

// Zuerst die CONFIG und Logging-Funktionen im globalen Scope definieren
/**
  * Globale Konfiguration für den Zählerstand-Rechner
  * @type {Object}
  * @property {number} maxWert - Maximaler Zählerstandswert (wird dynamisch aus vorkommastellen berechnet)
  * @property {number} winterFaktor - Faktor für erhöhten Verbrauch im Winter (z.B. 1.02 = 2% mehr)
  * @property {number[]} winterMonate - Array der Wintermonate (1-12)
  * @property {number} vorkommastellen - Anzahl der Vorkommastellen des Zählers
  * @property {number} nachkommastellen - Anzahl der Nachkommastellen für Berechnungen
  * @property {boolean} DEBUG_MODE - Debug-Modus aktivieren/deaktivieren
  */
  const CONFIG = {
    maxWert: 999999,
    winterFaktor: 1.02,
    winterMonate: [11, 12, 1, 2],
    vorkommastellen: 6,
    nachkommastellen: 3,
    DEBUG_MODE: true  // Debug-Modus aktivieren/deaktivieren
  };

/**
  * Logging-Funktionen für verschiedene Nachrichtenebenen
  * Alle Funktionen schreiben sowohl in die Konsole als auch in das Debug-Output-Feld
  */
  const logDebug = (message, force = false) => {
    if (CONFIG.DEBUG_MODE) {
      // Ignoriere bestimmte Debug-Nachrichten
      const ignoredMessages = [
        'hideError: Element',
        'showError: Fehlermeldung für',
        'showError: is-invalid Klasse für',
        'Hinweis:',
        'zurückgesetzt',
        'Setze Standard-Ausgaben zurück',
        'After normalizeGermanDate',
        'Normalized value is empty'
      ];

      // Zeige die Nachricht nur, wenn sie nicht ignoriert werden soll
      if (force || !ignoredMessages.some(ignored => message.includes(ignored))) {
        console.log(`[DEBUG] ${message}`);
        const debugOutput = document.getElementById('debugOutput');
        if (debugOutput) {
          debugOutput.value += `[DEBUG] ${message}\n`;
          debugOutput.scrollTop = debugOutput.scrollHeight;
        }
      }
    }
  };

/**
  * Schreibt eine Warnung in die Konsole und das Debug-Output-Feld
  * @param {string} message - Die Warnmeldung
  */
  const logWarn = (message) => {
    if (CONFIG.DEBUG_MODE) {
      console.warn(`[WARN] ${message}`);
      const debugOutput = document.getElementById('debugOutput');
      if (debugOutput) {
        debugOutput.value += `[WARN] ${message}\n`;
        debugOutput.scrollTop = debugOutput.scrollHeight;
      }
    }
  };

/**
  * Schreibt eine Fehlermeldung in die Konsole
  * @param {string} msg - Die Fehlermeldung
  */
  const logError = (msg) => {
    if (CONFIG.DEBUG_MODE) {
      console.error(`[ERROR] ${msg}`);
      const debugOutput = document.getElementById('debugOutput');
      if (debugOutput) {
        debugOutput.value += `[ERROR] ${msg}\n`;
        debugOutput.scrollTop = debugOutput.scrollHeight;
      }
    }
  };

  // Am Anfang des Scripts, nach den DOM-Element-Definitionen
  const lastCalculation = {
    values: null,
    result: null
  };

document.addEventListener("DOMContentLoaded", function () {
  // Warten Sie einen Moment, bis die Logging-Funktionen vollständig initialisiert sind
  setTimeout(() => {
    logDebug("DOM fully loaded.");
  }, 0);

  if (typeof bootstrap !== 'undefined') {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    logDebug("Bootstrap Tooltips initialized.");
  } else {
    logWarn("Bootstrap JavaScript nicht geladen. Tooltips werden nicht initialisiert.");
  }

/**
  * Entfernt alle Leerzeichen aus einem String
  * @param {string} str - Der zu bereinigende String
  * @returns {string} - Der String ohne Leerzeichen
  */
  const removeAllWhitespace = (str) => str.replace(/\s/g, '');

/**
  * Setzt den Textinhalt eines Elements sicher, nur wenn das Element existiert.
  * @param {HTMLElement|null} element - Das HTML-Element, dessen Textinhalt gesetzt werden soll.
  * @param {string} content - Der Textinhalt, der gesetzt werden soll.
  */
  const setzeTextContent = (element, content) => {
    if (element) {
      element.textContent = content;
    }
  };

  logDebug("[DEBUG_DOM_CACHED] Essential DOM element check starting...");

  // Input-Felder
  const datumAltInput = document.getElementById("datumAltInput");
  const zaehlerstandAltInput = document.getElementById("zaehlerstandAltInput");
  const datumNeuInput = document.getElementById("datumNeuInput");
  const zaehlerstandNeuInput = document.getElementById("zaehlerstandNeuInput");
  const datumZwischenInput = document.getElementById("datumZwischenInput");
  const datumZukunftInput = document.getElementById("datumZukunftInput");

  // Ausgabefelder
  const verbrauchGesamtOutput = document.getElementById("verbrauchGesamtOutput");
  const tageGesamtOutput = document.getElementById("tageGesamtOutput");
  const verbrauchZwischenOutput = document.getElementById("verbrauchZwischenOutput");
  const verbrauchZukunftOutput = document.getElementById("verbrauchZukunftOutput");
  const tageZukunftOutput = document.getElementById("tageZukunftOutput");
  const verbrauchNeuOutput = document.getElementById("verbrauchNeuOutput");
  const tageAktuellOutput = document.getElementById("tageAktuellOutput");
  const tageZwischenOutput = document.getElementById("tageZwischenOutput");
  const zaehlerstandZwischenOutput = document.getElementById("zaehlerstandZwischenOutput");
  const zaehlerstandZukunftOutput = document.getElementById("zaehlerstandZukunftOutput");

  // Konfigurations-Inputs
  const rundenOptionInput = document.getElementById("rundungsOption");
  const vorkommastellenInput = document.getElementById("vorkommastellenOption"); 

  // Checkboxen
  const wintermodusCheckbox = document.getElementById("wintermodusCheckbox");
  const isWinterModeCheckbox = wintermodusCheckbox;
  const abrechnungCheckbox = document.getElementById("abrechnungCheckbox");

  // Buttons
  const openModalButton = document.getElementById("openModalButton"); // Der Button, der das Modal öffnet
  const modalFooterButton = document.getElementById("modalFooterButton");
  const closeButton = document.getElementById("closeButton");

  // Debug-Output
  const debugOutput = document.getElementById("debugOutput");

  const essentialElements = [
    datumAltInput, zaehlerstandAltInput, datumNeuInput, zaehlerstandNeuInput,
    vorkommastellenInput
  ];

  const allElementsFound = essentialElements.every(element => {
    if (!element) {
      logWarn(`Ein essentielles DOM-Element wurde nicht gefunden.`);
      return false;
    }
    return true;
  });

  if (allElementsFound) {
    logDebug("[DEBUG_DOM_CACHED] All essential DOM elements found.");
  } else {
    logError("Nicht alle essentiellen DOM-Elemente wurden gefunden.");
  }

  // *** Zentrale Validierungs- und Formatierungsfunktion *** //

/**
  * Zentrale Validierungs- und Formatierungsfunktion für Eingabefelder
  *
  * Diese Funktion führt die Validierung und ggf. Formatierung für ein bestimmtes Input-Feld durch.
  * Sie verwaltet die 'is-invalid' Klasse und die CustomValidity-Nachricht.
  *
  * Validierungsregeln:
  * - Pflichtfelder dürfen nicht leer sein (wenn touched)
  * - Datumsfelder müssen im Format TT.MM.JJJJ sein und ein gültiges Datum enthalten
  * - Zählerstandsfelder müssen eine gültige Zahl sein und die konfigurierte Anzahl Vorkommastellen nicht überschreiten
  *
  * @param {HTMLInputElement} inputElement - Das Input-Element, das validiert werden soll
  * @param {boolean} triggerDisplay - True, wenn die 'is-invalid' Klasse sofort gesetzt werden soll (z.B. bei blur oder submit)
  * @returns {boolean} - True, wenn das Feld gültig ist, false sonst
  */
  const validateField = (inputElement, triggerDisplay = false) => {
    if (!inputElement) {
      logWarn("validateField: Input-Element ist null oder undefined.");
      return false;
    }

    const value = inputElement.value.trim();
    let errorMessage = "";
    let isValid = true;

    inputElement.setCustomValidity("");

    // Prüfe Pflichtfeld wenn das Feld "touched" wurde
    if (inputElement.hasAttribute('required') && value === "" && inputElement.dataset.touched === 'true') {
      errorMessage = "Dieses Feld ist ein Pflichtfeld.";
      isValid = false;
    }

    // Rest der Validierung nur durchführen, wenn das Feld nicht leer ist
    if (value !== "") {
      if (inputElement.type === 'date') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errorMessage = "Ungültiges Datum. Bitte im Format TT.MM.JJJJ eingeben.";
          isValid = false;
        } else {
          const minDate = new Date('1900-01-01');
          const maxDate = new Date('2100-12-31');
          if (date < minDate || date > maxDate) {
            errorMessage = "Datum außerhalb des gültigen Bereichs (1900-2100).";
            isValid = false;
          }
        }
      } else if (inputElement.type === 'number') {
        const cleanValue = value.replace(/\./g, '');
        const numValue = parseFloat(cleanValue.replace(',', '.'));

        if (isNaN(numValue) || !isFinite(numValue)) {
          errorMessage = "Bitte eine gültige Zahl eingeben.";
          isValid = false;
        } else {
          const currentVorkommastellen = parseInt(vorkommastellenInput.value, 10);

          if (currentVorkommastellen && currentVorkommastellen > 0) {
            const maxZaehlerwert = Math.pow(10, currentVorkommastellen) - 1;
            if (numValue > maxZaehlerwert) {
              errorMessage = `Der Zählerstand darf ${maxZaehlerwert.toLocaleString('de-DE')} nicht überschreiten.`;
              isValid = false;
            }
          }
        }
      }
    }

    if (!isValid) {
      inputElement.setCustomValidity(errorMessage);
      if (triggerDisplay) {
        inputElement.classList.add('is-invalid');
      } else {
        inputElement.classList.remove('is-invalid');
      }
    } else {
      inputElement.classList.remove('is-invalid');
    }

    return isValid;
  };

  // *** Enter-Prevention ***

  // Verhindert das Absenden eines Formulars (oder ähnliches Standardverhalten),
  // wenn in einem der definierten Eingabefelder die Enter-Taste gedrückt wird.
  [zaehlerstandAltInput, zaehlerstandNeuInput, datumAltInput, datumNeuInput, datumZukunftInput, datumZwischenInput]
  .forEach((input) => {
    if (input) {
      input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
        }
      });
    }
  });

  // *** Fehleranzeige-Funktionen ***

  // Funktionen zum Anzeigen und Ausblenden von Fehlermeldungen unter den Eingabefeldern.
  // Verwendet Bootstrap-Klassen ('is-invalid') und Feedback-Elemente (Postfix 'Feedback' zur ID).
  const showError = (inputElementId, message) => {
    const inputElement = document.getElementById(inputElementId);
    const feedbackElement = document.getElementById(inputElementId + "Feedback");
    if (inputElement) inputElement.classList.add('is-invalid');
    if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.style.display = 'block';
    } else {
        logWarn(`Feedback element not found for #${inputElementId}`);
    }
  };

  const hideError = (inputElementId) => {
    const inputElement = document.getElementById(inputElementId);
    const feedbackElement = document.getElementById(inputElementId + "Feedback");
    if (inputElement) inputElement.classList.remove('is-invalid');
    if (feedbackElement) {
        feedbackElement.textContent = '';
        feedbackElement.style.display = 'none';
    } else {
        logWarn(`Feedback element not found for #${inputElementId}`);
    }
  };

  // *** Validierung und Parsing des Zählerstandes ************************* //

/**
  * Validiert das Format und die Vorkommastellen eines Zählerstand-Eingabefeldes.
  * Zeigt bei Fehlern entsprechende Meldungen an.
  * @param {HTMLInputElement} inputElement - Das DOM-Element des Eingabefeldes.
  * @param {number} vorkommastellen - Die maximal erlaubte Anzahl von Vorkommastellen basierend auf der Auswahl.
  * @returns {boolean} - True, wenn der Input gültig ist oder leer ist, sonst false.
  */
  const validateZaehlerstandInput = (inputElement, vorkommastellen) => {
    const value = inputElement.value.trim();
    hideError(inputElement.id); // Versteckt vorherige Fehlermeldungen.

    if (!value) return true; // Leere Felder sind für die Validierung hier gültig (Pflichtfeld-Check erfolgt separat).

    // Regex zur Überprüfung des erwarteten Formats (mit optionalen Tausendertrennzeichen und optionalen Dezimalstellen).
    // Erlaubt "0" oder eine Zahl beginnend mit 1-9, optional gefolgt von 3er-Gruppen mit Punkt,
    // und optional gefolgt von einem Komma und 1-3 Dezimalstellen.
    const zstRegex = /^(0|[1-9]\d{0,2}(\.\d{3})*|\d+)(,\d{1,3})?$/; // Überprüft das Format.

    // Prüft das Format gegen den Regex.
    if (!zstRegex.test(value)) {
      showError(inputElement.id, "Ungültiges Format. Erwartet: 123.456,789 oder 123456,78"); // Zeigt Fehler bei falschem Format.
      return false;
    }

    // Prüft die Anzahl der Vorkommastellen.
    if (!checkVorkommastellen(value, vorkommastellen)) {
      showError(inputElement.id, `Zu viele Vorkommastellen für Zähler (${vorkommastellen}).`); // Zeigt Fehler bei zu vielen Vorkommastellen.
      return false;
    }

    // Prüft die Anzahl der Nachkommastellen basierend auf CONFIG.nachkommastellen
    const parts = value.split(',');
    if (parts.length === 2 && parts[1].length > CONFIG.nachkommastellen) {
      showError(inputElement.id, `Zu viele Nachkommastellen. Maximal ${CONFIG.nachkommastellen} erlaubt.`);
      return false;
    }

    // Zusätzliche Prüfung: Wert darf den maximalen Wert nicht überschreiten
    const maxWert = getMaxWert(vorkommastellen);
    const numValue = parseZaehlerstand(value);
    if (numValue !== "-" && numValue > maxWert) {
      showError(inputElement.id, `Wert überschreitet den maximalen Zählerstand (${maxWert.toLocaleString('de-DE')}).`);
      return false;
    }

    return true; // Der Input ist gültig.
  };

/**
  * Validiert ein Datumsfeld auf korrektes Format und Gültigkeit.
  * Unterstützt verschiedene Trennzeichen und 2-/4-stellige Jahreszahlen.
  * @param {HTMLInputElement} inputElement - Das zu prüfende Eingabefeld.
  * @returns {boolean} - True, wenn das Datum gültig ist, sonst false.
  */
  const validateDatumInput = (inputElement) => {
    const value = inputElement.value.trim();
    hideError(inputElement.id);

    if (!value) return true;

    // Erlaubt verschiedene Datumsformate (TT.MM.JJJJ, TT/MM/JJJJ, TT-MM-JJJJ)
    const dateRegex = /^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{2,4})$/;
    const match = value.match(dateRegex);

    if (!match) {
      showError(inputElement.id, "Ungültiges Format. Erwartet: TT.MM.JJJJ, TT/MM/JJJJ oder TT-MM-JJJJ");
      return false;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);

    // Konvertiert 2-stellige Jahre in 4-stellige
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      showError(inputElement.id, "Ungültiges Datum");
      return false;
    }

    return true;
  };

/**
  * Parst einen String-Wert eines Zählerstandes in eine Zahl.
  * Berücksichtigt deutsche Formatierung (Komma als Dezimaltrennzeichen, Punkt als Tausendertrennzeichen).
  * @param {string} value - Der String-Wert des Zählerstandes.
  * @returns {number|string} - Die geparste Zahl oder "-" wenn der Input ungültig ist oder leer/Strich.
  */
  const parseZaehlerstand = (value) => {
    if (!value || value === "-") return "-"; // Behandelt leere oder "-" Eingaben.
    // Entfernt Tausendertrennzeichen (.) und ersetzt Komma (,) durch Punkt (.).
    const clean = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean); // Konvertiert den bereinigten String in eine Gleitkommazahl.
    // Gibt die Zahl oder "-" zurück, wenn die Konvertierung fehlschlägt.
    return isNaN(num) ? "-" : num;
  };

/**
  * Formatiert eine Zählerstand-Zahl für die Anzeige mit Tausendertrennzeichen (Punkt)
  * und einem Komma als Dezimaltrennzeichen, immer mit 3 Nachkommastellen.
  * Wird typischerweise beim Verlassen (blur) des Eingabefeldes verwendet.
  * @param {string} value - Der Eingabewert als String.
  * @returns {string} - Der formatierte String oder der ursprüngliche Wert, wenn Parsen fehlschlägt.
  */
  const formatZaehlerstandOnBlur = (value) => {
    const num = parseZaehlerstand(value); // Parst den Wert in eine Zahl.
    if (num === "-") return value; // Wenn Parsen fehlschlägt, gibt den Originalwert zurück.
    // Formatiert die Zahl: 3 Nachkommastellen (.toFixed(3)), ersetzt den Dezimalpunkt durch Komma,
    // und fügt Tausendertrennzeichen (Punkte) hinzu.
    return num.toFixed(3).replace(/\./g, ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

/**
  * Formatiert einen Zählerstandswert mit Tausendertrennzeichen und festen Nachkommastellen für die Anzeige.
  * Wenn der Wert leer ist, wird nichts formatiert.
  * @param {string|number} value Der zu formatierende Zählerstandswert.
  * @returns {string} Der formatierte Wert oder der Originalwert, wenn leer.
  */
  const formatZaehlerstand = (value) => {
    if (value === null || value === undefined || value.toString().trim() === "") {
        return ""; // Nichts formatieren, wenn der Wert leer ist
    }
    const numValue = parseFloat(value.toString().replace(/\./g, '').replace(',', '.'));
    if (isNaN(numValue)) {
        return value; // Wert ist keine Zahl, nicht formatieren
    }
    return numValue.toLocaleString('de-DE', {
        minimumFractionDigits: CONFIG.nachkommastellen,
        maximumFractionDigits: CONFIG.nachkommastellen
    });
  };

  // *** Datum Validierung und Parsing ***

/**
  * Überprüft, ob ein gegebener String ein gültiges deutsches Datumsformat (TT.MM.JJJJ) hat
  * und ob das Datum logisch gültig ist (z.B. kein 31.02.).
  * @param {string} dateString - Der zu prüfende Datumsstring.
  * @returns {boolean} - True, wenn das Format und das Datum gültig sind, sonst false.
  */
  const isValidGermanDate = (dateString) => {
    // Prüft das String-Format gegen TT.MM.JJJJ.
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return false;
    const parts = dateString.split('.');
    const day = parseInt(parts[0], 10); // Tag
    const month = parseInt(parts[1], 10); // Monat (1-12)
    const year = parseInt(parts[2], 10); // Jahr

    // Grundlegende Bereichsprüfung für Jahr und Monat.
    if (year < 1000 || year > 3000 || month == 0 || month > 12) return false;

    // Erstellt ein Date-Objekt. Die Date-Konstruktor passt ungültige Tage automatisch an
    // (z.B. wird der 31. Februar zum 2. März).
    const date = new Date(year, month - 1, day); // Monat ist 0-basiert in Date-Objekten.
    // Prüft, ob das erstellte Date-Objekt immer noch den ursprünglichen Tag, Monat und Jahr hat.
    // Wenn nicht (z.B. bei 31.02.), war das Datum logisch ungültig.
    return date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year;
  };

/**
  * Parst einen deutschen Datumsstring (TT.MM.JJJJ) in ein JavaScript Date-Objekt.
  * Setzt die Uhrzeit auf 00:00:00, um reine Datumsvergleiche zu ermöglichen.
  * @param {string} dateString - Der zu parsende Datumsstring.
  * @returns {Date | null} - Ein Date-Objekt oder null, wenn der String leer oder "-" ist.
  */
  const parseGermanDate = (dateString) => {
    if (!dateString || dateString === "-") return null;

    // Erlaubt sowohl Punkt als auch Schrägstrich als Trennzeichen
    const parts = dateString.split(/[\.\/]/);
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Konvertiert 2-stellige Jahre in 4-stellige
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    // Erstellt das Date-Objekt
    const date = new Date(year, month - 1, day);
    
    // Prüft, ob das Datum gültig ist
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null;
    }

    return date;
  };

/**
  * Normalisiert einen Datumsstring aus verschiedenen gängigen deutschen Formaten
  * (TT.MM.JJJJ, T.M.JJJJ, TT/MM/JJJJ, TT-MM-JJJJ etc.) in das Standardformat TT.MM.JJJJ.
  * Versucht bei 2-stelligen Jahreszahlen eine 4-stellige Jahreszahl zu ergänzen.
  * Validiert, ob das Ergebnis ein gültiges Datum ist.
  * @param {string} dateString - Der zu normalisierende Datumsstring.
  * @returns {string} - Der normalisierte Datumsstring (TT.MM.JJJJ) oder ein leerer String,
  * wenn das Format ungültig ist oder nach der Normalisierung kein gültiges Datum vorliegt.
  */
  const normalizeGermanDate = (dateString) => {
    if (!dateString) return ""; // Gibt bei leerem Input einen leeren String zurück.
    // Regex, der verschiedene Separatoren (. / -) und Ziffernanzahlen für Tag, Monat, Jahr matcht.
    const parts = dateString.match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{2,4})$/);
    if (!parts) return ""; // Gibt leeren String zurück, wenn das grundlegende Format nicht passt.

    let day = parts[1];
    let month = parts[2];
    let year = parts[3];

    // Fügt führende Nullen hinzu, falls Tag oder Monat einstellig sind.
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');

    // Behandlung von 2-stelligen Jahreszahlen.
    if (year.length === 2) {
      // Heuristik: Jahreszahlen <= aktuelles Jahr + 5 werden als 20xx interpretiert,
      // ältere als 19xx.
      const currentYear = new Date().getFullYear();
      const yearInt = parseInt(year, 10);

      if (yearInt >= 0 && yearInt <= 99) { // Sicherstellen, dass es eine 2-stellige Zahl ist
        // Beispiel: Aktuelles Jahr 2024. yearInt 24 -> 2024. yearInt 29 -> 2029. yearInt 30 -> 1930.
        if (yearInt <= (currentYear % 100) + 5) {
          year = '20' + year;
        } else {
          year = '19' + year;
        }
      }
    }

    // Nach der Normalisierung (Format TT.MM.JJJJ) wird geprüft, ob das Ergebnis ein gültiges Datum ist.
    const normalizedFull = `${day}.${month}.${year}`;
    if (!isValidGermanDate(normalizedFull)) {
      logDebug(`[DEBUG_NORMALIZE] Normalized date is invalid: ${normalizedFull}`); // Debug-Log
      return ""; // Gibt leeren String zurück, wenn das Datum nach Normalisierung ungültig ist (z.B. 31.02.2023).
    }

    return normalizedFull; // Gibt den normalisierten und validierten String zurück.
  };

/**
  * Prüft, ob das Monat eines gegebenen Date-Objekts in der Liste der Wintermonate liegt.
  * @param {Date} dateObject - Das zu prüfende Date-Objekt.
  * @returns {boolean} - True, wenn es ein Wintermonat ist, sonst false.
  */
  const isWinterMonth = (dateObject) => {
    // Prüft, ob das Date-Objekt gültig ist.
    if (!dateObject || isNaN(dateObject.getTime())) return false;
    const month = dateObject.getMonth() + 1; // getMonth() gibt 0-11 zurück
    return CONFIG.winterMonate.includes(month); // Prüft, ob das Monat im Konfigurations-Array enthalten ist.
  };

/**
  * Prüft, ob ein String nur erlaubte Zeichen für ein Datum (Ziffern, Punkt, Bindestrich, Slash) enthält.
  * Wird für die Live-Validierung während der Eingabe verwendet.
  * @param {string} value - Der zu prüfende String.
  * @returns {boolean} - True, wenn nur erlaubte Zeichen vorhanden sind, sonst false.
  */
  const hasValidDateChars = (value) => {
    return /^[0-9\.\-\/]*$/.test(value);
  };

/**
  * Führt eine schnelle Live-Validierung des Datums-Eingabefeldes während der Eingabe durch.
  * Prüft nur auf erlaubte Zeichen und ein potenziell gültiges Format.
  * Die vollständige Datumsprüfung erfolgt beim Verlassen (blur) des Feldes.
  * @param {HTMLInputElement} inputElement - Das DOM-Element des Eingabefeldes.
  * @returns {boolean} - True, wenn die Live-Validierung bestanden ist (oder das Feld leer ist), sonst false.
  */
  const validateInputDateLive = (inputElement) => {
    logDebug(`[DEBUG_VALIDATELIVE] Entering validateInputDateLive. Element: ${inputElement ? `#${inputElement.id}` : 'N/A'} Value: ${inputElement ? `"${inputElement.value}"` : 'N/A'}`); // Debug-Log
    const value = inputElement.value.trim();
    // const feedbackId = inputElement.id + "Feedback"; // feedbackId wird hier nicht direkt benötigt.

    if (!value) {
      hideError(inputElement.id); // Blendet Fehler aus, wenn das Feld leer ist.
      return true; // Leeres Feld ist live gültig.
    }

    // Prüft auf unerlaubte Zeichen.
    if (!hasValidDateChars(value)) {
      showError(inputElement.id, "Ungültige Zeichen. Nur Zahlen, '.', '-' und '/' erlaubt."); // Zeigt Fehler, wenn unerlaubte Zeichen gefunden werden.
      return false;
    }

    // Bei Live-Eingabe prüfen wir nicht die vollständige logische Datumsgültigkeit (z.B. 31.02.),
    // sondern nur, ob das Format POTENTIELL gültig werden könnte.
    const parts = value.match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{2,4})$/);
    if (value !== "" && !parts) {
      // Format noch nicht komplett oder falsch, aber keine ungültigen Zeichen.
      hideError(inputElement.id); // Fehler von ungültigen Zeichen ausblenden, falls vorher gesetzt.
      return false; // Ungültiges Format für Live-Validierung (z.B. "12.").
    }

    // Wenn das Format komplett und die Zeichen gültig sind, verstecke Fehler (finale Validierung auf Blur).
    hideError(inputElement.id); // Versteckt eventuelle Formatfehler.
    return true; // Format scheint okay für Live-Eingabe, finale Validierung erfolgt auf Blur.
  };

/**
  * Normalisiert das Datum im Eingabefeld beim Verlassen (blur) und führt eine finale Validierung durch.
  * Aktualisiert den Wert im Feld auf das normalisierte Format (TT.MM.JJJJ), wenn gültig.
  * Zeigt eine Fehlermeldung an, wenn das Datum ungültig ist.
  * @param {HTMLInputElement} inputElement - Das DOM-Element des Eingabefeldes.
  * @returns {boolean} - True, wenn das Datum gültig und normalisiert wurde, sonst false.
  */
  const normalizeAndValidateDateOnBlur = (inputElement) => {
    logDebug(`[DEBUG_VALIDATEBLUR] Entering normalizeAndValidateDateOnBlur. Element: ${inputElement ? `#${inputElement.id}` : 'N/A'} Value: ${inputElement ? `"${inputElement.value}"` : 'N/A'}`); // Debug-Log
    const value = inputElement.value.trim();

    if (!value) {
      hideError(inputElement.id); // Blendet Fehler aus, wenn das Feld leer ist.
      return false; // Leeres Feld ist auf Blur nicht "gültig" im Sinne einer abgeschlossenen Eingabe.
    }

    // Normalisieren (versucht TT.MM.JJJJ daraus zu machen) und validieren.
    const normalized = normalizeGermanDate(value);
    logDebug(`[DEBUG_VALIDATEBLUR] After normalizeGermanDate. Normalized value: ${normalized}`); // Debug-Log

    // Überprüfen, ob die normalisierte Form ein gültiges Datum ist. normalizeGermanDate gibt "" zurück, wenn Format falsch oder Datum ungültig.
    if (normalized === "") {
      logDebug(`[DEBUG_VALIDATEBLUR] Normalized value is empty (invalid format or date).`); // Debug-Log
      showError(inputElement.id, "Ungültiges Format oder ungültiges Datum. Erwartet: TT.MM.JJJJ, TT/MM/JJJJ oder TT-MM-JJJJ"); // Zeigt Fehler bei ungültigem Datum/Format.
      // Wir setzen den Wert nicht zurück, damit der Nutzer seine Eingabe korrigieren kann.
      return false;
    }

    // Wenn gültig, Wert im Feld aktualisieren und Fehler ausblenden.
    inputElement.value = normalized;
    logDebug(`[DEBUG_VALIDATEBLUR] Normalization successful. Setting input value to: ${normalized}`); // Debug-Log
    hideError(inputElement.id); // Blendet eventuelle Fehler aus.

    return true; // Datum ist formatiert und gültig.
  };


  // *** Berechnungsfunktionen ***

/**
  * Berechnet den Verbrauch zwischen zwei Zählerständen
  * 
  * Diese Funktion berücksichtigt:
  * - Zählerüberlauf (wenn der neue Wert kleiner als der alte ist)
  * - Konfigurierte Nachkommastellen für die Rundung
  * - Gültigkeitsbereich der Zählerstandswerte
  * 
  * @param {number|string} zaehlerstandAlt - Der alte Zählerstand
  * @param {number|string} zaehlerstandNeu - Der neue Zählerstand
  * @param {number} maxWert - Der maximale Zählerstandswert
  * @returns {number|string} - Der berechnete Verbrauch oder "-" bei ungültigen Eingaben
  */
  const berechneVerbrauch = (zaehlerstandAlt, zaehlerstandNeu, maxWert) => {
    // Standardfall: Zählerstand steigt normal
    if (zaehlerstandNeu >= zaehlerstandAlt) {
      logDebug(`Berechne Verbrauch (normal): ${zaehlerstandNeu} - ${zaehlerstandAlt}`);
      return { verbrauch: zaehlerstandNeu - zaehlerstandAlt, ueberlauf: false };
    } else {
      // Überlauf erkannt: Zählerstand ist kleiner als der alte, muss also über den Maximalwert gegangen sein
      logDebug(`Berechne Verbrauch (Überlauf): ((${maxWert} + 1) - ${zaehlerstandAlt}) + ${zaehlerstandNeu}`);
      return { 
        verbrauch: ((maxWert + 1) - zaehlerstandAlt) + zaehlerstandNeu, 
        ueberlauf: true 
      };
    }
  };

/**
  * Berechnet die Anzahl der Tage zwischen zwei Datum-Objekten
  * 
  * Die Funktion:
  * - Prüft die Gültigkeit der Datum-Objekte
  * - Stellt sicher, dass das Enddatum nach dem Startdatum liegt
  * - Rundet das Ergebnis auf 6 Nachkommastellen für maximale Präzision
  * 
  * @param {Date|null} startDate - Das Startdatum
  * @param {Date|null} endDate - Das Enddatum
  * @returns {number|string} - Die Anzahl der Tage oder "-" bei ungültigen Eingaben
  */
  const berechneTageDifferenz = (startDate, endDate) => {
    // Stelle sicher, dass wir mit Date-Objekten arbeiten
    const start = resetDateTime(startDate);
    const end = resetDateTime(endDate);
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays; // ? kleine Toleranz einbauen (z. B. diffInTagen < 1.1), um Zeitverschiebungen oder Rechenungenauigkeiten abzufangen.
  };

/**
  * Passt einen berechneten Zählerstandswert an, um ihn innerhalb des gültigen Bereichs zu halten
  * 
  * Diese Funktion behandelt:
  * - Negative Werte (werden durch Überlauf korrigiert)
  * - Werte über dem Maximum (werden durch Modulo-Operation angepasst)
  * - Zählerüberlauf-Szenarien
  * 
  * @param {number|string} calculatedZst - Der berechnete Zählerstandswert
  * @param {number} maxWert - Der maximale Zählerstandswert
  * @returns {number|string} - Der angepasste Zählerstand oder "-" bei ungültigen Eingaben
  */
  const passeUeberlaufAn = (calculatedZst, maxWert) => {
    if (calculatedZst === "-") return "-"; // Behandelt ungültige Eingabe.
    const anzahlZustaende = maxWert + 1; // Anzahl der möglichen Werte des Zählers (z.B. 0 bis 999999 sind 1.000.000 Zustände).

    // Passt negative Werte an (z.B. -1 wird zu maxWert, -2 zu maxWert-1 usw.).
    if (calculatedZst < 0) {
      // calculatedZst % anzahlZustaende gibt den Rest. Das "+ anzahlZustaende) % anzahlZustaende" stellt sicher,
      // dass das Ergebnis positiv und im Bereich liegt.
      return (calculatedZst % anzahlZustaende + anzahlZustaende) % anzahlZustaende;
    } else if (calculatedZst > maxWert) {
      // Passt Werte größer als maxWert an (Modulu-Operation).
      // Beispiel: maxWert 999, calculatedZst 1050. 1050 % 1000 = 50.
      return calculatedZst % anzahlZustaende;
    } else {
      // Werte im gültigen Bereich werden unverändert zurückgegeben.
      return calculatedZst;
    }
  };

/**
  * Berechnet den Zählerstand an einem Zieldatum basierend auf Referenzdaten und Verbrauchsdaten.
  * Berücksichtigt den Wintermodus und den Zählerüberlauf.
  * @param {Date} datumZiel - Das Zieldatum für die Berechnung.
  * @param {Date} vorherigesDatum - Das Startdatum für die Verbrauchsberechnung bis zum Zieldatum.
  * @param {number} vorherigerZst - Der Zählerstand am vorherigen Datum.
  * @param {number} verbrauchProTagSommer - Der Tagesverbrauch für Sommermonate.
  * @param {number} verbrauchProTagWinter - Der Tagesverbrauch für Wintermonate (mit Winterfaktor).
  * @param {Date} datumEnd - Das Enddatum der Hauptreferenzperiode (für Abrechnungslogik).
  * @param {number} zstEnd - Der Zählerstand am Enddatum der Hauptreferenzperiode (für Abrechnungslogik).
  * @param {boolean} isWinterModeActive - Ob der Wintermodus generell aktiv ist.
  * @returns {number|string} - Der berechnete Zählerstand oder "-" bei ungültigen Eingaben.
  */
  const berechneZstAmDatum = (datumZiel, vorherigesDatum, vorherigerZst, verbrauchProTagSommer, verbrauchProTagWinter, datumEnd, zstEnd, isWinterModeActive) => {
    logDebug(`[DEBUG] Berechne Zählerstand für ${datumZiel} ...`);
    
    // Prüfe auf aufeinanderfolgende Tage im Abrechnungsmodus
    if (abrechnungCheckbox && abrechnungCheckbox.checked) {
      // Prüfe, ob das Ziel direkt vor dem Enddatum liegt
      const diffInMsEnd = Math.abs(datumEnd - datumZiel);
      const diffInTagenEnd = diffInMsEnd / (1000 * 60 * 60 * 24);

      if (diffInTagenEnd === 1) {
        logDebug("[DEBUG] Aufeinanderfolgende Tage zum Enddatum erkannt - verwende Endzählerstand");
        return zstEnd; // Verwende den Endzählerstand
      }

      // Prüfe, ob das Ziel direkt nach dem vorherigen Datum liegt
      const diffInMs = Math.abs(datumZiel - vorherigesDatum);
      const diffInTagen = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInTagen === 1) {
        logDebug("[DEBUG] Aufeinanderfolgende Tage erkannt - verwende tatsächlichen Verbrauch");
        return vorherigerZst; // Verwende den übergebenen vorherigen Zählerstand
      }
      logDebug(`Berechnung für zukünftigen Zählerstand gestartet`);
      logDebug(`Start-Zählerstand: ${vorherigerZst}, End-Zählerstand: ${zstEnd}`);
      logDebug(`Referenz-Zeitraum: ${vorherigesDatum} - ${datumEnd}, Ziel-Datum: ${datumZiel}`);
      logDebug(`Wintermodus aktiv: ${isWinterModeActive}, Abrechnung aktiv: ${abrechnungCheckbox && abrechnungCheckbox.checked}`);
    }

    // Wintermodus-Logik
    const isWinter = isWinterModeActive && isWinterMonth(datumZiel);
    logDebug(`[DEBUG] Wintermodus aktiv: ${isWinter}`);

    // Berechne den Zählerstand
    const tageBisZiel = berechneTageDifferenz(vorherigesDatum, datumZiel);

    // Berechne Sommer- und Wintertage
    let sommerTage = 0;
    let winterTage = 0;
    let currentDate = resetDateTime(vorherigesDatum);
    const zielDate = resetDateTime(datumZiel);

    // Zähle die Tage bis zum Zieldatum
    while (currentDate < zielDate) {
      if (isWinterMonth(currentDate)) {
        winterTage++;
      } else {
        sommerTage++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    logDebug(`[DEBUG] Sommer-Tage: ${sommerTage}`);
    logDebug(`[DEBUG] Winter-Tage: ${winterTage}`);

    // Berechne den Verbrauch basierend auf Wintermodus
    let verbrauchBisZiel;
    if (isWinterModeActive) {
      // Im Wintermodus: Sommer- und Wintertage getrennt berechnen
      const sommerVerbrauch = sommerTage * verbrauchProTagSommer;
      const winterVerbrauch = winterTage * verbrauchProTagWinter;
      verbrauchBisZiel = sommerVerbrauch + winterVerbrauch;
    } else {
      // Ohne Wintermodus: Normaler Verbrauch (verwende den Sommer-Tagesverbrauch als Basis)
      verbrauchBisZiel = tageBisZiel * verbrauchProTagSommer;
    }

    // Berechne den Zählerstand
    let zaehlerstand = vorherigerZst + verbrauchBisZiel;

    // Stelle sicher, dass der Zählerstand den Maximalwert nicht überschreitet
    if (zaehlerstand > CONFIG.maxWert) {
      zaehlerstand = zaehlerstand - CONFIG.maxWert;
    }

    // Runde auf die konfigurierte Anzahl Nachkommastellen
    const roundFactor = Math.pow(10, CONFIG.nachkommastellen);
    zaehlerstand = Math.round(zaehlerstand * roundFactor) / roundFactor;

    return zaehlerstand;
  };

  // *** Formatierungs- und Rundungsfunktionen ***

/**
  * Formatiert eine Zahl mit einer festen Anzahl von Nachkommastellen, verwendet Komma als Dezimaltrennzeichen.
  * Fügt keine Tausendertrennzeichen hinzu.
  * @param {number | string} num - Die zu formatierende Zahl oder "-".
  * @param {number} decimalPlaces - Die gewünschte Anzahl von Nachkommastellen.
  * @returns {string} - Die formatierte Zahl als String oder "-".
  */
  const formatierteZahlFixed = (num, decimalPlaces) => {
    if (typeof num !== 'number') return "-"; // Behandelt ungültige Eingabe.
    // Verwendet toFixed() für feste Nachkommastellen und ersetzt den Punkt durch ein Komma.
    return num.toFixed(decimalPlaces).replace(/\./g, ',');
  };

/**
  * Formatiert eine Zahl für die Anzeige unter Verwendung der lokalen Einstellungen (de-DE).
  * Zeigt eine variable Anzahl von Nachkommastellen an (entfernt unnötige Nullen), bis zu einem Maximum.
  * @param {number | string} num - Die zu formatierende Zahl oder "-".
  * @param {number} maxDecimals - Die maximale Anzahl von Nachkommastellen.
  * @returns {string} - Die formatierte Zahl als String oder "-".
  */
  const formatierteZahlFlexible = (num, maxDecimals) => {
    if (typeof num !== 'number') return "-"; // Behandelt ungültige Eingabe.
    // Verwendet toLocaleString mit 'de-DE' Locale und maximumFractionDigits.
    // toLocaleString entfernt standardmäßig führende und abschließende Nullen nach dem Dezimalpunkt.
    return num.toLocaleString('de-DE', {
      maximumFractionDigits: maxDecimals
    });
  };

/**
  * Rundet und formatiert einen Zählerstandswert für die Anzeige, basierend auf der ausgewählten Rundungsoption.
  * @param {number | string} value - Der zu rundende und formatierende Wert (Zahl oder String).
  * @returns {string} - Der gerundete und formatierte Zählerstand als String oder "-".
  */
  const rundeWertFuerAnzeige = (value) => {
    // Parst den Wert in eine Zahl, falls er als String vorliegt.
    const num = typeof value === 'number' ? value : parseZaehlerstand(value);
    if (num === "-") return "-"; // Behandelt ungültige Eingabe.

    const roundingOption = rundenOptionInput.value; // Holt die ausgewählte Rundungsoption.
    let roundedNum;

    // Wendet die entsprechende Rundung an.
    switch (roundingOption) {
      case 'standard':
        roundedNum = Math.round(num); // Kaufmännisch runden.
        // Feste 0 Nachkommastellen anzeigen.
        return formatierteZahlFixed(roundedNum, 0);
      case 'floor':
        roundedNum = Math.floor(num); // Abrunden.
        // Feste 0 Nachkommastellen anzeigen.
        return formatierteZahlFixed(roundedNum, 0);
      case 'none':
      default:
        // Keine Rundung, flexible Nachkommastellen anzeigen (bis max 3 für Zähler).
        return formatierteZahlFlexible(num, 3); // Zähler haben üblicherweise 3 Nachkommastellen.
    }
  };

/**
  * Rundet und formatiert einen Verbrauchswert für die Anzeige, basierend auf der ausgewählten Rundungsoption.
  * Ähnlich wie `rundeWertFuerAnzeige`, aber mit potenziell mehr Nachkommastellen im "none"-Modus.
  * @param {number | string} value - Der zu rundende und formatierende Wert (Zahl oder String).
  * @returns {string} - Der gerundete und formatierte Verbrauchswert als String oder "-".
  */
  const rundeVerbrauchFuerAnzeige = (value) => {
    // Parst den Wert in eine Zahl, falls er als String vorliegt.
    const num = typeof value === 'number' ? value : parseZaehlerstand(value);
    if (num === "-") return "-"; // Behandelt ungültige Eingabe.

    const roundingOption = rundenOptionInput.value; // Holt die ausgewählte Rundungsoption.
    let roundedNum;

    // Wendet die entsprechende Rundung an.
    switch (roundingOption) {
      case 'standard':
        roundedNum = Math.round(num); // Kaufmännisch runden.
        // Feste 0 Nachkommastellen anzeigen.
        return formatierteZahlFixed(roundedNum, 0);
      case 'floor':
        roundedNum = Math.floor(num); // Abrunden.
        // Feste 0 Nachkommastellen anzeigen.
        return formatierteZahlFixed(roundedNum, 0);
      case 'none':
      default:
        // Keine Rundung, flexible Nachkommastellen anzeigen (bis max 3 für Verbrauch).
        return formatierteZahlFlexible(num, 3); // Etwas mehr Präzision für Verbräuche im "none" Modus.
    }
  };

/**
  * Setzt CSS-Klassen ('negative', 'overflow') auf ein DOM-Element basierend auf dem Wert.
  * Wird verwendet, um negative Ergebnisse visuell hervorzuheben. (Overflow-Klasse ist derzeit nicht aktiv genutzt, aber vorhanden).
  * @param {HTMLElement | null} element - Das DOM-Element.
  * @param {number | string} value - Der Wert (Zahl oder String).
  */
  const setzeKlasseNachWert = (element, value) => {
    if (!element) return; // Bricht ab, wenn das Element nicht existiert.
    // Parst den Wert in eine Zahl.
    const num = typeof value === 'number' ? value : parseZaehlerstand(value);

    // Entfernt vorherige Klassen.
    element.classList.remove("negative");
    element.classList.remove("overflow"); // Overflow-Klasse wird derzeit nicht gesetzt, könnte aber in Zukunft nützlich sein.

    // Fügt die 'negative' Klasse hinzu, wenn der Wert eine negative Zahl ist.
    if (typeof num === 'number') {
      if (num < 0) {
        element.classList.add("negative");
      }
    }
  };

  // *** Hauptfunktion zur Aktualisierung der Berechnungen und der Anzeige ***

/**
  * Setzt alle Ausgabefelder auf ihren Standardwert ("-") und entfernt negative Markierungen.
  * Wird verwendet, wenn die Berechnung aufgrund von Fehlern nicht durchgeführt werden kann.
  */
  const setzeStandardAusgaben = () => {
    if (zaehlerstandZwischenOutput) zaehlerstandZwischenOutput.textContent = "-";
    if (zaehlerstandZukunftOutput) zaehlerstandZukunftOutput.textContent = "-";
    if (verbrauchZukunftOutput) {
      verbrauchZukunftOutput.textContent = "-";
      verbrauchZukunftOutput.classList.remove('overflow');
    }
    if (verbrauchNeuOutput) {
      verbrauchNeuOutput.textContent = "-";
      verbrauchNeuOutput.classList.remove('overflow');
    }
    if (verbrauchZwischenOutput) {
      verbrauchZwischenOutput.textContent = "-";
      verbrauchZwischenOutput.classList.remove('overflow');
    }
    if (verbrauchGesamtOutput) {
      verbrauchGesamtOutput.classList.remove('overflow');
    }
  };

/**
  * Hauptfunktion zur Aktualisierung aller Berechnungen und Anzeigen
  *
  * Diese zentrale Funktion:
  * - Validiert alle Eingabefelder
  * - Führt die Verbrauchs- und Tagesberechnung durch
  * - Aktualisiert die Ausgabefelder im DOM
  * - Behandelt Sonderfälle wie Überlauf, Wintermodus und Abrechnungsmodus
  *
  * @returns {void}
  */
  const aktualisiereBerechnung = () => {
    const currentValues = {
      start: zaehlerstandAltInput.value,
      ende: zaehlerstandNeuInput.value,
      datumStart: datumAltInput.value,
      datumEnde: datumNeuInput.value,
      datumZwischen: datumZwischenInput ? datumZwischenInput.value : '',
      datumZukunft: datumZukunftInput ? datumZukunftInput.value : '',
      vorkommastellen: vorkommastellenInput ? vorkommastellenInput.value : '',
      wintermodus: wintermodusCheckbox ? wintermodusCheckbox.checked : false,
      rundenOption: rundenOptionInput ? rundenOptionInput.value : '',
      abrechnung: abrechnungCheckbox ? abrechnungCheckbox.checked : false
    };

    // Prüfe ob sich die Werte geändert haben
    if (lastCalculation.values && JSON.stringify(currentValues) === JSON.stringify(lastCalculation.values)) {
      return lastCalculation.result;
    }

    logDebug("[DEBUG_CALC_START] Entering aktualisiereBerechnung.");
    logDebug("--- Starte Neuberechnung ---");

    // Initialisiere alle DOM-Elemente am Anfang
    const verbrauchProTagOutput = document.getElementById("verbrauchProTagOutput");
    const verbrauchProTagSommerOutput = document.getElementById("verbrauchProTagSommerOutput");
    const verbrauchProTagWinterOutput = document.getElementById("verbrauchProTagWinterOutput");
    const zaehlerstandZukunftOutput = document.getElementById("zaehlerstandZukunftOutput");
    const verbrauchZukunftOutput = document.getElementById("verbrauchZukunftOutput");
    const tageZukunftOutput = document.getElementById("tageZukunftOutput");
    const verbrauchGesamtOutput = document.getElementById("verbrauchGesamtOutput");
    const tageGesamtOutput = document.getElementById("tageGesamtOutput");
    const verbrauchNeuOutput = document.getElementById("verbrauchNeuOutput");
    const tageAktuellOutput = document.getElementById("tageAktuellOutput");
    const verbrauchZwischenOutput = document.getElementById("verbrauchZwischenOutput");
    const tageZwischenOutput = document.getElementById("tageZwischenOutput");
    const zaehlerstandZwischenOutput = document.getElementById("zaehlerstandZwischenOutput");

    // Bestimmt den maximalen Zählerstandswert
    const vorkommastellen = parseInt(vorkommastellenInput.value, 10);
    const aktuellerMaxWert = getMaxWert(vorkommastellen);
    logDebug(`Vorkommastellen: ${vorkommastellen}, MaxWert: ${aktuellerMaxWert}`);

    // Liest die Eingabewerte
    const zaehlerstandStartStr = zaehlerstandAltInput.value.trim();
    const zaehlerstandEndeStr = zaehlerstandNeuInput.value.trim();
    const datumStartStr = datumAltInput.value.trim();
    const datumEndeStr = datumNeuInput.value.trim();

    logDebug(`Eingabewerte: Start=${zaehlerstandStartStr}, Ende=${zaehlerstandEndeStr}, DatumStart=${datumStartStr}, DatumEnde=${datumEndeStr}`);

    // Prüft optionale Elemente
    const datumZwischenInputExists = !!datumZwischenInput;
    const datumZwischenStr = datumZwischenInputExists ? datumZwischenInput.value.trim() : "";
    const datumZukunftInputExists = !!datumZukunftInput;
    const datumZukunftStr = datumZukunftInputExists ? datumZukunftInput.value.trim() : "";
    logDebug(`Optionale Eingaben: Zwischen=${datumZwischenStr}, Zukunft=${datumZukunftStr}`);

    let kannBerechnen = true;

    // Prüfe, ob mindestens ein Pflichtfeld ausgefüllt wurde
    const mindestensEinFeldAusgefuellt = 
      (zaehlerstandAltInput && zaehlerstandAltInput.value.trim()) || 
      (zaehlerstandNeuInput && zaehlerstandNeuInput.value.trim()) || 
      (datumAltInput && datumAltInput.value.trim()) || 
      (datumNeuInput && datumNeuInput.value.trim());

    // *** Pflichtfeldprüfung ***

    logDebug("Starte Pflichtfeldprüfung...");
    if (!zaehlerstandStartStr && (zaehlerstandAltInput.dataset.touched === 'true' || mindestensEinFeldAusgefuellt)) {
      showError(zaehlerstandAltInput.id, "Pflichtfeld.");
      logDebug("Fehler: Zählerstand Start ist leer");
      kannBerechnen = false;
    } else {
      hideError(zaehlerstandAltInput.id);
    }
    if (!zaehlerstandEndeStr && (zaehlerstandNeuInput.dataset.touched === 'true' || mindestensEinFeldAusgefuellt)) {
      showError(zaehlerstandNeuInput.id, "Pflichtfeld.");
      logDebug("Hinweis: Zählerstand Ende ist leer");
      kannBerechnen = false;
    } else {
      hideError(zaehlerstandNeuInput.id);
    }
    if (!datumStartStr && (datumAltInput.dataset.touched === 'true' || mindestensEinFeldAusgefuellt)) {
      showError(datumAltInput.id, "Pflichtfeld.");
      logDebug("Hinweis: Datum Start ist leer");
      kannBerechnen = false;
    } else {
      hideError(datumAltInput.id);
    }
    if (!datumEndeStr && (datumNeuInput.dataset.touched === 'true' || mindestensEinFeldAusgefuellt)) {
      showError(datumNeuInput.id, "Pflichtfeld.");
      logDebug("Hinweis: Datum Ende ist leer");
      kannBerechnen = false;
    } else {
      hideError(datumNeuInput.id);
    }

    if (!kannBerechnen) {
      logDebug("Berechnung abgebrochen: Pflichtfelder fehlen");
      setzeStandardAusgaben();
      return;
    }

    // *** Nachkommastellen-Validierung ***
    logDebug("Starte Nachkommastellen-Validierung...");
    if (zaehlerstandStartStr) {
      const partsStart = zaehlerstandStartStr.split(',');
      if (partsStart.length === 2 && partsStart[1].length > CONFIG.nachkommastellen) {
        logDebug(`Fehler: Zählerstand Start hat zu viele Nachkommastellen (${partsStart[1].length} > ${CONFIG.nachkommastellen})`);
        showError(zaehlerstandAltInput.id, `Zu viele Nachkommastellen. Maximal ${CONFIG.nachkommastellen} erlaubt.`);
        setzeStandardAusgaben();
        return;
      }
    }
    if (zaehlerstandEndeStr) {
      const partsEnde = zaehlerstandEndeStr.split(',');
      if (partsEnde.length === 2 && partsEnde[1].length > CONFIG.nachkommastellen) {
        logDebug(`Fehler: Zählerstand Ende hat zu viele Nachkommastellen (${partsEnde[1].length} > ${CONFIG.nachkommastellen})`);
        showError(zaehlerstandNeuInput.id, `Zu viele Nachkommastellen. Maximal ${CONFIG.nachkommastellen} erlaubt.`);
        setzeStandardAusgaben();
        return;
      }
    }

    // Parsen der Eingabewerte
    logDebug("Starte Parsing der Eingabewerte...");
    const zaehlerstandStart = parseZaehlerstand(zaehlerstandStartStr);
    const zaehlerstandEnde = parseZaehlerstand(zaehlerstandEndeStr);
    const datumStart = parseGermanDate(datumStartStr);
    const datumEnde = parseGermanDate(datumEndeStr);

    // Hinzugefügt: Parsen optionaler Daten und Zählerstände frühzeitig
    const datumZwischen = datumZwischenStr ? parseGermanDate(datumZwischenStr) : undefined;
    const zstZwischenInput = document.getElementById("zaehlerstandZwischenInput");
    const zstZwischen = zstZwischenInput ? parseZaehlerstand(zstZwischenInput.value.trim()) : undefined;

    const datumZukunft = datumZukunftStr ? parseGermanDate(datumZukunftStr) : undefined;
    const zstZukunftInput = document.getElementById("zaehlerstandZukunftInput");
    const zstZukunft = zstZukunftInput ? parseZaehlerstand(zstZukunftInput.value.trim()) : undefined;

    logDebug(`Parsed values: Start=${zaehlerstandStart}, Ende=${zaehlerstandEnde}, DatumStart=${datumStart}, DatumEnde=${datumEnde}`);

    // Validierung der Zählerstandswerte gegen den maximalen Wert
    const maxWert = getMaxWert(vorkommastellen);
    if (zaehlerstandStart !== "-" && zaehlerstandStart > maxWert) {
      logDebug(`Fehler: Zählerstand Start (${zaehlerstandStart}) überschreitet maximalen Wert (${maxWert})`);
      showError(zaehlerstandAltInput.id, `Wert überschreitet den maximalen Zählerstand (${maxWert.toLocaleString('de-DE')}).`);
      setzeStandardAusgaben();
      return;
    }
    if (zaehlerstandEnde !== "-" && zaehlerstandEnde > maxWert) {
      logDebug(`Fehler: Zählerstand Ende (${zaehlerstandEnde}) überschreitet maximalen Wert (${maxWert})`);
      showError(zaehlerstandNeuInput.id, `Wert überschreitet den maximalen Zählerstand (${maxWert.toLocaleString('de-DE')}).`);
      setzeStandardAusgaben();
      return;
    }

    if (zaehlerstandStart === "-" || zaehlerstandEnde === "-" || !datumStart || !datumEnde) {
      logDebug("Berechnung abgebrochen: Ungültige Werte nach Parsing");
      setzeStandardAusgaben();
      return;
    }

    // Hole den Status der Abrechnungs-Checkbox und des Wintermodus am Anfang der Funktion
    const abrechnungAktiv = abrechnungCheckbox ? abrechnungCheckbox.checked : false;
    const isWinterModeActive = wintermodusCheckbox ? wintermodusCheckbox.checked : false;
    logDebug(`Abrechnungs-Checkbox Status: ${abrechnungAktiv}`);
    logDebug(`Wintermodus Status: ${isWinterModeActive}`);

    // Abrechnungslogik für Verbrauch und Tage
    let verbrauchAktuell = berechneVerbrauch(zaehlerstandStart, zaehlerstandEnde, aktuellerMaxWert);
    let tageAktuell = berechneTageDifferenz(datumStart, datumEnde);
    let ueberlaufErkannt = verbrauchAktuell.ueberlauf;
    verbrauchAktuell = verbrauchAktuell.verbrauch;

    // Prüfe, ob Dazwischen vorhanden ist und direkt vor Ende liegt (Datum und optional gleicher Zählerstand)
    if (
        abrechnungAktiv &&
        datumZwischen &&
        sindAufeinanderfolgendeTage(datumZwischen, datumEnde)
    ) {
        if (zstZwischen !== undefined && zstZwischen === zaehlerstandEnde) {
            verbrauchAktuell = 0;
            tageAktuell = 1;
        }
        // Entfernt: Doppelte Berechnung, da verbrauchAktuell bereits berechnet wurde
    }
    // Prüfe, ob Alt direkt vor Neu liegt (ohne Dazwischen)
    else if (
        abrechnungAktiv &&
        !datumZwischen &&
        sindAufeinanderfolgendeTage(datumStart, datumEnde)
    ) {
        verbrauchAktuell = 0;
        tageAktuell = 1;
    }

    // Prüfe auf aufeinanderfolgende Tage mit gleichem Zählerstand z.B. 31.12. und 01.01.
    if (
      abrechnungAktiv &&
      datumZwischen &&
      datumZwischen.getDate() === 31 &&
      datumZwischen.getMonth() === 11 && // 11 ist Dezember (0-basiert)
      zstZwischen !== undefined &&
      zstZwischen === zaehlerstandEnde
    ) {
      verbrauchAktuell = 0; // Kein Verbrauch bei aufeinanderfolgenden Tagen mit gleichem Zählerstand
      tageAktuell = 1; // Setze auf 1 Tag für aufeinanderfolgende Tage
    }

    const verbrauchGesamt = verbrauchAktuell;
    const tageGesamt = tageAktuell;

    logDebug(`Berechnete Werte: Verbrauch=${verbrauchGesamt}, Tage=${tageGesamt}`);

    if (verbrauchGesamt === "-" || tageGesamt === "-") {
      logDebug("Berechnung abgebrochen: Ungültige Berechnungsergebnisse");
      setzeStandardAusgaben();
      return;
    }

    // --- NEUE BERECHNUNG DES TÄGLICHEN VERBRAUCHS MIT WINTERMODUS ---
    let verbrauchProTagSommer = 0;
    let verbrauchProTagWinter = 0;
    let verbrauchProTagEffektivFuerAnzeige = 0; // Der Wert, der im verbrauchProTagOutput angezeigt wird

    if (isWinterModeActive) {
        // Berechne Sommer- und Wintertage für die gesamte Referenzperiode
        let sommerTageGesamt = 0;
        let winterTageGesamt = 0;
        let tempDate = resetDateTime(datumStart);
        let endDateForLoop = resetDateTime(datumEnde);

        while (tempDate < endDateForLoop) {
            if (isWinterMonth(tempDate)) {
                winterTageGesamt++;
            } else {
                sommerTageGesamt++;
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // Basis-Verbrauch pro Tag. Dies ist der Verbrauch eines Sommertages.
        // Die "effektive" Anzahl der Tage ist die Summe der Sommertage plus der gewichteten Wintertage.
        const effektiveTage = sommerTageGesamt + (winterTageGesamt * CONFIG.winterFaktor);
        if (effektiveTage > 0) {
            verbrauchProTagSommer = verbrauchGesamt / effektiveTage;
        } else {
            verbrauchProTagSommer = 0; // Division durch Null vermeiden
        }

        verbrauchProTagWinter = verbrauchProTagSommer * CONFIG.winterFaktor;
        // Der angezeigte "Verbrauch pro Tag" ist der gewichtete Durchschnitt über die gesamte Periode
        verbrauchProTagEffektivFuerAnzeige = (sommerTageGesamt * verbrauchProTagSommer + winterTageGesamt * verbrauchProTagWinter) / tageGesamt;

        logDebug(`Sommer-Tage (Gesamt): ${sommerTageGesamt}`);
        logDebug(`Winter-Tage (Gesamt): ${winterTageGesamt}`);
        logDebug(`Effektive Tage: ${effektiveTage}`);
        logDebug(`Basis Verbrauch pro Tag (Sommer): ${verbrauchProTagSommer}`);

    } else {
        // Ohne Wintermodus ist der Tagesverbrauch konstant (nur Sommerverbrauch relevant)
        verbrauchProTagSommer = verbrauchGesamt / tageGesamt;
        verbrauchProTagWinter = verbrauchProTagSommer; // Gleicher Verbrauch wie Sommer
        verbrauchProTagEffektivFuerAnzeige = verbrauchProTagSommer; // Einfach der Durchschnitt
    }

    logDebug(`Verbrauch pro Tag (Sommer): ${verbrauchProTagSommer}`);
    logDebug(`Verbrauch pro Tag (Winter): ${verbrauchProTagWinter}`);
    logDebug(`Verbrauch pro Tag (Effektiv für Anzeige): ${verbrauchProTagEffektivFuerAnzeige}`);

    // Aktualisiere die Ausgabefelder für den Tagesverbrauch
    setzeTextContent(verbrauchProTagOutput, rundeVerbrauchFuerAnzeige(verbrauchProTagEffektivFuerAnzeige)); 
    setzeTextContent(verbrauchProTagSommerOutput, rundeVerbrauchFuerAnzeige(verbrauchProTagSommer));
    setzeTextContent(verbrauchProTagWinterOutput, rundeVerbrauchFuerAnzeige(verbrauchProTagWinter));

    // --- ENDE NEUE BERECHNUNG DES TÄGLICHEN VERBRAUCHS ---

    // --- Schritt 5: Ergebnisse in die Ausgabefelder schreiben ---

    logDebug("Schreibe Ergebnisse in Ausgabefelder...");

    // Debug-Ausgabe der Ausgabefelder
    logDebug(`verbrauchGesamtOutput existiert: ${!!verbrauchGesamtOutput}`);
    logDebug(`tageGesamtOutput existiert: ${!!tageGesamtOutput}`);

    // Verbrauch Gesamt (bei Aktuell)
    let formattedVerbrauch = rundeVerbrauchFuerAnzeige(verbrauchGesamt);
    if (verbrauchGesamtOutput) {
      verbrauchGesamtOutput.textContent = formattedVerbrauch;
      // CSS-Klasse für Überlauf setzen
      if (ueberlaufErkannt) {
        verbrauchGesamtOutput.classList.add('overflow');
        logDebug("Überlauf erkannt - CSS-Klasse 'overflow' gesetzt für Verbrauch Gesamt");
      } else {
        verbrauchGesamtOutput.classList.remove('overflow');
      }
      logDebug(`Verbrauch Gesamt gesetzt: ${formattedVerbrauch}`);
    } else {
      logDebug("WARNUNG: verbrauchGesamtOutput nicht gefunden!");
    }

    // Tage Gesamt (bei Aktuell)
    let formattedTage = Math.round(tageGesamt).toLocaleString('de-DE');
    if (tageGesamtOutput) {
      tageGesamtOutput.textContent = formattedTage;
      logDebug(`Tage Gesamt gesetzt: ${formattedTage}`);
    } else {
      logDebug("WARNUNG: tageGesamtOutput nicht gefunden!");
    }

    // Berechne Zwischenwerte - nur wenn nötig
    if (datumZwischen) {
      logDebug("Berechne Zwischenwerte...");
      const datumZwischen = parseGermanDate(datumZwischenStr);
      if (datumZwischen) {
        const tageBisZwischen = berechneTageDifferenz(datumStart, datumZwischen);
        if (tageBisZwischen !== "-") {
          // Berechne Zählerstand für Zwischendatum
          const zstZwischen = berechneZstAmDatum(
            datumZwischen, datumStart, zaehlerstandStart, verbrauchProTagSommer, verbrauchProTagWinter, datumEnde, zaehlerstandEnde, isWinterModeActive
          );

          // Formatiere und zeige Zählerstand an
          if (zaehlerstandZwischenOutput && zstZwischen !== "-") {
            const formattedZstZwischen = rundeWertFuerAnzeige(zstZwischen);
            zaehlerstandZwischenOutput.textContent = formattedZstZwischen;
            logDebug(`Zählerstand Zwischen gesetzt: ${formattedZstZwischen}`);
          }

          // Berechne und zeige Verbrauch an (Start bis Zwischen)
          let sommerTageStartZwischen = 0;
          let winterTageStartZwischen = 0;
          let tempDateStartZwischen = resetDateTime(datumStart);
          let endDateForLoopZwischen = resetDateTime(datumZwischen);

          while (tempDateStartZwischen < endDateForLoopZwischen) {
            if (isWinterMonth(tempDateStartZwischen)) {
              winterTageStartZwischen++;
            } else {
              sommerTageStartZwischen++;
            }
            tempDateStartZwischen.setDate(tempDateStartZwischen.getDate() + 1);
          }

          let verbrauchZwischenCalc;
          if (isWinterModeActive) {
            verbrauchZwischenCalc = (sommerTageStartZwischen * verbrauchProTagSommer) + (winterTageStartZwischen * verbrauchProTagWinter);
          } else {
            verbrauchZwischenCalc = tageBisZwischen * verbrauchProTagSommer;
          }

          const formattedVerbrauchZwischen = rundeVerbrauchFuerAnzeige(verbrauchZwischenCalc);
          setzeTextContent(verbrauchZwischenOutput, formattedVerbrauchZwischen);
          // CSS-Klasse für Überlauf bei Zwischenverbrauch setzen
          if (verbrauchZwischenOutput) {
            if (ueberlaufErkannt) {
              verbrauchZwischenOutput.classList.add('overflow');
              logDebug("Überlauf erkannt - CSS-Klasse 'overflow' gesetzt für Verbrauch Zwischen");
            } else {
              verbrauchZwischenOutput.classList.remove('overflow');
            }
          }
          setzeTextContent(tageZwischenOutput, Math.round(tageBisZwischen).toLocaleString('de-DE'));
          logDebug(`Verbrauch Zwischen gesetzt: ${formattedVerbrauchZwischen}`);

          // Aktualisiere die Aktuell-Werte basierend auf dem Zwischenwert
          const tageAktuellNachZwischen = berechneTageDifferenz(datumZwischen, datumEnde);
          let verbrauchAktuellNachZwischen;

          // Prüfe auf aufeinanderfolgende Tage im Abrechnungsmodus
          if (abrechnungAktiv && sindAufeinanderfolgendeTage(datumZwischen, datumEnde)) {
            verbrauchAktuellNachZwischen = 0;
            setzeTextContent(tageAktuellOutput, "1");
            logDebug("Abrechnungsmodus: Aufeinanderfolgende Tage erkannt - Verbrauch auf 0 gesetzt");
          } else {
            let sommerTageZwischenEnde = 0;
            let winterTageZwischenEnde = 0;
            let tempDateZwischenEnde = resetDateTime(datumZwischen);
            let endDateForLoopAktuell = resetDateTime(datumEnde);

            while (tempDateZwischenEnde < endDateForLoopAktuell) {
              if (isWinterMonth(tempDateZwischenEnde)) {
                winterTageZwischenEnde++;
              } else {
                sommerTageZwischenEnde++;
              }
              tempDateZwischenEnde.setDate(tempDateZwischenEnde.getDate() + 1);
            }

            if (isWinterModeActive) {
              verbrauchAktuellNachZwischen = (sommerTageZwischenEnde * verbrauchProTagSommer) + (winterTageZwischenEnde * verbrauchProTagWinter);
            } else {
              verbrauchAktuellNachZwischen = tageAktuellNachZwischen * verbrauchProTagSommer;
            }
            setzeTextContent(tageAktuellOutput, Math.round(tageAktuellNachZwischen).toLocaleString('de-DE'));
          }

          setzeTextContent(verbrauchNeuOutput, rundeVerbrauchFuerAnzeige(verbrauchAktuellNachZwischen));
          // CSS-Klasse für Überlauf bei Aktuell-Verbrauch setzen
          if (verbrauchNeuOutput) {
            if (ueberlaufErkannt) {
              verbrauchNeuOutput.classList.add('overflow');
              logDebug("Überlauf erkannt - CSS-Klasse 'overflow' gesetzt für Verbrauch Aktuell");
            } else {
              verbrauchNeuOutput.classList.remove('overflow');
            }
          }
          logDebug(`Verbrauch Aktuell gesetzt: ${rundeVerbrauchFuerAnzeige(verbrauchAktuellNachZwischen)}`);

          // Aktualisiere die Gesamt-Werte für die Anzeige
          setzeTextContent(verbrauchGesamtOutput, rundeVerbrauchFuerAnzeige(verbrauchAktuellNachZwischen));
          setzeTextContent(tageGesamtOutput, Math.round(tageAktuellNachZwischen).toLocaleString('de-DE'));

          logDebug(`Verbrauch Gesamt aktualisiert (formatiert): ${rundeVerbrauchFuerAnzeige(verbrauchAktuellNachZwischen)}`);
          logDebug(`Verbrauch Gesamt aktualisiert (Rohwert): ${verbrauchAktuellNachZwischen}`);
        }
      }
    }

    // Berechne Zukunftsprognose - nur wenn nötig
    if (datumZukunft) {
      logDebug("Berechne Zukunftsprognose...");

      // Stellen Sie sicher, dass datumEnde (bereits ein Date-Objekt aus dem Haupt-Parsing) auf Mitternacht gesetzt ist
      const datumEndeForPrognosis = resetDateTime(datumEnde);

      // Stellen Sie sicher, dass datumZukunft (bereits ein Date-Objekt aus dem Haupt-Parsing) auf Mitternacht gesetzt ist
      const datumZukunftForPrognosis = resetDateTime(datumZukunft);

      // Führen Sie den direkten Vergleich der Date-Objekte durch (getTime() für präzisen Vergleich)
      if (datumZukunftForPrognosis.getTime() <= datumEndeForPrognosis.getTime()) {
        logDebug("Zukunftsdatum liegt nicht nach dem Enddatum - keine Berechnung (DatumZukunft <= DatumEnde)");
        setzeTextContent(zaehlerstandZukunftOutput, "-");
        setzeTextContent(verbrauchZukunftOutput, "-");
        setzeTextContent(tageZukunftOutput, "-");
        return; // Berechnung abbrechen
      }

      // Prüfe zuerst auf Abrechnungsmodus und aufeinanderfolgende Tage
      if (abrechnungAktiv && sindAufeinanderfolgendeTage(datumEndeForPrognosis, datumZukunftForPrognosis)) {
        logDebug("Aufeinanderfolgende Tage im Abrechnungsmodus erkannt");
        prognoseZaehlerstand = zaehlerstandEnde;
        verbrauchZukunft = 0;
        tageZukunft = 1;
      } else {
        // Berechne den Zählerstand für die Zukunftsprognose
        prognoseZaehlerstand = berechneZstAmDatum(
          datumZukunftForPrognosis, 
          datumEndeForPrognosis, 
          zaehlerstandEnde,
          verbrauchProTagSommer,
          verbrauchProTagWinter,
          datumEndeForPrognosis, 
          zaehlerstandEnde, 
          isWinterModeActive
        );

        // Berechne den Verbrauch für die Zukunftsprognose
        const tageZukunftCalc = berechneTageDifferenz(datumEndeForPrognosis, datumZukunftForPrognosis);
        let sommerTageZukunft = 0;
        let winterTageZukunft = 0;
        let tempDateZukunft = resetDateTime(datumEndeForPrognosis);
        let endDateForLoopZukunft = resetDateTime(datumZukunftForPrognosis);

        while (tempDateZukunft < endDateForLoopZukunft) {
          if (isWinterMonth(tempDateZukunft)) {
            winterTageZukunft++;
          } else {
            sommerTageZukunft++;
          }
          tempDateZukunft.setDate(tempDateZukunft.getDate() + 1);
        }

        let verbrauchZukunftCalc;
        if (isWinterModeActive) {
          verbrauchZukunftCalc = (sommerTageZukunft * verbrauchProTagSommer) + (winterTageZukunft * verbrauchProTagWinter);
        } else {
          verbrauchZukunftCalc = tageZukunftCalc * verbrauchProTagSommer;
        }

        verbrauchZukunft = verbrauchZukunftCalc;
        tageZukunft = tageZukunftCalc;
      }

      // Setze die berechneten Werte
      if (zaehlerstandZukunftOutput && prognoseZaehlerstand !== "-") {
        setzeTextContent(zaehlerstandZukunftOutput, rundeWertFuerAnzeige(prognoseZaehlerstand));
        logDebug(`Zählerstand Zukunft gesetzt: ${rundeWertFuerAnzeige(prognoseZaehlerstand)}`);
      }
      if (verbrauchZukunftOutput && verbrauchZukunft !== "-") {
        setzeTextContent(verbrauchZukunftOutput, rundeVerbrauchFuerAnzeige(verbrauchZukunft));
        // CSS-Klasse für Überlauf bei Zukunftsverbrauch setzen
        if (ueberlaufErkannt) {
          verbrauchZukunftOutput.classList.add('overflow');
          logDebug("Überlauf erkannt - CSS-Klasse 'overflow' gesetzt für Verbrauch Zukunft");
        } else {
          verbrauchZukunftOutput.classList.remove('overflow');
        }
        logDebug(`Verbrauch Zukunft gesetzt: ${rundeVerbrauchFuerAnzeige(verbrauchZukunft)}`);
      }
      if (tageZukunftOutput && tageZukunft !== "-") {
        setzeTextContent(tageZukunftOutput, Math.round(tageZukunft).toLocaleString('de-DE'));
        logDebug(`Tage Zukunft gesetzt: ${Math.round(tageZukunft).toLocaleString('de-DE')}`);
      }
    } else {
      // Wenn kein Zukunftsdatum angegeben ist, setze die Ausgabefelder zurück
      const zaehlerstandZukunftOutput = document.getElementById('zaehlerstandZukunftOutput');
      const verbrauchZukunftOutput = document.getElementById('verbrauchZukunftOutput');
      const tageZukunftOutput = document.getElementById('tageZukunftOutput');

      if (zaehlerstandZukunftOutput) setzeTextContent(zaehlerstandZukunftOutput, '-');
      if (verbrauchZukunftOutput) setzeTextContent(verbrauchZukunftOutput, '-');
      if (tageZukunftOutput) setzeTextContent(tageZukunftOutput, '-');
    }


    // Cache das Ergebnis - sicher auf DOM-Elemente zugreifen
    lastCalculation.values = currentValues;
    lastCalculation.result = {
      verbrauchGesamt: verbrauchGesamt,
      tageGesamt: tageGesamt,
      verbrauchNeu: verbrauchNeuOutput ? verbrauchNeuOutput.textContent : '-',
      tageAktuell: tageAktuellOutput ? tageAktuellOutput.textContent : '-',
      verbrauchZwischen: verbrauchZwischenOutput ? verbrauchZwischenOutput.textContent : '-',
      tageZwischen: tageZwischenOutput ? tageZwischenOutput.textContent : '-',
      zaehlerstandZukunft: zaehlerstandZukunftOutput ? zaehlerstandZukunftOutput.textContent : '-',
      verbrauchZukunft: verbrauchZukunftOutput ? verbrauchZukunftOutput.textContent : '-',
      tageZukunft: tageZukunftOutput ? tageZukunftOutput.textContent : '-'
    };
  };

  // Debouncing für Input-Handler
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Optimierte Event-Handler
  const handleInput = debounce((inputElement) => {
    handleInputValidation(inputElement, false);
  }, 50); // Reduziert von 150ms auf 50ms

  // Hilfsfunktion für Event-Listener
  const addListenerToInputs = (inputs, event, handler) => {
    inputs.forEach(input => {
      if (input) input.addEventListener(event, handler);
    });
  };

  // Event-Listener für Zählerstände
  addListenerToInputs(
    [zaehlerstandAltInput, zaehlerstandNeuInput],
    'focus',
    function() {
      this.dataset.touched = 'true';
      handleInputValidation(this, true);
    }
  );

  addListenerToInputs(
    [zaehlerstandAltInput, zaehlerstandNeuInput],
    'blur',
    function() {
      const inputElement = this;
      const debouncedHandler = debounce(() => {
        const isValid = handleInputValidation(inputElement, true);
        if (isValid) {
          aktualisiereBerechnung();
        }
      }, 25);
      debouncedHandler();
    }
  );

  addListenerToInputs(
    [zaehlerstandAltInput, zaehlerstandNeuInput],
    'input',
    function() {
      const inputElement = this;
      debounce(() => {
        inputElement.dataset.touched = 'true'; // inputElement ist verfügbar
        aktualisiereBerechnung();
      }, 50)();
    }
  );

  // Event-Listener für Datumsfelder
  addListenerToInputs(
    [datumAltInput, datumNeuInput, datumZukunftInput, datumZwischenInput],
    'focus',
    function() {
      this.dataset.touched = 'true';
      validateDatumInput(this);
    }
  );

  addListenerToInputs(
    [datumAltInput, datumNeuInput, datumZukunftInput, datumZwischenInput],
    'blur',
    function() {
      const inputElement = this;
      const debouncedHandler = debounce(() => {
        const normalized = normalizeAndValidateDateOnBlur(inputElement);
        if (normalized) {
          aktualisiereBerechnung();
        }
      }, 25);
      debouncedHandler();
    }
  );

  addListenerToInputs(
    [datumAltInput, datumNeuInput, datumZukunftInput, datumZwischenInput],
    'input',
    function() {
      const inputElement = this;
      debounce(() => {
        inputElement.dataset.touched = 'true'; // inputElement ist verfügbar
        aktualisiereBerechnung();
      }, 50)();
    }
  );

  // Event-Listener für Konfigurationsänderungen
  const configElements = [
    vorkommastellenInput,
    wintermodusCheckbox,
    rundenOptionInput,
    abrechnungCheckbox
  ];
  
  configElements.forEach(element => {
    if (element) {
      element.addEventListener('change', debounce(aktualisiereBerechnung, 25));
    }
  });

  if (vorkommastellenInput) {
    vorkommastellenInput.addEventListener('change', debounce(aktualisiereBerechnung, 25));
  }
  if (wintermodusCheckbox) {
    wintermodusCheckbox.addEventListener('change', debounce(aktualisiereBerechnung, 25));
  }
  if (rundenOptionInput) {
    rundenOptionInput.addEventListener('change', debounce(aktualisiereBerechnung, 25));
  }
  if (abrechnungCheckbox) {
    abrechnungCheckbox.addEventListener('change', debounce(aktualisiereBerechnung, 25));
  }

}); // Ende von DOMContentLoaded

/**
  * Prüft, ob zwei Daten aufeinanderfolgende Tage sind
  * @param {Date} datum1 - Das erste Datum
  * @param {Date} datum2 - Das zweite Datum
  * @returns {boolean} - true wenn die Daten aufeinanderfolgende Tage sind
  */
  const sindAufeinanderfolgendeTage = (datum1, datum2) => {
    // Erstelle Kopien der Daten und setze die Uhrzeit auf Mitternacht
    const d1 = resetDateTime(datum1);
    const d2 = resetDateTime(datum2);

    // Berechne die Differenz in Tagen
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Die Tage sind aufeinanderfolgend, wenn die Differenz genau 1 Tag beträgt
    return diffDays === 1;
  };

  // Neue Hilfsfunktion erstellen:
  const berechneWintermodusTage = (startDate, endDate) => {
    let sommerTage = 0;
    let winterTage = 0;
    let tempDate = resetDateTime(startDate);
    let endDateForLoop = resetDateTime(endDate);

    while (tempDate < endDateForLoop) {
      if (isWinterMonth(tempDate)) {
        winterTage++;
      } else {
        sommerTage++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return { sommerTage, winterTage };
  };

  // Alle Abrechnungsprüfungen in eine Funktion zusammenfassen:
  const pruefeAbrechnungsmodus = (datum1, datum2, zst1, zst2) => {
    if (!abrechnungAktiv) return false;
    
    if (sindAufeinanderfolgendeTage(datum1, datum2)) {
      if (zst1 !== undefined && zst1 === zst2) {
        return true; // Verbrauch = 0, Tage = 1
      }
    }
    return false;
  };

  // Hilfsfunktion zum Zurücksetzen der Uhrzeit
  const resetDateTime = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Zentrale Funktion für die Berechnung des maximalen Zählerstandswerts
  const getMaxWert = (vorkommastellen) => {
    return Math.pow(10, vorkommastellen) - 1;
  };

// E.o.F.