# Zählerstands-Rechner (ZST-Rechner)
Ein benutzerfreundlicher Online-Rechner zur Berechnung von interpolierten Zählerständen und Verbrauchswerten basierend auf Benutzereingaben wie Datum und Zählerstand. Dieses Tool wurde speziell entwickelt, um einfache und präzise Berechnungen im deutschen Zahlen- und Datumsformat durchzuführen.

## Funktionen
- **Eingabe von Zählerständen und Datumsangaben**:
  Unterstützt die Eingabe von Zählerständen im deutschen Format (z. B. `1.234,567`) und Datumsangaben im Format `TT.MM.JJJJ`.

- **Interpolation von Zählerständen**:
  Berechnet interpolierte Werte für zukünftige und "Zwischen"-Zeitpunkte.

- **Berechnung des Verbrauchs**:
  Zeigt den Verbrauch zwischen verschiedenen Zeitpunkten (aktuell, vergangen, zukünftig) an.

- **Rundungsoptionen**:
  - Kaufmännisches Runden
  - Immer abrunden
  - Keine Rundung (Werte werden auf maximal 3 Nachkommastellen begrenzt)

- **Responsive Benutzeroberfläche**:
  Unterstützt die Nutzung auf mobilen und Desktop-Geräten.

## Demo
Probieren Sie den ZST-Rechner live aus:  
[Zählerstands-Rechner online testen](https://demo-seite.com/rechner/zst/)

## Installation
Falls Sie den Rechner lokal hosten oder anpassen möchten, folgen Sie diesen Schritten:

1. **Repository klonen**:
    ```bash
       git clone https://github.com/ztatement/zst-rechner.git
       cd zst-rechner```

2. **Webserver starten**:

Öffnen Sie die index.html in einem Browser oder verwenden Sie einen lokalen Webserver wie http-server:
    ```bash
        npx http-server```

3. **Anpassungen vornehmen**:
   Bearbeiten Sie die HTML- oder JavaScript-Dateien, um den Rechner an Ihre Bedürfnisse anzupassen.

## Verwendung
1. **Eingabefelder**
Zählerstände: Geben Sie die alten und aktuellen Zählerstände im deutschen Format ein (z. B. 1.234,5).

Datumsangaben: Füllen Sie die Felder für alte, neue, zukünftige und "Zwischen"-Datumsangaben aus.

2. **Rundungsoptionen**
Wählen Sie aus drei Rundungsoptionen:

Kaufmännisches Runden: Rundet auf die nächste ganze Zahl.

Abrunden: Immer zur nächstkleineren Zahl.

Keine Rundung: Werte werden direkt angezeigt (maximal 3 Nachkommastellen).

3. **Ergebnisse**
Nach der Eingabe der Daten und der Auswahl einer Rundungsoption werden die berechneten Werte automatisch angezeigt.

## Technologie
HTML5: Struktur der Benutzeroberfläche

CSS3: Gestaltung und Responsivität

JavaScript (ES6): Validierung, Berechnung und Dynamik

### Beitrag leisten
Beiträge und Verbesserungsvorschläge sind jederzeit willkommen! Folgen Sie diesen Schritten, um einen Beitrag zu leisten:

Forken Sie das Repository.

Erstellen Sie einen neuen Branch:
    ```bash
    git checkout -b feature/neue-funktion```

Nehmen Sie Ihre Änderungen vor und committen Sie:
    ```bash
    git commit -m "Neue Funktion hinzugefügt"```

Pushen Sie den Branch:
    ```bash
    git push origin feature/neue-funktion```

Erstellen Sie einen Pull Request auf GitHub.

## Lizenz
Dieses Projekt steht unter der MIT-Lizenz. Weitere Informationen finden Sie in der LICENSE-Datei.

Vielen Dank, dass Sie den ZST-Rechner nutzen! 😊
