# Generátor pragotronových nápisů — zadání k implementaci

Poznámka: původní zadání před implementací. Aktuální technické řešení a stav ověření popisuje [implementace.md](implementace.md).

Verze 1.0, 10. 10. 2026. Stav: připravené zadání, bez implementace a nasazení. Repozitář dodá uživatel později. Tento dokument definuje doporučené výchozí řešení; konkrétní knihovny, fontové soubory a kompatibilita sociálních sítí se ověří při implementaci.

## 1. Cíl a rozsah

Veřejná responzivní stránka, na které si člověk napíše vlastní text, vytvoří stylizovanou mechanickou překlápěcí tabuli a stáhne statický PNG nebo animovaný GIF. Text může být víceřádkový, s češtinou, číslicemi, interpunkcí i malými písmeny. Text se nesmí svévolně přepsat na velká písmena. Přepínač VERZÁLKY je volitelný. Nepodporovaný znak se nesmí tiše zahodit.

První verze funguje bez účtu, serverového renderování a databáze. Úpravy i exporty běží v prohlížeči. Stránka nemá odesílat napsaný text na server. Rozepsaná práce se automaticky ukládá lokálně; Obnovit výchozí nastavení ji smaže až po potvrzení. Export a import projektu JSON umožní pozdější úpravy.

## 2. Základní ovládání

Na desktopu nastavení vlevo a velký náhled vpravo. Na mobilu jedna kolona, kompaktní náhled a rozbalovací skupiny nastavení. Export zůstává snadno dostupný, nesmí překrýt formulář ani systémovou klávesnici. Rozvržení nesmí mít horizontální posun celé stránky.

Po otevření ukázkový dvouřádkový text PRAHA / HLAVNÍ NÁDRAŽÍ, režim Po znacích, černé destičky a světlý text. Jedno velké víceřádkové textové pole; pod ním přehled řádků s možností samostatného zarovnání. Není potřeba složitý rich-text editor.

Skupiny: Text; Typ tabule; Vzhled; Rozměry a kompozice; Animace; Export. Základní volby viditelné, jemné nastavení v rozbalovací části. Náhled se při psaní aktualizuje staticky. Animaci spustí Přehrát přetočení; každé stisknutí klávesy nespouští dlouhou animaci.

## 3. Režimy tabule

### A. Po znacích

Každý viditelný grafém má vlastní destičku stejné šířky a samostatně se překlápí kolem vodorovné osy. Unicode zpracovat po grafémech, nikoliv po bajtech či jednotlivých UTF-16 jednotkách; kombinovaná diakritika se nesmí rozdělit. Vstup normalizovat do NFC. Jeden znak není vždy jedna hodnota JavaScript stringu.

Mezera má ve výchozím stavu 45 % šířky znakového modulu, nastavitelně 20–100 %. Je to klidná mezera: bez písmene, překlápění a vlastní destičky. Podklad společného rámečku může zůstat viditelný. Opakované i počáteční a koncové mezery se zachovají. Tabulátor se při vložení převede na čtyři mezery. Prázdný řádek vytvoří svislou mezeru odpovídající výšce řádku.

Výchozí destička: lehce zaoblené mechanické rohy, vodorovná spára uprostřed, jemný stín u osy, dvě části listu. Nastavit hustotu modulů a poměr šířky/výšky. Volitelný vnější rámeček; užší mezery nevyplňovat prázdnými znakovými moduly. Pro čtvercové a úzké glyfy zachovat stejnou šířku destičky.

### B. Celé cedulky

Jedna společná volba režimu s podvolbou Po řádcích / Po slovech. Celý obsah jedné cedulky se přetočí jako jeden list, nesmí vypadat jako skrytá animace jednotlivých písmen.

Po řádcích (výchozí): každý vizuální řádek je samostatná široká cedulka. Po slovech: každý souvislý úsek mezi mezerami je samostatná cedulka; interpunkce zůstává u slova. Mezery mezi cedulkami zachovávají svůj počet a nastavenou šířku. Krátké slovo má užší cedulku, dlouhé širší, všechny mají stejnou výšku a vnitřní odsazení. Před začátkem animace se zamkne geometrie podle cílového textu, aby tabule během přetočení neposkakovala.

## 4. Text a zarovnání

- Společné zarovnání vlevo / na střed / vpravo; jednotlivý řádek ho může přepsat. Volba Vrátit společné zarovnání zruší přepsání.
- Zarovnává se celý řádek v dostupné šířce kompozice, ne znak uvnitř své destičky. Znaky uvnitř destiček zůstávají opticky vycentrované.
- Velikost textu či modulu, výška řádku, mezery mezi moduly, mezery mezi řádky a vnitřní odsazení tabule.
- Režim Přizpůsobit text (výchozí): jednotné zmenšení celé tabule tak, aby se vešla. Zachovat ruční konce řádků. Text nesmí zmizet za hranicí exportu.
- Volitelné Automatické zalamování po slovech; ruční konce řádků zůstávají. Odvozené vizuální řádky zdědí zarovnání původního řádku. Dlouhé slovo se nejprve řeší zmenšením; nikdy se bez vysvětlení neusekne.
- Volba Velká písmena mění pouze zobrazení, původní text zůstává uchovaný.

