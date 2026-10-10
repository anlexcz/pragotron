# Implementace a ověření

První implementace, 10. 10. 2026. Tento dokument popisuje skutečný stav aplikace. `specifikace.md` uchovává původní návrh, včetně doporučených kandidátů, které nemusely být použity.

## Rozhodnutí

Buildless HTML/CSS a nativní JavaScript ES moduly místo Reactu/Vite/TypeScriptu. Editor nepotřebuje produkční balíčky, instalaci ani serverovou část a lze ho nahrát na běžný statický hosting. Node.js je pouze nástroj pro lokální server, kontrolu, testy a kopírování produkčních souborů. Stejný renderer a časová osa jsou sdílené pro všechny výstupy.

Písma jsou lokální DejaVu s přiloženou licencí. Úzký styl se vykresluje se zúžením na 72 % původní šířky; další dva styly používají Sans Bold a Sans Mono Bold. Nejde o přesné historické řezy. Neověření kandidáti Roboto a Oswald z původního návrhu nebyli přibaleni.

GIF encoder je vlastní implementace podle GIF89a. LZW komprese rozšiřuje slovník od 9 do 12 bitů a resetuje ho při naplnění. Encoder neukládá všechny RGBA snímky; main thread vykreslí jeden snímek, předá jeho buffer workeru a čeká na potvrzení. Worker uchovává komprimovaná data. Náhled i export přebírají kopii projektu. Změna nastavení v průběhu exportu nemění generovaný soubor.

Paleta používá 216 barev RGB krychle, 39 doplňkových odstínů podle motivu a jeden rezervovaný průhledný index. Kvantizace je bez ditheringu, s memoizací nejbližší barvy. Průhlednost se převádí prahováním alfa na 128; GIF nemá plynulou alfa průhlednost. PNG ji zachovává. Vnější měkký stín se nepoužívá, mechanické stíny zůstávají uvnitř neprůhledných listů.

GIF snímky jsou plné, disposal 2 odstraňuje předchozí obsah do průhledného pozadí. Pro jednorázovou sekvenci není v souboru NETSCAPE2.0; smyčka rozšíření dostane a po držení výsledku obsahuje krátké mechanické přetočení zpět. Závěrečný snímek se vykresluje explicitně. Při sníženém pohybu je náhled statický, vyžádaný GIF zůstává dostupný.

Geometrie rezervuje společný prostor pro počáteční i cílový text, aby tabule během animace neměnila rozměry. Ve finále odcházející znaky nezanechávají prázdné destičky, ale rezervovaný prostor zůstává. To může při výrazně kratším cílovém textu zvětšit okolí/rámeček proti projektu bez počátečního textu.

Zalamování zachovává zadané mezery i ruční konce řádků. Na pevném plátně se počítá podle dostupné šířky, u ořezu na tabuli používá pracovní šířku 1100 px. Dlouhé jednotlivé slovo se nedělí ani neořezává. Geometrie celé tabule se na pevném plátně jednotně přizpůsobuje.

## Uložený projekt

JSON `schemaVersion: 1`, plochá pole podle `defaults()` v `src/model.js`. `rows` obsahuje trvalá ID řádků a `align` s hodnotou `inherit`, `left`, `center` či `right`. Import validuje datové typy, barvy, výčtové volby a číselné rozsahy. Neznámá verze se odmítne. Odvozená geometrie, buffery a fontové soubory se neukládají.

Rozepsaná práce: `localStorage`, klíč `pragotron-project-v1`, debounce 300 ms. Při vypnutém nebo plném úložišti lze stále stáhnout projekt JSON. Automatické ukládání zůstává jen v daném prohlížeči.

## Ověření

| Kontrola | Stav |
|---|---|
| Segmentace grafémů, česká kombinovaná diakritika, emoji sekvence | automatické testy |
| Zachování opakovaných mezer a prázdných řádků | automatické testy |
| Zarovnání řádků a zachování jejich nastavení po vložení řádku | automatické testy |
| Celé řádkové a slovní cedulky, párování slov při jiných mezerách | automatické testy |
| Deterministické starty, cílový stav, držení a návrat ve smyčce | automatické testy |
| Stories rozměry a poměr stran GIFu | automatické testy |
| Kontrast a validace neplatných importů | automatické testy |
| LZW šířky kódů, reset slovníku, krátká i náhodná dlouhá data | nezávislý testovací dekodér |
| GIF worker: přenos bufferu, dokončení a chybová odpověď | Node worker test s web-worker adaptérem |
| Vygenerované PNG pro znaky, řádky a slova | vizuální kontrola skutečných snímků Canvas rendereru |
| Vygenerované GIFy včetně šumu pro zátěž slovníku | nezávisle dekódováno Pillow; zkontrolována průhlednost, maska posledního snímku, prodleva a smyčka |
| Syntaxe a přítomnost lokálních souborů | `npm run check` |
| Balíček statického webu | `npm run build` |
| Skutečné ovládání v desktopových prohlížečích a Safari | zbývá ruční kontrola |
| Samsung S23 Ultra: formuláře, zrušení exportu, stažení a sdílení | zbývá ruční kontrola |
| Skutečný import animovaného GIFu do Instagram Stories | neověřeno, podpora není slíbena |

Ověření jádra nepředstavuje ověření celé stránky v konkrétním prohlížeči. V tomto prostředí nebyl dostupný podporovaný nástroj pro browser QA, proto nebyl spouštěn náhledový server ani simulována podpora Instagramu.

## Ruční kontrola po prvním otevření

1. Po načtení se objeví PRAHA / HLAVNÍ NÁDRAŽÍ; vyzkoušet český text, malé písmo a tři řádky s různým zarovnáním.
2. Přepnout mezi znaky, celými řádky a slovy. Mezery mají zůstat zachované.
3. Přehrát animaci, změnit motiv a rychlost, vyzkoušet počáteční text i smyčku.
4. Stáhnout PNG a GIF, prohlédnout na světlém i tmavém pozadí. Jednorázový GIF má zůstat na výsledku.
5. Při GIF exportu změnit text; export má obsahovat původní snapshot. Zrušit další export a ihned spustit nový.
6. Na mobilu otevřít klávesnici, měnit nastavení, zkontrolovat rozložení a stažení/share. Exportní textové hlášení má vysvětlit případnou chybu.
7. Uložit projekt, obnovit stránku a znovu ho importovat. Neplatný JSON nesmí přepsat rozepsanou tabuli.
8. Vyzkoušet cílový editor Stories; zapsat skutečný postup a jeho omezení, případně doporučit externí editor s podporou animovaných překryvů.

## Praktické limity

PNG nejvýše 16 milionů pixelů a 16 384 px v každé ose. Vlastní pevné plátno 100–4096 px na osu. GIF nejvýše 500 milionů pixelových vzorků za export a 100 MiB komprimovaného výstupu. Vykreslovací cache nejvýše přibližně 8 milionů pixelů. Velké jednotlivé listy mají omezenou pracovní texturu a přepočítávají se na výslednou geometrii. Limity umožňují čitelné chybové hlášení místo pádu při extrémním textu; konkrétní rychlost záleží na zařízení.

Budoucí možnosti: přesnější font podle skutečné tabule s vyřešenou licencí, video export pro hotová Stories, doložený postup pro animované samolepky. PNG i GIF už jsou součást první implementace.
