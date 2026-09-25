# Deutsch

Nur das, was Deutsch eigen ist. Die gemeinsamen Regeln stehen im Katalog (`ste-rules.md`), der Ablauf in `SKILL.md`.

ASD-STE100 ist eine kontrollierte Sprache für Englisch; eine deutsche Fassung gibt es nicht. Die Prinzipien übertragen sich: kurze Sätze, aktive Verben, ein Wort pro Sache, Bedingung vor Befehl. Die Wortgrenzen 20 und 25 stammen aus STE und sind für Deutsch nicht geprüft — Deutsch trägt mehr Inhalt pro Wort. Nimm sie als Richtwerte. Der Zielwert aus Schritt 3 gilt auch hier: ein Median von höchstens 14 Wörtern.

Diese Datei gilt für jeden deutschen Text, auch für Chat-Antworten. Sie duzt dich; das `Sie` steht nur in den Beispielen.

## Das einfache Wort

Deutsch hat für fast jedes Amtswort ein Alltagswort. Das Alltagswort kostet den Leser nichts.

| Statt | Schreib |
|---|---|
| anschließend, im Anschluss | danach |
| aufweisen, verfügen über | haben |
| ausschließlich | nur |
| benötigen | brauchen |
| bereitstellen | geben |
| beziehungsweise | oder |
| darüber hinaus | außerdem |
| durchführen | das Verb nennen: prüfen, messen, starten |
| eine Vielzahl von | viele |
| erfolgen | das Verb nennen: passieren, laufen, starten |
| erforderlich | nötig |
| ermitteln | herausfinden |
| gewährleisten | dafür sorgen, dass |
| hinsichtlich, bezüglich | für, bei |
| innerhalb von | in |
| mittels | mit |
| seitens | von |
| sofern | wenn |
| unverzüglich | sofort |
| vorhanden sein | es gibt, haben |
| weiterhin | auch |
| zunächst | zuerst |
| zusätzlich | noch, mehr |

Fachbegriffe stehen nicht auf dieser Liste. `Partition`, `Commit`, `Webhook` bleiben. Erklär jeden bei der ersten Nennung in einem Satz.

## Versteckte Handelnde

Deutsch versteckt den Handelnden auf vier Wegen. Alle vier kosten den Leser einen zweiten Durchgang.

| Statt | Schreib |
|---|---|
| Gesucht wird zuerst im Arbeitsverzeichnis. | `hoardctl` sucht zuerst im Arbeitsverzeichnis. |
| Die Konfiguration lässt sich ausgeben. | `hoardctl config show` gibt die Konfiguration aus. |
| Es ist darauf zu achten, dass … | Achten Sie darauf, dass … |
| Man installiert dafür oft `gcc`. | pip braucht dafür `gcc`. |

Software darf grammatisches Subjekt sein, aber nur mit konkreten Verben: liest, schreibt, nimmt, meldet, bricht ab. Nicht: gewinnt, versteht, entscheidet sich, will. "Die erste gefundene Datei gewinnt" → "`hoardctl` nimmt die erste gefundene Datei."

## Nominalstil auflösen

Ein Substantiv auf `-ung`, `-heit`, `-keit` oder ein substantivierter Infinitiv enthält meist das Verb, das der Satz braucht. Nenne den Handelnden, dann löst sich der Nominalstil von selbst.

- "das Ablegen einer Konfigurationsdatei ist umständlich" → "`hoardctl` verlangt eine Konfigurationsdatei im Projekt. Das ist umständlich."
- "nach erfolgter Auflösung der Werte" → "nachdem `hoardctl` die Werte aufgelöst hat"
- "zur Durchführung der Prüfung" → "um zu prüfen"

**Funktionsverbgefüge durch das Vollverb ersetzen:** zur Anwendung bringen → anwenden · in Betrieb nehmen → starten · eine Entscheidung treffen → entscheiden · Verwendung finden → verwenden · zum Einsatz kommen → einsetzen · Anwendung finden → gelten · eine Prüfung durchführen → prüfen.

## Nebensätze

Regel 4 aus Schritt 3 trifft Deutsch härter als Englisch: Deutsch schiebt das Verb des Nebensatzes ans Ende, und der Leser wartet darauf.

- **Ein Relativsatz wird ein eigener Satz.** "Der Lauf, der länger als drei Stunden dauert, wird abgebrochen." → "Ein Lauf dauert länger als drei Stunden. `datenpumpe` bricht ihn dann ab."
- **Ein Komma pro Satz.** Das Komma nach der vorangestellten Bedingung ist dieses eine Komma.
- **Kein Gedankenstrich in der Satzmitte.** Was dahinter steht, ist der nächste Satz.

## Verbklammer kurz halten

Im Hauptsatz steht der zweite Verbteil am Satzende: bei trennbaren Verben, bei Modalverben (`kann … werden`) und in zusammengesetzten Zeiten. Was dazwischen liegt, hält der Leser im Kopf. Halte die Klammer eng — als Richtwert höchstens acht Wörter.

> Sie fügen die Objekte, die Sie für die Darstellung des Prozesses benötigen, in Ihr Bild **ein**.

