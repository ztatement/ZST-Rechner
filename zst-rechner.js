/*
 * Dieses Skript ist für die Berechnung und Anzeige interpolierter Zählerstände sowie 
 * des Verbrauchs basierend auf Benutzereingaben (Datum und Zählerstände).
 * Unterstützt deutsche Formate (TT.MM.JJJJ für Datum und 1.234,567 für Zählerstände).
 * Rundungsoptionen: Kaufmännisch, Abrunden, Keine Rundung.
 * Weiter wird Bezug nehmend auf die Einstellung der Vorkommastellen ein Überlauf berücksichtigt.
 */

// Wenn die Seite vollständig geladen ist, wird dieses Skript ausgeführt
document.addEventListener("DOMContentLoaded", function () {
  // Verschiedene Eingabefelder und IDs definieren
  // Eingabefelder
  const zstOldInput = document.getElementById("zstOldInput"); // Benutzerinput: alter Zählerstand
  const zstNewInput = document.getElementById("zstNewInput"); // Benutzerinput: aktueller Zählerstand
  const datOldInput = document.getElementById("datOldInput"); // Benutzerinput: Altes Datum
  const datNewInput = document.getElementById("datNewInput"); // Benutzerinput: Neues Datum
  const datFutureInput = document.getElementById("datFutureInput");   // Benutzerinput: Datum in die Zukunft
  const datBetweenInput = document.getElementById("datBetweenInput"); // Benutzerinput: Datum zwischen alt und neu
  // Dropdown
  const roundingOption = document.getElementById("roundingOption"); // Dropdown für Rundungsoptionen
  const vorkommastellen = document.getElementById("vorkommastellenOption").value; // Dropdown für Auswahl 5 od. 6 Vorkommastellen
  // Ausgabefelder Zählerstand
  const zstBetween = document.getElementById("zstBetween"); // Ausgabe des interpolierten Zählerstands 
  const zstFuture = document.getElementById("zstFuture"); // Ausgabe des interpolierten Zählerstands für Zukunft
  // Ausgabefelder Tage
  const daysFuture = document.getElementById("daysFuture");
  const daysNew = document.getElementById("daysNew");
  const daysBetween = document.getElementById("daysBetween");
  // Ausgabefelder Verbrauch
  const verbrauchFuture = document.getElementById("verbrauchFuture"); // Ausgabe des berechneten Verbrauchs für die Zukunft
  const verbrauchNew = document.getElementById("verbrauchNew");
  const verbrauchBetween = document.getElementById("verbrauchBetween");

  const maxValue = vorkommastellen === "5" ? 99999 : 999999; // Maximalwert dynamisch setzen

  if (!zstOldInput.value.trim()) {
    zstOldInput.value = "0"; // Standardwert nur setzen, wenn kein Wert vorhanden ist
  }

  // Überprüfung des neuen Zählerstandes bei Änderung
  zstNewInput.addEventListener("change", () => {
    let value = zstNewInput.value.trim(); // Leerzeichen entfernen
    const regex = /^\d{1,3}(\.\d{3})*(,\d{1,3})?$/; // Erlaubt exakt bis zu drei Nachkommastellen


    // Falls kein Dezimaltrennzeichen vorhanden ist, wird ,0 angefügt
    if (!regex.test(value)) {
      alert("Bitte geben Sie einen gültigen Zählerstand im Format 1.234,5 ein.");
      zstNewInput.value = ""; // Eingabe zurücksetzen
    } else if (!value.includes(",")) {
      zstNewInput.value += ",0"; // `,0` hinzufügen
    }
  });

  const calculateConsumption = (oldValue, newValue, maxValue) => {
    if (oldValue > newValue) {
      // Überlauf erkannt
      return (maxValue - oldValue) + newValue + 1;
    }
    // Kein Überlauf
    return newValue - oldValue;
  };

  const validateVorkommastellen = (value, vorkommastellen) => {
    // Entferne Tausendertrennzeichen und überprüfe die Länge der Vorkommastellen
    const cleanedValue = value.replace(/\./g, "").replace(/,/, ".");
    //const cleanedValue = value.replace(/\./g, "").split(",")[0]; // Nur den Vorkommateil extrahieren
    const decimalPart = value.split(",")[1] || ""; // Nachkommastellen extrahieren
    console.log("Cleaned Value:", cleanedValue);
    console.log("Decimal Part Length:", decimalPart.length);

    // Validierung der Nachkommastellen
    if (decimalPart.length > 3) {
      console.warn("Zu viele Nachkommastellen!");
      return false;
    }

    return cleanedValue.length === parseInt(vorkommastellen, 10); // Vergleich mit der gewählten Anzahl
  };

/**
  * Validiert einen Zählerstand basierend auf Format und Anzahl der Vorkommastellen.
  * 
  * @param {HTMLElement} inputElement - Das Eingabefeld für den Zählerstand.
  * @param {string} vorkommastellen - Erwartete Anzahl der Vorkommastellen.
  * @returns {boolean} - Gibt `true` zurück, wenn die Eingabe gültig ist.
  */
  const validateZählerstand = (inputElement, vorkommastellen) => {
    const value = inputElement.value.trim(); // Benutzer-Eingabe bereinigen
    if (value === "0") {
      inputElement.classList.remove("is-invalid"); // Rot entfernen
      inputElement.setCustomValidity(""); // Validierung zurücksetzen
      return true; // "0" ist gültig
    }

    const regex = /^\d{1,3}(\.\d{3})*(,\d{1,3})?$/; // Erlaubt exakt bis zu drei Nachkommastellen

    if (!regex.test(value) || !validateVorkommastellen(value, vorkommastellen)) {
      inputElement.classList.add("is-invalid"); // Rot markieren
      inputElement.setCustomValidity("Bitte geben Sie einen Zählerstand mit der korrekten Anzahl Vorkommastellen ein.");
      return false;
    }

    inputElement.classList.remove("is-invalid"); // Rot entfernen
    inputElement.setCustomValidity(""); // Validierung zurücksetzen
    return true;
    
console.log("Eingegebener Wert:", value);
console.log("Bereinigter Wert:", cleanedValue);
console.log("Nachkommastellen:", decimalPart);
  };

/*
    if (!regex.test(value)) {
      console.warn("Ungültiges Format!");
      inputElement.classList.add("is-invalid"); // Rot markieren
      inputElement.setCustomValidity("Bitte geben Sie einen gültigen Zählerstand im Format 1.234,5 ein.");
      return false;
    }

    if (!validateVorkommastellen(value, vorkommastellen)) {
      console.warn("Ungültige Anzahl von Vorkommastellen!");
      inputElement.classList.add("is-invalid"); // Rot markieren
      inputElement.setCustomValidity("Bitte geben Sie einen Zählerstand mit der korrekten Anzahl Vorkommastellen ein.");
      return false;
    }

    inputElement.classList.remove("is-invalid"); // Rot entfernen
    inputElement.setCustomValidity(""); // Validierung zurücksetzen
    return true;

  };*/

  // Validierung für deutsches Datumsformat (TT.MM.JJJJ)
  const isValidGermanDate = (dateString) => {
    const regex = /^\d{2}\.\d{2}\.\d{4}$/; // Prüft auf TT.MM.JJJJ
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split('.').map(Number);
    const date = new Date(year, month - 1, day); // Monat ist nullbasiert
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  // Konvertierung von deutschem Datum zu Date-Objekt
  const parseGermanDate = (dateString) => {
    if (!isValidGermanDate(dateString)) return null;
    const [day, month, year] = dateString.split('.').map(Number);
    return new Date(year, month - 1, day);
  };

  const validateInput = (inputElement) => {
    const value = inputElement.value;

    if (!isValidGermanDate(value)) {
      inputElement.classList.add("is-invalid");
      inputElement.setCustomValidity("Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.");
    } else {
      inputElement.classList.remove("is-invalid");
      inputElement.setCustomValidity("");
    }
  };

  [zstOldInput, zstNewInput].forEach((element) => {
    element.addEventListener("input", () => {
      const vorkommastellen = document.getElementById("vorkommastellenOption").value;
      const isValid = validateZählerstand(element, vorkommastellen);
      
      // Falls ungültig, keine Berechnung durchführen
      if (!isValid) {
        updateCalculation(); // beendet Berechnung, falls ungültig
      }
    });
  });

  // Event Listener für Eingaben im Datumsfeld
  [datOldInput, datNewInput, datFutureInput, datBetweenInput].forEach((element) => {
    element.addEventListener("input", () => validateInput(element));
  });

  // Verarbeitet die Eingabewerte und gibt sie als Zahlen zurück
  const parseValue = (value) => {
    if (!value) return "-"; //null; // Null zurückgeben, falls kein Wert eingegeben wurde

    // Tausenderpunkte entfernen, aber Dezimal-Komma zu Punkt umwandeln
    const cleanedValue = value.replace(/\./g, "").replace(/,/, ".");

    // In eine Zahl umwandeln
    return parseFloat(cleanedValue); // Die Eingabe bleibt genau
  };

/**
  * Berechnet die Anzahl der Tage zwischen zwei Datumswerten.
  * Erwartet Eingabe im Format TT.MM.JJJJ und konvertiert diese in Date-Objekte.
  * Gibt die Differenz in Tagen zurück.
  * 
  * @param {string} startDate - Startdatum (TT.MM.JJJJ).
  * @param {string} endDate - Enddatum (TT.MM.JJJJ).
  * @returns {number|string} - Anzahl der Tage oder "-" bei ungültiger Eingabe.
  */
  const calculateDays = (startDate, endDate) => {
    const start = parseGermanDate(startDate);
    const end = parseGermanDate(endDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return "-";
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

 /*
  * Rundungsoptionen:
  * - "standard": Kaufmännisches Runden (Standardwahl).
  * - "floor": Immer abrunden, kein Kaufmännisches Runden.
  * - "none": Keine Rundung, Werte bleiben genau, aber auf 3 Nachkommastellen begrenzt.
  */
  const roundValue = (value) => {
    if (isNaN(value)) return "-";

    const roundingMethod = roundingOption ? roundingOption.value : "standard";
    const vorkommastellen = document.getElementById("vorkommastellenOption").value; // Vorkommastellen aus Dropdown
    
    let roundedValue = value;
    if (roundingMethod === "floor") {
      roundedValue = Math.floor(value);
    } else if (roundingMethod === "none") {
      roundedValue = parseFloat(value.toFixed(3));
    } else {
      roundedValue = Math.round(value);
    }
    // Zählerstand mit gewählten Vorkommastellen anzeigen
    return roundedValue.toLocaleString("de-DE", {
      minimumIntegerDigits: Number(vorkommastellen),
      useGrouping: true,
    });
  };

// Berechnung aktualisieren
const updateCalculation = () => {
  const oldDate = datOldInput.value;
  const newDate = datNewInput.value;
  const futureDate = datFutureInput.value;
  const betweenDate = datBetweenInput.value; // Datum "Dazwischen"

  const zstOldVal = parseValue(zstOldInput.value); // Wert aus der Eingabe für alten Zählerstand
  const zstNewVal = parseValue(zstNewInput.value);
  const zstBetweenVal = parseValue(zstBetween.textContent) || 0; // Standardwert 0

  const vorkommastellen = document.getElementById("vorkommastellenOption").value;
  const maxValue = vorkommastellen === "5" ? 99999 : 999999; // Maximalwert dynamisch setzen

  // Validierung der Eingaben
  /*if (
    !validateZählerstand(zstOldInput, vorkommastellen) ||
    !validateZählerstand(zstNewInput, vorkommastellen)
  ) {
    console.warn("Ungültige Eingaben. Berechnung abgebrochen.");
    return;
  }*/

  // Tage berechnen
  const daysTotalOldToNew = calculateDays(oldDate, newDate);
  const daysBetweenToNew = calculateDays(betweenDate, newDate);
  const daysToFuture = calculateDays(newDate, futureDate);

  daysNew.textContent = isNaN(daysTotalOldToNew) ? "-" : daysTotalOldToNew;
  daysBetween.textContent = isNaN(daysBetweenToNew) ? "-" : daysBetweenToNew;
  daysFuture.textContent = isNaN(daysToFuture) ? "-" : daysToFuture;

  // Absicherung gegen ungültige Werte
  if (
    isNaN(daysBetweenToNew) || isNaN(daysTotalOldToNew) || daysTotalOldToNew === 0 ||
    isNaN(zstOldVal) || isNaN(zstNewVal)
  ) {
    console.warn("Ungültige Werte für die Berechnung.");
    
    // Fallbackwerte setzen
    zstBetweenVal = "-";
    zstFuture.textContent = "-";
    zstBetween.textContent = "-";
    verbrauchFuture.textContent = "-";
    verbrauchNew.textContent = "-";
    verbrauchBetween.textContent = "-";
    return; // Keine weiteren Berechnungen durchführen
  } else {
    // Berechnung durchführen
    zstBetweenVal = zstOldVal + ((zstNewVal - zstOldVal) * (daysBetweenToNew / daysTotalOldToNew));
  }

  // Zählerstände interpolieren
  const zstFutureVal = zstNewVal + ((zstNewVal - zstOldVal) * (daysToFuture / daysTotalOldToNew));
  zstBetweenVal = zstOldVal + ((zstNewVal - zstOldVal) * (daysBetweenToNew / daysTotalOldToNew));

  // Verbrauch berechnen
  let verbrauchToNew;

  if (!betweenDate) {
    // Kein Datum "Dazwischen" eingegeben
    verbrauchToNew = calculateConsumption(zstOldVal, zstNewVal, maxValue);
  } else {
    // Datum "Dazwischen" ist angegeben
    verbrauchToNew = calculateConsumption(zstBetweenVal, zstNewVal, maxValue);
  }

  const verbrauchToFuture = calculateConsumption(zstNewVal, zstFutureVal, maxValue);
  const verbrauchToBetween = betweenDate
    ? calculateConsumption(zstOldVal, zstBetweenVal, maxValue)
    : "-"; // Kein Verbrauch "Dazwischen", wenn kein Datum

  const setClassByValue = (element, value, maxValue) => {
    if (value < 0) {
      element.classList.add("negative"); // Negative Werte -> Rot
      element.classList.remove("overflow");
    } else if (value > maxValue) {
      element.classList.add("overflow"); // Überlauf -> Orange
      element.classList.remove("negative");
    } else {
      element.classList.remove("negative", "overflow"); // Standardstil zurücksetzen
    }
  };

  // Ergebnisse visuell hervorheben
  setClassByValue(zstFuture, zstFutureVal, maxValue);
  setClassByValue(zstBetween, zstBetweenVal, maxValue);
  setClassByValue(verbrauchFuture, verbrauchToFuture, maxValue);
  setClassByValue(verbrauchNew, verbrauchToNew, maxValue);
  setClassByValue(verbrauchBetween, verbrauchToBetween, maxValue);

  // Ergebnisse anzeigen
  zstFuture.textContent = roundValue(zstFutureVal);
  zstBetween.textContent = roundValue(zstBetweenVal);
  verbrauchFuture.textContent = roundValue(verbrauchToFuture);
  verbrauchNew.textContent = roundValue(verbrauchToNew);
  verbrauchBetween.textContent = roundValue(verbrauchToBetween);
};

// Event-Listener für Eingaben an Zählerständen und Datumsfeldern
[datOldInput, datNewInput, datFutureInput, datBetweenInput, zstOldInput, zstNewInput].forEach((element) => {
  element.addEventListener("input", updateCalculation);
});

// Initiale Berechnung durchführen
updateCalculation();
});
