 /*
  * Zählerstand-Rechner
  *
  * Autor: Thomas Boettcher @ztatement <github [at] ztatement [dot] com>
  * Lizenz: MIT (https://opensource.org/licenses/MIT)
  * Repository: https://github.com/ztatement/ZST-Rechner
  * Erstellt: Tue Apr 01 2025 07:33:03 GMT+0200
  * Letzte Änderung: Mon May 22 2025
  * Version: 3.0
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

  console.log("[DEBUG_EARLY] Script starting...");

document.addEventListener("DOMContentLoaded", function () {

  console.log("[DEBUG_DOM_LOADED] DOM fully loaded.");

/**
  * Globale Konfiguration für den Zählerstand-Rechner
  * @type {Object}
  * @property {number} maxWert - Maximaler Zählerstandswert (wird dynamisch aus vorkommastellen berechnet)
  * @property {number} winterFaktor - Faktor für erhöhten Verbrauch im Winter (z.B. 1.02 = 2% mehr)
  * @property {number[]} winterMonate - Array der Wintermonate (1-12)
  * @property {number} vorkommastellen - Anzahl der Vorkommastellen des Zählers
  * @property {number} nachkommastellen - Anzahl der Nachkommastellen für Berechnungen
  */
  const CONFIG = {
    maxWert: 999999,
    winterFaktor: 1.02,
    winterMonate: [11, 12, 1, 2],
    vorkommastellen: 6,
    nachkommastellen: 3,
  };

  // *** Bootstrap Tooltip Initialisierung ********************************* //

  if (typeof bootstrap !== 'undefined') {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    console.log("[DEBUG_INIT] Bootstrap Tooltips initialized.");
  } else {
    console.warn("Bootstrap JavaScript nicht geladen. Tooltips werden nicht initialisiert.");
  }

/**
  * Logging-Funktionen für verschiedene Nachrichtenebenen
  * Alle Funktionen schreiben sowohl in die Konsole als auch in das Debug-Output-Feld
  */

/**
  * Schreibt eine Warnung in die Konsole und das Debug-Output-Feld
  * @param {string} message - Die Warnmeldung
  */
  const logWarn = (message) => {
    console.warn(message);
    if (debugOutput) {
      debugOutput.value += `[Warnung]:] ${message}\n`;
      debugOutput.scrollTop = debugOutput.scrollHeight;
    }
  };

/**
  * Schreibt eine Debug-Nachricht in die Konsole und das Debug-Output-Feld
  * @param {string} message - Die Debug-Nachricht
  */
  const logDebug = (message) => {
    console.log(`[DEBUG] ${message}`);
    if (debugOutput) {
      debugOutput.value += `[DEBUG] ${message}\n`;
      debugOutput.scrollTop = debugOutput.scrollHeight;
    }
  };

/**
  * Schreibt eine Fehlermeldung in die Konsole
  * @param {string} msg - Die Fehlermeldung
  */
  let logError = (msg) => console.error(`[Fehler]: ${msg}`);

/**
  * Entfernt alle Leerzeichen aus einem String
  * @param {string} str - Der zu bereinigende String
  * @returns {string} - Der String ohne Leerzeichen
  */
  const removeAllWhitespace = (str) => str.replace(/\s/g, '');

  console.log("[DEBUG_DOM_CACHED] Essential DOM element check starting...");

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
  const openModalButton = document.getElementById("openModalButton");
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
    console.log("[DEBUG_DOM_CACHED] All essential DOM elements found.");
  } else {
    console.error("Nicht alle essentiellen DOM-Elemente wurden gefunden.");
    return;
  }

  // *** Zentrale Validierungs- und Formatierungsfunktion ****************** //

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

  // *** Enter-Prevention ************************************************** //

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
  * Überprüft, ob die Anzahl der Vorkommastellen in einem Zählerstandswert
  * die erlaubte Obergrenze nicht überschreitet.
  * @param {string} value - Der Eingabewert als String (z.B. "123.456,789").
  * @param {number} expected - Die maximal erlaubte Anzahl von Vorkommastellen.
  * @returns {boolean} - True, wenn die Anzahl der Vorkommastellen <= expected ist, sonst false.
  */
  const checkVorkommastellen = (value, expected) => {
    const s = value.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(s);
    if (isNaN(num)) return false;
    const parts = s.split('.');
    const vorkomma = parts[0];
    return vorkomma.length <= expected;
  };

