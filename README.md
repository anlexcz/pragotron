# Pragotron

Generátor vlastních mechanických překlápěcích tabulí. Český responzivní editor, víceřádkový text, PNG a animovaný GIF. Statická aplikace bez produkčních závislostí, účtů a serveru. Všechny texty a exporty se zpracovávají v prohlížeči.

## Co umí

- Jednotlivé znaky s užšími neanimovanými mezerami, nebo celé cedulky po slovech či řádcích.
- České znaky, malá i velká písmena, interpunkci a Unicode grafémy včetně emoji; vzhled exotických znaků závisí na systémovém fallbacku.
- Společné i samostatné zarovnání řádků vlevo, na střed a vpravo.
- Pět barevných variant, vlastní barvy, automatickou čitelnost textu, tři typografické směry, rámeček, spáru, stíny a patinu.
- Ořez na tabuli, Stories, čtverec, široký formát a vlastní plátno.
- Mechanické přetočení, počáteční text, rychlost, mezilisty, pořadí, závěrečné držení a volitelnou smyčku.
- PNG s plnou alfa průhledností a GIF89a s průhledným okolím; GIF výchozně přehraje sekvenci jednou.
- Automatické místní uložení, import/export projektu JSON, zrušení exportu a sdílení souboru na podporovaných zařízeních.

## Spuštění

Node.js 20 nebo novější. Není potřeba `npm install`.

```sh
npm start
```

Otevři `http://localhost:8080`. Lze použít i jiný statický HTTP server. Samotné otevření `index.html` přes `file://` není podporované kvůli ES modulům, fontům a exportnímu workeru.

```sh
npm run check
npm test
npm run build
```

Build vytvoří složku `dist/`. GitHub Actions spouští kontroly a přikládá stejnou složku jako artefakt `pragotron-static`.

## Nahrání na hosting

Nahraj **obsah** `dist/` na statický hosting, například do adresáře webu na Wedosu. Ponech adresáře `src/` a `assets/` a jejich soubory pohromadě. Funguje také pod podadresářem — cesty jsou relativní. Server musí obsluhovat `.js` jako JavaScript a fonty jako binární soubory. Pro sdílení přes systémové menu je potřeba HTTPS a podpora Web Share API.

Alternativně lze v GitHub Pages zvolit nasazování ze složky `/` větve `main`; produkční soubory jsou i v kořeni repozitáře. Toto nastavení není automaticky zapnuté touto implementací. CI aplikaci kontroluje, ale samo ji veřejně nenasazuje.

## Export a Stories

PNG exportuje výsledný statický stav v rozměrech plátna. Průhledné okolí zachová destičky a případný rámeček. Šachovnice je pouze součást náhledu.

GIF exportuje tutéž animaci a stejné písmo jako náhled. Má nejvýše 256 barev, binární průhlednost a žádný zvuk. Neumí měkké poloprůhledné okraje. Delší strana může mít 480, 720 nebo 1080 px; malé originály se nezvětšují. Proto GIF s formátem Stories může mít například 405 × 720 px. Závěrečné držení je zakódované jako jeden dlouhý snímek, nikoliv desítky kopií.

Jednorázový GIF nepřidává smyčkovací rozšíření. Běžný dekodér ponechá poslední snímek, ale aplikace třetích stran může přehrávání změnit. PNG je vhodné jako obrázek či statický překryv. Pro animovanou průhlednou samolepku musí cílový editor umět importovat lokální GIF jako překryv. **Přímý import do Instagram Stories nebyl ověřen a není garantovaný.** Nahrávání do GIPHY ani automatické publikování není součást této aplikace.

Příliš velký PNG (přes 16 milionů pixelů nebo rozměr 16 384 px) a extrémně náročný GIF jsou zastaveny s doporučením menšího formátu. GIF encoder také hlídá 100 MiB výsledných dat. U dlouhého textu pomůže více řádků nebo pevné plátno, které tabuli automaticky zmenší.

## Architektura a dokumentace

- `src/model.js`: projekt, normalizace, validace importu, témata a kontrast.
- `src/scene.js`: geometrie, grafémy, zarovnání, zalamování a deterministická časová osa.
- `src/renderer.js`: společný Canvas renderer náhledu, PNG a GIFu; perspektiva listu se aproximuje vodorovnými proužky.
- `src/gif.js` a `src/gif-worker.js`: původní streamovací GIF/LZW encoder a jeho worker.
- `src/app.js`: editor, místní uložení, animace a exportní orchestrace.

Původní zadání: [docs/specifikace.md](docs/specifikace.md). Skutečná implementace a ověření: [docs/implementace.md](docs/implementace.md).

## Písma a licence

Lokální písma DejaVu Sans, DejaVu Sans Bold a DejaVu Sans Mono Bold. Úzká varianta používá DejaVu Sans s horizontálním zúžením při vykreslení; není původním fontem výrobce Pragotron. Širší grotesk a monospace používají odpovídající tučné řezy. Fontové soubory nejsou upravené. Licence a copyright jsou v [assets/fonts/LICENSE-DejaVu.txt](assets/fonts/LICENSE-DejaVu.txt).

Zdrojové soubory zatím nemají přidělenou samostatnou open-source licenci. Licence přibalených písem tím není dotčena.

Formát Graphics Interchange Format (GIF) a jeho původní specifikace pocházejí od CompuServe Incorporated. Encoder vychází z [GIF89a](https://www.w3.org/Graphics/GIF/spec-gif89a.txt).
