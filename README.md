# PropTech Studio – AI Staging & Oceňovanie nehnuteľností (SK/CZ B2B SaaS)

Kompletná B2B webová aplikácia pre realitné kancelárie a maklérov navrhnutá pre **Zero-Cost MVP prevádzku na Netlify** (nulové náklady na externé platené AI API).

## Hlavné funkcie

1. **Interaktívne porovnanie Pred / Po (Hero sekcia)**
   - Plynulý posuvník (*Before / After Image Comparison Slider*) porovnávajúci „Pôvodný stav (Prázdny byt)“ a „AI Virtual Staging (Škandinávsky štýl)“ s prepínaním 3 ukážkových miestností.
2. **Okamžitý klientsky PDF Oceňovač nehnuteľností (`html2pdf.js`)**
   - Výpočet odhadovanej trhovej hodnoty nehnuteľnosti v reálnom čase podľa lokality (Bratislava, Košice, Trnava, Žilina, Prešov, Banská Bystrica, Trenčín, Nitra, Okresné mesto / Ostatné), výmery v m², stavu, konštrukcie a príslušenstva.
   - Živý náhľad A4 dokumentu s vlastným logom realitnej kancelárie (`FileReader`) a okamžitý klientsky export do `Odhad_ceny_nehnutelnosti.pdf`.
3. **Concierge AI Virtual Staging – Objednávkový portál s klientskou kompresiou fotiek**
   - Výber typu miestnosti, 5 vizuálnych štýlov zariadenia, režimu úpravy a nahrávanie až 4 fotografií.
   - **HTML5 `<canvas>` kompresia v prehliadači:** Každá nahratá fotka sa pred odoslaním automaticky zmenší na max. šírku `1400px` pri kvalite JPEG `0.82`, aby bol JSON payload pre Netlify Functions rýchly a spoľahlivý.
4. **Netlify Function (`netlify/functions/staging-order.js`)**
   - Spracováva `POST` požiadavky pomocou `nodemailer` (Gmail SMTP).
   - Odošle kompletnú špecifikáciu zákazky na `adamhorvat.financie@gmail.com` s predmetom `"Nová objednávka AI Staging – [Názov RK / Maklér]"` a pripojí skomprimované fotografie ako prílohy (`izba-1.jpg`, `izba-2.jpg`, ...).

## Nasadenie na Netlify

1. Nahrajte priečinok projektu do GitHub repozitára a prepojte ho s Netlify (alebo použite Netlify CLI).
2. V nastaveniach Netlify (**Site configuration → Environment variables**) pridajte premenné:
   - `GMAIL_USER` – vaša Gmail adresa (napr. `adamhorvat.financie@gmail.com`)
   - `GMAIL_APP_PASSWORD` – 16-miestne heslo aplikácie (*Google App Password*)
3. Pri každom pushnutí Netlify automaticky nainštaluje `nodemailer` z `package.json` a sprístupní endpoint `/.netlify/functions/staging-order`.
