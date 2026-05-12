# Features Backlog — Health Mentor

Features pianificate ma non ancora sviluppate. Aggiornare quando una feature viene implementata.

---

## Alta priorità

### 1. Meal Plan Settimanale AI
In base alla fase corrente (bulk/cut), TDEE e macro target, genera un piano pasti per la settimana con lista della spesa.
- **Input**: fase, TDEE, macro target, preferenze alimentari (da aggiungere al profilo)
- **Output**: 7 giorni di pasti con kcal/macro per pasto, lista della spesa aggregata
- **Trigger**: bottone "Genera Piano" nella pagina pasti o nuova pagina dedicata
- **API**: Claude Opus con prompt strutturato + tabella preferenze in Supabase

### 2. Progressione Volume/Intensità Automatica
Job settimanale che traccia se l'utente è in progressive overload e notifica se stagna da più di 2 settimane.
- **Logic**: confronta volume e max weight per esercizio tra le ultime 3 sessioni dello stesso tipo
- **Alert**: se peso o volume non aumentano da 3 sessioni → notifica + suggerimento
- **Dove**: un badge nella sidebar o una card nel dashboard principale

### 3. Targets Giornalieri Visivi
Dashboard con ring/progress bar per proteine, calorie, acqua, passi. Da guardare 5 volte al giorno.
- **Dati necessari**: macro da meals API (già disponibili), acqua (nuovo campo), passi (da WHOOP o manuale)
- **UI**: cerchi animati SVG o progress bar circolari stile Apple Fitness
- **Posizione**: card nella dashboard principale

---

## Media priorità

### 4. Body Measurements Log
Tracciamento di petto, vita, fianchi, braccia, cosce nel tempo.
- **DB**: nuova tabella `body_measurements` con `user_id, logged_date, chest_cm, waist_cm, hips_cm, left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm`
- **UI**: form di inserimento + grafici LineChart per ogni misura
- **Utilità**: fondamentale in bulk/cut per capire la composizione corporea oltre al peso

### 5. 1RM Tracker e Strength Standards
Calcola il massimale stimato per ogni esercizio composto e lo confronta con standard per peso corporeo.
- **Formula**: Epley (weight × (1 + reps/30)) o Brzycki
- **Standard**: tabella per sesso e peso corporeo (beginner/intermediate/advanced/elite)
- **UI**: pagina dedicata o sezione in Storico Workout

### 7. WHOOP Deep Integration
Usare il recovery score WHOOP per suggerire automaticamente se fare sessione heavy, light o rest day.
- **Logic**: recovery < 33% → rest; 33-66% → light; > 66% → heavy/normale
- **UI**: card nella dashboard con raccomandazione giornaliera basata su recovery
- **Dati**: già disponibili in `whoop_daily`, manca solo il trigger UI

### 8. Photo Progress
Log foto corporee con timeline comparativa.
- **Storage**: Supabase Storage bucket "progress-photos"
- **DB**: tabella `progress_photos` con `user_id, logged_date, photo_url, notes`
- **UI**: griglia timeline con confronto affiancato tra due date

---

## Lungo termine

### 9. Macro Cycling
Giorni di training vs rest day con macro diversi (più carbs workout day, meno rest day).
- Il piano si adatta automaticamente al calendario allenamenti
- Richiede integrazione tra workout calendar e meal targets

### 12. Ricette Salvate
Crea pasti "template" (es. "Colazione standard") da aggiungere in un click.
- **DB**: tabella `meal_templates` con items pre-configurati
- **UI**: sezione "Preferiti" nella pagina pasti, sopra la ricerca

### 13. Correlazione Sleep → Performance
Grafico che mostra se le sessioni dopo notti con HRV basso producono meno volume.
- Dati già presenti: `whoop_daily` + `workouts` + `workout_sets`
- Serve un join per data e correlazione statistica

### 14. Deload Detector
Rileva automaticamente quando il volume accumulato suggerisce una settimana di scarico.
- **Logic**: se volume totale delle ultime 4 settimane supera soglia o cala progressivamente → suggerisci deload
- **Trigger**: POST all'endpoint di phase detection o job settimanale

