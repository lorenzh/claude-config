# Runbook: `datenpumpe`

Alle Befehle, Pfade, Tabellennamen und Zahlen in diesem Runbook sind Platzhalter für den
fiktiven Dienst `datenpumpe`. Ersetzen Sie sie durch die Werte Ihrer Installation.

## Was der Dienst tut

`datenpumpe` lädt jede Nacht CSV-Exporte in das Data Warehouse. Der Scheduler startet den Dienst
um 01:00 Uhr.

Der Dienst liest die Dateien aus `/data/datenpumpe/incoming`. Er prüft jede Datei gegen das
erwartete Schema. Danach schreibt er die Zeilen in die Zieltabellen im Schema `dwh`. Zum Schluss
verschiebt er die verarbeiteten Dateien nach `/data/datenpumpe/archive`.

Ein Lauf verarbeitet alle Dateien eines Datums. `datenpumpe` schreibt für jeden Lauf eine Zeile in
die Tabelle `load_run`. Diese Zeile enthält Startzeit, Endzeit, Status und Zeilenzahl. Der Status
lautet `running`, `success` oder `failed`.

Ein Lauf löscht die Zeilen seines Datums vor dem Schreiben. Ein zweiter Lauf für dasselbe Datum
erzeugt deshalb keine doppelten Zeilen.

## Einen Lauf nach einem Fehlschlag neu starten

ACHTUNG: Starten Sie keinen zweiten Lauf, solange der erste läuft. Zwei gleichzeitige Läufe
schreiben doppelte Zeilen in die Zieltabellen.

1. Prüfen Sie den Status des letzten Laufs: `datenpumpe status --last`.
2. Wenn der Status `running` lautet, beenden Sie den Lauf mit `datenpumpe abort <run-id>`.
3. Lesen Sie das Protokoll des Laufs: `datenpumpe logs <run-id>`.
4. Wenn eine Datei das Schema verletzt, verschieben Sie die Datei nach `/data/datenpumpe/quarantine`.
5. Melden Sie jede Datei in der Quarantäne an das Team des Quellsystems.
6. Prüfen Sie den freien Platz: `df -h /data/datenpumpe`.
7. Wenn weniger als 20 Prozent frei sind, löschen Sie alte Dateien aus dem Archiv.
8. Starten Sie den Lauf neu: `datenpumpe run --date <YYYY-MM-DD>`.
9. Prüfen Sie den Fortschritt: `datenpumpe status --follow`.
10. Wenn der Lauf ein zweites Mal fehlschlägt, eskalieren Sie an das Team Data Platform.

Hinweis: Der Neustart verarbeitet nur das genannte Datum. Für mehrere Tage braucht `datenpumpe`
einen Lauf pro Datum, in aufsteigender Reihenfolge.

## Alarmschwellen

Die folgenden Schwellen stehen in `datenpumpe-alerts.yaml`. Die Zahlen sind Platzhalter. Die
gültigen Werte stehen in der Datei Ihrer Umgebung.

| Alarm | Bedingung | Kanal |
|---|---|---|
| `datenpumpe_run_failed` | Ein Lauf endet mit Status `failed`. | Pager |
| `datenpumpe_run_missing` | Bis 03:00 Uhr gibt es keinen Lauf mit Status `success`. | Pager |
| `datenpumpe_duration_high` | Ein Lauf dauert länger als 90 Minuten. | Chat |
| `datenpumpe_rows_low` | Die Zeilenzahl liegt unter 60 Prozent des Medians der letzten 7 Läufe. | Chat |
| `datenpumpe_quarantine` | In der Quarantäne liegen mehr als 5 Dateien. | Chat |

Ein Pager-Alarm verlangt eine Reaktion in der Nacht. Ein Chat-Alarm verlangt eine Reaktion am
nächsten Arbeitstag.

Die Ursache von `datenpumpe_rows_low` liegt im Export des Quellsystems oder in einer Datei in der
Quarantäne. Der Lauf selbst endet trotzdem mit Status `success`.

## Wenn der Lauf länger dauert als sonst

Die übliche Dauer der letzten Wochen steht im Dashboard `datenpumpe / run duration`.

1. Prüfen Sie die Dauer der letzten sieben Läufe: `datenpumpe status --history 7`.
2. Prüfen Sie Zahl und Größe der Eingabedateien: `ls -lh /data/datenpumpe/incoming`.
3. Wenn die Datenmenge über der des Vortags liegt, informieren Sie das Team des Quellsystems.
4. Wenn die Datenmenge gleich blieb, prüfen Sie die Last der Warehouse-Datenbank.
5. Prüfen Sie die laufenden Abfragen: `datenpumpe db locks`.
6. Wenn eine fremde Abfrage eine Zieltabelle sperrt, bitten Sie den Besitzer der Abfrage, sie
   abzubrechen.
7. Prüfen Sie den freien Platz: `df -h /data/datenpumpe`.
8. Wenn der Lauf länger als 3 Stunden dauert, brechen Sie ihn ab: `datenpumpe abort <run-id>`.
9. Starten Sie den Lauf danach neu. Folgen Sie dabei den Schritten oben.

Hinweis: Ein Abbruch verliert keine Daten. `datenpumpe` schreibt die Zeilen einer Datei erst am
Ende der Datei fest.
