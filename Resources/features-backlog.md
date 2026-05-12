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