Prázdný vstup zobrazí prázdnou tabuli a export nebude aktivní. U rozsáhlého textu se před exportem zobrazí odhad náročnosti a možnost snížit rozlišení; formulář nemá svévolný krátký limit délky. Praktické limity exportu závisí na rozměru, počtu snímků a paměti zařízení, nikoliv jen na počtu znaků.

## 5. Vzhled a čitelnost

Předvolby jsou stylizované varianty inspirované mechanickými tabulemi, nikoliv tvrzení o přesné historické výrobní verzi:

| Varianta | Destička | Text | Charakter |
|---|---|---|---|
| Nádražní černá | #171717 | #F4F1E7 | výchozí světlý text na tmavém listu |
| Krémová | #E8DFC8 | #202020 | světlé starší cedulky |
| Modrá | #153B62 | #F5F5ED | modrý orientační styl |
| Žlutá | #E5C331 | #191919 | výrazná žlutá cedulka |
| Tmavě zelená | #1B4032 | #F4F0DF | doplňkový retro styl |
| Vlastní | vlastní | automatická či vlastní | vlastní kombinace |

Oddělit tři věci: pozadí celého exportního plátna, barvu destiček a barvu textu. Průhledné plátno neznamená průhledné destičky. Destičky zůstávají viditelné i u samolepky bez okolního pozadí.

Barva textu se výchozně vybere automaticky jako světlá nebo tmavá podle kontrastu s destičkou; při změně destičky se přepočítá. Ruční barva ji přepíše. Při nízkém kontrastu nabídnout návrat k automatické barvě, export neblokovat. Doporučený návrhový cíl kontrastu textu 4,5:1; mechanická spára nesmí zakrýt diakritiku ani rozbít čitelnost.

Nabídnout tři odlišné fontové směry: úzké technické písmo, širší dopravní grotesk a monospace pro písmena. Kandidáti pro ověření: Roboto Condensed, Oswald, Roboto Mono. Neoznačovat je za původní font Pragotronu. Před použitím ověřit konkrétní licenci, české glyfy a přibalit licenční text. Fonty hostovat lokálně; export čeká na jejich načtení. Výběr ukazuje živou ukázku s ĚŠČŘŽÝÁÍÉŮÚ a čísly.

Pro jiné abecedy a emoji zajistit systémový fallback a upozornit, že jejich vzhled může být méně autentický. Export musí používat stejný fallback jako náhled. Tvar destiček, rámeček, sílu spáry, jemnou patinu a stín lze měnit; výchozí vzhled je čistý, patina vypnutá. Vnější měkký stín je pro průhledný GIF vypnutý kvůli jeho omezené průhlednosti.

## 6. Kompozice a rozměry

Předvolby PNG: Oříznout na tabuli (s nastaveným okrajem), Stories 1080 × 1920, Čtverec 1080 × 1080, Na šířku 1920 × 1080, Vlastní rozměry. U pevného plátna vybrat polohu tabule nahoře / uprostřed / dole a odsazení. Výchozí Stories centrované s dostatečným vnějším prostorem; případná vodítka bezpečného prostoru jsou jen pomůcka a neexportují se.

Oříznutí na tabuli používá hranice celé animace včetně pohyblivých listů, nikoliv pouze finálního statického stavu. Náhled ukazuje skutečný poměr stran exportu, přepínání velikosti okna nemění souřadnice výsledku.

## 7. Animace

Mechanická animace split-flap: původní horní polovina se sklápí k ose, následně se od osy odklápí spodní polovina nového listu. Současně správně měnit odkryté pevné poloviny. Pohyb dolů, stín a perspektiva; prostý fade nebo svislý posun textu není náhrada překlápění.

Výchozí sekvence: 0,3 s prázdná tabule → přetočení trvající zhruba 1,8 s → 3 s cílový text. Uživatel může změnit rychlost, délku závěrečného držení (1–10 s), počet mezilistů (0–8), pořadí startu a opakování. Výsledná délka vychází ze skutečné časové osy, neslibovat pevnou dobu při libovolném počtu řádků.

Starty: všechny současně; postupně zleva doprava po řádcích; lehce nepravidelně. Výchozí po znacích lehce nepravidelně, po cedulkách postupně po řádcích. Náhodnost má uložený seed: náhled a export musí ukázat stejnou sekvenci.

