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