Dreizehn Wörter zwischen `fügen` und `ein`. Besser — die Klammer schließt früh, der Rest folgt als eigener Satz:

> Sie fügen die benötigten Objekte in Ihr Bild ein. Sie brauchen sie, um den Prozess darzustellen.

## Substantivketten

- **Höchstens ein Genitiv pro Satz.** Zwei Genitive in einem Satz sind fast immer eine Kette. "die Auflösung der Werte der Konfiguration des Servers" → "wie `hoardctl` die Werte der Serverkonfiguration auflöst".
- **Komposita: höchstens drei Glieder** (Richtwert). Längere in einen Satz auflösen: `Kommandozeilenoptionsauflösung` → "wie `hoardctl` die Kommandozeilenoptionen auflöst".
- **Bindestrich bei Kürzeln und Zahlen:** `S3-Speicher`, `CI-Umgebung`, `24-Stunden-Betrieb`. Sonst zusammenschreiben, auch wenn das Wort lang wird: `Betriebsstundenzähler`, `Konfigurationsdatei`.

## Bedingung vor Befehl

Die STE-Regel gilt unverändert, aber Deutsch stellt die Bedingung gern nach. Zieh sie nach vorn:

- "Erhöhen Sie das Zeitlimit, wenn das Netz langsam ist." → "Wenn das Netz langsam ist, erhöhen Sie das Zeitlimit."
- "Der Dienst startet neu, falls die Prüfung fehlschlägt." → "Falls die Prüfung fehlschlägt, startet der Dienst neu."

## Modalverben

Deutsch hat kein Äquivalent zur STE-Modalleiter, aber dieselbe Absicht gilt: Anforderung oder Tatsache, nichts dazwischen.

| Du schreibst | Schreib |
|---|---|
| sollte (Anforderung) | muss |
| sollte (Empfehlung) | streichen, oder als Tatsache: "X ist schneller, weil Y." |
| könnte, dürfte, eventuell | kann |
| würde (hypothetisch) | umbauen: "Wenn X eintritt, folgt Y." |

## Füllwörter und Weichmacher

Modalpartikeln schwächen jede Aussage und tragen keine Information. Streichen: **eigentlich, ja, halt, wohl, durchaus, quasi, sozusagen, im Prinzip, letztlich, natürlich, bekanntlich, im Grunde, gewissermaßen**.

Ebenso die Hedges: **meistens, in der Regel, tendenziell, oft, eher, fast immer, so gut wie nie** → die Zahl oder die Bedingung nennen. Nenne keinen Grenzwert, den du nicht belegen kannst; ohne Zahl nennst du die Bedingung oder den Befehl, mit dem der Leser selbst misst.

- "Werte über 16 bringen bei den meisten Anbietern nichts mehr." → "Ob höhere Werte helfen, hängt vom Anbieter ab. Messen Sie den Durchsatz."
- "was bei unerwartetem Verhalten meist schneller zum Ziel führt" → "damit sehen Sie die Herkunft jedes Werts."

## Blähwörter

| Statt | Schreib |
|---|---|
| zur Verfügung stellen | geben, bereitstellen |
| Verwendung finden | gelten, genutzt werden |
| beinhalten | enthalten |
| aufgrund der Tatsache, dass | weil |
| im Rahmen von | bei, in |
| diesbezüglich, dahingehend | (streichen) |
| entsprechend, adäquat | passend, oder die Bedingung nennen |
| performant, robust, mächtig | die messbare Eigenschaft nennen |
| nahtlos, umfassend, einfach | (streichen) |
| ermöglicht es Ihnen, zu | Sie können |
| dient dazu, zu | (streichen — sag, was es tut) |
| unter anderem, etc., usw. | die Punkte nennen |
| d. h., z. B. | das heißt, zum Beispiel |

## Ein Wort pro Sache

Ein Synonym liest sich als zweite Sache. Entscheide dich vor dem Schreiben: prüfen **oder** kontrollieren **oder** verifizieren; Konfiguration **oder** Einstellungen; starten **oder** ausführen; löschen **oder** entfernen.

Beugungsformen eines Verbs sind keine Rotation. `prüft` und `prüfen` sind dasselbe Wort.

## Anrede

Eine Anrede pro Text, und nicht mischen. In Dokumentation `Sie`, außer das Projekt duzt durchgängig. In einer Chat-Antwort übernimmst du die Anrede des Fragenden.

Oberflächen- und Fehlertexte folgen der Anrede des Produkts, nicht der des Chats. Kennst du sie nicht, schreib `Sie` und nenne die Annahme.

Weiche nicht in den unpersönlichen Infinitiv aus ("Datei öffnen"), wenn der Text den Leser sonst anspricht.

## Rechtschreibung

Deutsche Rechtschreibung nach Duden, nicht die Schweizer Variante: `ß`, nicht `ss`, außer nach kurzem Vokal. Anglizismen bleiben in der Form, die das Projekt verwendet; erfinde keine Eindeutschung für einen Fachbegriff, den das Team englisch benutzt.
