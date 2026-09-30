# Inventar industrija i generičkih fotografija

Stanje: 30. septembar 2026.

## Biblioteka fotografija

- Aktivna biblioteka: 448 JPG/JPEG fajlova.
- Sačuvani V39.5 izvor: 786 JPG/JPEG fajlova.
- Svih 105 fotografija koje današnji scenariji stvarno koriste postoje u aktivnoj biblioteci.
- Razlika od 343 fajla je kandidat za selektivni prenos, a ne automatsko kopiranje: uključuje starije varijante, dodatne timske fotografije i sadržaj koji još nema aktivan scenario.

## Prioritetna proširenja

| ID | Delatnost | Stanje scenarija | Tip sajta | Fotografije |
| --- | --- | --- | --- | --- |
| `marketing-agency` | Marketing agencija | Kompletan JPG bundle | Portfolio + zahtev za ponudu | 1 hero, 3 usluge, 2 izdvojena rada |
| `print-shop` | Štamparija i fotokopirnica | Postoji, bez fotografija | Katalog usluga + zahtev sa specifikacijom | 1 hero, 3 usluge, 2 detalja materijala |
| `photo-video` | Foto/video studio i video produkcija | Postoji, bez fotografija | Portfolio + upit za termin/projekat | 1 hero, 3 usluge, 2 izdvojena rada |
| `bookshop` | Knjižara | Novo | Katalog + upit o dostupnosti | 1 hero, 3 kategorije, 2 izdvojena naslova/atmosfere |
| `pet-shop` | Pet shop | Novo | Katalog + upit o dostupnosti | 1 hero, 3 kategorije, 2 izdvojena proizvoda |
| `pet-grooming` | Pet grooming / šišanje pasa | Novo | Usluge + zahtev za termin | 1 hero, 3 usluge, 2 detalja salona/nege |
| `cosmetics-perfumery` | Kozmetika i parfimerija | Novo | Katalog + upit o dostupnosti | 1 hero, 3 kategorije, 2 izdvojena proizvoda |
| `freight-carrier` | Autoprevoznik | Novo | Usluge + zahtev za ponudu | 1 hero, 3 usluge, 2 logistička detalja |

## Pravilo biblioteke

Svaka delatnost dobija šest fotografija u svojoj putanji:

```text
assets/images/curated/<grupa>/<id>/
  hero/<id>_hero_01.jpg
  services/<id>_service_01.jpg
  services/<id>_service_02.jpg
  services/<id>_service_03.jpg
  featured/<id>_featured_01.jpg
  featured/<id>_featured_02.jpg
```

Fotografije su ilustrativne, bez logotipa, natpisa, izmišljenih cena, brendiranih pakovanja ili prepoznatljivih lica. Stvarne fotografije klijenta se kasnije biraju kroz Editor i ulaze samo u njegov Publish ZIP. Isporučujemo JPG (kvalitet 85); PNG iz generatora ostaje izvan repozitorijuma.

## Automatizacija

Ne unosimo fotografije ručno u HTML. Jedan profil sadrži putanje, nazive usluga, formu upita i dozvoljene module; generator potom koristi isti profil za Advisor, pregled i ZIP. Za novu delatnost procedura je:

1. Dodati provereni profil i sinonime za prepoznavanje.
2. Generisati šest generičkih fotografija iz standardnog prompta.
3. Validirati da svih šest fajlova postoji i da nema polomljenih putanja.
4. Aktivirati profil tek kada Advisor test prepoznavanja i render test prođu.

Prvi paket za izradu: postojeća tri profila bez slika (`marketing-agency`, `print-shop`, `photo-video`), zatim pet novih profila.