Výchozí počáteční stav prázdný; volitelně jiný počáteční text. Pro oba texty společná pevná geometrie. Při rozdílném počtu znaků doplnit prázdné listy; odcházející obsah se musí také přetočit do prázdna. V režimu po slovech párovat cedulky podle pořadí, doplnit chybějící cedulky a rezervovat šířku podle většího z obou obsahů. Počáteční mezery mohou při přechodu do písmene vytvořit aktivní modul; mezera→mezera se nikdy neanimuje.

Mezilehlé listy ve znakovém režimu čerpají z dostupné abecedy a finální glyf musí být vždy dosažitelný. Celé cedulky mají prázdné nebo předpřipravené neutrální mezilistové nápisy, které respektují dostupnou šířku. Žádné náhodné osobní či nevhodné texty. Zvuk není součást GIFu; zvukové efekty v první verzi nejsou nutné.

Výchozí přehrání jednou. V běžném prohlížeči má skončit posledním snímkem. Volitelné opakování obsahuje závěrečné držení a explicitní návrat do počátečního stavu; uživatel v náhledu vidí i spoj smyčky. Externí aplikace může opakování změnit, proto nejde slíbit trvalé zastavení v každé platformě.

## 8. Export

### PNG

Plné rozlišení, finální stav, volitelně průhledné okolí s plnou alfa průhledností. Rámeček a destičky mohou zůstat neprůhledné. PNG musí odpovídat finálnímu snímku náhledu. Název pragotron-YYYYMMDD-HHMMSS.png. Průhlednost v editoru zobrazovat šachovnicí, nikdy ji nezapéct do souboru.

### GIF

GIF89a s průhledným okolím nebo s plným barevným plátnem. GIF nemá plynulý alfa kanál: jednotlivý pixel je průhledný nebo neprůhledný. Nezaměňovat s alfa průhledností PNG. Použít rezervovaný transparentní index a konzistentní paletu nejvýše 256 barev včetně průhledného indexu. Jemné okraje řešit supersamplingem a následným řízeným převodem na binární masku; negenerovat barevné halo podle konkrétního pozadí.

Výchozí GIF 720 px na delší straně při ořezu na tabuli, 20 fps; volby 480 / 720 / 1080 px. Pro pevné Stories plátno 720 × 1280 nebo 1080 × 1920 s upozorněním na náročnost. Nezvětšovat malou tabuli bez kontroly uživatele. Snímkové časy kódovat v setinách sekund. Kódování postupně ve workeru, neudržovat všechny RGBA snímky současně.

Každý snímek má správně vyčistit předchozí pohybující se části; při implementaci ověřit disposal a transparentní pozadí ve více dekodérech. Pokud optimalizace dílčích snímků vytváří duchy, použít celé snímky. Výchozí jednorázové přehrání: nepřidávat nekonečnou smyčku; konkrétní API encoderu ověřit testem, protože hodnoty repeat se mohou lišit. Finální snímek je plně složená čitelná tabule.

Průběh exportu: příprava → vykreslení → kódování → stažení, s průběhem a Zrušit. Změny nastavení nesmějí měnit právě exportovaný snapshot. Před startem odhadnout počet snímků a nároky, při nedostatku paměti nabídnout nižší kvalitu. Po úspěchu uvolnit pracovní buffery a dočasné object URL. Na mobilu nabídnout sdílení souboru, pokud ho daný prohlížeč podporuje, a vždy také stažení.

### Použití na Stories

PNG je statický podklad či obrázek pro další skládání. Průhledný GIF je animovaný asset pro aplikaci, která ho skutečně umí importovat jako překryv. Přímé vložení libovolného lokálního GIFu jako animované instagramové samolepky není tímto zadáním garantováno. Při implementaci vyzkoušet cílový postup na Androidu a uvést krátký ověřený návod. Pokud se GIF nativně nepoužije, nabídnout návod pro složení v externím editoru. MP4 může být pozdější export pro hotové Stories, ale běžný MP4 nelze prezentovat jako průhlednou samolepku.

## 9. Doporučená architektura

Statická TypeScript aplikace; React + Vite jako kandidát, finální stack přizpůsobit budoucímu repozitáři. UI nezávislé na renderovacím jádru. Žádné založení repozitáře nebo hostingové služby v této přípravné fázi.

Jeden deterministický Canvas renderer pro náhled, PNG i GIF. Funkce layout(project, fonts) vypočítá rozložení; buildTimeline(project, layout) časovou osu; renderFrame(ctx, scene, time) libovolný snímek. Canvas animace simuluje otočení poloviny listu kolem horizontální osy včetně perspektivy; pokud se zvolí jiné renderování, stále musí produkovat stejné snímky pro export. Nespoléhat na screenshot DOM nebo snímání běžící CSS animace.