### 15. Body Fat Trend Stimato
Da peso + misure corporee calcola body fat % con formula Navy/YMCA e tracciala nel tempo.
- Richiede body measurements log (feature #4)
- Formula Navy: per uomini = 86.01 × log10(waist - neck) - 70.041 × log10(height) + 36.76

### 17. Quick Log Mobile
Pagina ultra-semplificata ottimizzata per smartphone: peso + pasto + workout in 3 tap.
- Route dedicata `/quick-log`
- UI minimalista senza navigazione
- Pre-seleziona i dati di oggi automaticamente

### 18. Notifiche Push (PWA)
Reminder per pesarsi la mattina, loggare i pasti, idratazione.
- Richiede: Service Worker + VAPID keys + `web-push` + tabella `push_subscriptions`
- Stack: `next-pwa` + Vercel Cron Jobs per scheduling
- iOS richiede iOS 16.4+ e "Aggiungi a schermata Home"

### 19. Export Dati
Scarica tutto in CSV o PDF: workout history, peso, macro.
- Utile per condividere con un coach esterno
- Generazione PDF server-side con `puppeteer` o `jsPDF`

### 20. Mood e Energia Soggettiva
Scala 1-5 di come ti senti prima dell'allenamento, correlata a performance e HRV.
- **DB**: campo `subjective_energy` in `workouts` (già ha `notes`)
- **UI**: slider 1-5 nella pagina log workout

### 22. Analisi Foto Composizione AI
Carica una foto progress e l'AI stima i cambiamenti rispetto alla settimana precedente.
- Richiede feature #8 (Photo Progress)
- Usa Claude con vision capability

### 23. Periodizzazione Automatica
L'AI costruisce il macrociclo (es. 12 settimane bulk → 8 settimane cut) con progressione pianificata.
- Output: calendario con settimane di volume/intensità/deload
- Basata su goal phase, livello attuale e storia
- Feature più complessa del progetto

---

## Nuove Feature — Nutrizione Avanzata

### 24. Hydration Tracker
Log dell'acqua giornaliera (bicchieri o ml) con progress bar e reminder.
- **DB**: campo `water_ml` in una nuova tabella `daily_log` o colonna in `weight_log`
- **UI**: card nella dashboard con cerchio progress, pulsanti +250ml / +500ml
- **Correlazione**: mostra se i giorni con idratazione scarsa coincidono con HRV basso
- **Effort**: basso — dati semplici, nessuna API esterna

### 25. Supplement Tracker
Log giornaliero degli integratori assunti (creatina, proteine, vitamina D, omega-3, etc.).
- **DB**: tabella `supplements` (nome, dose, unità) + `supplement_log` (data, supplement_id, assunto)
- **UI**: lista di integratori configurata nel profilo, check giornaliero rapido
- **Reminder**: integra con notifiche push (feature #18) per ricordare la creatina mattutina
- **Effort**: medio

### 26. Nutrition Gap Analysis
Analizza i pasti della settimana e identifica i nutrienti sistematicamente carenti.
- **Logic**: aggrega fiber_g, omega-3 (se tracciato), micronutrienti dai dati già presenti in `meal_items`
- **Output**: card settimanale con "Carente in fibre (media 12g/die vs 25g target)" + suggerimenti alimentari
- **AI**: Claude analizza i pattern e suggerisce 3 alimenti da aggiungere alla dieta
- **Effort**: medio — dati già disponibili, serve logica aggregazione + AI call

### 27. Net Carbs Tracker
Aggiunge il calcolo dei carboidrati netti (carbs − fibra) ai totali giornalieri.
- **UI**: quinto stat nella card totals giornalieri della pagina pasti
- **Utilità**: per chi segue approcci low-carb o vuole monitorare l'impatto glicemico
- **Effort**: bassissimo — solo calcolo UI, dati già presenti

### 28. Meal Prep Planner
Pianifica i pasti della settimana in anticipo e genera automaticamente la lista della spesa aggregata.
- **DB**: tabella `meal_plan` con pasti pianificati per data futura
- **UI**: vista settimanale con slot pasto per giorno + bottone "Genera lista spesa"
- **Lista spesa**: aggrega tutti gli ingredienti pianificati, deduplica, divide per categoria
- **Effort**: alto

---

## Nuove Feature — Allenamento Avanzato

### 29. Rest Timer
Timer tra le serie direttamente nell'app durante il log workout.
- **UI**: modale o banner fisso in basso durante il log, con countdown e notifica sonora
- **Configurabile**: 60s / 90s / 120s / 180s, preset per tipo di esercizio
- **Haptic**: vibrazione al termine del recupero (mobile)
- **Effort**: basso — puro front-end, nessuna API

### 30. Volume Landmarks per Gruppo Muscolare
Basato sulla scienza di Mike Israetel (MEV, MAV, MRV). Traccia se sei nel range ottimale di volume settimanale per ogni gruppo muscolare.
- **Logic**: mappa ogni esercizio al gruppo muscolare → somma le serie settimanali → confronta con soglie MEV/MAV/MRV
- **UI**: grafico a barre per gruppo muscolare con zone colorate (sotto MEV, ottimale, oltre MRV)
- **DB**: tabella di mapping esercizio → gruppo muscolare (configurabile dall'utente)
- **Effort**: medio-alto

### 31. Muscle Group Balance Analyzer
Analizza se stai allenando i muscoli antagonisti in modo equilibrato (petto vs schiena, quadricipiti vs hamstring, bicipiti vs tricipiti).
- **Logic**: rapporto volume settimanale tra coppie antagoniste, alert se squilibrio > 30%
- **UI**: spider chart o grafico radar per visualizzare il bilanciamento muscolare
- **Prevenzione infortuni**: segnala squilibri cronici prima che diventino problemi
- **Effort**: medio

### 32. Workout Template
Salva un allenamento completo come template e riutilizzalo in un click nel log.
- **DB**: tabelle `workout_templates` e `template_exercises` con esercizi e serie predefinite
- **UI**: sezione "I miei template" nella pagina log workout, bottone "Usa template" che pre-popola gli esercizi
- **Progressione automatica**: carica i pesi dell'ultima sessione di quel template come punto di partenza
- **Effort**: medio

### 33. RPE Analyzer
Analisi delle sessioni in cui hai loggato l'RPE per capire se stai gestendo l'intensità in modo ottimale.
- **Logic**: se RPE medio > 8.5 per 3+ sessioni consecutive → possibile overreaching; se < 6.5 → possibile undertraining
- **UI**: sezione in Storico Workout con trend RPE per esercizio e raccomandazione AI
- **Dati**: già presenti in `workout_sets.rpe`
- **Effort**: basso — dati già tracciati, serve aggregazione + regole

---

## Nuove Feature — Analytics e Trend

### 34. Moving Average Peso
Sovrapponi al grafico del peso una media mobile a 7 giorni per eliminare le fluttuazioni quotidiane.
- **UI**: seconda linea nel grafico peso (già esistente) in colore diverso
- **Utilità**: elimina il rumore da acqua/glicogeno, mostra il trend reale del tessuto
- **Effort**: bassissimo — calcolo client-side sui dati già caricati

### 35. Confronto tra Periodi
Confronta le metriche di due settimane o mesi a scelta affiancate.
- **UI**: selettori per "Periodo A" e "Periodo B" + tabella comparativa (volume, calorie, peso, recovery)
- **Esempio**: "Marzo vs Aprile: volume +12%, calorie +150 kcal/die, peso +0.8 kg"
- **Dove**: nuova sezione in Analytics o pagina dedicata
- **Effort**: medio

### 36. Goal Tracker
Imposta obiettivi specifici con scadenza e traccia il progresso con ETA dinamico.
- **Esempi**: "pesare 82 kg entro il 15 luglio", "fare 10 pull-up entro settembre", "100 kg di panca entro dicembre"
- **DB**: tabella `goals` con tipo, target, scadenza, data_inizio, valore_iniziale
- **UI**: card nella dashboard con progress bar e ETA calcolato sul trend attuale
- **AI**: avvisa se il ritmo attuale non è sufficiente per raggiungere l'obiettivo entro la data
- **Effort**: medio

### 37. Biomarker Log
Tieni traccia degli esami del sangue nel tempo (testosterone, ferritina, vitamina D, TSH, colesterolo, etc.).
- **DB**: tabella `biomarkers` (nome, unità, range_min, range_max) + `biomarker_log` (data, valore)
- **UI**: form di inserimento + grafici per ogni marker con range di riferimento evidenziato
- **Correlazione**: sovrapponi i marker ai trend di peso e performance per trovare correlazioni
- **Effort**: medio

---

## Nuove Feature — Salute Integrata

### 38. Stress Score Composito
Aggrega HRV, sleep performance, training load e caloric delta in un unico punteggio giornaliero.
- **Formula**: score ponderato da 0-100 basato su deviazione dai baseline personali
- **UI**: numero grande + semaforo (verde/giallo/rosso) nella dashboard, trend settimanale
- **Differenza da WHOOP recovery**: incorpora anche training load e nutrizione, non solo biometria
- **Effort**: medio

### 39. Pain/Discomfort Log
Log rapido di dolori muscolari o articolari con rilevamento pattern nel tempo.
- **DB**: tabella `pain_log` con `user_id, logged_date, body_area, intensity_1_5, type (dolore/rigidità/fastidio), notes`
- **UI**: body map cliccabile per selezionare la zona + slider intensità
- **AI alert**: se un disturbo persiste oltre 5 giorni o aumenta di intensità → avviso proattivo
- **Effort**: medio

### 40. HRV Baseline Personale
Calcola il tuo HRV baseline su 30 giorni e mostra con un semaforo se oggi sei sopra o sotto rispetto a te stesso.
- **Logic**: media mobile 30gg HRV + deviazione standard → zona verde/gialla/rossa
- **UI**: sostituisce o integra il valore HRV grezzo nella dashboard sleep
- **Dati**: già disponibili in `whoop_daily.hrv_rmssd_ms`
- **Effort**: basso — calcolo sui dati esistenti

---

## Nuove Feature — AI Differenzianti

### 41. Meal Photo Recognition
Scatta una foto del piatto e l'AI (Claude con vision) stima le macro senza inserimento manuale.
- **UI**: bottone "📷 Foto piatto" nella pagina pasti → upload immagine → AI stima kcal/P/C/G
- **API**: Claude con vision + prompt strutturato per output JSON con alimenti e grammi stimati
- **Limitazione**: stima approssimativa, da usare quando il log manuale non è praticabile
- **Effort**: basso — Claude vision è già disponibile con lo stesso SDK

### 42. Predictive Body Composition
"Al ritmo attuale raggiungerai il target il [data]. Body fat stimato: X%."
- **Logic**: linear regression sul trend peso delle ultime 4 settimane → proiezione verso il target
- **UI**: card nella dashboard con countdown giorni al target + proiezione peso corporeo
- **Confidence interval**: mostra range ottimistico/pessimistico basato sulla varianza del trend
- **Effort**: medio — richiede calcolo statistico ma nessuna nuova API

### 43. Supplement AI Recommendations
Basandosi su fase, deficit nutrizionali rilevati e dati WHOOP, l'AI suggerisce integratori pertinenti.
- **Input**: fase corrente, HRV basso cronico, deficit proteico, body fat %, stagione
- **Output**: lista di 3-5 integratori con motivazione scientifica e dosaggio consigliato
- **Disclaimer**: "Consulta un medico prima di integrare" sempre visibile
- **Effort**: basso — AI call con contesto utente già disponibile

### 44. Meal Swap Suggestions
"Sostituisci questo alimento con qualcosa di simile ma con più proteine / meno calorie."
- **UI**: bottone "Swap" accanto a ogni alimento nel log → AI suggerisce 3 alternative con confronto macro
- **Contesto**: considera la fase attuale (bulk/cut) e i target giornalieri per suggerire swap pertinenti
- **Effort**: basso — AI call con dati alimento già presenti

---

## Nuove Feature — Integrazioni Esterne

### 45. Apple Health / Google Fit Sync
Importa passi, frequenza cardiaca a riposo e calorie bruciate dai dati già presenti sul telefono.
- **iOS**: HealthKit API (richiede app nativa o PWA con permessi specifici)
- **Android**: Google Fit REST API (OAuth2)
- **Dati importati**: steps, resting_hr, active_calories per aggiornare automaticamente TDEE
- **Effort**: alto — richiede OAuth separato per piattaforma

### 46. Storico Pasti Import (MyFitnessPal / Cronometer)
Importa lo storico pasti da altre app tramite file CSV.
- **Formato**: parser CSV per export MyFitnessPal e Cronometer
- **UI**: pagina import con drag & drop file + preview dati + conferma
- **Abbassa barriera**: chi arriva da MFP porta subito il suo storico
- **Effort**: medio — parser CSV + mapping campi

### 47. Strava Integration
Importa automaticamente le sessioni cardio (corsa, ciclismo) da Strava.
- **OAuth**: Strava API con refresh token → salva in `workouts` con tipo "cardio"
- **Dati**: distanza, durata, calorie, pace, mappa GPS (opzionale)
- **Effort**: medio — OAuth + webhook Strava

---

## Feature Sviluppate

- [x] Dashboard con caloric balance card + phase detection
- [x] Log peso con phase detection trigger
- [x] Log pasti con ricerca food (OpenFoodFacts + USDA, risultati illimitati)
- [x] Log workout con sessioni Torso A/B/C e Limbs
- [x] Storico workout: analisi Per Sessione (AI session coach) + Per Esercizio (charts + AI)
- [x] Sleep dashboard con WHOOP integration
- [x] Report settimanale AI
- [x] Analytics page
- [x] Timezone italiana (Europe/Rome) su tutto il progetto
- [x] Feature 6: Calendario workout visivo (heatmap)
- [x] Feature 10: Meal timing tracker (finestra anabolica)
- [x] Feature 11: Barcode scanner pasti
- [x] Feature 21: Coach conversazionale AI

- [x] Dashboard con caloric balance card + phase detection
- [x] Log peso con phase detection trigger
- [x] Log pasti con ricerca food (OpenFoodFacts + USDA, risultati illimitati)
- [x] Log workout con sessioni Torso A/B/C e Limbs
- [x] Storico workout: analisi Per Sessione (AI session coach) + Per Esercizio (charts + AI)
- [x] Sleep dashboard con WHOOP integration
- [x] Report settimanale AI
- [x] Analytics page
- [x] Timezone italiana (Europe/Rome) su tutto il progetto
- [x] Feature 6: Calendario workout visivo (heatmap)
- [x] Feature 10: Meal timing tracker (finestra anabolica)
- [x] Feature 11: Barcode scanner pasti
- [x] Feature 21: Coach conversazionale AI
