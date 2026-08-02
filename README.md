# Prevodník mien 🪙

Mobilná aplikácia (Android) na prevod mien s aktuálnymi kurzami. Funguje online aj offline.

---

## 📦 Inštalácia do telefónu

1. Súbor **`Prevodnik-mien.apk`** skopíruj do telefónu (cez USB, e-mail, Google Drive…).
2. V telefóne otvor súbor (napr. cez aplikáciu *Súbory*).
3. Ak telefón vyžiada, **povol inštaláciu z neznámych zdrojov** pre danú aplikáciu (Súbory / prehliadač).
4. Potvrď inštaláciu. Hotovo — ikona **Prevodník mien** sa objaví medzi aplikáciami.

> APK je podpísané debug kľúčom, čo stačí na bežnú inštaláciu aj aktualizáciu.

## 🔄 Aktualizácia aplikácie

Keď urobím zmeny a znova zostavím APK:
1. Skopíruj **nový** `Prevodnik-mien.apk` do telefónu.
2. Otvor ho a potvrď **inštalovať** → aplikácia sa prepíše novšou verziou (dáta ostávajú).

## ✨ Funkcie

- **Aktuálne kurzy** z internetu (zdroj: open.er-api.com, záloha: frankfurter.dev)
- **Offline režim** — bez internetu aplikácia používa naposledy uložené kurzy (funguje vždy)
- **Kalkulačka** — plná klávesnica 5×4 s operátormi **+ − × ÷ % =**, mazaním (C / ⌫) a desatinnou čiarkou
- **Live prevod meny** — výsledok sa prepočíta pri každom stlačení
- **Dve šípky (prepínač smeru)** — kruhové tlačidlo medzi menami prepne smer prevodu
  (napr. CZK → EUR na EUR → CZK)
- **Výber meny** — klik na ľubovoľnú menu otvorí zoznam "Meny" s vyhľadávaním,
  vlajkou, názvami a aktuálnymi kurzami
- **Aktuálny kurz** sa zobrazuje na spodnej lište
- **🎨 Nastavenia** (ikona ozubeného kolieska vľavo dole):
  - **Farba aplikácie** — Tmavá, Čierna, Námorná, Grafit
  - **Farba tlačidiel operátorov** — Modrá, Zelená, Oranžová, Fialová, Červená, Tyrkysová
  - **Štýl klávesnice** — Klasický (plné bloky), Zaoblený (gombíky), Plochý (s medzerami)
  - **Hustota klávesnice** — Kompaktná, Pohodlná, Priestorná
  - **Vibračná odozva** — zap/vyp
- Plynulé animácie, ripple efekty, vibračná odozva pri stlačení

## 🛠️ Znovu-zostavenie APK (ak chceš niečo zmeniť)

Najprj sa uisti, že máš prostredie (už nainštalované):
- **JDK 17** → `C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot`
- **Android SDK** → `C:\Android\sdk`

Stačí **dvojklik** na **`build-apk.bat`** v priečinku projektu. Výsledok:
`Prevodnik-mien.apk`.

## 📁 Štruktúra projektu

```
Prevodník mien/
├── www/                      ← samotná aplikácia (tu sa mení vzhľad/logika)
│   ├── index.html            ← štruktúra obrazoviek
│   ├── styles.css            ← tmavý dizajn
│   ├── app.js                ← logika: kurzy, kalkulačka, klávesnica
│   └── currencies.js         ← zoznam mien + vlajky
├── android/                  ← vygenerovaný Android projekt (Capacitor)
├── make_icons.js             ← generuje launcher ikony
├── build-apk.bat             ← jeden klik → nové APK
├── capacitor.config.json     ← nastavenie aplikácie
└── Prevodnik-mien.apk        ← ← VÝSLEDNÝ SÚBOR na inštaláciu
```

## ❓ Často kladené otázky

**Kurzy sa neaktualizujú?**
Aplikácia si kurzy stiahne pri štarte a pri kliknutí na 🔄 v zozname mien.
Bez internetu použije posledné uložené kurzy.

**Ako zmeniť východzie meny?**
V súbore `www/app.js` zmeň `state.from = "EUR"` a `state.to = "CZK"`.

**Ako pridať/zmeniť menu?**
Uprav zoznam v `www/currencies.js`.

---
Aplikácia: **Prevodník mien** · Balík: `com.prevodnikmien.app`
Ikona: kalkulačkový dizajn ($ € + ¥ ₽ =) · Verzia 1.1
