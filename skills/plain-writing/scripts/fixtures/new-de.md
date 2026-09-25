# Runbook: `datenpumpe`

## Was `datenpumpe` macht

`datenpumpe` lädt jede Nacht CSV-Dateien in das Data Warehouse. Das Data Warehouse ist die zentrale
Datenbank für Berichte. Ein Lauf ist eine nächtliche Ausführung von `datenpumpe`.

Der Lauf startet um 01:00 Uhr. Er holt die CSV-Dateien aus dem Ordner `/data/exports/incoming`.
Danach prüft er jede Datei gegen das erwartete Schema. Dateien mit dem richtigen Schema schreibt er
in die Staging-Tabellen. Staging-Tabellen sind Zwischentabellen. Erst der letzte Schritt kopiert die
Zeilen in die Zieltabellen.

Ein Lauf dauert normalerweise 40 bis 70 Minuten. Nach dem Lauf verschiebt `datenpumpe` jede geladene
Datei nach `/data/exports/done`. Ein Lauf ist idempotent. Das heißt: Ein zweiter Lauf mit denselben
Dateien liefert dasselbe Ergebnis wie der erste.

## Neustart nach einem fehlgeschlagenen Lauf

ACHTUNG: Ein Neustart bei laufendem Prozess schreibt Zeilen doppelt in die Staging-Tabellen.

1. Prüfen Sie den Status: `systemctl status datenpumpe`.
2. Wenn der Dienst noch läuft, stoppen Sie ihn: `systemctl stop datenpumpe`.
3. Warten Sie, bis der Status `inactive` meldet.
4. Lesen Sie die letzten Zeilen im Log: `journalctl -u datenpumpe -n 200`.
5. Notieren Sie den Namen der Datei, bei der der Lauf abgebrochen ist.
6. Leeren Sie die Staging-Tabellen: `datenpumpe staging clear`.
7. Verschieben Sie alle Dateien aus `/data/exports/done` zurück nach `/data/exports/incoming`.
   Nehmen Sie nur die Dateien des letzten Laufs.
8. Starten Sie den Lauf neu: `datenpumpe run --date <Datum des Laufs>`.
9. Prüfen Sie nach dem Lauf die Zeilenzahl: `datenpumpe report --date <Datum des Laufs>`.

Wenn Schritt 8 wieder abbricht, starten Sie ihn nicht ein drittes Mal. Melden Sie sich beim
Bereitschaftsdienst Data Platform.

## Alarmschwellen

Die Schwellen stehen in `/etc/datenpumpe/alerts.yaml`. Die Werte in dieser Tabelle sind der Stand
von heute. Prüfen Sie die Datei, bevor Sie sich auf eine Zahl verlassen.

| Alarm | Schwelle | Kanal |
|---|---|---|
| `run_failed` | ein Lauf bricht ab | Pager |
| `run_missing` | um 02:00 Uhr hat kein Lauf gestartet | Pager |
| `run_slow` | ein Lauf dauert länger als 90 Minuten | Slack `#data-alerts` |
| `rows_low` | ein Lauf lädt weniger als 80 Prozent der Zeilen des Vortags | Slack `#data-alerts` |
| `file_rejected` | eine Datei passt nicht zum Schema | Slack `#data-alerts` |
| `disk_low` | weniger als 15 Prozent freier Platz auf `/data` | Pager |

Ein Pager-Alarm weckt den Bereitschaftsdienst. Bearbeiten Sie ihn sofort. Ein Slack-Alarm hat Zeit
bis zum nächsten Arbeitstag. Wenn derselbe Slack-Alarm an drei Tagen hintereinander kommt, behandeln Sie ihn wie einen Pager-Alarm.

## Wenn der Lauf länger dauert als sonst

Der Alarm `run_slow` kommt nach 90 Minuten. Der Lauf läuft dann weiter. Brechen Sie ihn nicht sofort
ab. Ein großer Lauf ist langsam, und die Datenmenge schwankt von Tag zu Tag.

1. Prüfen Sie den Fortschritt: `datenpumpe status`. Die Ausgabe nennt die aktuelle Datei und die
   Zahl der geladenen Zeilen.
2. Vergleichen Sie die Gesamtgröße der Dateien mit der des Vortags: `du -sh /data/exports/incoming`.
3. Wenn die Datenmenge um mehr als die Hälfte gewachsen ist, ist der Lauf nur größer. Warten Sie und
   informieren Sie das Team in `#data-alerts`.
4. Wenn die Datenmenge gleich geblieben ist, prüfen Sie die Last der Datenbank. Fragen Sie dazu die
   Ansicht `pg_stat_activity` ab.
5. Wenn eine fremde Abfrage die Zieltabellen sperrt, sprechen Sie mit deren Besitzer. `datenpumpe`
   wartet auf die Sperre und meldet keinen Fehler.
6. Wenn die Zahl der geladenen Zeilen 15 Minuten lang gleich bleibt, hängt der Lauf. Folgen Sie dann
   dem Abschnitt "Neustart nach einem fehlgeschlagenen Lauf".

Ab 06:00 Uhr lesen die ersten Berichte aus den Zieltabellen. Wenn der Lauf um 05:30 Uhr noch nicht
fertig ist, informieren Sie den Bereitschaftsdienst Data Platform. Der Bereitschaftsdienst
entscheidet, ob die Berichte den Stand vom Vortag zeigen.