Navržené moduly: project/schema a migrace; text/normalization a segmentace; layout; fonts; themes; animation/timeline; renderer; export/png; export/gif-worker; editor; persistence. GIF encoder vybrat až po praktickém prototypu průhlednosti, disposal, délky držení a jednorázového přehrání. Ověřit jeho licenci, worker kompatibilitu, velikost balíčku a možnost postupného kódování.

Náhled přizpůsobí pixelovou hustotu obrazovky, export používá přesné fyzické pixely z nastavení. Animace náhledu přes requestAnimationFrame; export přes deterministické vzorkování času. Závěrečný snímek vzorkovat explicitně, nesmí chybět kvůli zaokrouhlení počtu snímků. Při sníženém pohybu zobrazit statický náhled, explicitně vyžádaný export animace zůstává dostupný.

## 10. Ukládaný projekt

Verzované JSON, schemaVersion: 1. Uchovat původní text, řádky s trvalým ID a volitelným přepsáním zarovnání; mode characters / panels; panelUnit line / word; globalAlignment; uppercase; wrapping; fontId a weight; moduleSize a aspectRatio; spaceRatio; moduleGap; lineGap; padding; themeId; panelColor; textColorMode auto / custom; textColor; frame; texture; seam; shadow; canvasPreset, width, height, backgroundMode a backgroundColor, placement; animation startText, speed, intermediateCount, order, seed, finalHold, loop; export gifLongEdge a fps.

Odvozený layout a binární fonty do projektu neukládat. Import validovat, neznámou verzi odmítnout s vysvětlením, chybná čísla omezit bezpečnými rozsahy. Změna motivu mění jeho barvy a výchozí vzhled, nemění text a geometrii; změna režimu zachovává kompatibilní nastavení. Při editaci řádků zachovat přepsaná zarovnání pomocí stabilních ID; nový řádek dědí společné nastavení.

## 11. Akceptační kontrola

1. PRAHA / HLAVNÍ NÁDRAŽÍ ve všech režimech, bez ořezu diakritiky.
2. Tři řádky s rozdílným zarovnáním; náhled, PNG a konec GIFu mají stejnou kompozici.
3. A  B se dvěma mezerami, počáteční mezery a prázdný řádek zůstávají zachované; mezery mezi znaky se neotáčejí.
4. Kombinované Unicode znaky, emoji a nepodporované glyfy se nerozdělí a tiše nezmizí.
5. Režim Po řádcích skutečně překlápí celý řádek; Po slovech celá slova.
6. PNG s průhledným okolím funguje na světlém i tmavém podkladu, šachovnice není součástí souboru.
7. GIF nemá duchy, barevné halo, vyříznuté části listů ani chybějící finální snímek.
8. Jednorázový GIF se v podporovaných testovacích dekodérech neopakuje; opakovaný GIF má čitelnou závěrečnou pauzu.
9. Stejný seed a projekt dávají totožnou časovou osu náhledu i exportu.
10. Dlouhý text, velká cedulka a změna počátečního textu nerozhazují rozložení; překročení výkonového rozpočtu nabídne nižší kvalitu.
11. Mobilní prohlížeč na Samsungu S23 Ultra: editace, změna orientace, export, zrušení a stažení; dále desktop Chrome/Firefox a mobilní Safari při dostupnosti.
12. Zrušení exportu uvolní paměť a umožní další export. Pomalu načtený font nevede k exportu s chybnými metrikami.
13. Obnovení rozepsaného projektu, JSON export/import a neplatný import mají předvídatelné chování.
14. Ruční ověření cílového použití GIFu ve Stories; výsledek zapsat do návodu, neslibovat neověřenou podporu.

Automatické testy mají pokrýt segmentaci grafémů, zachování mezer, geometrii zarovnání, deterministickou časovou osu a parametry GIFu. Vizuální kontrola ověří otáčení, stíny, diakritiku a skutečné exportované soubory.

## 12. Postup po dodání repozitáře

Přečíst pravidla repozitáře a existující stack. Implementovat nejprve text, layout a statický renderer; následně oba režimy a vzhled; PNG; deterministickou animaci; GIF worker a kompatibilitu; mobilní ovládání a obnovu projektů. Průhledný GIF není automaticky odsunut do budoucna — je součástí požadované první funkční verze.

Dokončit ověření akceptačních bodů, přidat README s ovládáním, exportními omezeními a licencemi fontů, zapsat skutečně ověřený postup Stories. Potom připravit změny pro nahrání do dodaného GitHub repozitáře podle uživatelova zadání. Ve fázi této specifikace se nic nepublikuje.

## 13. Zdroj pro formát GIF

Oficiální specifikace GIF89a, zejména Graphic Control Extension, transparentní index, časování a disposal: https://www.w3.org/Graphics/GIF/spec-gif89a.txt . Chování smyček a importů v externích aplikacích vyžaduje samostatnou praktickou kontrolu.
