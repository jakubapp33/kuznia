import type { Food } from '../types'

/**
 * Dodatkowe produkty ogólne i dania – wartości na 100 g, uśrednione z tabel składu żywności
 * i typowych receptur (dania gotowe mogą różnić się o 10–25% zależnie od przepisu).
 * Zapis: nazwa;kcal;białko;tłuszcz;węglowodany;błonnik
 */
const RAW = `
# mięso
Karkówka wieprzowa (surowa);240;16;19.5;0;0
Karkówka z grilla;290;24;21;0;0
Łopatka wieprzowa (surowa);190;17;13.5;0;0
Żeberka wieprzowe (surowe);280;16;24;0;0
Żeberka pieczone;340;24;27;0;0
Schab pieczony;190;28;8;0;0
Polędwiczka wieprzowa (surowa);115;21;3.5;0;0
Golonka gotowana;270;20;21;0;0
Kurczak cały pieczony (ze skórą);215;24;13;0;0
Skrzydełka z kurczaka (surowe);190;18;13;0;0
Skrzydełka z kurczaka pieczone;250;23;17;0;0
Podudzie z kurczaka ze skórą (surowe);160;18;9.5;0;0
Udko z kurczaka pieczone ze skórą;230;24;15;0;0
Pierś z kurczaka gotowana;150;30;3;0;0
Pierś z kurczaka smażona w panierce;230;24;10;11;0.5
Wątróbka drobiowa (surowa);120;17;5;1;0
Żołądki drobiowe;95;18;2.5;0;0
Udziec z indyka (surowy);115;19;4;0;0
Mięso mielone z indyka;145;19;7.5;0;0
Mięso mielone z kurczaka;140;18;7.5;0;0
Mięso mielone wołowo-wieprzowe;230;18;17.5;0;0
Kaczka pieczona (ze skórą);335;19;28;0;0
Wołowina gulaszowa (surowa);150;20;7.5;0;0
Stek wołowy z grilla (antrykot);250;25;16.5;0;0
Polędwica wołowa (surowa);150;20.5;7.5;0;0
Cielęcina (surowa);110;20;3;0;0
Jagnięcina (surowa);230;17;18;0;0
Królik (surowy);135;21;5.5;0;0
Burger wołowy (kotlet, surowy);250;17;20;0;0
# wędliny
Kabanosy wieprzowe;440;24;38;1;0
Kabanosy drobiowe;300;22;23;1;0
Kiełbasa krakowska sucha;300;24;22;1;0
Kiełbasa żywiecka;290;20;23;1;0
Kiełbasa biała (surowa);270;14;23;1;0
Kiełbasa podwawelska;240;15;19.5;1.5;0
Salami;430;22;37;1.5;0
Mortadela;300;12;27;2;0
Szynka konserwowa;110;17;4;1.5;0
Szynka parmeńska;250;26;16;0;0
Filet z indyka (wędlina);100;20;1.5;1.5;0
Pierś z kurczaka wędzona (wędlina);105;21;1.5;1.5;0
Pasztet drobiowy;250;11;21;5;0
Kaszanka;250;9;17;16;1
Salceson;220;14;18;1;0
Boczek surowy;400;14;38;0;0
Smalec;900;0;99.5;0;0
# ryby i owoce morza
Łosoś pieczony;230;25;14;0;0
Łosoś wędzony;180;22;10;0;0
Pstrąg (surowy);120;20;4.5;0;0
Pstrąg wędzony;160;24;7;0;0
Mintaj (surowy);75;16.5;0.8;0;0
Tilapia (surowa);95;20;1.7;0;0
Morszczuk (surowy);80;17;1;0;0
Halibut (surowy);110;21;2.5;0;0
Śledź w oleju;290;15;25;1;0
Śledź marynowany (w occie);180;15;11;5;0
Śledź w śmietanie;230;9;19;5;0
Sardynki w oleju;210;23;13;0;0
Szprotki wędzone;225;20;16;0;0
Makrela w pomidorach (puszka);170;13;12;3;0
Tuńczyk w oleju (odsączony);190;27;9;0;0
Paluszki rybne (pieczone);220;13;10;20;1
Ryba w panierce smażona;230;16;12;14;0.5
Paluszki surimi (krabowe);100;8;1;15;0
Kalmary (surowe);90;16;1.4;3;0
Małże (gotowane);170;24;4.5;7;0
# nabiał
Mleko 0,5%;37;3.4;0.5;4.9;0
Mleko 1,5%;46;3.3;1.5;4.8;0
Mleko bez laktozy 2%;48;3.3;2;4.7;0
Mleko kozie;70;3.6;4.2;4.5;0
Mleko zagęszczone niesłodzone;130;6.6;7.5;9.5;0
Napój sojowy niesłodzony;35;3.3;1.9;0.7;0.6
Napój migdałowy niesłodzony;15;0.5;1.2;0.3;0.3
Napój kokosowy;20;0.1;0.9;2.7;0
Napój ryżowy;50;0.1;1;10;0
Kakao na mleku 2%;80;3.5;2.3;11;0.4
Jogurt owocowy;95;3.3;2.5;14.5;0
Jogurt pitny owocowy;75;2.8;1.5;12.5;0
Jogurt grecki 0%;55;10;0;4;0
Jogurt proteinowy naturalny;60;10;0.2;4;0
Jogurt proteinowy owocowy;70;9.5;0.3;7;0
Maślanka naturalna;38;3.3;0.5;4.7;0
Zsiadłe mleko;55;3;2;4.5;0
Serek homogenizowany waniliowy;160;7.5;6;18;0
Serek wiejski lekki;75;12;2.5;1.5;0
Twaróg tłusty;175;17.5;10;3.5;0
Ser twarogowy kanapkowy (śmietankowy);250;7;23;3;0
Serek topiony;270;11;23;5;0
Ser camembert;300;20;24;0.5;0
Ser brie;330;21;27.5;0.5;0
Ser pleśniowy (lazur);350;20;29.5;0.5;0
Parmezan;390;35;28;0;0
Ser edamski;330;26;25;0.5;0
Ser cheddar;400;25;33;1;0
Ser halloumi;320;22;25;2;0
Ser oscypek;300;22;22;2;0
Mascarpone;420;5;43;3.5;0
Ricotta;150;8;11;3.5;0
Śmietana 12%;135;2.7;12;4;0
Śmietana 30%;290;2.2;30;3.2;0
Śmietanka do kawy 10%;115;3;10;4.2;0
Bita śmietana (spray);260;2;24;10;0
Masło klarowane;890;0.3;99;0;0
Margaryna (półtłusta);360;0;40;0.5;0
# jaja
Jajko gotowane;140;12.5;9.7;0.7;0
Jajecznica na maśle (z 2 jaj);190;12;15.5;0.8;0
Omlet z 2 jaj;175;11.5;13.5;1.5;0
Jajko sadzone;195;13.5;15;0.8;0
# pieczywo
Chleb tostowy pszenny;265;8;3.5;49;2.5
Chleb tostowy pełnoziarnisty;250;9.5;4;44;6
Chleb graham;235;8.5;1.5;46;5.5
Chleb orkiszowy;245;9;2;46;5
Chleb wieloziarnisty;260;9.5;5.5;42;6.5
Chleb żytni (jasny);235;6;1.5;48;5.5
Chleb bezglutenowy;240;3;5;45;5
Chleb na zakwasie pszenno-żytni;240;7.5;1.5;48;4
Bagietka;270;9;2;54;2.5
Bułka maślana;320;8.5;7;55;2
Chałka;300;8;5.5;55;2
Croissant maślany;410;8;21;46;2.5
Pączek z nadzieniem;380;6;17;50;1.5
Drożdżówka z serem;330;8;12;47;1.5
Rogal z makiem/dżemem;350;7;12;54;2
Pita;275;9;1.2;56;2.2
Naan;300;8.5;7;50;2
Bajgiel;260;10;1.5;51;2.5
Pieczywo chrupkie żytnie;350;10;1.7;66;16
Sucharki;400;11;6;74;3.5
Krakersy;470;9;20;64;2.5
Paluszki słone;380;10;3.5;77;3
Precle;385;10;3;79;3
Bułka tarta;355;12;2;72;4
# zboża i dodatki
Płatki jęczmienne;350;10;2;72;10
Płatki żytnie;340;9;2;70;13
Płatki orkiszowe;350;13;2.5;67;9
Płatki jaglane;355;10.5;3;71;3.5
Granola z miodem;450;9;17;63;6.5
Płatki czekoladowe (kulki);385;8;3;80;6
Płatki miodowe (cheerios-typ);375;7.5;3.5;77;7
Otręby owsiane;330;17;7;51;15
Kasza manna;345;10.5;1.3;73;3
Kasza jęczmienna (pęczak, sucha);335;9.5;2;70;10
Kasza jęczmienna gotowana;120;3;0.5;25;3.5
Kasza gryczana gotowana;110;4;1;21;2.7
Kasza jaglana gotowana;120;3.5;1;23;1.3
Kuskus ugotowany;112;3.8;0.2;23;1.4
Bulgur ugotowany;85;3;0.3;18.5;4.5
Ryż basmati (suchy);355;8.5;0.6;78;1.3
Ryż jaśminowy (suchy);360;7;0.6;80;1
Ryż brązowy ugotowany;125;2.6;1;26;1.6
Ryż dziki (suchy);360;14.5;1;75;6
Ryż do sushi ugotowany (z octem);150;2.5;0.3;34;0.4
Quinoa (sucha);370;14;6;64;7
Quinoa ugotowana;120;4.4;1.9;21;2.8
Amarantus (suchy);370;13.5;7;65;7
Makaron ryżowy (suchy);360;6;0.6;80;1.5
Makaron gryczany (suchy);340;13;2.5;67;6
Makaron z soczewicy (suchy);340;24;2;55;8
Makaron jajeczny (suchy);380;14;4;70;3
Makaron pełnoziarnisty ugotowany;140;5.5;1;26;4
Gnocchi;150;3.5;0.3;33;1.5
Kluski śląskie;160;2.5;0.4;37;1.5
Kopytka;165;4;1.5;34;1.5
Kluski lane (z jajkiem);150;5;3;25;1
Popcorn (z mikrofali, solony);480;8;25;57;10
Popcorn bez tłuszczu;380;12;4.5;78;14.5
Chrupki kukurydziane;390;7;2.5;84;3
Wafle kukurydziane;385;8;3;81;5
# warzywa
Szpinak;23;2.9;0.4;3.6;2.2
Sałata lodowa;14;0.9;0.1;3;1.2
Sałata masłowa;15;1.4;0.2;2.9;1.3
Rukola;25;2.6;0.7;3.7;1.6
Roszponka;21;2;0.4;3.6;1.5
Jarmuż;50;4.3;0.9;8.8;3.6
Kapusta biała;25;1.3;0.1;5.8;2.5
Kapusta czerwona;30;1.4;0.2;7.4;2.1
Kapusta pekińska;16;1.2;0.2;3.2;1.2
Brukselka;43;3.4;0.3;9;3.8
Por;60;1.5;0.3;14;1.8
Seler korzeń;42;1.5;0.3;9;1.8
Seler naciowy;16;0.7;0.2;3;1.6
Pietruszka korzeń;55;2.6;0.5;10.5;4.2
Natka pietruszki;36;3;0.8;6.3;3.3
Burak (surowy);43;1.6;0.2;9.6;2.8
Buraki gotowane;45;1.7;0.2;10;2
Rzodkiewka;16;0.7;0.1;3.4;1.6
Dynia;26;1;0.1;6.5;0.5
Bakłażan;25;1;0.2;6;3
Szparagi;20;2.2;0.1;3.9;2.1
Kalarepa;27;1.7;0.1;6.2;3.6
Pomidory koktajlowe;20;0.9;0.2;4;1.3
Pomidory krojone z puszki;22;1.1;0.2;4;1
Passata pomidorowa;30;1.4;0.2;5.5;1.2
Koncentrat pomidorowy 30%;100;4.5;0.5;19;4
Ogórek kiszony;12;0.6;0.1;2.2;1
Ogórek konserwowy (słodko-kwaśny);45;0.5;0.1;10;1
Oliwki zielone;145;1;15;4;3.3
Oliwki czarne;115;0.8;11;6;3
Papryka zielona;20;0.9;0.2;4.6;1.7
Papryka żółta;27;1;0.2;6.3;0.9
Cebula czerwona;40;1.1;0.1;9.3;1.7
Szczypiorek;30;3.3;0.7;4.4;2.5
Koperek;43;3.5;1.1;7;2.1
Fasola biała (konserwowa);95;6.5;0.5;16;6
Fasola biała (sucha);290;21.5;1.5;47;17
Soczewica zielona (sucha);330;25;1.5;52;11
Soczewica ugotowana;115;9;0.4;20;8
Ciecierzyca (sucha);360;19;6;61;17
Groch łuskany (suchy);320;23;1.5;57;14
Edamame;120;11;5;9;5
Kukurydza (kolba gotowana);95;3.4;1.5;19;2.7
Pieczarki smażone;60;3.5;4;3;2
Grzyby leśne (surowe);30;2.5;0.5;4;2.5
Puree ziemniaczane;105;2;4;15.5;1.3
Ziemniaki pieczone;110;2.5;3;19;2.2
Frytki smażone (z budki);310;3.5;15;40;3.5
Placki ziemniaczane;230;4;12;27;2.5
Kapusta zasmażana;80;1.5;4;9;2.5
Buraczki zasmażane;80;1.5;3.5;11;2.4
Marchewka z groszkiem;55;2.5;1.5;8;3
# surówki i sałatki
Surówka z marchewki i jabłka;55;0.8;1;11;2.5
Surówka z kapusty (coleslaw);150;1;12;9;2
Mizeria ze śmietaną;50;1;3;4.5;0.6
Sałatka jarzynowa z majonezem;170;3.5;13;9;2.5
Sałatka grecka;100;3.5;8.5;4;1.3
Sałatka cezar z kurczakiem;170;11;11;6;1
Sałatka z kurczakiem i warzywami (bez sosu);85;9;3;5;1.5
Sałatka ziemniaczana;150;2.5;8;16;1.5
Sałatka śledziowa;180;6;14;7;1.5
# owoce
Brzoskwinia;40;0.9;0.3;9.5;1.5
Nektarynka;44;1.1;0.3;10.5;1.7
Śliwka;46;0.7;0.3;11.4;1.4
Morela;48;1.4;0.4;11;2
Wiśnie;50;1;0.3;12;1.6
Czereśnie;63;1;0.2;16;2.1
Jagody leśne;57;0.7;0.3;14.5;2.4
Porzeczki czarne;63;1.4;0.4;15;5.5
Porzeczki czerwone;56;1.4;0.2;14;4.3
Agrest;44;0.9;0.6;10;4.3
Jeżyny;43;1.4;0.5;10;5.3
Grejpfrut;42;0.8;0.1;10.7;1.6
Cytryna;29;1.1;0.3;7.5;2.8
Limonka;30;0.7;0.2;8;2.8
Granat;83;1.7;1.2;18.7;4
Melon;34;0.8;0.2;8.2;0.9
Liczi;66;0.8;0.4;16.5;1.3
Marakuja;97;2.2;0.7;23;10
Figa świeża;74;0.8;0.3;19;2.9
Figi suszone;250;3.3;0.9;64;10
Morele suszone;240;3.4;0.5;63;7.3
Śliwki suszone;240;2.2;0.4;64;7
Żurawina suszona (słodzona);310;0.1;1.4;82;5.7
Chipsy bananowe;520;2.3;34;58;7.7
Ananas z puszki (w syropie);75;0.4;0.1;19.5;0.8
Brzoskwinie z puszki (w syropie);70;0.5;0.1;17.5;1.3
Mus owocowy (tubka);60;0.4;0.2;13.5;1.5
Wiórki kokosowe;660;6.9;64.5;24;16
# orzechy i nasiona
Orzechy laskowe;630;15;61;17;10
Pistacje;570;20;45;28;10
Orzechy brazylijskie;660;14;67;12;7.5
Orzechy makadamia;720;8;76;14;8.6
Orzeszki ziemne solone;600;25;50;16;8
Orzechy pekan;690;9;72;14;9.6
Pestki słonecznika;580;21;51;20;8.6
Sezam;570;18;50;23;12
Mak;525;18;42;28;20
Mieszanka studencka;470;12;28;45;6
Masło orzechowe 100% orzechów;620;26;50;16;7
Krem orzechowo-czekoladowy;540;6;31;57;3.5
Olej kokosowy;890;0;99;0;0
Olej lniany;890;0;99.5;0;0
Masło migdałowe;620;21;55;19;10
# słodycze i desery
Ciastka maślane;490;6.5;23;64;2
Herbatniki;440;7.5;13;72;2.5
Ciastka owsiane;460;6.5;18;67;4
Ciastka z kawałkami czekolady;490;5.5;24;63;2.5
Wafelek w czekoladzie;530;6.5;30;58;2
Pierniki w czekoladzie;390;5;10;70;3
Biszkopty;380;8;4;77;1.5
Sernik;300;8;18;27;0.3
Szarlotka;270;3;12;38;1.5
Makowiec;380;7;15;54;4
Babka piaskowa;410;5.5;20;52;1
Tiramisu;290;5;18;27;0.5
Ciasto drożdżowe z kruszonką;350;6;12;54;1.5
Brownie;450;5.5;24;55;2.5
Budyń na mleku;100;3;2.5;17;0
Kisiel;65;0;0;16;0
Galaretka owocowa;70;1.5;0;16;0
Ryż na mleku;105;3.2;2;18.5;0.2
Żelki owocowe;340;6;0.2;79;0
Cukierki twarde;390;0;0.2;97;0
Baton czekoladowy z orzeszkami i karmelem;490;8.5;24;60;2
Baton czekoladowy z karmelem;450;4.5;17;69;1
Baton wafel w czekoladzie;520;6.5;27;63;1.5
Batonik zbożowy (musli);410;6;14;64;5.5
Czekolada biała;550;6;31;59;0
Czekolada mleczna z orzechami;550;8.5;34;51;3
Pralinki czekoladowe;530;6;32;55;2
Chałwa;520;12;30;52;3
Pianki w czekoladzie;440;3;19;65;1
Kakao naturalne (proszek);350;20;11;46;31
Cukier puder;400;0;0;100;0
Syrop klonowy;260;0;0;67;0
Syrop z agawy;310;0;0;76;0
Lody wodne (sorbet);130;0.3;0.2;32;0.5
Lody czekoladowe;220;3.8;11.5;28;1.2
Gofr z cukrem pudrem;310;7.5;14;39;1.5
Gofr z bitą śmietaną i owocami;280;5;14;33;1.5
Bita śmietana z cukrem;300;2;27;12;0
# napoje
Sok jabłkowy;45;0.1;0.1;11;0.1
Sok multiwitamina;48;0.3;0.1;11.5;0.2
Sok marchwiowy;40;0.6;0.2;9;0.8
Nektar owocowy;55;0.2;0.1;13.5;0.3
Napój izotoniczny;25;0;0;6;0
Napój energetyczny;45;0;0;11;0
Napój energetyczny zero;3;0;0;0.5;0
Cola zero;0.4;0;0;0;0
Napój gazowany owocowy (oranżada);40;0;0;10;0
Lemoniada;42;0;0;10.5;0
Herbata mrożona (ice tea);28;0;0;7;0
Kompot;45;0.2;0;11;0.3
Woda smakowa;20;0;0;5;0
Woda kokosowa;19;0.7;0.2;3.7;1.1
Smoothie owocowe;55;0.6;0.3;12.5;1.2
Koktajl białkowy na mleku (1 miarka + 300 ml);75;9;1.7;5.5;0
Mleko czekoladowe;70;3;1.5;11;0.5
Kawa czarna;2;0.1;0;0.3;0
Espresso;9;0.1;0.2;1.7;0
Cappuccino;40;2;2;3.5;0
Kawa z mlekiem i cukrem;45;1;1.2;7;0
Flat white;50;2.8;2.7;4;0
Herbata z cukrem (1 łyżeczka);8;0;0;2;0
Piwo bezalkoholowe;25;0.3;0;5.5;0
Piwo smakowe (radler);40;0.3;0;9;0
Wino czerwone wytrawne;85;0.1;0;2.6;0
Wino białe wytrawne;82;0.1;0;2.6;0
Wino słodkie;110;0.1;0;9;0
Wódka 40%;220;0;0;0;0
Whisky 40%;250;0;0;0.1;0
Cydr;45;0;0;5;0
# dania obiadowe
Kotlet schabowy z ziemniakami i surówką;155;8;7;14;1.5
Kotlet mielony;250;14;17;10;0.5
Kotlet de volaille;260;17;16;12;0.5
Kurczak w panierce (filet);230;20;11;12;0.5
Bigos;110;6;7;5;2.2
Gołąbki w sosie pomidorowym;110;6;5;10;1.3
Gulasz wołowy;120;13;6;4;0.8
Gulasz wieprzowy;150;13;9;4;0.7
Strogonow;120;10;7;4.5;0.7
Pulpety w sosie;150;10;9;7;0.5
Kurczak w sosie śmietanowym;140;14;8;3;0.3
Kurczak curry z ryżem;140;9;4.5;16;1
Kurczak słodko-kwaśny z ryżem;145;7;3.5;21;0.8
Kurczak teriyaki z ryżem;145;9;2.5;21;0.7
Ryż z kurczakiem i warzywami;125;9;3;15.5;1.3
Kurczak z ryżem i brokułem (fit);120;12;2;14;1.4
Leczo;70;3;4.5;5;1.5
Fasolka po bretońsku;130;7;6.5;11;4
Gołąbki bez zawijania (zapiekanka);120;7;6;10;1.5
Placek po węgiersku;180;8;10;15;1.5
Zapiekanka makaronowa z mięsem i serem;175;10;8;16;1
Spaghetti bolognese;135;6.5;4;18;1.5
Makaron carbonara;190;8;9;19;1
Makaron z pesto;210;6;10;24;1.6
Makaron z sosem pomidorowym;120;4;2.5;21;1.6
Makaron z kurczakiem i szpinakiem w sosie śmietanowym;160;9;6.5;17;1.2
Lasagne;155;8.5;7.5;13;1
Risotto z kurczakiem;140;7;4.5;18;0.6
Pierogi z mięsem;210;9;7;28;1.5
Pierogi z kapustą i grzybami;180;5;5;29;2.5
Pierogi z serem na słodko;220;8;6;33;1
Pierogi z owocami;190;4.5;3;36;1.5
Pierogi ruskie podsmażane;240;6.5;10;31;1.7
Kluski leniwe;200;9;6;28;0.8
Krokiety z mięsem;230;9;11;24;1
Naleśnik z dżemem;220;5.5;6;36;1
Naleśniki z serem na słodko;200;9;7;25;0.5
Racuchy z jabłkami;250;5.5;10;35;1.5
Placki z cukinii;150;5;8;14;1.5
Pyzy z mięsem;190;7;6;27;1.5
Owsianka na mleku z owocami;110;4;3;17;2
Owsianka na wodzie;70;2.5;1.3;12;1.8
Kanapka z szynką i serem;250;13;10;27;2.5
Kanapka z jajkiem;220;9.5;10;23;2.5
Tost z serem i szynką;275;14;11;29;1.8
Zapiekanka z pieczarkami i serem (bagietka);250;10;10;30;2
Hot dog;250;9.5;13;24;1.2
# zupy
Żurek z jajkiem i kiełbasą;85;4;5;6;0.6
Barszcz czerwony czysty;20;0.6;0.2;4;0.8
Barszcz ukraiński;50;2;2;6;1.5
Zupa ogórkowa;50;1.5;2.5;5.5;0.9
Grochówka;90;5;3.5;10;3
Krupnik;55;2;2;7;0.8
Kapuśniak;45;2;2.5;4;1.2
Zupa jarzynowa;40;1.3;1.5;5.5;1.2
Zupa pieczarkowa;50;1.5;3;4.5;0.5
Zupa krem z dyni;55;1;3;6;1
Zupa krem z brokułów;50;2;3;4;1.2
Zupa krem z pomidorów;55;1.3;3;6;0.8
Zupa gulaszowa;75;5;3.5;5.5;0.8
Flaki wołowe;75;8;4;2;0.3
Rosół (sam bulion);8;0.8;0.5;0.2;0
Zupa ramen (z makaronem i mięsem);95;5;3.5;11;0.6
Zupa pho;55;4;1.3;7;0.4
Zupa z soczewicy;70;4;1.8;9.5;2.5
# fast food i na mieście
Cheeseburger;265;14;11;29;1.5
Burger z frytkami (zestaw);260;9.5;13;27;2.2
Burger wołowy (restauracyjny);250;13;13;20;1.5
Kebab na talerzu z frytkami;190;10;10;16;1.5
Kebab w tortilli (durum);215;11;9.5;22;1.5
Kebab box;200;9;11;17;1.4
Falafel;330;13;18;32;5
Nuggetsy z kurczaka;270;15;16;17;1
Strips z kurczaka (panierowane);250;19;13;14;0.8
Skrzydełka w panierce (kubełek);280;20;18;10;0.5
Tortilla/wrap z kurczakiem;195;11;7;22;1.6
Burrito;190;8;6.5;25;2.5
Tacos;220;10;11;20;2.5
Pizza pepperoni;280;12;12;31;2
Pizza capricciosa;240;11;8.5;29;1.8
Pizza hawajska;235;11;8;30;1.6
Pizza z kurczakiem;245;13;8.5;29;1.8
Zapiekanka z budki;240;9.5;9;30;2
Sushi nigiri (z łososiem);150;6;3;25;0.3
Sushi california roll;145;4;4;24;1
Sushi futomaki;150;4.5;4;24;1.2
Pad thai z kurczakiem;160;9;6;19;1
Makaron chiński z kurczakiem i warzywami;135;7.5;4;17;1.3
Ryż smażony z jajkiem i warzywami;165;5;5.5;24;1
Pierogi gyoza (smażone);230;8.5;9;29;1.5
Ryba z frytkami (fish and chips);230;10;12;21;1.6
Frytki z fast foodu;320;3.5;15;41;3.8
# sosy i dodatki
Sos czosnkowy;300;2;30;6;0.2
Sos tzatziki;90;3.5;6.5;4;0.4
Sos bolognese;95;6;5;6;1.5
Sos pomidorowy do makaronu (słoik);50;1.5;1.5;7.5;1.5
Sos śmietanowo-serowy;180;4;16;5;0
Sos pieczeniowy;60;1.5;3;7;0.2
Pesto bazyliowe;450;5;45;6;2
Sos sojowy;55;8;0.1;5;0.8
Sos barbecue;160;1;0.5;37;0.8
Sos słodko-kwaśny;150;0.4;0.3;36;0.4
Sos sriracha;95;2;1;19;2
Ketchup;105;1.2;0.2;24;0.4
Musztarda;140;7;9;8;3
Chrzan tarty;80;1.5;3;10;3
Majonez light;300;0.8;31;6;0
Hummus klasyczny;250;7.5;17.5;14;6
Guacamole;155;2;14;7;6
Tahini (pasta sezamowa);600;17;54;21;9.3
Ocet balsamiczny;88;0.5;0;20;0
`

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-')
}

export const EXTRA_FOODS: Food[] = RAW.trim()
  .split('\n')
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const [name, kcal, p, f, c, fiber] = l.split(';')
    return { id: 'pl:' + slug(name), name, kcal: Number(kcal), p: Number(p), f: Number(f), c: Number(c), fiber: Number(fiber) }
  })