/**
  * Behandelt die Validierung und Formatierung für ein gegebenes Input-Element.
  * Diese Funktion wird bei 'input'- und 'blur'-Ereignissen aufgerufen.
  * Sie unterscheidet zwischen Datums- und Zahlenfeldern und ruft die entsprechenden
  * Validierungs- und Formatierungsfunktionen auf.
  * @param {HTMLInputElement} inputElement Das zu validierende und formatierende Input-Element.
  * @param {boolean} isBlurEvent True, wenn die Funktion durch ein 'blur'-Ereignis ausgelöst wurde.
  * Dies steuert die Sichtbarkeit der Validierungsmeldungen.
  */
  const handleInputValidation = (inputElement, isBlurEvent = false) => {
    if (!inputElement) return false;

    const inputType = inputElement.type;
    const value = inputElement.value.trim();

    let isValid = true;

    if (inputType === 'date') {
      isValid = validateDatumInput(inputElement);
    } else if (inputType === 'number') {
      isValid = validateZaehlerstandInput(inputElement, parseInt(vorkommastellenInput.value, 10));
      
      if (isValid && isBlurEvent) {
        // Formatierung nur beim Verlassen des Feldes
        const numValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(numValue)) {
          inputElement.value = formatZaehlerstand(numValue);
        }
      }
    }

    return isValid;
  };

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

    return true; // Der Input ist gültig.
  };

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
  * @returns {number | string} - Die geparste Zahl oder "-" wenn der Input ungültig ist oder leer/Strich.
  */
 /* const parseZaehlerstand = (value) => {
    if (!value || value === "-") return "-"; // Behandelt leere oder "-" Eingaben.
    // Entfernt Tausendertrennzeichen (.) und ersetzt Komma (,) durch Punkt (.).
    const s = value.trim().replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(s); // Konvertiert den bereinigten String in eine Gleitkommazahl.
    // Gibt die Zahl oder "-" zurück, wenn die Konvertierung fehlschlägt.
    return isNaN(num) ? "-" : num;
  }; */
  // Parst einen String-Wert eines Zählerstandes in eine Zahl.
  // Berücksichtigt deutsche Formatierung (Komma als Dezimaltrennzeichen, Punkt als Tausendertrennzeichen).
  // @param {string} value - Der String-Wert des Zählerstandes.
  // @returns {number | string} - Die geparste Zahl oder "-" wenn der Input ungültig ist oder leer/Strich.
  const parseZaehlerstand = (value) => {
    if (!value || value === "-") return "-";
    const clean = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
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

  // *** Datum Validierung und Parsing ************************************* //

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

  /*
  // Parst ein Datum aus verschiedenen Formaten (TT.MM.JJJJ, TT/MM/JJJJ, TT-MM-JJJJ)
  // @param {string} value - Der String-Wert des Datums.
  // @returns {Date | null} - Das geparste Datum oder null bei Fehler.
  const parseDatum = (value) => {
    if (!value || value === "-") return null;
    const dateRegex = /^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{2,4})$/;
    const match = value.match(dateRegex);
    if (!match) return null;
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) year = year < 50 ? 2000 + year : 1900 + year;
    const date = new Date(year, month - 1, day);
    return (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year) ? date : null;
  }; */

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
      console.log("[DEBUG_NORMALIZE] Normalized date is invalid:", normalizedFull); // Debug-Log
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
    console.log("[DEBUG_VALIDATELIVE] Entering validateInputDateLive. Element:", inputElement ? `#${inputElement.id}` : 'N/A', "Value:", inputElement ? `"${inputElement.value}"` : 'N/A'); // Debug-Log
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
    console.log("[DEBUG_VALIDATEBLUR] Entering normalizeAndValidateDateOnBlur. Element:", inputElement ? `#${inputElement.id}` : 'N/A', "Value:", inputElement ? `"${inputElement.value}"` : 'N/A'); // Debug-Log
    const value = inputElement.value.trim();

    if (!value) {
      hideError(inputElement.id); // Blendet Fehler aus, wenn das Feld leer ist.
      return false; // Leeres Feld ist auf Blur nicht "gültig" im Sinne einer abgeschlossenen Eingabe.
    }

    // Normalisieren (versucht TT.MM.JJJJ daraus zu machen) und validieren.
    const normalized = normalizeGermanDate(value);
    console.log("[DEBUG_VALIDATEBLUR] After normalizeGermanDate. Normalized value:", normalized); // Debug-Log

    // Überprüfen, ob die normalisierte Form ein gültiges Datum ist. normalizeGermanDate gibt "" zurück, wenn Format falsch oder Datum ungültig.
    if (normalized === "") {
      console.log("[DEBUG_VALIDATEBLUR] Normalized value is empty (invalid format or date)."); // Debug-Log
      showError(inputElement.id, "Ungültiges Format oder ungültiges Datum. Erwartet: TT.MM.JJJJ, TT/MM/JJJJ oder TT-MM-JJJJ"); // Zeigt Fehler bei ungültigem Datum/Format.
      // Wir setzen den Wert nicht zurück, damit der Nutzer seine Eingabe korrigieren kann.
      return false;
    }

    // Wenn gültig, Wert im Feld aktualisieren und Fehler ausblenden.
    inputElement.value = normalized;
    console.log("[DEBUG_VALIDATEBLUR] Normalization successful. Setting input value to:", normalized); // Debug-Log
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
    if (zaehlerstandAlt === "-" || zaehlerstandNeu === "-") return "-";
    
    // Berechne den Faktor für die Rundung basierend auf CONFIG.nachkommastellen
    const roundFactor = Math.pow(10, CONFIG.nachkommastellen);
    
    // Runde die Werte auf die konfigurierte Anzahl Nachkommastellen
    const zstAlt = Math.round(zaehlerstandAlt * roundFactor) / roundFactor;
    const zstNeu = Math.round(zaehlerstandNeu * roundFactor) / roundFactor;
    const maxWertRounded = Math.round(maxWert * roundFactor) / roundFactor;
    
    // Prüfe, ob die gerundeten Werte im gültigen Bereich liegen
    // Erlaube Werte bis maxWert + 0.999 (für 3 Nachkommastellen)
    const maxAllowedValue = maxWert + (roundFactor - 1) / roundFactor;
    if (zstAlt < 0 || zstNeu < 0 || zstAlt > maxAllowedValue || zstNeu > maxAllowedValue) {
      logError(`berechneVerbrauch: Zählerstand außerhalb des gültigen Bereichs [0, ${maxAllowedValue}].`);
      return "-";
    }

    // Berechne den Verbrauch unter Berücksichtigung des Überlaufs
    if (zstNeu >= zstAlt) {
      // Normaler Fall: Neuer Zählerstand ist größer oder gleich
      return zaehlerstandNeu - zaehlerstandAlt;
    } else {
      // Überlauf: Neuer Zählerstand ist kleiner als alter
      // Berechne: (maxWert - alter Zählerstand) + neuer Zählerstand + kleinster möglicher Wert
      const smallestValue = 1 / roundFactor;
      return (maxWert - zaehlerstandAlt) + zaehlerstandNeu + smallestValue;
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
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "-";
    if (startDate.getTime() > endDate.getTime()) return "-";

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const roundedDiffDays = Math.round(diffDays * 1000000) / 1000000;

    if (Math.abs(diffDays - Math.round(diffDays)) < 1e-9) {
        return Math.round(diffDays);
    }

    return roundedDiffDays;
  };
  /*
  // Berechnet die Differenz in Tagen zwischen zwei Datumsobjekten (inklusive oder exklusive Endtag)
  // @param {Date} d1 - Startdatum
  // @param {Date} d2 - Enddatum
  // @returns {number|string} - Anzahl der Tage oder "-"
  const berechneTageDifferenz = (d1, d2) => {
    if (!d1 || !d2) return "-";
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : "-";
  }; */


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
  * Berechnet die Anzahl der Wintertage zwischen zwei Daten
  * 
  * Die Funktion:
  * - Iteriert durch jeden Tag im Zeitraum
  * - Prüft, ob der Tag in einem Wintermonat liegt
  * - Zählt die Wintertage
  * 
  * @param {Date} startDate - Das Startdatum
  * @param {Date} endDate - Das Enddatum
  * @param {number[]} winterMonate - Array der Wintermonate (1-12)
  * @returns {number} - Die Anzahl der Wintertage
  */
  const berechneWinterTage = (startDate, endDate, winterMonate) => {
    let winterTage = 0;
    const tempDate = new Date(startDate);
    
    while (tempDate.getTime() <= endDate.getTime()) {
      const month = tempDate.getMonth() + 1; // getMonth() gibt 0-11 zurück
      if (winterMonate.includes(month)) {
        winterTage++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return winterTage;
  };

/**
  * Berechnet einen geschätzten Zählerstand an einem bestimmten Zieldatum
  * 
  * Diese komplexe Funktion:
  * - Verwendet einen Referenzzeitraum für die Berechnung
  * - Berücksichtigt den Wintermodus mit angepasstem Verbrauch
  * - Unterstützt Abrechnungszeiträume
  * - Berechnet den Verbrauch pro Tag
  * - Passt den Verbrauch basierend auf Winter/Sommer an
  * 
  * @param {number|string} zstRefStart - Zählerstand am Start des Referenzzeitraums
  * @param {number|string} zstRefEnde - Zählerstand am Ende des Referenzzeitraums
  * @param {Date} datumRefStart - Startdatum des Referenzzeitraums
  * @param {Date} datumRefEnde - Enddatum des Referenzzeitraums
  * @param {Date} datumZiel - Das Zieldatum für die Berechnung
  * @param {number} maxWert - Der maximale Zählerstandswert
  * @param {boolean} wintermodusAktiv - Ob der Wintermodus aktiv ist
  * @param {Object} config - Die Konfiguration mit Winterfaktor und -monaten
  * @param {boolean} abrechnungAktiv - Ob der Abrechnungsmodus aktiv ist
  * @returns {number|string} - Der berechnete Zählerstand oder "-" bei ungültigen Eingaben
  */
  const berechneZstAmDatum = (
    zstRefStart, zstRefEnde, datumRefStart, datumRefEnde, datumZiel,
    maxWert, wintermodusAktiv, config, abrechnungAktiv
  ) => {
    if (zstRefStart === "-" || zstRefEnde === "-" || !datumRefStart || !datumRefEnde || !datumZiel || maxWert === undefined) {
      return "-";
    }
    if (isNaN(datumRefStart.getTime()) || isNaN(datumRefEnde.getTime()) || isNaN(datumZiel.getTime())) {
      return "-";
    }

    logDebug(`Berechne Zählerstand für ${datumZiel}...`);
    logDebug(`Wintermodus aktiv: ${wintermodusAktiv}`);
    logDebug(`Abrechnung aktiv: ${abrechnungAktiv}`);

    // Prüfe, ob das Zieldatum im Abrechnungszeitraum liegt
    if (abrechnungAktiv) {
      const zielDatumObj = new Date(datumZiel);
      const monat = zielDatumObj.getMonth() + 1; // getMonth() gibt 0-11 zurück
      const tag = zielDatumObj.getDate();
      
      // Prüfe auf 30./31.12. oder 1.1.
      if ((monat === 12 && (tag === 30 || tag === 31)) || (monat === 1 && tag === 1)) {
        logDebug(`Datum ${datumZiel} liegt im Abrechnungszeitraum - verwende letzten bekannten Zählerstand`);
        return zstRefEnde;
      }
    }

    // Berechne die Tage zwischen den Daten
    const tageAlt = berechneTageDifferenz(datumRefStart, datumRefEnde);
    const tageZiel = berechneTageDifferenz(datumRefStart, datumZiel);
    logDebug(`Tage zwischen Alt und Neu: ${tageAlt}`);
    logDebug(`Tage zwischen Alt und Ziel: ${tageZiel}`);

    // Berechne den Verbrauch pro Tag
    const verbrauchGesamt = berechneVerbrauch(zstRefStart, zstRefEnde, maxWert);
    const verbrauchProTag = verbrauchGesamt / tageAlt;
    logDebug(`Verbrauch pro Tag: ${verbrauchProTag}`);

    // Berechne den Verbrauch bis zum Zieldatum
    let verbrauchBisZiel = verbrauchProTag * tageZiel;
    logDebug(`Verbrauch bis Ziel: ${verbrauchBisZiel}`);

    // Wenn Wintermodus aktiv ist, berücksichtige den Winterfaktor
    if (wintermodusAktiv && config && config.winterFaktor && config.winterMonate) {
      const winterFaktor = config.winterFaktor;
      const winterMonate = config.winterMonate;
      logDebug(`Winterfaktor: ${winterFaktor}`);
      logDebug(`Wintermonate: ${winterMonate.join(', ')}`);

      // Berechne die Anzahl der Wintertage im Referenzzeitraum
      const winterTage = berechneWinterTage(datumRefStart, datumRefEnde, winterMonate);
      const sommerTage = tageAlt - winterTage;
      logDebug(`Wintertage im Referenzzeitraum: ${winterTage}`);
      logDebug(`Sommertage im Referenzzeitraum: ${sommerTage}`);

      // Berechne die Anzahl der Wintertage bis zum Zieldatum
      const winterTageBisZiel = berechneWinterTage(datumRefStart, datumZiel, winterMonate);
      const sommerTageBisZiel = tageZiel - winterTageBisZiel;
      logDebug(`Wintertage bis Ziel: ${winterTageBisZiel}`);
      logDebug(`Sommertage bis Ziel: ${sommerTageBisZiel}`);

      // Berechne die effektiven Tage unter Berücksichtigung des Winterfaktors
      const effektiveTage = winterTage * winterFaktor + sommerTage;
      logDebug(`Effektive Tage im Referenzzeitraum: ${effektiveTage}`);

      // Berechne den angepassten Verbrauch pro Tag
      const verbrauchProEinheit = verbrauchGesamt / effektiveTage;
      logDebug(`Verbrauch pro Einheit: ${verbrauchProEinheit}`);

      // Berechne den Verbrauch bis zum Zieldatum mit Winterfaktor
      verbrauchBisZiel = (winterTageBisZiel * winterFaktor + sommerTageBisZiel) * verbrauchProEinheit;
      logDebug(`Verbrauch bis Ziel mit Winterfaktor: ${verbrauchBisZiel}`);
    }

    // Berechne den Zählerstand am Zieldatum
    const zstZiel = zstRefStart + verbrauchBisZiel;
    logDebug(`Berechneter Zählerstand: ${zstZiel}`);

    return passeUeberlaufAn(zstZiel, maxWert);
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
        // Keine Rundung, flexible Nachkommastellen anzeigen (bis max 4 für Verbrauch).
        return formatierteZahlFlexible(num, 4); // Etwas mehr Präzision für Verbräuche im "none" Modus.
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
    if (verbrauchZukunftOutput) verbrauchZukunftOutput.textContent = "-";
    if (verbrauchNeuOutput) verbrauchNeuOutput.textContent = "-";
    if (verbrauchZwischenOutput) verbrauchZwischenOutput.textContent = "-";
  };

/**
  * Hauptfunktion zur Aktualisierung aller Berechnungen und Anzeigen
  * 
  * Diese zentrale Funktion:
  * - Validiert alle Eingabefelder
  * - Berechnet Verbräuche und Zählerstände
  * - Aktualisiert alle Ausgabefelder
  * - Berücksichtigt optionale Zwischen- und Zukunftsberechnungen
  * - Handhabt Fehlerfälle und ungültige Eingaben
  * 
  * Die Funktion wird aufgerufen bei:
  * - Änderungen in Eingabefeldern
  * - Änderungen der Konfiguration
  * - Aktivierung/Deaktivierung von Optionen
  */
  const aktualisiereBerechnung = () => {
    console.log("[DEBUG_CALC_START] Entering aktualisiereBerechnung.");
    logDebug("--- Starte Neuberechnung ---");

    // Bestimmt den maximalen Zählerstandswert
    const vorkommastellen = parseInt(vorkommastellenInput.value, 10);
    const aktuellerMaxWert = Math.pow(10, vorkommastellen) - 1;
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

    // Parsen der Eingabewerte
    logDebug("Starte Parsing der Eingabewerte...");
    const zaehlerstandStart = parseZaehlerstand(zaehlerstandStartStr);
    const zaehlerstandEnde = parseZaehlerstand(zaehlerstandEndeStr);
    const datumStart = parseGermanDate(datumStartStr);
    const datumEnde = parseGermanDate(datumEndeStr);

    logDebug(`Parsed values: Start=${zaehlerstandStart}, Ende=${zaehlerstandEnde}, DatumStart=${datumStart}, DatumEnde=${datumEnde}`);

    if (zaehlerstandStart === "-" || zaehlerstandEnde === "-" || !datumStart || !datumEnde) {
      logDebug("Berechnung abgebrochen: Ungültige Werte nach Parsing");
      setzeStandardAusgaben();
      return;
    }

    // Berechnung des Verbrauchs und der Tage
    logDebug("Starte Berechnung von Verbrauch und Tagen...");
    const verbrauchGesamt = berechneVerbrauch(zaehlerstandStart, zaehlerstandEnde, aktuellerMaxWert);
    const tageGesamt = berechneTageDifferenz(datumStart, datumEnde);

    logDebug(`Berechnete Werte: Verbrauch=${verbrauchGesamt}, Tage=${tageGesamt}`);

    if (verbrauchGesamt === "-" || tageGesamt === "-") {
      logDebug("Berechnung abgebrochen: Ungültige Berechnungsergebnisse");
      setzeStandardAusgaben();
      return;
    }

    // Durchschnittlicher Verbrauch pro Tag
    const verbrauchProTag = verbrauchGesamt / tageGesamt;
    logDebug(`Verbrauch pro Tag: ${verbrauchProTag}`);

    // Hole den Status der Abrechnungs-Checkbox
    const abrechnungAktiv = abrechnungCheckbox ? abrechnungCheckbox.checked : false;
    logDebug(`Abrechnungs-Checkbox Status: ${abrechnungAktiv}`);

    // --- Schritt 5: Ergebnisse in die Ausgabefelder schreiben ---

    logDebug("Schreibe Ergebnisse in Ausgabefelder...");
    
    // Debug-Ausgabe der Ausgabefelder
    logDebug(`verbrauchGesamtOutput existiert: ${!!verbrauchGesamtOutput}`);
    logDebug(`tageGesamtOutput existiert: ${!!tageGesamtOutput}`);
    
    // Verbrauch Gesamt (bei Aktuell)
    let formattedVerbrauch = rundeVerbrauchFuerAnzeige(verbrauchGesamt);
    if (verbrauchGesamtOutput) {
      verbrauchGesamtOutput.textContent = formattedVerbrauch;
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

    // Optionale Ausgaben für Zwischenwerte
    if (verbrauchZwischenOutput && datumZwischenStr) {
      logDebug("Berechne Zwischenwerte...");
      const datumZwischen = parseGermanDate(datumZwischenStr);
      if (datumZwischen) {
        const tageBisZwischen = berechneTageDifferenz(datumStart, datumZwischen);
        if (tageBisZwischen !== "-") {
          // Berechne Zählerstand für Zwischendatum
          const zstZwischen = berechneZstAmDatum(
            zaehlerstandStart, zaehlerstandEnde,
            datumStart, datumEnde,
            datumZwischen,
            aktuellerMaxWert,
            wintermodusCheckbox ? wintermodusCheckbox.checked : false,
            CONFIG,
            abrechnungAktiv
          );
          
          // Formatiere und zeige Zählerstand an
          if (zaehlerstandZwischenOutput && zstZwischen !== "-") {
            const formattedZstZwischen = rundeWertFuerAnzeige(zstZwischen);
            zaehlerstandZwischenOutput.textContent = formattedZstZwischen;
            logDebug(`Zählerstand Zwischen gesetzt: ${formattedZstZwischen}`);
          }

          // Berechne und zeige Verbrauch an
          const verbrauchZwischen = berechneVerbrauch(zaehlerstandStart, zstZwischen, aktuellerMaxWert);
          const formattedVerbrauchZwischen = rundeVerbrauchFuerAnzeige(verbrauchZwischen);
          verbrauchZwischenOutput.textContent = formattedVerbrauchZwischen;
          if (tageZwischenOutput) {
            tageZwischenOutput.textContent = Math.round(tageBisZwischen).toLocaleString('de-DE');
          }
          logDebug(`Verbrauch Zwischen gesetzt: ${formattedVerbrauchZwischen}`);

          // Aktualisiere die Aktuell-Werte basierend auf dem Zwischenwert
          const tageAktuell = berechneTageDifferenz(datumZwischen, datumEnde);
          const verbrauchAktuell = berechneVerbrauch(zstZwischen, zaehlerstandEnde, aktuellerMaxWert);
          
          if (verbrauchNeuOutput) {
            const formattedVerbrauchAktuell = rundeVerbrauchFuerAnzeige(verbrauchAktuell);
            verbrauchNeuOutput.textContent = formattedVerbrauchAktuell;
            logDebug(`Verbrauch Aktuell gesetzt: ${formattedVerbrauchAktuell}`);
          }
          
          if (tageAktuellOutput) {
            tageAktuellOutput.textContent = Math.round(tageAktuell).toLocaleString('de-DE');
            logDebug(`Tage Aktuell gesetzt: ${tageAktuell}`);
          }

          // Aktualisiere die Gesamt-Werte für die Anzeige
          if (verbrauchGesamtOutput) {
            formattedVerbrauch = rundeVerbrauchFuerAnzeige(verbrauchAktuell);
            verbrauchGesamtOutput.textContent = formattedVerbrauch;
            logDebug(`Verbrauch Gesamt aktualisiert: ${formattedVerbrauch}`);
          }
          
          if (tageGesamtOutput) {
            formattedTage = Math.round(tageAktuell).toLocaleString('de-DE');
            tageGesamtOutput.textContent = formattedTage;
            logDebug(`Tage Gesamt aktualisiert: ${formattedTage}`);
          }
        }
      }
    }

    // Optionale Ausgaben für Zukunftsprognose
    if (verbrauchZukunftOutput && datumZukunftStr) {
      logDebug("Berechne Zukunftsprognose...");
      const datumZukunft = parseGermanDate(datumZukunftStr);
      if (datumZukunft) {
        const tageZukunft = berechneTageDifferenz(datumEnde, datumZukunft);
        if (tageZukunft !== "-") {
          // Berechne Zählerstand für Zukunftsdatum
          const zstZukunft = berechneZstAmDatum(
            zaehlerstandStart, zaehlerstandEnde,
            datumStart, datumEnde,
            datumZukunft,
            aktuellerMaxWert,
            wintermodusCheckbox ? wintermodusCheckbox.checked : false,
            CONFIG,
            abrechnungAktiv
          );
          
          // Formatiere und zeige Zählerstand an
          if (zaehlerstandZukunftOutput && zstZukunft !== "-") {
            const formattedZstZukunft = rundeWertFuerAnzeige(zstZukunft);
            zaehlerstandZukunftOutput.textContent = formattedZstZukunft;
            logDebug(`Zählerstand Zukunft gesetzt: ${formattedZstZukunft}`);
          }

          // Berechne und zeige Verbrauch an
          const verbrauchZukunft = berechneVerbrauch(zaehlerstandEnde, zstZukunft, aktuellerMaxWert);
          const formattedVerbrauchZukunft = rundeVerbrauchFuerAnzeige(verbrauchZukunft);
          verbrauchZukunftOutput.textContent = formattedVerbrauchZukunft;
          if (tageZukunftOutput) {
            tageZukunftOutput.textContent = Math.round(tageZukunft).toLocaleString('de-DE');
          }
          logDebug(`Verbrauch Zukunft gesetzt: ${formattedVerbrauchZukunft}`);
        }
      }
    }

    logDebug("[DEBUG_CALC_END] aktualisiereBerechnung erfolgreich abgeschlossen.");
  };

  // Event-Listener für Eingabefelder
  [zaehlerstandAltInput, zaehlerstandNeuInput]
  .forEach((input) => {
    if (input) {
      // Führe Validierung beim ersten Klick durch
      input.addEventListener('focus', function() {
        this.dataset.touched = 'true';
        handleInputValidation(this, true);
      });
      
      input.addEventListener('blur', function() {
        const isValid = handleInputValidation(this, true);
        if (isValid) {
          aktualisiereBerechnung();
        }
      });

      // Bei Änderung des Wertes
      input.addEventListener('input', function() {
        this.dataset.touched = 'true';
        aktualisiereBerechnung();
      });
    }
  });

  // Spezielle Event-Listener für Datumsfelder
  [datumAltInput, datumNeuInput, datumZukunftInput, datumZwischenInput]
  .forEach((input) => {
    if (input) {
      // Führe Validierung beim ersten Klick durch
      input.addEventListener('focus', function() {
        this.dataset.touched = 'true';
        validateDatumInput(this);
      });
      
      input.addEventListener('blur', function() {
        const normalized = normalizeAndValidateDateOnBlur(this);
        if (normalized) {
          aktualisiereBerechnung();
        }
      });

      // Bei Änderung des Wertes
      input.addEventListener('input', function() {
        this.dataset.touched = 'true';
        aktualisiereBerechnung();
      });
    }
  });

  // Event-Listener für Konfigurationsänderungen
  if (vorkommastellenInput) {
    vorkommastellenInput.addEventListener('change', aktualisiereBerechnung);
  }
  if (wintermodusCheckbox) {
    wintermodusCheckbox.addEventListener('change', aktualisiereBerechnung);
  }
  if (rundenOptionInput) {
    rundenOptionInput.addEventListener('change', aktualisiereBerechnung);
  }
  if (abrechnungCheckbox) {
    abrechnungCheckbox.addEventListener('change', aktualisiereBerechnung);
  }
}); // Ende von DOMContentLoaded
