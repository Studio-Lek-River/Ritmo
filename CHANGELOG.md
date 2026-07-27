# [0.98.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.97.0...v0.98.0) (2026-07-27)


### Features

* **connections:** toon het aantal opgeruimde blokken tijdens verbreken ([cbb2bd6](https://github.com/Studio-Lek-River/Ritmo/commit/cbb2bd61f3925737993240e239e1bd38a51128d1))
* **connections:** vraag bij verbreken van Outlook om de Ritmo-blokken op te ruimen ([ebd82b4](https://github.com/Studio-Lek-River/Ritmo/commit/ebd82b43b874525a51cceb2b5c29acc330988212)), closes [#160](https://github.com/Studio-Lek-River/Ritmo/issues/160)

# [0.97.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.96.0...v0.97.0) (2026-07-27)


### Features

* **outlook:** ruim alle Ritmo-blokken in één actie op ([6d48e1d](https://github.com/Studio-Lek-River/Ritmo/commit/6d48e1d9c6df4981a7c014a62428d16fd3616095)), closes [#155](https://github.com/Studio-Lek-River/Ritmo/issues/155)

# [0.96.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.95.0...v0.96.0) (2026-07-27)


### Features

* **outlook:** werk bestaande agendablokken bij in plaats van ze opnieuw aan te maken ([7e0867d](https://github.com/Studio-Lek-River/Ritmo/commit/7e0867dbeeec18091175f3c207a028b037107144))

# [0.95.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.94.0...v0.95.0) (2026-07-27)


### Bug Fixes

* **planner:** stop het wegschrijven van de week bij een rate-limit ([c6914a5](https://github.com/Studio-Lek-River/Ritmo/commit/c6914a577394c36bb029abdde41b8dd9f6f3fdb7))


### Features

* **outlook:** kom na opnieuw koppelen terug in de planner ([6032962](https://github.com/Studio-Lek-River/Ritmo/commit/6032962cda18cee2817118d0c5c8902e6e4123b4))
* **planner:** zet de hele week in één klik in de agenda ([deb614f](https://github.com/Studio-Lek-River/Ritmo/commit/deb614f668b637122639d56e38b125fa8dba2817)), closes [#153](https://github.com/Studio-Lek-River/Ritmo/issues/153)

# [0.94.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.93.0...v0.94.0) (2026-07-27)


### Bug Fixes

* **planner:** corrigeer het label van automatisch inplannen ([d33320c](https://github.com/Studio-Lek-River/Ritmo/commit/d33320cd834a66856136f0d412696516936f4b9f))
* **planner:** neem routines uit de takenpool mee bij het indelen van de dag ([7c3e823](https://github.com/Studio-Lek-River/Ritmo/commit/7c3e823e78cce35baf15086ada70902b48223331))


### Features

* **planner:** meld wanneer er niets in te delen valt ([fd58073](https://github.com/Studio-Lek-River/Ritmo/commit/fd58073da43853d1b2cf0a64d123cf3577b9b619))

# [0.93.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.92.0...v0.93.0) (2026-07-27)


### Features

* **outlook:** schrijf de dagplanning naar Outlook via "Zet in agenda" ([9436961](https://github.com/Studio-Lek-River/Ritmo/commit/9436961b37773b7dc8722771639a958a638683ad)), closes [#41](https://github.com/Studio-Lek-River/Ritmo/issues/41)
* **outlook:** vraag Calendars.ReadWrite en deel de write-keten voor write.js ([2173498](https://github.com/Studio-Lek-River/Ritmo/commit/2173498aa061b7ecdc5471f5fcfb46a083fe44e1))

# [0.92.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.91.0...v0.92.0) (2026-07-27)


### Bug Fixes

* **planner:** voorkom onvertaalde fallback-redenen bij de server-provider ([fb1c1bc](https://github.com/Studio-Lek-River/Ritmo/commit/fb1c1bc7ec4b73d8358224094ce2b493087f71b6))


### Features

* **planner:** koppel "deel mijn dag in" aan de provider-keuze ([45680ba](https://github.com/Studio-Lek-River/Ritmo/commit/45680bad1957f0f54b5bf943c1d63c56dc2e2f69))
* **planner:** voeg planner-provider-abstractie en server-seam toe ([370ccbb](https://github.com/Studio-Lek-River/Ritmo/commit/370ccbbe50297de811de566e49786042d3f0e8d4))

# [0.91.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.90.0...v0.91.0) (2026-07-27)


### Bug Fixes

* **connections:** controleer eerst op een bestaande member-id-rij vóór het claimen van een legacy Trello-rij ([d82a1bb](https://github.com/Studio-Lek-River/Ritmo/commit/d82a1bbab2a94d64539da6f216af11bc6ded9822))
* **connections:** meld een falend Trello-account ook bij een deels geslaagde fetch ([f626aad](https://github.com/Studio-Lek-River/Ritmo/commit/f626aad6b69a9d3ee915450d1b69574b8a78668f))


### Features

* **connections:** meerdere Trello-accounts naast elkaar koppelen ([43a45b1](https://github.com/Studio-Lek-River/Ritmo/commit/43a45b1ca35daccb6c0aef8fa654d1f772fb6adb)), closes [#120](https://github.com/Studio-Lek-River/Ritmo/issues/120)

# [0.90.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.89.1...v0.90.0) (2026-07-27)


### Features

* **planner:** geef dagdata en toggle-handlers door voor module-routines ([c10423c](https://github.com/Studio-Lek-River/Ritmo/commit/c10423cae6d29723ed0f888b190df4a0707058ea))
* **planner:** laat module-items en -blokken meedoen als derde bron in de dagtijdlijn ([b05d2de](https://github.com/Studio-Lek-River/Ritmo/commit/b05d2de068754724575b5d843d4a266524d5c908))
* **planner:** laat module-routines meeslepen en meedoen aan "deel mijn dag in" ([84306c7](https://github.com/Studio-Lek-River/Ritmo/commit/84306c7fc6d95e15da7fdfbdcea77dd84682ad68))
* **planner:** schakelaar "meenemen in de dagplanning" in de module-instellingen ([6316721](https://github.com/Studio-Lek-River/Ritmo/commit/63167212a45376a6ab645291f70a2c4e15d1b050)), closes [#122](https://github.com/Studio-Lek-River/Ritmo/issues/122)

## [0.89.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.89.0...v0.89.1) (2026-07-27)


### Bug Fixes

* **nutrition:** productmaat in de voedingsuitleg berekenen in plaats van hardcoderen ([18f59af](https://github.com/Studio-Lek-River/Ritmo/commit/18f59af47b8998834fa643b8c1f28b4a96084f16))
* **settings:** tandwiel opent weer de tabs na het starten van de rondleiding ([18a85d7](https://github.com/Studio-Lek-River/Ritmo/commit/18a85d70ba2a61c03000e35e36a48d5292f284a1)), closes [#152](https://github.com/Studio-Lek-River/Ritmo/issues/152)

# [0.89.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.88.0...v0.89.0) (2026-07-27)


### Features

* **nutrition:** uitleg van product naar maaltijd met voorbeeld ([c9b5f3a](https://github.com/Studio-Lek-River/Ritmo/commit/c9b5f3ad435970838fb1fcfa76845e6efef00311)), closes [#150](https://github.com/Studio-Lek-River/Ritmo/issues/150)

# [0.88.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.87.1...v0.88.0) (2026-07-27)


### Features

* **nutrition:** drink- en calorieënteller samenvoegen tot één kaart ([7940a4d](https://github.com/Studio-Lek-River/Ritmo/commit/7940a4d56483f806cc439ea6c133803f5e19ebab)), closes [#151](https://github.com/Studio-Lek-River/Ritmo/issues/151)

## [0.87.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.87.0...v0.87.1) (2026-07-27)


### Bug Fixes

* **household:** punt als decimaalteken bij het invoeren van bedragen ([3213845](https://github.com/Studio-Lek-River/Ritmo/commit/321384583a055d73779754d1a9cc7c57a4ff792f)), closes [#114](https://github.com/Studio-Lek-River/Ritmo/issues/114)

# [0.87.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.86.0...v0.87.0) (2026-07-27)


### Bug Fixes

* **nutrition:** macro-velden in het productformulier uitlijnen ([7b94338](https://github.com/Studio-Lek-River/Ritmo/commit/7b94338c8ed1a88db3d56ac951fbad51b4ce49e0))


### Features

* **insight:** gemiddelde macro's per dag op de calorieënkaart ([8b628fa](https://github.com/Studio-Lek-River/Ritmo/commit/8b628fabc0bed1ff7a614b454a3788352fe5b97d)), closes [#148](https://github.com/Studio-Lek-River/Ritmo/issues/148)
* **nutrition:** eiwitten, koolhydraten en vetten in het datamodel ([945fc1a](https://github.com/Studio-Lek-River/Ritmo/commit/945fc1a7c5e94c228e4f849ee3567ad5b75c6484))
* **nutrition:** macro's invoeren en berekend zien in de samenstellers ([5831c7d](https://github.com/Studio-Lek-River/Ritmo/commit/5831c7dfa323328e89bb4d74ec4a08606a66eac4))

# [0.86.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.85.0...v0.86.0) (2026-07-27)


### Features

* **nutrition:** porties en maaltijden in het datamodel ([877f34c](https://github.com/Studio-Lek-River/Ritmo/commit/877f34c9516fe75b4287bbc890dfc1126927fb00))
* **nutrition:** porties en maaltijden samenstellen en loggen ([20f9d66](https://github.com/Studio-Lek-River/Ritmo/commit/20f9d665985fc289ade98d8c0cc6c3cbc596c07c)), closes [#147](https://github.com/Studio-Lek-River/Ritmo/issues/147)

# [0.85.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.84.0...v0.85.0) (2026-07-26)


### Features

* **instellingen:** voedingsbibliotheek beheren via een eigen tab in Instellingen ([1417ec2](https://github.com/Studio-Lek-River/Ritmo/commit/1417ec233bd907538d6a7383edf472677fbad8f3)), closes [#146](https://github.com/Studio-Lek-River/Ritmo/issues/146)

# [0.84.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.83.0...v0.84.0) (2026-07-26)


### Bug Fixes

* **sync:** lege dag overschrijft niet langer de gelogde taken uit de cloud ([1a110ff](https://github.com/Studio-Lek-River/Ritmo/commit/1a110fff75972a14ccda36343b56387cec3bb287))
* **sync:** opnieuw ophalen bij terugkeer naar het tabblad en na-ophaal herladen ([d7fe711](https://github.com/Studio-Lek-River/Ritmo/commit/d7fe711d5c61ef81656f5d6e07b8323d32e82edd)), closes [#145](https://github.com/Studio-Lek-River/Ritmo/issues/145)


### Features

* **sync:** ophaal-poort die lokale schrijfacties laat wachten op de cloud ([1a97dec](https://github.com/Studio-Lek-River/Ritmo/commit/1a97dec47cbff0b67ca096009444c04981ee9c1b))

# [0.83.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.82.0...v0.83.0) (2026-07-26)


### Bug Fixes

* **investments:** decimale bedragen blijven behouden bij inline bewerken ([14501a7](https://github.com/Studio-Lek-River/Ritmo/commit/14501a7d4ce3b3f05b855a575fa66fb552ff224f))
* **investments:** koersdeel-splitsing rondt af als formatEuro, niet als Math.round ([3eddfec](https://github.com/Studio-Lek-River/Ritmo/commit/3eddfec0ad28c21feb9ecda189dd840d1ef90d63))
* **investments:** sluitpost-afronding en geneste ternaries in koersdeel-splitsing ([633ab26](https://github.com/Studio-Lek-River/Ritmo/commit/633ab266f41c561a2c98e22b122f93be9ea46e53))


### Features

* **investments:** aantal en koers per meting ([bfbcafc](https://github.com/Studio-Lek-River/Ritmo/commit/bfbcafc4e7c07fdd528e77211092abb6f8561225))
* **investments:** koersgrafiek met euro- of indexschaal ([05744ce](https://github.com/Studio-Lek-River/Ritmo/commit/05744ce2eccdb8cc61ed02cd25df9ea857f59cc5))
* **investments:** koerswinst gescheiden van inleg ([ca30b1d](https://github.com/Studio-Lek-River/Ritmo/commit/ca30b1dfbc0610db5144eb37e890b272609b1a1b)), closes [#115](https://github.com/Studio-Lek-River/Ritmo/issues/115)

# [0.82.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.81.0...v0.82.0) (2026-07-26)


### Bug Fixes

* **nutrition:** gepaarde voedingsregels krijgen hetzelfde tijdstempel ([83bd359](https://github.com/Studio-Lek-River/Ritmo/commit/83bd359ffd06fa0c6398769056f767dcfd2313c7))
* **nutrition:** meervoud voor het aantal porties op een gelogde maaltijd ([12334e5](https://github.com/Studio-Lek-River/Ritmo/commit/12334e55d7df39ae2d8ec933fa10794b6c708aea))
* **ui:** toast kapt zijn eigen boodschap niet meer af ([277ea88](https://github.com/Studio-Lek-River/Ritmo/commit/277ea88d3b4420433841c2b07b697a7df241679a))


### Features

* **nutrition:** drankjes tellen mee in de gekoppelde Drinken-teller ([4bdb532](https://github.com/Studio-Lek-River/Ritmo/commit/4bdb532d086b11674bb01af24da7cf2572624933)), closes [#143](https://github.com/Studio-Lek-River/Ritmo/issues/143)

# [0.81.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.80.0...v0.81.0) (2026-07-26)


### Features

* **nutrition:** i18n-keys voor maaltijden-UI ([2abe9e1](https://github.com/Studio-Lek-River/Ritmo/commit/2abe9e1030b08807c4307baca6da02672e4b1ed6)), closes [#142](https://github.com/Studio-Lek-River/Ritmo/issues/142)
* **nutrition:** maaltijden aanmaken en beheren via nieuwe tab ([676e1e3](https://github.com/Studio-Lek-River/Ritmo/commit/676e1e329cf6d02cfbbc9c46fcaa1ef03bf0b43a))
* **nutrition:** recepten als sjabloon van meerdere ingrediënten ([e93a90e](https://github.com/Studio-Lek-River/Ritmo/commit/e93a90e0e1e8ddbcb337f53a6c7fe4e406636c29))
* **nutrition:** recepten in één klik loggen vanaf de dagkaart ([764ea54](https://github.com/Studio-Lek-River/Ritmo/commit/764ea54e172844d29942c9a76a75bfd46a728f64))

# [0.80.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.79.0...v0.80.0) (2026-07-26)


### Bug Fixes

* **nutrition:** verwijderdialoog vermeldt dat gelogde maaltijden blijven staan ([b3f58ee](https://github.com/Studio-Lek-River/Ritmo/commit/b3f58ee1bed42d4ddb54c9d4b495e19fdb1925b8))


### Features

* **nutrition:** log losse voedingsmiddelen met automatische kcal-berekening ([f9a3ad4](https://github.com/Studio-Lek-River/Ritmo/commit/f9a3ad4b7a873adb8fe6cbc44b0f33a562ac900e)), closes [#143](https://github.com/Studio-Lek-River/Ritmo/issues/143) [#141](https://github.com/Studio-Lek-River/Ritmo/issues/141)

# [0.79.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.78.1...v0.79.0) (2026-07-26)


### Features

* **nutrition:** voeg opslag, sync en backup toe voor voedingsbibliotheek ([1edb072](https://github.com/Studio-Lek-River/Ritmo/commit/1edb072b4084164e931d1add2d0c9444ede56c47))
* **nutrition:** voeg voedingsbibliotheek-beheer toe aan de counter-editor ([9141010](https://github.com/Studio-Lek-River/Ritmo/commit/91410105b374731b22e5d14b710771c9854548bf))
* **nutrition:** voeg voedingsbibliotheek-domein en provider toe ([db25b2c](https://github.com/Studio-Lek-River/Ritmo/commit/db25b2c2e50162940e034fb9abf19953b01138b2))

## [0.78.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.78.0...v0.78.1) (2026-07-24)


### Bug Fixes

* **sync:** mergesettings-blob bij push/pull i.p.v. overschrijven ([a07abfb](https://github.com/Studio-Lek-River/Ritmo/commit/a07abfb4797b90ff172d192a75356a7c18099193))

# [0.78.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.77.0...v0.78.0) (2026-07-22)


### Features

* **bodymap:** toon standaard alleen prikken van deze week op de figuur ([437b4f9](https://github.com/Studio-Lek-River/Ritmo/commit/437b4f9d135d0f2adf121ba248746e94631f2814)), closes [#138](https://github.com/Studio-Lek-River/Ritmo/issues/138)

# [0.77.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.76.0...v0.77.0) (2026-07-18)


### Features

* **injectionSchedule:** undo in plaats van bevestigingsdialoog bij prik verwijderen ([174a477](https://github.com/Studio-Lek-River/Ritmo/commit/174a4770ddf612aa6ac00158983e914575fd41ec)), closes [#137](https://github.com/Studio-Lek-River/Ritmo/issues/137)

# [0.76.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.75.0...v0.76.0) (2026-07-18)


### Bug Fixes

* **modules:** verwijder-dialog belooft geen onomkeerbaarheid meer ([7adc7fa](https://github.com/Studio-Lek-River/Ritmo/commit/7adc7fa7c63670117cdfb5c0e01f24a9a1fc16ab))


### Features

* **modules:** bevestiging en undo bij module-, metric- en tagverwijdering ([0852a8c](https://github.com/Studio-Lek-River/Ritmo/commit/0852a8c5acadc12a55ebd416a918fa46d91eb1df)), closes [#136](https://github.com/Studio-Lek-River/Ritmo/issues/136)

# [0.75.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.74.0...v0.75.0) (2026-07-18)


### Features

* **household:** beleggingen hernoemen en verwijderen met undo ([41eeb7a](https://github.com/Studio-Lek-River/Ritmo/commit/41eeb7a1892f0c2c3a2610928b318689d1e6f1bf))
* **planner:** Kanban-kaart hernoemen en verwijderen met undo ([142f215](https://github.com/Studio-Lek-River/Ritmo/commit/142f2153fe9544768e218700ffbb68ad0f4ca29d))

# [0.74.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.73.0...v0.74.0) (2026-07-17)


### Features

* **collecties:** gebeurtenis verwijderen bereikbaar en terugdraaibaar maken ([7d92869](https://github.com/Studio-Lek-River/Ritmo/commit/7d92869e82696b85b81311f5bd15daec7c12c439))
* **teller:** invoer verwijderen en bedrag bewerken terugdraaibaar maken ([571c6b5](https://github.com/Studio-Lek-River/Ritmo/commit/571c6b5ebc02821ed48172059f97eaff3273aa36))

# [0.73.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.72.0...v0.73.0) (2026-07-17)


### Features

* **medicatie:** inname en bestelling terugdraaien ([4b945ae](https://github.com/Studio-Lek-River/Ritmo/commit/4b945ae9f8755cdcb7a417469b3269a0c4de2105))

# [0.72.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.71.0...v0.72.0) (2026-07-17)


### Features

* **household:** klusjes, boodschappen en vaste lasten consistent met de rest van de app ([ecc0095](https://github.com/Studio-Lek-River/Ritmo/commit/ecc0095256a1171477772efaa3d7d30286c43672)), closes [#131](https://github.com/Studio-Lek-River/Ritmo/issues/131)

# [0.71.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.70.0...v0.71.0) (2026-07-17)


### Features

* **planner:** verberg Trello/GitHub-kaarten in Takenpool en ProjectsView ([fe484a9](https://github.com/Studio-Lek-River/Ritmo/commit/fe484a97def2491f948b41444f4a834493109413))
* **sourceItemPrefs:** voeg hidden-veld en verberg-mechanisme toe voor bronitems ([785004e](https://github.com/Studio-Lek-River/Ritmo/commit/785004e90770940e3689019937d2293777c069d4))

# [0.70.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.69.0...v0.70.0) (2026-07-17)


### Features

* **projecten:** onderwerp-naam en subdoel-label inline bewerkbaar ([47de05c](https://github.com/Studio-Lek-River/Ritmo/commit/47de05cac25260b423ba6f9219b539a430a1f272))

# [0.69.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.68.0...v0.69.0) (2026-07-17)


### Features

* **settings:** terugkerende taak - tekst en dagen bewerkbaar, verwijderen met undo ([4522720](https://github.com/Studio-Lek-River/Ritmo/commit/4522720922e51bce66458e0bc787e0f91a9253d1))

# [0.68.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.67.2...v0.68.0) (2026-07-17)


### Bug Fixes

* **planner:** Escape in taak-inline-edit slaat niet meer alsnog op via blur ([26d67bf](https://github.com/Studio-Lek-River/Ritmo/commit/26d67bf139e6aa8c2476afb7a4398e63a693f8ca))


### Features

* **planner:** losse taak inline bewerken en verwijderen met ongedaan maken ([a99a5ff](https://github.com/Studio-Lek-River/Ritmo/commit/a99a5ffd8c9f63a563da0f812cf7505431a9ebd3))

## [0.67.2](https://github.com/Studio-Lek-River/Ritmo/compare/v0.67.1...v0.67.2) (2026-07-17)


### Bug Fixes

* **planner:** weggeklikte terugkerende taak blijft weg na herstart ([b4c9cfd](https://github.com/Studio-Lek-River/Ritmo/commit/b4c9cfd0b21e67403aae53b6108c1a8e6a5cf62e))

## [0.67.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.67.0...v0.67.1) (2026-07-17)


### Bug Fixes

* **toast:** FIFO-wachtrij zodat een tweede toast de eerste (en zijn undo) niet meer opeet ([1c64e85](https://github.com/Studio-Lek-River/Ritmo/commit/1c64e852b758c1fcace468e9ddaac3dfe1c3c3ca))

# [0.67.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.66.0...v0.67.0) (2026-07-17)


### Features

* **planner:** Vandaag-feed met voortgang per project over alle bronnen ([0f9c3ec](https://github.com/Studio-Lek-River/Ritmo/commit/0f9c3eca779a9445d72e9a2e2864fe7b49da7a1e)), closes [#39](https://github.com/Studio-Lek-River/Ritmo/issues/39)

# [0.66.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.65.0...v0.66.0) (2026-07-17)


### Features

* **connections:** eigen dag, tijd en duur per kaart wissen bij het verbreken van een koppeling ([790591f](https://github.com/Studio-Lek-River/Ritmo/commit/790591fcb64267dd4aebfd7ce46ea061b66f2cea))
* **planner:** duur en tijd schrijven op een Trello-kaart of GitHub-issue ([edc50ae](https://github.com/Studio-Lek-River/Ritmo/commit/edc50ae9c38182f5f37a39b46dfd33ca75ea9e6a))
* **planner:** opslag voor duur en tijd op items van een gekoppelde bron ([bf4ad77](https://github.com/Studio-Lek-River/Ritmo/commit/bf4ad77424cfd1c1ce793e71c53254785a91f40d))
* **planner:** Trello-kaarten en GitHub-issues plannen in het weekrooster ([0772123](https://github.com/Studio-Lek-River/Ritmo/commit/077212364fdfd2e187fe28336a6ef4f673119878))

# [0.65.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.64.0...v0.65.0) (2026-07-17)


### Bug Fixes

* **planner:** deel mijn dag in correct terugdraaien en ook na alles overnemen ([eedf56b](https://github.com/Studio-Lek-River/Ritmo/commit/eedf56bd4516a5f7078fb11394f5df935355b1d1))


### Features

* **planner:** duur van een taak aanpassen via een chip op de takenpool-kaart ([d3f1829](https://github.com/Studio-Lek-River/Ritmo/commit/d3f182982de4ecfa295029ff40c559d781299202))
* **planner:** knop om de laatste dagindeling terug te draaien ([a747838](https://github.com/Studio-Lek-River/Ritmo/commit/a7478383a05d2b1a13111f1e9312fd00a2364750))

# [0.64.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.63.0...v0.64.0) (2026-07-17)


### Features

* **desktop:** bredere app-layout met meegroeiende takenpool ([37c5ab9](https://github.com/Studio-Lek-River/Ritmo/commit/37c5ab92dc46e374356d91ae2ef93c99350c3605))

# [0.63.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.62.2...v0.63.0) (2026-07-17)


### Bug Fixes

* **planner:** bron-icoon decoratief maken en lege menu-popover verbergen ([4840546](https://github.com/Studio-Lek-River/Ritmo/commit/484054660538107bb103391c7d1577d0faf1f334))


### Features

* **i18n:** vertaalsleutels voor prioriteit en takenpool-kaarten ([734e783](https://github.com/Studio-Lek-River/Ritmo/commit/734e7839c4c83e5fb6d84c937e9fb53afa1a2f01))
* **planner:** prioriteit als eerste-klas veld op de dagtijdlijn ([e90f23b](https://github.com/Studio-Lek-River/Ritmo/commit/e90f23b9d784bd9a96cb0639ae8b1622aa02c7d2))
* **planner:** prioriteit schrijfbaar op losse taken en project-subgoals ([e9e89b7](https://github.com/Studio-Lek-River/Ritmo/commit/e9e89b742505fd6171bbcad16b6b6df45f879884))
* **planner:** takenpool-kaarten met chips en een "..."-menu per taak ([00ab9eb](https://github.com/Studio-Lek-River/Ritmo/commit/00ab9eb3ac9930595d07f719ec775a7efe519eb4))

## [0.62.2](https://github.com/Studio-Lek-River/Ritmo/compare/v0.62.1...v0.62.2) (2026-07-17)


### Bug Fixes

* **api:** connections-endpoints weer als eigen Vercel-routes ([9e6d354](https://github.com/Studio-Lek-River/Ritmo/commit/9e6d354809fcc29d2e7f40e2dbd60d922eae3049))

## [0.62.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.62.0...v0.62.1) (2026-07-17)


### Bug Fixes

* **api:** connections-endpoints via een router zodat de deploy binnen de Vercel-limiet blijft ([ff2e6f1](https://github.com/Studio-Lek-River/Ritmo/commit/ff2e6f191373cdf2842c042b23c28fde41de9fa9))

# [0.62.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.61.1...v0.62.0) (2026-07-17)


### Bug Fixes

* **connections:** gesloten GitHub-issues worden niet meer ingepland ([2525024](https://github.com/Studio-Lek-River/Ritmo/commit/252502442c2314d90a2a9447d9fe930c9daa6135))
* **planner:** projecttaak met een dubbele punt in het id blijft verplaatsbaar ([b79a087](https://github.com/Studio-Lek-River/Ritmo/commit/b79a08794210b9686c2d81a6957756da16a86125))


### Features

* **connections:** GitHub lezen - toegewezen issues als planbare items ([00e22b7](https://github.com/Studio-Lek-River/Ritmo/commit/00e22b7c904f996240983320d6fcd5b2aad40a0d)), closes [#38](https://github.com/Studio-Lek-River/Ritmo/issues/38)

## [0.61.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.61.0...v0.61.1) (2026-07-16)


### Bug Fixes

* **planner:** Trello-bordenlijst blijft niet meer hangen op laden ([6c6e13e](https://github.com/Studio-Lek-River/Ritmo/commit/6c6e13e5fd9ee364c5deba22f7a6bd039ef6d33f))

# [0.61.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.60.0...v0.61.0) (2026-07-16)


### Bug Fixes

* **connections:** koppeling verbreken werkt weer ([37021ba](https://github.com/Studio-Lek-River/Ritmo/commit/37021babe50ea9127106b8bd08790cad885d78bc))


### Features

* **connections:** Trello-token wordt bij verbreken ook bij Trello ingetrokken ([d539c04](https://github.com/Studio-Lek-River/Ritmo/commit/d539c045463582e658e2f9185e0d14fe8f0e89fd))

# [0.60.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.59.0...v0.60.0) (2026-07-16)


### Features

* **connections:** Trello koppelen met een geplakt token ([ac41a6f](https://github.com/Studio-Lek-River/Ritmo/commit/ac41a6f5c0dce0c41e29fdba1139fda61fae6793))
* **connections:** Trello-endpoints voor koppelen en kaarten lezen ([18fba73](https://github.com/Studio-Lek-River/Ritmo/commit/18fba739c883fbcfd76910d836fc784e461ebeec))
* **planner:** kies per Trello-bord of het meetelt in de planner ([213dd37](https://github.com/Studio-Lek-River/Ritmo/commit/213dd3776ce936c370b01a203876d63e9637b99b))
* **planner:** Trello-borden lokaal cachen als afgeleide projecten ([2deeab8](https://github.com/Studio-Lek-River/Ritmo/commit/2deeab83cb8866cb0a92dc86a477b73475a7113e))
* **planner:** Trello-borden verschijnen als projecten met hun kaarten in de takenpool ([b0598cb](https://github.com/Studio-Lek-River/Ritmo/commit/b0598cbc96b35d97f3ef76b3567a6e094ba50fed))
* **projects:** Trello-projecten zijn read-only en linken naar het bord ([72c3358](https://github.com/Studio-Lek-River/Ritmo/commit/72c335876bbd56bf808e05fb5958464617130b3a))

# [0.59.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.58.0...v0.59.0) (2026-07-16)


### Bug Fixes

* **agenda:** een agendaweek buiten het bewaarvenster wordt niet meer weggegooid ([e4b4b9c](https://github.com/Studio-Lek-River/Ritmo/commit/e4b4b9c9448156751e23c39dc330cba4e74a9eb7))
* **planner:** agendablokken blijven binnen de zichtbare uren van het rooster ([eaef59b](https://github.com/Studio-Lek-River/Ritmo/commit/eaef59b835d58a786c7a3cf8a76412d5a3c3acaf))
* **planner:** dagen staan niet meer dubbel boven het weekrooster ([76639a3](https://github.com/Studio-Lek-River/Ritmo/commit/76639a323e5ba772e76cfd4ba6f24d6548ee4ba4))


### Features

* **planner:** afspraken die niet meetellen zijn te verbergen ([8babfb2](https://github.com/Studio-Lek-River/Ritmo/commit/8babfb25e66d80fbe9e69389629a26926b0b936b))
* **planner:** vooruit en terug bladeren door de weken ([38a817f](https://github.com/Studio-Lek-River/Ritmo/commit/38a817fb8462f499cc4ea890c3dc4acb66a9182b))

# [0.58.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.57.0...v0.58.0) (2026-07-16)


### Bug Fixes

* **planner:** titel en icoon van een agendakaartje staan bovenaan, tijd eronder ([e852cc1](https://github.com/Studio-Lek-River/Ritmo/commit/e852cc1770aee653e6880c75b8e4b248c7cac5be))
* **planner:** vernieuwknop van de Outlook-koppeling past weer in de box ([a2efb70](https://github.com/Studio-Lek-River/Ritmo/commit/a2efb70e196ff505ad8ff73cc5e4440349d61b24))


### Features

* **planner:** per agendapunt kiezen of het meetelt bij het indelen ([a79444a](https://github.com/Studio-Lek-River/Ritmo/commit/a79444a00d30a58dffe18bb55673edc6d1133bdc))

# [0.57.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.56.0...v0.57.0) (2026-07-16)


### Bug Fixes

* **planner:** verbroken Outlook-koppeling laat geen afspraken meer meetellen ([0d163af](https://github.com/Studio-Lek-River/Ritmo/commit/0d163afa57ce14c0a8b5f18034e2f46c1f0e47af))


### Features

* **planner:** agenda blijft staan na herladen via een lokale cache ([d9f0768](https://github.com/Studio-Lek-River/Ritmo/commit/d9f07685baec2058f2bd98d78ced1caddecc1248))
* **planner:** dekkende kaartjes met kleurstrip in het rooster ([4ce1d7b](https://github.com/Studio-Lek-River/Ritmo/commit/4ce1d7ba56b96ffc8d5c7a6e7e9a38df4e41445a))
* **planner:** Outlook vernieuwen in het Koppelingen-blok ([908257a](https://github.com/Studio-Lek-River/Ritmo/commit/908257a2032fdf8cce5ace40348e4406974ec578))

# [0.56.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.55.1...v0.56.0) (2026-07-16)


### Features

* **planner:** Koppelingen-blok onder de takenpool met bronkleur in het rooster ([c6a182d](https://github.com/Studio-Lek-River/Ritmo/commit/c6a182d52f49c0143505664acd14d39a7fd7310f))
* **planner:** sourcePrefs-model voor bronvoorkeuren in de planner ([3b6aaa5](https://github.com/Studio-Lek-River/Ritmo/commit/3b6aaa588e723e62eed53680e060081486f9e4d2))

## [0.55.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.55.0...v0.55.1) (2026-07-16)


### Bug Fixes

* **pwa:** laat de service worker /api-routes niet onderscheppen ([0715ca0](https://github.com/Studio-Lek-River/Ritmo/commit/0715ca0a26ef89ef7c04e35a29a04a685729e073))

# [0.55.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.54.0...v0.55.0) (2026-07-15)


### Bug Fixes

* **connections:** toon Verbreken alleen bij verbonden koppeling ([c5ba1e4](https://github.com/Studio-Lek-River/Ritmo/commit/c5ba1e475ca2e73e140a0fab7b002476b0772ec2))
* **planner:** voorkom verouderde Outlook-agenda bij overlappende refetch ([7b23a0d](https://github.com/Studio-Lek-River/Ritmo/commit/7b23a0d4f857dc80db5885cdb43dae6e5c4a51fa))


### Features

* **planner:** expliciete knop om Outlook-agenda te importeren en vernieuwen ([36645e1](https://github.com/Studio-Lek-River/Ritmo/commit/36645e17fd3ea311f0234f819edd5daedb3df394))

# [0.54.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.53.0...v0.54.0) (2026-07-15)


### Bug Fixes

* **sync:** schrijf sync-metadata ook bij edits vlak na inloggen ([c43ec9c](https://github.com/Studio-Lek-River/Ritmo/commit/c43ec9c0f35ff6b418dd5289c01c2b8d94d2cc9f))


### Features

* **sync:** onthoud 'Behoud cloud' zodat de sync-prompt niet terugkeert ([e8dadc8](https://github.com/Studio-Lek-River/Ritmo/commit/e8dadc88e5c4f425bba9ebdee91baa714cf6b10d))

# [0.53.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.52.0...v0.53.0) (2026-07-15)


### Features

* **connections:** koppel Outlook-connect-knop en agenda-state in de Planner ([906604c](https://github.com/Studio-Lek-River/Ritmo/commit/906604c160f293664b0a7ed56e68ad31337ace36))
* **connections:** Outlook OAuth authorization-code flow (S07) ([db25b59](https://github.com/Studio-Lek-River/Ritmo/commit/db25b594786dec2e4cb1c63ee75e0c7162006561))
* **connections:** Outlook-connect-redirect en ephemere agenda-fetch ([f2b1b42](https://github.com/Studio-Lek-River/Ritmo/commit/f2b1b42436146a67911cd8ce4bdcc55f9f09f82e))
* **i18n:** teksten voor Outlook-OAuth-fouten en agenda-weergave (S07) ([ff7583c](https://github.com/Studio-Lek-River/Ritmo/commit/ff7583ccb168431f933b9561eae157d3356721e2))
* **planner:** normaliseer Outlook-agenda-events naar weergave- en planblokken ([53cb4b4](https://github.com/Studio-Lek-River/Ritmo/commit/53cb4b4b548fa4efd81fcf587017d246fe8eb7c7))
* **planner:** render Outlook-afspraken als read-only agenda-blokken ([8bdd1bf](https://github.com/Studio-Lek-River/Ritmo/commit/8bdd1bf86232dd69cbb18278045a10acc33966b3))

# [0.52.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.51.0...v0.52.0) (2026-07-15)


### Features

* **planner:** per-taak diepwerk-tag ([2e958b1](https://github.com/Studio-Lek-River/Ritmo/commit/2e958b17ffdac9fa5cf06f91bfa3fa62180df59e))
* **planner:** planDay leest energie/diepwerk/rust ([9c6e600](https://github.com/Studio-Lek-River/Ritmo/commit/9c6e6002c51868a02ebd7015ed3b3460f6909539))
* **planner:** planPrefs afstem-voorkeuren in settings ([f84d9b4](https://github.com/Studio-Lek-River/Ritmo/commit/f84d9b422d5ace65f41b817d233b6e7cc8cfafd0))
* **planner:** Voorkeuren-tab + paneel in suite ([dd5cd30](https://github.com/Studio-Lek-River/Ritmo/commit/dd5cd305b2deae9e5bcf04b9037ebb906bd7e74d))

# [0.51.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.50.0...v0.51.0) (2026-07-15)


### Features

* **planner:** deel-mijn-dag knop + voorstel/concept/direct blokken ([4c0d799](https://github.com/Studio-Lek-River/Ritmo/commit/4c0d7991fa9568d8aa78bcb6e0a7f9be92a6d0ce))
* **planner:** drie standen als instelling (planMode) ([d5db11a](https://github.com/Studio-Lek-River/Ritmo/commit/d5db11a8623c6817768182ffcc8c6bbbe7ab218d))
* **planner:** heuristische dag-indeler planDay.js ([6f13b2a](https://github.com/Studio-Lek-River/Ritmo/commit/6f13b2a2078416d9ee808191819d792323a47f3b))

# [0.50.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.49.0...v0.50.0) (2026-07-15)


### Features

* **bodymap:** precieze vrije plaatsing van prikken op het silhouet ([9a6f7df](https://github.com/Studio-Lek-River/Ritmo/commit/9a6f7df46b19d542e3a65d751aa41c4d9dc8d696))

# [0.49.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.48.0...v0.49.0) (2026-07-15)


### Features

* **planner:** planning-metadata (duration/window/autoPlan) op taken-bronnen ([d91c16f](https://github.com/Studio-Lek-River/Ritmo/commit/d91c16f318c2e1daf2b583b9fe14b39fbc6dabba))
* **planner:** vrije blokken als project-subgoal-reservering ([f3d6d92](https://github.com/Studio-Lek-River/Ritmo/commit/f3d6d92191890d568b79522f122bbdea09a29e4f))

# [0.48.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.47.0...v0.48.0) (2026-07-15)


### Bug Fixes

* **planner:** expliciete i18n-keys voor Dag/Week-toggle in WeekView ([6bcbb5f](https://github.com/Studio-Lek-River/Ritmo/commit/6bcbb5f306aedbe23d48a95e5d232b60f4c7043a))
* **planner:** TaskPoolPanel accepteert drop om tijd te wissen ([93c86c8](https://github.com/Studio-Lek-River/Ritmo/commit/93c86c8249cc95f8531f1f8236e78dedb0f09ec8))


### Features

* **planner:** weekrooster met takenpool, legenda en cross-day-slepen (S03) ([a7aab0b](https://github.com/Studio-Lek-River/Ritmo/commit/a7aab0b7a06625f1a28ad1da238a30fd935ca0c6))

# [0.47.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.46.0...v0.47.0) (2026-07-15)


### Bug Fixes

* **db:** sluit named-role EXECUTE-lek, verklein connections-grant, fix NULL-unique ([d7f4bc3](https://github.com/Studio-Lek-River/Ritmo/commit/d7f4bc3c71e38aece0cb2711e6eaad684943e95d))


### Features

* **api:** connections disconnect-endpoint en connect-stub (S02) ([acafe16](https://github.com/Studio-Lek-River/Ritmo/commit/acafe16630117437e07bc646c7a54421ae2f7402))
* **connections:** Koppelingen-UI met verbind/verbreek en status (S02) ([e8d460e](https://github.com/Studio-Lek-River/Ritmo/commit/e8d460e7fa163ea2a8cde6a6498cc5feb31486d3))
* **db:** connections-tabel met RLS en Vault-only tokens (S02) ([bc3508f](https://github.com/Studio-Lek-River/Ritmo/commit/bc3508f3430ead293d75e86397f8690ac5f6d383))
* **items:** genormaliseerd items-model over tasks/projects-modules (S02) ([6cc2e74](https://github.com/Studio-Lek-River/Ritmo/commit/6cc2e74619294fbe118245ca3fe155a198ff6a0b))

# [0.46.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.45.0...v0.46.0) (2026-07-13)


### Features

* **bodymap:** breid buik uit naar 3x3 raster met middenkolom ([1b901d4](https://github.com/Studio-Lek-River/Ritmo/commit/1b901d48cca9009be79515eb025c420774f38ad3))

# [0.45.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.44.0...v0.45.0) (2026-07-13)


### Features

* **ui:** accent-helpers in theme + shell/planner/kanban naar accent ([bffed26](https://github.com/Studio-Lek-River/Ritmo/commit/bffed268a44a95c54f5b4c4f2569e5dd12652b37))
* **ui:** Monday-tokenset en accent-token in index.css ([4b20d28](https://github.com/Studio-Lek-River/Ritmo/commit/4b20d285607b94318b5e9e002338b53deb9df571))

# [0.44.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.43.0...v0.44.0) (2026-07-13)


### Features

* **build:** expose app version to runtime via __APP_VERSION__ define ([d6cfd67](https://github.com/Studio-Lek-River/Ritmo/commit/d6cfd67395ac490ff59075d30aa243e5ceb3701c))
* **ui:** toon versienummer op splash en in help ([a55ef04](https://github.com/Studio-Lek-River/Ritmo/commit/a55ef04b758f9d8413d6dbf84c15573e73f9c6c4))

# [0.43.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.42.0...v0.43.0) (2026-07-13)


### Features

* **health:** calorieen-teller en health-modus toggle voor tellers ([691705c](https://github.com/Studio-Lek-River/Ritmo/commit/691705c81ea6fcb1da5ee2d1415099bbf2f2a267))
* **household:** afvinkbaar weekmenu per dag ([4a096de](https://github.com/Studio-Lek-River/Ritmo/commit/4a096dec5c5c6f81ea2ddd6ed386254c605b484c))

# [0.42.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.41.0...v0.42.0) (2026-07-13)


### Features

* **sync:** synchroniseer household-modules via user_data ([5f41815](https://github.com/Studio-Lek-River/Ritmo/commit/5f41815cd203388f693c14ec601a7ddd73454594))

# [0.41.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.40.0...v0.41.0) (2026-07-13)


### Bug Fixes

* **medication:** wrap dagrooster-doses voorbij middernacht met morgen-markering ([5d8a398](https://github.com/Studio-Lek-River/Ritmo/commit/5d8a3985238d281b90ece9613842b7731c66d33b))


### Features

* **medication:** dagrooster-invoer in het medicijnformulier en Vandaag-kaart ([fab9d18](https://github.com/Studio-Lek-River/Ritmo/commit/fab9d18361d211967068c3b918b4dcb1be9e7723))
* **medication:** dagrooster-velden en schedule-helpers ([aa985a8](https://github.com/Studio-Lek-River/Ritmo/commit/aa985a82b0fdca0481022bf1eebf64da70deb71b))
* **medication:** logMedIntake-handler met undo, doorgegeven aan Today/Health ([5749f05](https://github.com/Studio-Lek-River/Ritmo/commit/5749f059f9ccb81929dc2e0c84be244227439127))
* **medication:** toon dagrooster-kaart bovenaan Vandaag en Gezondheid ([38c8935](https://github.com/Studio-Lek-River/Ritmo/commit/38c8935157724a2a1cf4b58312fcd9646f97af0d))

# [0.40.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.39.2...v0.40.0) (2026-07-12)


### Bug Fixes

* **bodymap:** migreer oude buikprikken niet-destructief naar middenrij ([4ff5601](https://github.com/Studio-Lek-River/Ritmo/commit/4ff56017957effb6561993cc099cc047d6d199de))


### Features

* **bodymap:** breid buikzones uit naar 3x2-raster ([848b86d](https://github.com/Studio-Lek-River/Ritmo/commit/848b86dcf82cbfa8647e07bcd8832a1a5613054c))
* **bodymap:** toon zes buikstippen op het silhouet ([388bd6f](https://github.com/Studio-Lek-River/Ritmo/commit/388bd6f9aa8ba382441a9566368813c1e2a74a18))

## [0.39.2](https://github.com/Studio-Lek-River/Ritmo/compare/v0.39.1...v0.39.2) (2026-07-12)


### Bug Fixes

* **feedback:** toon specifieke, vertaalde foutmelding bij mislukte issue-aanmaak ([4fea4b9](https://github.com/Studio-Lek-River/Ritmo/commit/4fea4b985f8fa6dea01b9eb9010c80e0755d5864))

## [0.39.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.39.0...v0.39.1) (2026-07-10)


### Bug Fixes

* **settings:** herstel crash bij openen instellingen door ontbrekende switchToStandard-prop ([184a60a](https://github.com/Studio-Lek-River/Ritmo/commit/184a60af00fb7dc1655fb830a84a4519d554838e))

# [0.39.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.38.0...v0.39.0) (2026-07-10)


### Bug Fixes

* **productivity:** toon in de Planner alleen taken en projecten ([e4133eb](https://github.com/Studio-Lek-River/Ritmo/commit/e4133eb78d18725050011385bfb50db1a2efad80))


### Features

* **health:** terugschakelen naar Standaard vult de standaard-modules aan ([05b38b1](https://github.com/Studio-Lek-River/Ritmo/commit/05b38b1ac590b1bd8ac2a83cd0a7380f888cf326))
* **productivity:** maak vanuit de Planner een taak of projectdoel als kaart aan ([16eb0b8](https://github.com/Studio-Lek-River/Ritmo/commit/16eb0b85cd8dc7119802e49b52ea99287f8b7329))

# [0.38.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.37.0...v0.38.0) (2026-07-09)


### Features

* **i18n:** Nederlandse naam Planner en labels voor de Planner-weergave ([58dbddf](https://github.com/Studio-Lek-River/Ritmo/commit/58dbddf605c075631807a1f068403843c01c543b))
* **productivity:** gedeelde takenlijst met toevoeg-veld in de Planner ([6ad8109](https://github.com/Studio-Lek-River/Ritmo/commit/6ad810972d377a3d4797de92839b36e640fef3b6))
* **productivity:** toon de dag als agenda per uur ([7f6b415](https://github.com/Studio-Lek-River/Ritmo/commit/7f6b415ed58cbfa9724f6785bc80f192bc161ef9))
* **productivity:** toon Kanban altijd met drie kolommen en kaart-toevoegen ([92a49b4](https://github.com/Studio-Lek-River/Ritmo/commit/92a49b40b325edb961b6afb4f29b49c438eeb0e6))

# [0.37.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.36.0...v0.37.0) (2026-07-09)


### Bug Fixes

* **productivity:** force Dag-view to always reflect today's date ([f3c612d](https://github.com/Studio-Lek-River/Ritmo/commit/f3c612d3d1d18c0a6eb42aec4d0def90774d7bc6))
* **productivity:** remove dead showSettingsBtn constant in checklist editor ([1331ae1](https://github.com/Studio-Lek-River/Ritmo/commit/1331ae1a6629fcfd7f0021d872786b3a85cbccf1))
* **theme:** laat r-chip padding niet overschrijven door px-2/py-0.5 ([e7d69fb](https://github.com/Studio-Lek-River/Ritmo/commit/e7d69fb19f0b5beb50e0013328a6abdaa961d1bf))


### Features

* **desktop:** zijmenu vervangen door horizontale topbalk ([05712af](https://github.com/Studio-Lek-River/Ritmo/commit/05712af610de2e1b1c9ca29d391e6d1d8fe5ecb3))
* **productivity:** add dayTimeline aggregation helper and i18n keys ([3901a3c](https://github.com/Studio-Lek-River/Ritmo/commit/3901a3cf6e51f79965145475a9e7d69b1dcb5516))
* **productivity:** add Kanban-view with drag-and-drop and move buttons ([7fcfa3d](https://github.com/Studio-Lek-River/Ritmo/commit/7fcfa3def8118a613faefe9db09e3dba46b5e657))
* **productivity:** add optional status field handlers for tasks and project subgoals ([9c78843](https://github.com/Studio-Lek-River/Ritmo/commit/9c7884391d84ec7e6fa3bb2f996d39e4bc8505f8))
* **productivity:** add optional tijd-veld op taken, routines en projecttaken ([8229b47](https://github.com/Studio-Lek-River/Ritmo/commit/8229b47b0377da6e4b2924a8745967b525995702))
* **productivity:** add Productivity Suite nav entry and routing ([05157d6](https://github.com/Studio-Lek-River/Ritmo/commit/05157d60cbdabf3e9f808e9ff958a5e106a27a7d))
* **productivity:** add ProductivitySuiteView workspace and DagView ([8713158](https://github.com/Studio-Lek-River/Ritmo/commit/871315888f3eab4702a11825e03d5e31a8a40c57))
* **productivity:** add taskBoard aggregation helper for the Kanban view ([e010c43](https://github.com/Studio-Lek-River/Ritmo/commit/e010c434492b7292528dabf0ed954da3794cb750))
* **productivity:** wire projecttaak toggle into the Dag-view ([10231e1](https://github.com/Studio-Lek-River/Ritmo/commit/10231e17b1e034b4e3822f133a071109203ef234))
* **settings:** kies weergavestijl Strak, Levendig of Compact ([014ffcc](https://github.com/Studio-Lek-River/Ritmo/commit/014ffcc35ecd300b4eb3029011a3f8fd15e58bec))
* **theme:** pas dichtheid/hoek-tokens en per-skin status-chips toe op gedeelde oppervlakken ([8566f10](https://github.com/Studio-Lek-River/Ritmo/commit/8566f10b7f25e8e1c22a4d701012eb5376aca6ff))
* **theme:** radius- en dichtheid-tokens per weergavestijl ([e45d3f9](https://github.com/Studio-Lek-River/Ritmo/commit/e45d3f9d5dcb9e913a092810d91af9689132f216))

# [0.36.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.35.0...v0.36.0) (2026-07-09)


### Bug Fixes

* houd gezondheids-rondleiding beperkt tot geldige health-context ([e7afa81](https://github.com/Studio-Lek-River/Ritmo/commit/e7afa81e4d903ea650a7aab013775b4202e071b4))


### Features

* leer in de gezondheids-rondleiding hoe je onderdelen toevoegt, wijzigt en verwijdert ([7ec3727](https://github.com/Studio-Lek-River/Ritmo/commit/7ec3727efb87232b3abc903064bd507da88a7389))
* maak de rondleiding beter vindbaar en bruikbaar ([ac1c71e](https://github.com/Studio-Lek-River/Ritmo/commit/ac1c71ecfb23d3278c6dfd4b19840a4691ea6a62))
* sluit de gezondheids-rondleiding af met wegwijzers naar overzicht en huishouden ([bb5b470](https://github.com/Studio-Lek-River/Ritmo/commit/bb5b470e48fde7532205ef9e2f0d140ee1511562))
* toon voorbeeldgrafiek en uitleg voor metrieken in de gezondheids-rondleiding ([d7d2807](https://github.com/Studio-Lek-River/Ritmo/commit/d7d2807ac6398ef0df3a543f7d1d279e830551f7))
* voeg gezondheids-rondleiding toe die de basis van gezondheidsmodus stap voor stap instelt ([37358a8](https://github.com/Studio-Lek-River/Ritmo/commit/37358a8e133103355a2dfcf983f8c5d18902faae))
* voeg metingen-presets Health metrics en Weight Loss samen tot een ([59a6708](https://github.com/Studio-Lek-River/Ritmo/commit/59a670867a55c032209700634953fac857845396))

# [0.35.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.34.0...v0.35.0) (2026-07-09)


### Features

* herorden navigatie en hernoem Vandaag naar Taken ([7b8315a](https://github.com/Studio-Lek-River/Ritmo/commit/7b8315ade137d14c58cbceb1dac2f80624f8edf6))
* verwijder Reflectie volledig uit app en instellingen ([cf30943](https://github.com/Studio-Lek-River/Ritmo/commit/cf3094318f4a412f2fdc361f53b8f6a1b7b89058))
* verwijder Week- en Maand-weergaven uit navigatie en app ([4dc893e](https://github.com/Studio-Lek-River/Ritmo/commit/4dc893e2befc20c9c8c4ec32df9d600eefd7560d))

# [0.34.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.33.0...v0.34.0) (2026-07-09)


### Features

* **health:** toon bijwerkingen per item in week- en maandgrafiek ([0d4eab0](https://github.com/Studio-Lek-River/Ritmo/commit/0d4eab083d3a05628c6f371f60cf22949af1dd6f))
* **health:** vervang dag-tracker door logkaart in gezondheidsmodus ([9ffea90](https://github.com/Studio-Lek-River/Ritmo/commit/9ffea90b7b586ffa7104b132ed452800613f1f05))
* **layout:** aparte desktop systeem-layout met sidebar naast mobiele view ([cc30c0a](https://github.com/Studio-Lek-River/Ritmo/commit/cc30c0a8c8d3239d523e5d906239c68bdc34e57c))
* **layout:** baseer desktop-layout op platform i.p.v. vensterbreedte ([2af4da6](https://github.com/Studio-Lek-River/Ritmo/commit/2af4da6cde293390b08e7baf78eeb71048630a97))
* **layout:** voeg useIsDesktop-hook en isDesktop-context toe ([3e983c6](https://github.com/Studio-Lek-River/Ritmo/commit/3e983c65af50f9fe3ec7d125ccef5f49b694ebc8))

# [0.33.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.32.0...v0.33.0) (2026-07-09)


### Bug Fixes

* **onboarding:** behoud nameKey op health-modules voor taal-reactiviteit ([59ca87e](https://github.com/Studio-Lek-River/Ritmo/commit/59ca87ee62e4059773479f31afa952ba12d4ba74))


### Features

* **onboarding:** voeg Ritmo Health startprofiel toe aan onboarding ([9f12aef](https://github.com/Studio-Lek-River/Ritmo/commit/9f12aefde392b77656f2984d7347f132960d11d7))

# [0.32.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.31.0...v0.32.0) (2026-07-09)


### Features

* **bodymap:** herontwerp priklocatie met lichaamssilhouet en heat-stippen ([0d6ab68](https://github.com/Studio-Lek-River/Ritmo/commit/0d6ab687ec4108ea046f09de0e7ccf657bfd6579))
* **bodymap:** tel prikken per zone binnen instelbaar venster ([f30d9a6](https://github.com/Studio-Lek-River/Ritmo/commit/f30d9a68a8dc475e8d455fd79994c2e857489665))

# [0.31.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.30.0...v0.31.0) (2026-07-09)


### Features

* **health:** combineer Health- en Today-tab in health mode ([b825d68](https://github.com/Studio-Lek-River/Ritmo/commit/b825d6824774910dcb9a4f7c9d53752350de6fa5))
* **health:** toon Weight Loss met hart-icoon in roze ([91f3a3f](https://github.com/Studio-Lek-River/Ritmo/commit/91f3a3fc46fff5d125d3e83820fc718ee4021b9c))
* **health:** voeg priklocatie en prikschema toe aan Weight Loss-setup ([dfe9734](https://github.com/Studio-Lek-River/Ritmo/commit/dfe9734e434748a5f9399cd92f9038e2d9dda13c))

# [0.30.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.29.0...v0.30.0) (2026-07-09)


### Features

* **modules:** vul prikschema en bodymap direct in bij aanmaken ([4dc6e49](https://github.com/Studio-Lek-River/Ritmo/commit/4dc6e49bf19cfd9009fcdebe4eb3974ed8f8fae8))

# [0.29.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.28.0...v0.29.0) (2026-07-09)


### Bug Fixes

* **household:** voorkom dataverlies bij weekmenu-plak-flow ([4dd854b](https://github.com/Studio-Lek-River/Ritmo/commit/4dd854bbef5da93266eb440fe09e785a1493dd0d))


### Features

* **household:** laat huishoud-secties verbergen en sorteren ([061017d](https://github.com/Studio-Lek-River/Ritmo/commit/061017dde533e81ae0a60187d1c3ec9b8057d43b))
* **household:** vervang Mee-eten-tracker door weekdag-weekmenu ([ba44e33](https://github.com/Studio-Lek-River/Ritmo/commit/ba44e3342c6b5887645e6fcdb8599fe4eba9f7b3))

# [0.28.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.27.0...v0.28.0) (2026-07-08)


### Features

* **health:** add Weight Loss setup and prikschema module type ([e92cbd6](https://github.com/Studio-Lek-River/Ritmo/commit/e92cbd6e43f70b56f3f6c1b4954a2347c9ac0049))
* **modules:** add first medicine inline when creating a medication module ([08d04fa](https://github.com/Studio-Lek-River/Ritmo/commit/08d04fac29598565ac353c5dbfaa1cd9bd1eeabd))

# [0.27.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.26.0...v0.27.0) (2026-07-08)


### Bug Fixes

* **settings:** verhelp crash bij openen Instellingen (openBlankModuleEditor buiten scope in SettingsModal) ([0051058](https://github.com/Studio-Lek-River/Ritmo/commit/0051058d0a78562d9ef9e6b19f562935059be666))


### Features

* **health:** health-module helper + health-vlag op beweging/bijwerkingen-presets ([f3148f5](https://github.com/Studio-Lek-River/Ritmo/commit/f3148f5e47a94606ace64634213c10a3645241ea))
* **health:** houd Huishouden-tab beschikbaar in Health-modus ([f2688f2](https://github.com/Studio-Lek-River/Ritmo/commit/f2688f2bd96e744250aa873ba8fa42572e3acb8e))
* **health:** menubalk en modulefilter schakelen op appMode ([89d8bdd](https://github.com/Studio-Lek-River/Ritmo/commit/89d8bdde97ddd00bd8fe9dc874d368718d156702))
* **settings:** Health/Standaard-schakelaar in instellingen ([6419da2](https://github.com/Studio-Lek-River/Ritmo/commit/6419da27a89bae6a87e9ea1373ca869ad1d1e963))
* **settings:** persistente appMode-instelling (standard/health) ([6d1ad50](https://github.com/Studio-Lek-River/Ritmo/commit/6d1ad50100ba5e4fa3b2c0f7f5e9e7d77b147392))

# [0.26.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.25.0...v0.26.0) (2026-07-08)


### Features

* **insight:** dot-matrix helper + bijwerkingen-heatmap + i18n ([0a66dc6](https://github.com/Studio-Lek-River/Ritmo/commit/0a66dc6db3ebfca0b7d7a4959d98928388d944dc))
* **insight:** staafgrafiek vervangt lijngrafiek in beweging-trends ([4099647](https://github.com/Studio-Lek-River/Ritmo/commit/4099647067f64c4c4558165b8b13c90eb6c115af))

# [0.25.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.24.0...v0.25.0) (2026-07-08)


### Bug Fixes

* **presets:** gebruik palet-kleur 'red' voor Bijwerkingen-preset i.p.v. legacy 'rose' ([1b58101](https://github.com/Studio-Lek-River/Ritmo/commit/1b58101e3277c7520bc050bc4b7f0c5970f73135))


### Features

* **presets:** voeg Beweging-health-preset (counter, minuten + categorieen) toe ([f520332](https://github.com/Studio-Lek-River/Ritmo/commit/f520332e84315899bfeb2173aea0f134de90dd50))
* **presets:** voeg Bijwerkingen-health-preset (checklist, dagelijkse bijwerkingen) toe ([02ffdf4](https://github.com/Studio-Lek-River/Ritmo/commit/02ffdf45e027e4ad6c0ae4167226857b22170ea1))

# [0.24.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.23.0...v0.24.0) (2026-07-08)


### Bug Fixes

* **modules:** verhelp metricLibraryOpen-crash in module-editor ([35a7c33](https://github.com/Studio-Lek-River/Ritmo/commit/35a7c3358da4648ffa52462c54013c02d6f8f161))


### Features

* **health:** één Gezondheid-tab met alle gezondheidsmodules ([97fa710](https://github.com/Studio-Lek-River/Ritmo/commit/97fa710fd1bed66b45729382a23ba8b5eb1d7a0b))

# [0.23.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.22.0...v0.23.0) (2026-07-08)


### Features

* **bodymap:** add bodymap module type with view and mutators ([3f591f0](https://github.com/Studio-Lek-River/Ritmo/commit/3f591f03d91c0fd59e304b11f2a96b163c57750e))
* **bodymap:** add injection utility and type-plumbing ([ae24061](https://github.com/Studio-Lek-River/Ritmo/commit/ae240611e61b4b62b091e6165c37e79136fe4d2d))

# [0.22.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.21.0...v0.22.0) (2026-07-08)


### Features

* **health:** add medication module type with view and mutators ([58da059](https://github.com/Studio-Lek-River/Ritmo/commit/58da05993c9b1e984f4ab3c4481fa027f8103718))
* **health:** add medication utility and type-plumbing ([40c89e3](https://github.com/Studio-Lek-River/Ritmo/commit/40c89e373f97aa45bacc6cfb7e4a57555f78ea4f))
* **medication:** laat besteld-hoeveelheid via invoerveld kiezen ([4ae04af](https://github.com/Studio-Lek-River/Ritmo/commit/4ae04af558803a21639133b71c47449c20b3bc23))
* **medication:** voeg vrij frequentie-interval naast presets toe ([19cb3b3](https://github.com/Studio-Lek-River/Ritmo/commit/19cb3b3d96f736da6d6d2469817f2c5bfd609ccb))

# [0.21.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.20.0...v0.21.0) (2026-07-08)


### Bug Fixes

* **errors:** ErrorBoundary volgt in-app darkMode i.p.v. OS-thema ([4ee5f13](https://github.com/Studio-Lek-River/Ritmo/commit/4ee5f130beeee364bf7696b818c1066d92aba514))
* **measurements:** guard null-metric ook in insight-kaart ([ec17205](https://github.com/Studio-Lek-River/Ritmo/commit/ec17205b258f9c05c9278067ce0ca99a52d94f5d))
* **measurements:** voorkom wit scherm bij null-metric in editor en detailweergave ([cbe84e9](https://github.com/Studio-Lek-River/Ritmo/commit/cbe84e9bd447dc3f7e84a821cc3a5b60ac7ce7ed))


### Features

* **errors:** voeg ErrorBoundary toe rond app en view-switch ([b7fd656](https://github.com/Studio-Lek-River/Ritmo/commit/b7fd6562531e048286168c33bc9554182b7933d3))

# [0.20.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.19.1...v0.20.0) (2026-07-08)


### Features

* **auth:** verwijder huishoud-sharing uit accountpaneel en app-wiring ([932788b](https://github.com/Studio-Lek-River/Ritmo/commit/932788b531790f0d56f610568892b4b9d8587e8c))
* **household:** verwijder belofte over toekomstig uitnodigen uit maaltijdplan ([4e77332](https://github.com/Studio-Lek-River/Ritmo/commit/4e77332268980bf6260e7a890a9019e8365c641f))
* **household:** verwijder deel-functionaliteit uit de Huishouden-tab ([938fdd2](https://github.com/Studio-Lek-River/Ritmo/commit/938fdd229536071f9a6d83c4165c62076e51f6ed))

## [0.19.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.19.0...v0.19.1) (2026-07-08)


### Bug Fixes

* **households:** race-safe token-inwisseling in redeem_invite ([1482596](https://github.com/Studio-Lek-River/Ritmo/commit/1482596564b12d176a887ae8f069818e2585625f))
* **households:** sluit invite-RLS-gat via redeem_invite RPC (B1) ([9309c01](https://github.com/Studio-Lek-River/Ritmo/commit/9309c01f9211352de45a1805988cbe6e13408ffc))
* **households:** trek EXECUTE op redeem_invite in voor anon ([112d03f](https://github.com/Studio-Lek-River/Ritmo/commit/112d03fa1ae7f6819b290b4f4380a3f77e654580))

# [0.19.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.18.0...v0.19.0) (2026-06-23)


### Features

* **backup:** household-keys mee in export/import ([29fbf31](https://github.com/Studio-Lek-River/Ritmo/commit/29fbf31c3dc8c8fe3b1bd0d4a77a1b6b46392b42))
* **chart:** optionele formatValue- en series-props op LineChart ([21ddd7c](https://github.com/Studio-Lek-River/Ritmo/commit/21ddd7cc6525519d3bdd5425071f694017b48b1a))
* **household:** Aandelen-sectie met totaal- en per-aandeel-modus ([badcb53](https://github.com/Studio-Lek-River/Ritmo/commit/badcb53e457bd1aa6f097e454838d6ae7308bdbf))
* **i18n:** household.investments labels (nl/en) ([f8853b1](https://github.com/Studio-Lek-River/Ritmo/commit/f8853b124bd842dd0c628039d72ecb380d76faa2))
* **investments:** pure helpers voor aandelenreeks en forward-fill ([d7c369e](https://github.com/Studio-Lek-River/Ritmo/commit/d7c369e197308551b998da2fd89fe6c24c09b0fd))

# [0.18.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.17.1...v0.18.0) (2026-06-04)


### Features

* **app:** acht-weergave kiezer in counter-editor, losgekoppeld van unit ([9e51767](https://github.com/Studio-Lek-River/Ritmo/commit/9e5176770c0e5a0ff3bf8cfbde1bf62157688105))
* **counter:** CounterDisplay-component met acht weergaves, gewired in counter-module ([6768186](https://github.com/Studio-Lek-River/Ritmo/commit/67681867d27a4b056d3858b298c80e8673e03603))
* **glass:** fles- en druppelvorm in LiquidGlass ([fc0f189](https://github.com/Studio-Lek-River/Ritmo/commit/fc0f189c1b213f0eea9084270671e80b2caef453))
* **i18n:** weergave-labels (fles, druppel, plant, ring, meter, segmenten); glasvorm-strings vervallen ([dcc9b6b](https://github.com/Studio-Lek-River/Ritmo/commit/dcc9b6b2cfe8617793db96eb65b27aaadaaea4ca))

## [0.17.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.17.0...v0.17.1) (2026-06-03)


### Bug Fixes

* **settings:** tabbalk in twee rijen zodat account binnen overlay blijft ([4310719](https://github.com/Studio-Lek-River/Ritmo/commit/43107192194af8dafa4387f1d5e08469cd8d648d))

# [0.17.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.16.0...v0.17.0) (2026-06-02)


### Features

* **app:** weergave- en glasvorm-keuze in counter-editor ([4f1fd35](https://github.com/Studio-Lek-River/Ritmo/commit/4f1fd35beee8f9fca6031109da0b0923efec52e3))
* **colors:** glassFill light-tint helper voor glas-weergave ([e71d551](https://github.com/Studio-Lek-River/Ritmo/commit/e71d551347ac693e4f34877290bad513c4f63a0f))
* **counter:** optionele glas-weergave en doel-badge in counter-module ([f0bbf28](https://github.com/Studio-Lek-River/Ritmo/commit/f0bbf28f6bea3c0d2953414bad48a2e0bb8e21be))
* **glass:** LiquidGlass component met golfanimatie en glasvormen ([18de5dc](https://github.com/Studio-Lek-River/Ritmo/commit/18de5dc36496fb0e693d8862c73abc496e8d73e0))
* **i18n:** glas-weergave strings (nl/en) ([ad65a78](https://github.com/Studio-Lek-River/Ritmo/commit/ad65a78147d62eca26f993805ea95f7a57a61fa8))

# [0.16.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.15.0...v0.16.0) (2026-06-02)


### Features

* **app:** Account-tab met zichtbare sync-status ([9fccceb](https://github.com/Studio-Lek-River/Ritmo/commit/9fcccebbc745a2b7d2ef7869010a9782f1c63342))
* **i18n:** sync.status + settings.tabAccount strings (nl/en) ([f571a9c](https://github.com/Studio-Lek-River/Ritmo/commit/f571a9ce8db35827bfb4ea305e03116cec0c82c8))
* **sync:** observable sync-status laag + useSyncStatus hook ([2e08983](https://github.com/Studio-Lek-River/Ritmo/commit/2e08983b292933a1e5ef5239b4b6ee7167248021))
* **sync:** voed sync-status vanuit flushQueue en userData-functies ([e06a772](https://github.com/Studio-Lek-River/Ritmo/commit/e06a7720f356e0f0c1d6f121308bf5eaf31e7d93))

# [0.15.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.14.0...v0.15.0) (2026-05-28)


### Features

* **app:** pull user data on login with conflict resolution ([b95e675](https://github.com/Studio-Lek-River/Ritmo/commit/b95e6757f8a3248f3cd15c0e1b687a6274da8e3e))
* **i18n:** add sync conflict strings ([475aadd](https://github.com/Studio-Lek-River/Ritmo/commit/475aadd9c61b3562f4d29041d5421bb89a61c74e))
* **storage:** delegate settings and day:* keys to userDataStorage ([802700b](https://github.com/Studio-Lek-River/Ritmo/commit/802700bd0b71da592b94da2e17dea2cc78dccd42))
* **sync:** add userDataStorage module with push/pull/delete ([cd9db07](https://github.com/Studio-Lek-River/Ritmo/commit/cd9db07df87d399ea38de21db0ee6d7616eea615))
* **sync:** generalize flushQueue for per-item onConflict and delete op ([7e84ae0](https://github.com/Studio-Lek-River/Ritmo/commit/7e84ae0db0c2d32c07f6b1396ca75830a59717f0))
* **sync:** SyncConflictDialog component ([992acc7](https://github.com/Studio-Lek-River/Ritmo/commit/992acc76cc6ed2c9f64b4f2961f3f772b7157d45))

# [0.14.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.13.0...v0.14.0) (2026-05-26)


### Features

* **auth:** add AuthSection orchestrator with reset-flow detection ([1a3d891](https://github.com/Studio-Lek-River/Ritmo/commit/1a3d89158877664faddefe66ae2264b8eb6205ff))
* **auth:** add ChangePasswordForm for signed-in users ([060c357](https://github.com/Studio-Lek-River/Ritmo/commit/060c3579a1d725a9411743e5cce1e90544e1cf59))
* **auth:** add email verification and mail-sent notices ([bc5ab76](https://github.com/Studio-Lek-River/Ritmo/commit/bc5ab7692eab30873c9554515ac0632b94ab5cd4))
* **auth:** add forgot/reset password flow components ([57a03e5](https://github.com/Studio-Lek-River/Ritmo/commit/57a03e525b870a14ddcb7c9d7d71459f31abf6ed))
* **auth:** add magic link form ([87de363](https://github.com/Studio-Lek-River/Ritmo/commit/87de3634829b609f512e1d210817f5926074399e))
* **auth:** add password prompt for magic-link users ([7944c43](https://github.com/Studio-Lek-River/Ritmo/commit/7944c4362f3269793eafe4b9230b3e2856ca12ff))
* **auth:** add password validation and error translation helpers ([2364148](https://github.com/Studio-Lek-River/Ritmo/commit/23641488f0dcc5b7254babe396c802701c7cfbd7))
* **auth:** add PasswordRequirements component ([e8f760c](https://github.com/Studio-Lek-River/Ritmo/commit/e8f760cea6a96e932bfebd0d499267e798b36521))
* **auth:** add SignedInPanel with household list and sign-out ([32d0de1](https://github.com/Studio-Lek-River/Ritmo/commit/32d0de1e1a2d9b0d8a0537c7a56ac83947c60311))
* **auth:** add SignInForm and SignUpForm components ([0dac94c](https://github.com/Studio-Lek-River/Ritmo/commit/0dac94c9ef1aa901ead154e0d3247ff73f3bc7dc))
* **i18n:** add auth keys for password-based auth UI ([fd558e0](https://github.com/Studio-Lek-River/Ritmo/commit/fd558e0a212e166828d4345e24b7a973fab7eb39))
* **settings:** integrate AuthSection in install tab ([388b258](https://github.com/Studio-Lek-River/Ritmo/commit/388b258ee521c9cb5f3fc0cdcdecd01b8669f394))
* **sync:** add password auth functions to sync/auth ([de8ed5d](https://github.com/Studio-Lek-River/Ritmo/commit/de8ed5d946b5e8897140869f9fe8dd9278c44eec))

# [0.13.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.12.0...v0.13.0) (2026-05-20)


### Bug Fixes

* **animation:** restore cow-drink-milk Lottie JSON and enforce min display time in CelebrationOverlay ([2390ca9](https://github.com/Studio-Lek-River/Ritmo/commit/2390ca97149b9ebe5e316e9e8f871f6182f68824))
* **insights:** read selectedOption instead of selected in aggregateChoice ([8c25b10](https://github.com/Studio-Lek-River/Ritmo/commit/8c25b1054bc06fcd53d33450bf1c2cb0cf8ba4ee))
* **streak:** start streak from yesterday when today is incomplete; add sleep streak hint ([99fd792](https://github.com/Studio-Lek-River/Ritmo/commit/99fd7927bd30121b1d959aca128d35a52b0ce28e))
* **today:** exclude measurements modules from Today view enabledModules ([e4c2a3e](https://github.com/Studio-Lek-River/Ritmo/commit/e4c2a3ef30bd85fcf394d7fc3805ced4505dd502))


### Features

* **household:** show sync-disabled explanation when env vars are not configured ([657a7ff](https://github.com/Studio-Lek-River/Ritmo/commit/657a7ff1992fc88f809be00e9f89379dbbc4899f))
* **insight:** exclude collection modules from InsightView ([ba85dfb](https://github.com/Studio-Lek-River/Ritmo/commit/ba85dfb47821aab7b5ecd4635350441f5d866e27))
* **settings:** group modules by type in settings (today / collections / measurements) ([45de9fe](https://github.com/Studio-Lek-River/Ritmo/commit/45de9fe56bc66a38abddfd90f1565ea40bcdf881))
* **sleep:** add goal label and deviation bar to SleepTimeBlock ([f787166](https://github.com/Studio-Lek-River/Ritmo/commit/f7871660dfa74a3946ae56d38aa44882caee05f7))

# [0.12.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.11.0...v0.12.0) (2026-05-19)


### Features

* **i18n:** add share, auth, household sync, and meeeten translation keys ([9db3c91](https://github.com/Studio-Lek-River/Ritmo/commit/9db3c91da41830e7cb7e4076ac06602f6e0954a0))
* **sync:** add AuthModal, InviteModal, ConflictToast, and ShareToggle components ([2e9fcef](https://github.com/Studio-Lek-River/Ritmo/commit/2e9fcefe4c9c318c4c998101d74e905f263c525e))
* **sync:** add households CRUD (create, invite, redeem, leave) ([6fd6af7](https://github.com/Studio-Lek-River/Ritmo/commit/6fd6af73c1ca493ecd0f1ea1685633832bc670c2))
* **sync:** add HouseholdSetupView (start/join household) ([6fe2e61](https://github.com/Studio-Lek-River/Ritmo/commit/6fe2e616f4a9fc30071d3aa17525c71cfe182c29))
* **sync:** add realtime Supabase channel subscription with conflict detection ([242e7e0](https://github.com/Studio-Lek-River/Ritmo/commit/242e7e062fa2e40230f45f29a367fb497ee37340))
* **sync:** add shared mode to MealPlanSection (user ID bridging + cloud writes) ([033eed9](https://github.com/Studio-Lek-River/Ritmo/commit/033eed9256434b14cdc918bfb63236cb52430df8))
* **sync:** add Supabase client singleton, auth helpers, and invite token generator ([428f2c5](https://github.com/Studio-Lek-River/Ritmo/commit/428f2c525a8c9a440cb42e5188299af863988f1c))
* **sync:** add sync queue, household storage backend, and shared-key routing in storage ([c2da5bd](https://github.com/Studio-Lek-River/Ritmo/commit/c2da5bd31f794487fedf46785255aa6701d7b8e9))
* **sync:** integrate auth, household management, and ShareToggle into HouseholdView ([e6bb705](https://github.com/Studio-Lek-River/Ritmo/commit/e6bb705f65fd70ca5e4d3d4f74043a072464d476))
* **sync:** wire auth state, join-route detection, and ConflictToast into App ([289fc94](https://github.com/Studio-Lek-River/Ritmo/commit/289fc945aae750c001c92cdded158b3b0850c23d))

# [0.11.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.10.1...v0.11.0) (2026-05-19)


### Features

* **household:** wire mee-eten sectie into HouseholdView ([db1e11d](https://github.com/Studio-Lek-River/Ritmo/commit/db1e11dbba783d6329981931927f77f029e3c13f))
* **i18n:** add household.mealPlan translations ([d6fcb57](https://github.com/Studio-Lek-River/Ritmo/commit/d6fcb57f24c25ae86ffe9179e42bebe0fa287a6e))
* **mealplan:** add mealplan utility helpers ([a863877](https://github.com/Studio-Lek-River/Ritmo/commit/a863877efd2ea5a000a31464ed38dd648d9c5d47))
* **mealplan:** add MealPlanSection component ([fd20d46](https://github.com/Studio-Lek-River/Ritmo/commit/fd20d46af1a00b204ad392b92e7e9696f3da36e4))
* **mealplan:** add MealPlanSettings modal ([e412664](https://github.com/Studio-Lek-River/Ritmo/commit/e412664e88891d43f7bb0c95e9916256519c4e34))

## [0.10.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.10.0...v0.10.1) (2026-05-18)


### Bug Fixes

* **sleep:** tap op tijd-vakje opent native picker ([02ce03c](https://github.com/Studio-Lek-River/Ritmo/commit/02ce03c676f687c6e844630fba0b566c55d063d8))

# [0.10.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.9.1...v0.10.0) (2026-05-18)


### Features

* **measurements:** add module-preset picker and metric library ([7b7f60e](https://github.com/Studio-Lek-River/Ritmo/commit/7b7f60e9696ff55006d0ceeacde76516914da604))
* **sleep:** redesign sleep module to match counter style ([4afe063](https://github.com/Studio-Lek-River/Ritmo/commit/4afe063bba5a176cfd5821649d5b4709dafbfb92))
* **tabbar:** replace overflow menu with two-row tab layout ([af54f5c](https://github.com/Studio-Lek-River/Ritmo/commit/af54f5c2f7bc4e06e2af89c04604884814f0979a))

## [0.9.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.9.0...v0.9.1) (2026-05-09)


### Bug Fixes

* **modules:** los undefined name op in CounterUI ([feb062e](https://github.com/Studio-Lek-River/Ritmo/commit/feb062eb8b2e784922fb0e7c5c157da059501173))
* **tasks:** herstel rtheme.text typo bij recurring tasks ([08c1894](https://github.com/Studio-Lek-River/Ritmo/commit/08c1894c872739dddbb4d054e5301413a8c80e6b))

# [0.9.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.8.0...v0.9.0) (2026-05-09)


### Features

* **onboarding:** commit selecties naar modules en household-storage ([617c17e](https://github.com/Studio-Lek-River/Ritmo/commit/617c17e5d3fbede3e8542afcfa0db9972dff6351))
* **onboarding:** polish huishouden-stap met i18n custom-namen en lege-state fix ([f9d9976](https://github.com/Studio-Lek-River/Ritmo/commit/f9d9976d860843d8342d3fe27102ed652da86b93))
* **onboarding:** voeg AreaStep toe met drie tabs voor voorbeelden, custom en overslaan ([126fdfb](https://github.com/Studio-Lek-River/Ritmo/commit/126fdfb6419e4067feb3a752954d9fb8b59399ca))
* **onboarding:** voeg OnboardingView shell toe met 6-staps navigatie ([bc94d96](https://github.com/Studio-Lek-River/Ritmo/commit/bc94d9632545e52e55fb9b1d89d903548d369d4d))
* **onboarding:** voeg uitklapbaar item-paneel toe aan preset-cards ([c5865fe](https://github.com/Studio-Lek-River/Ritmo/commit/c5865fe03846627eefce276ded6b8f0bf1a64efb))
* **presets:** voeg HOUSEHOLD_PRESETS toe met chores en staples voor onboarding ([afe31a4](https://github.com/Studio-Lek-River/Ritmo/commit/afe31a40a6674207bea79e8d5bc670b4fe1a58f1))

# [0.8.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.7.0...v0.8.0) (2026-05-09)


### Features

* voeg generieke LineChart-component toe ([d034d22](https://github.com/Studio-Lek-River/Ritmo/commit/d034d222fbb9b54b303dacaf6c118d705218ef22))
* voeg health/bloodpressure/heartrate presets toe voor measurements ([eaed5c8](https://github.com/Studio-Lek-River/Ritmo/commit/eaed5c89514bcfb88bd80ba29786d5ad6d6c188e))
* voeg measurements module-type toe (renderer + detail-view) ([5fa4e33](https://github.com/Studio-Lek-River/Ritmo/commit/5fa4e33dd7111b5cff520dc89cc95eb04b83d6d1))
* voeg measurements toe aan ModuleEditor met inline metric-rijen ([2b18118](https://github.com/Studio-Lek-River/Ritmo/commit/2b181189c808b51a004500285221a00f40879148))
* voeg measurements-helpers en MEASUREMENT_UNITS toe ([95e0b14](https://github.com/Studio-Lek-River/Ritmo/commit/95e0b1474c1ff9fb641433eee64558cadf40a4cb))
* voeg MeasurementsInsightCard toe aan Insights-tab ([611f86d](https://github.com/Studio-Lek-River/Ritmo/commit/611f86df31e79a67740095e1937c7bac016b374a))
* voeg Scale en Ruler iconen toe aan ICON_OPTIONS ([4aa256b](https://github.com/Studio-Lek-River/Ritmo/commit/4aa256b407e7178fb790b8eb7a7b2205c4925445))

# [0.7.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.6.0...v0.7.0) (2026-05-09)


### Features

* **modules:** add celebration field to counter type ([0aba4f5](https://github.com/Studio-Lek-River/Ritmo/commit/0aba4f56b38bea66034ee88b2102a9b301ffe079))
* **modules:** add Lottie celebration overlay for counter goals ([43f4b0d](https://github.com/Studio-Lek-River/Ritmo/commit/43f4b0dc065b0fcebe41f0da704519c8483f30ae))

# [0.6.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.5.0...v0.6.0) (2026-05-08)


### Bug Fixes

* **collection:** hide collection-modules from Today tab ([ad6cc4a](https://github.com/Studio-Lek-River/Ritmo/commit/ad6cc4a8d7ac0221cd641061ad7dfbf5fbf0464f))
* **collection:** keep tag-group editor controls inside card on narrow screens ([40c2d94](https://github.com/Studio-Lek-River/Ritmo/commit/40c2d94025a5e28fd316f5ab6338bb09cdde54f2))
* **collection:** resolve preset tag labels via labelKey in lists and filters ([423f539](https://github.com/Studio-Lek-River/Ritmo/commit/423f539059641299d2f7c093a908f836b13909b7))


### Features

* **collection:** item-modal voor toevoegen en bewerken, vervangt swipe-to-delete ([c3d3d50](https://github.com/Studio-Lek-River/Ritmo/commit/c3d3d5003d6c3193c7c65e5c5a4182abb34ec2dd))

# [0.5.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.4.0...v0.5.0) (2026-05-06)


### Features

* **household:** hervorm budget tot vaste lasten met eenmalige uitgaven en gestuurde duurzaamheid ([f504f7b](https://github.com/Studio-Lek-River/Ritmo/commit/f504f7ba2d5b0ada7bd3cd1dc3e380a89b6543c5))

# [0.4.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.3.0...v0.4.0) (2026-05-05)


### Features

* **budget:** voeg kalender-subview toe met dag-events en netto-saldo ([d01ccd3](https://github.com/Studio-Lek-River/Ritmo/commit/d01ccd39eb0d33fcfee19b8f24f03b10cb3daeb6))
* **household:** visualiseer koppeling tussen budget en duurzaamheid ([403a759](https://github.com/Studio-Lek-River/Ritmo/commit/403a759acc137b865d00fd8930cb9a86d77ce984))
* **month:** voeg module-filter toe aan maandoverzicht ([115de7e](https://github.com/Studio-Lek-River/Ritmo/commit/115de7e49fed755e30dc900d03dbf6d1067388e1))
* **sleep:** laat slaap meedoen in dag-kleur en streak ([74a2065](https://github.com/Studio-Lek-River/Ritmo/commit/74a206582b4d2938c445064a537568a991a53e7a))

# [0.3.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.2.1...v0.3.0) (2026-05-05)


### Features

* **collections:** herontwerp CollectionsView met per-module kaarten ([23adfc2](https://github.com/Studio-Lek-River/Ritmo/commit/23adfc2001a996d30f0ea0a5c77dab3ed8407e3a))
* **collections:** voeg nieuwe i18n-keys toe ([79bbf82](https://github.com/Studio-Lek-River/Ritmo/commit/79bbf82dcc87c99a81c35fa86efb483f6c0220d8))
* **collections:** voeg stats-helpers toe en formatRelativeDate ([8ff2926](https://github.com/Studio-Lek-River/Ritmo/commit/8ff292682c5a9ad09abe351714ef44af3011f215))

## [0.2.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.2.0...v0.2.1) (2026-05-05)


### Bug Fixes

* **modules:** preset-naam overnemen in naamveld bij selectie ([cdf81c7](https://github.com/Studio-Lek-River/Ritmo/commit/cdf81c7a7df7aca90b9237cb18527c30f67c89a9))

# [0.2.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.1.2...v0.2.0) (2026-05-05)


### Features

* **backup:** exporteer en importeer alle data als JSON-bestand ([4633b33](https://github.com/Studio-Lek-River/Ritmo/commit/4633b3397a0a7f2310ea5c92816721ef7701f380))
* **pwa:** voeg install-banner en install-sectie in instellingen toe ([2f0499e](https://github.com/Studio-Lek-River/Ritmo/commit/2f0499e5a6e2f357ce93342b5063f92b61909ed0))
* **storage:** migreer localStorage naar IndexedDB via idb-keyval ([692f8d4](https://github.com/Studio-Lek-River/Ritmo/commit/692f8d439f3e12ed459cc1693d3a7cb2a8942fc4))
* **storage:** vraag persistent storage-permissie aan bij app-start ([b0d810d](https://github.com/Studio-Lek-River/Ritmo/commit/b0d810d7f36397606a83bbf08e1d006a9185824e))

## [0.1.2](https://github.com/Studio-Lek-River/Ritmo/compare/v0.1.1...v0.1.2) (2026-05-05)


### Bug Fixes

* **modules:** toon preset-stap bij aanmaken van collectie ([d865b37](https://github.com/Studio-Lek-River/Ritmo/commit/d865b3769a41e5ef594c308d18b01a019f4f8002))

## [0.1.1](https://github.com/Studio-Lek-River/Ritmo/compare/v0.1.0...v0.1.1) (2026-05-05)


### Bug Fixes

* **ci:** gebruik RELEASE_TOKEN voor semantic-release push-rechten ([c914c2a](https://github.com/Studio-Lek-River/Ritmo/commit/c914c2ab126311521b4e2cfd4e00d7cc2eaee3af))
* **ci:** herstel volledige semantic-release configuratie met git push-back ([1e5b757](https://github.com/Studio-Lek-River/Ritmo/commit/1e5b757a44041574c147da9f0542bb12268f479e))
* **ci:** vereenvoudig semantic-release zonder git push-back ([4e01ca1](https://github.com/Studio-Lek-River/Ritmo/commit/4e01ca16d88409ebe8cf3711d3ad71f243f70d60))

# [0.1.0](https://github.com/Studio-Lek-River/Ritmo/compare/v0.0.0...v0.1.0) (2026-05-05)


### Bug Fixes

* **modules:** zelf-maken-tab gaat direct naar configuratie zonder tussenstap ([e6f374f](https://github.com/Studio-Lek-River/Ritmo/commit/e6f374f889fe24d45ab673e7f68822986a9dd1c0))


### Features

* **collections:** pas item-editor en filter aan voor tag-groepen ([39f0cfd](https://github.com/Studio-Lek-River/Ritmo/commit/39f0cfd326fa40b9159553219d6a5baf29314aec))
* **collections:** vervang CollectionTagsEditor door tag-groepen UI in module-editor ([b942391](https://github.com/Studio-Lek-River/Ritmo/commit/b9423913a4a0c7314522cde2a369da3ef334e786))
* **collections:** voeg Droplets-icoon en wasmiddel-preset toe ([bc3d1b9](https://github.com/Studio-Lek-River/Ritmo/commit/bc3d1b9b8a7cf889a56ff8ee8b5d9807e3738cea))
* **collections:** voeg tagGroups-datamodel toe met migratie en helpers ([a732dde](https://github.com/Studio-Lek-River/Ritmo/commit/a732dde7401f767b212faf39e536ea6302c42ccd))
