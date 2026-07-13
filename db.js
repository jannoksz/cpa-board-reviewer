/* ============================================================
   CPA Board Reviewer — Data Layer ("Backend")
   Questions and results now live in Supabase (shared, cross-device),
   with a small local-only settings key for UI prefs like dark mode.
   This file is the single source of truth for reading/writing
   questions & results, so
   every page (admin, subject, exam, dashboard) talks to the
   SAME api instead of touching localStorage directly.
   ============================================================ */

const CPA = (() => {

    const KEYS = {
        SETTINGS: 'cpa_v1_settings' // local UI prefs only (dark mode) — everything else lives in Supabase now
    };

    // ---- Supabase client + auth ----------------------------------------
    const supabaseClient = supabase.createClient(
        'https://skosmgyicuwvlybkqdal.supabase.co',
        'sb_publishable_scCLt7VTNyIR-q8QDRPpxQ_4xMubH2Z'
    );

    let _user = null;      // { id, email } once logged in
    let _profile = null;   // { id, display_name, is_admin }

    async function signUp(email, password){
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if(error) throw error;
        return data;
    }
    async function signIn(email, password){
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if(error) throw error;
        _user = data.user;
        await _loadProfile();
        return data;
    }
    async function signOut(){
        await supabaseClient.auth.signOut();
        _user = null;
        _profile = null;
    }
    async function _loadProfile(){
        if(!_user){ _profile = null; return; }
        const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', _user.id).single();
        if(error){ console.error('Failed to load profile', error); _profile = null; return; }
        _profile = data;
    }
    // Call once on page load: restores an existing session (if any) and
    // pre-loads the question bank + this user's results.
    async function initSession(){
        const { data } = await supabaseClient.auth.getSession();
        _user = data.session ? data.session.user : null;
        if(_user) await _loadProfile();
        await loadQuestions();
        if(_user) await loadResults();
    }
    function getUser(){ return _user; }
    function getDisplayName(){ return _profile && _profile.display_name ? _profile.display_name : (_user ? _user.email : ''); }
    function isAdmin(){ return !!(_profile && _profile.is_admin); }

    // ---- Subject catalogue -----------------------------------------
    // counts = target number of questions an exam pulls for that level.
    const SUBJECTS = [
        { id:'FAR',       name:'FAR',       full:'Financial Accounting & Reporting',       icon:'fa-calculator',              counts:{easy:30, intermediate:20, hard:10, mastery:null} },
        { id:'AFAR',      name:'AFAR',      full:'Advanced Financial Accounting & Reporting', icon:'fa-chart-line',           counts:{easy:30, intermediate:20, hard:10, mastery:null} },
        { id:'MS',        name:'MS',        full:'Management Services',                    icon:'fa-briefcase',               counts:{easy:30, intermediate:20, hard:10, mastery:null} },
        { id:'AUDITING',  name:'Auditing',  full:'Auditing Theory & Problems',              icon:'fa-magnifying-glass-chart',  counts:{easy:30, intermediate:20, hard:10, mastery:null} },
        { id:'TAXATION',  name:'Taxation',  full:'Tax Concepts & Computations',             icon:'fa-receipt',                 counts:{easy:30, intermediate:20, hard:10, mastery:null}, featured:true },
        { id:'RFBT',      name:'RFBT',      full:'Regulatory Framework & Business Law',     icon:'fa-scale-balanced',          counts:{easy:30, intermediate:20, hard:10, mastery:null} }
    ];

    const LEVELS = [
        { id:'easy',         label:'Easy',         desc:'Foundational recall & concepts' },
        { id:'intermediate', label:'Intermediate', desc:'Applied, multi-step questions' },
        { id:'hard',         label:'Hard',         desc:'Problem solving & computations' },
        { id:'mastery',      label:'Mastery',      desc:'Comprehensive, board-condition mixed review' }
    ];

    // ---- low-level storage helpers ----------------------------------
    function _read(key, fallback){
        try{
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        }catch(e){
            console.error('CPA storage read failed for', key, e);
            return fallback;
        }
    }
    function _write(key, value){
        try{
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        }catch(e){
            console.error('CPA storage write failed for', key, e);
            return false;
        }
    }
    function _uid(){
        return 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
    }

    // ---- Questions ---------------------------------------------------
    // Kept in an in-memory cache so the many render functions elsewhere in
    // the app can keep reading questions synchronously. The cache is loaded
    // from Supabase on startup (loadQuestions) and refreshed after any write.
    let _questionsCache = [];

    function _rowToQuestion(row){
        return {
            id: row.id,
            subject: row.subject,
            level: row.level,
            type: row.type,
            question: row.question,
            choices: row.choices || [],
            correctIndex: row.correct_index,
            answer: row.answer || '',
            solution: row.solution || '',
            explanation: row.explanation || '',
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    async function loadQuestions(){
        const { data, error } = await supabaseClient.from('questions').select('*').order('created_at', { ascending:true });
        if(error){ console.error('Failed to load questions', error); _questionsCache = []; return; }
        _questionsCache = data.map(_rowToQuestion);
    }
    function getAllQuestions(){
        return _questionsCache;
    }
    function getQuestions(subject, level){
        return getAllQuestions().filter(q => q.subject === subject && (!level || q.level === level));
    }
    function getQuestion(id){
        return getAllQuestions().find(q => q.id === id) || null;
    }
    async function addQuestion(q){
        const row = {
            subject: q.subject, level: q.level, type: q.type || 'mcq',
            question: q.question, choices: q.choices || [], correct_index: q.correctIndex,
            answer: q.answer || '', solution: q.solution || '', explanation: q.explanation || ''
        };
        const { data, error } = await supabaseClient.from('questions').insert(row).select().single();
        if(error) throw error;
        const record = _rowToQuestion(data);
        _questionsCache.push(record);
        return record;
    }
    async function updateQuestion(id, patch){
        const row = {};
        if(patch.subject !== undefined) row.subject = patch.subject;
        if(patch.level !== undefined) row.level = patch.level;
        if(patch.type !== undefined) row.type = patch.type;
        if(patch.question !== undefined) row.question = patch.question;
        if(patch.choices !== undefined) row.choices = patch.choices;
        if(patch.correctIndex !== undefined) row.correct_index = patch.correctIndex;
        if(patch.answer !== undefined) row.answer = patch.answer;
        if(patch.solution !== undefined) row.solution = patch.solution;
        if(patch.explanation !== undefined) row.explanation = patch.explanation;
        row.updated_at = new Date().toISOString();
        const { data, error } = await supabaseClient.from('questions').update(row).eq('id', id).select().single();
        if(error) throw error;
        const record = _rowToQuestion(data);
        const idx = _questionsCache.findIndex(x => x.id === id);
        if(idx !== -1) _questionsCache[idx] = record;
        return record;
    }
    async function deleteQuestion(id){
        const { error } = await supabaseClient.from('questions').delete().eq('id', id);
        if(error) throw error;
        _questionsCache = _questionsCache.filter(q => q.id !== id);
    }
    function getQuestionCounts(subject){
        const qs = getAllQuestions().filter(q => q.subject === subject);
        const counts = {};
        LEVELS.forEach(l => { counts[l.id] = qs.filter(q => q.level === l.id).length; });
        return counts;
    }

    // ---- Bulk import ---------------------------------------------------
    // Accepts an array of "loose" row objects (already parsed from CSV or
    // JSON) and turns them into real question records in one shot, so the
    // admin never has to use the one-by-one modal for a big batch.
    // Each row may provide: type, question, choiceA/choiceB/choiceC/choiceD
    // (or a `choices` array), correct (letter A-D, 1-based or 0-based number),
    // answer, solution, explanation, subject, level.
    // `defaults.subject` / `defaults.level` are used for any row that omits them.
    async function bulkAddQuestions(rows, defaults){
        defaults = defaults || {};
        const added = [];
        const errors = [];

        for(let i = 0; i < rows.length; i++){
            const raw = rows[i];
            const rowNum = i + 2; // +2 assumes a header row at line 1 (CSV-friendly numbering)
            try{
                const record = _normalizeBulkRow(raw, defaults);
                added.push(await addQuestion(record));
            }catch(e){
                errors.push({ row: rowNum, message: e.message, raw });
            }
        }

        return { added, errors };
    }

    function _normalizeBulkRow(raw, defaults){
        const get = (obj, keys) => {
            for(const k of keys){
                if(obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return String(obj[k]).trim();
            }
            return '';
        };

        const subject = (get(raw, ['subject', 'Subject', 'SUBJECT']) || defaults.subject || '').toUpperCase();
        const level = (get(raw, ['level', 'Level', 'LEVEL', 'difficulty', 'Difficulty']) || defaults.level || '').toLowerCase();
        const type = (get(raw, ['type', 'Type', 'TYPE']) || defaults.type || 'mcq').toLowerCase();
        const question = get(raw, ['question', 'Question', 'QUESTION', 'q']);
        const explanation = get(raw, ['explanation', 'Explanation']);

        if(!SUBJECTS.some(s => s.id === subject)){
            throw new Error(`Unknown subject "${subject || '(blank)'}". Use one of: ${SUBJECTS.map(s=>s.id).join(', ')}.`);
        }
        if(!LEVELS.some(l => l.id === level)){
            throw new Error(`Unknown level "${level || '(blank)'}". Use one of: ${LEVELS.map(l=>l.id).join(', ')}.`);
        }
        if(!question){
            throw new Error('Missing question text.');
        }
        if(type !== 'mcq' && type !== 'problem'){
            throw new Error(`Unknown type "${type}". Use "mcq" or "problem".`);
        }

        if(type === 'mcq'){
            let choices = [];
            if(Array.isArray(raw.choices) && raw.choices.length){
                choices = raw.choices.map(c => String(c).trim());
            } else {
                choices = [
                    get(raw, ['choiceA', 'choice_a', 'A', 'optionA', 'option1', 'choice1']),
                    get(raw, ['choiceB', 'choice_b', 'B', 'optionB', 'option2', 'choice2']),
                    get(raw, ['choiceC', 'choice_c', 'C', 'optionC', 'option3', 'choice3']),
                    get(raw, ['choiceD', 'choice_d', 'D', 'optionD', 'option4', 'choice4'])
                ];
            }
            choices = choices.filter(c => c !== '');
            if(choices.length < 2){
                throw new Error('MCQ needs at least 2 non-empty choices.');
            }

            const correctRaw = get(raw, ['correct', 'Correct', 'correctIndex', 'answer', 'Answer']);
            if(correctRaw === ''){
                throw new Error('Missing correct answer (letter A-D or choice number).');
            }
            let correctIndex;
            if(/^[A-Za-z]$/.test(correctRaw)){
                correctIndex = correctRaw.toUpperCase().charCodeAt(0) - 65;
            } else if(/^\d+$/.test(correctRaw)){
                const n = parseInt(correctRaw, 10);
                // Accept both 1-based (spreadsheet-friendly) and 0-based input.
                correctIndex = (n >= 1 && n <= choices.length) ? n - 1 : n;
            } else {
                // Correct answer given as the literal choice text.
                correctIndex = choices.findIndex(c => c.toLowerCase() === correctRaw.toLowerCase());
            }
            if(correctIndex < 0 || correctIndex >= choices.length){
                throw new Error(`Correct answer "${correctRaw}" doesn't match any of the ${choices.length} choices.`);
            }

            return { subject, level, type:'mcq', question, choices, correctIndex, explanation };
        } else {
            const answer = get(raw, ['answer', 'Answer', 'correct', 'Correct']);
            const solution = get(raw, ['solution', 'Solution']);
            if(!answer){
                throw new Error('Missing correct final answer for problem-solving question.');
            }
            return { subject, level, type:'problem', question, answer, solution, explanation };
        }
    }

    // Minimal CSV parser — handles quoted fields, embedded commas, and
    // escaped quotes (""), which is all typical spreadsheet exports need.
    function parseCSV(text){
        const rows = [];
        let row = [], field = '', inQuotes = false;
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for(let i = 0; i < text.length; i++){
            const c = text[i], next = text[i+1];
            if(inQuotes){
                if(c === '"' && next === '"'){ field += '"'; i++; }
                else if(c === '"'){ inQuotes = false; }
                else field += c;
            } else {
                if(c === '"') inQuotes = true;
                else if(c === ','){ row.push(field); field = ''; }
                else if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
                else field += c;
            }
        }
        row.push(field);
        rows.push(row);
        while(rows.length && rows[rows.length-1].every(f => f.trim() === '')) rows.pop();

        if(!rows.length) return [];
        const headers = rows[0].map(h => h.trim());
        return rows.slice(1).map(r => {
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ''; });
            return obj;
        });
    }

    // ---- Exam session (in-memory helper, not persisted until submit) --
    function shuffle(arr){
        const a = arr.slice();
        for(let i = a.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function buildExam(subject, level){
        const subjectDef = SUBJECTS.find(s => s.id === subject);
        const configuredTarget = subjectDef ? subjectDef.counts[level] : 10;
        const bank = getQuestions(subject, level);
        // A null/undefined target (currently just "mastery") means "no cap" —
        // the exam uses every question that's been added for that tier.
        const unlimited = configuredTarget === null || configuredTarget === undefined;
        const target = unlimited ? bank.length : configuredTarget;
        const picked = shuffle(bank).slice(0, target);
        return { questions: picked, target, available: bank.length, unlimited };
    }

    // ---- Results / stats ----------------------------------------------
    // The DB (via RLS) only ever returns the logged-in user's own results,
    // so there's no need to filter by "reviewer" anymore — the cache IS
    // this user's results.
    let _resultsCache = [];

    function _rowToResult(row){
        return {
            id: row.id,
            subject: row.subject,
            level: row.level,
            score: row.score,
            total: row.total,
            percentage: row.percentage,
            durationSec: row.duration_sec,
            date: row.date
        };
    }
    async function loadResults(){
        if(!_user){ _resultsCache = []; return; }
        const { data, error } = await supabaseClient.from('results').select('*').eq('user_id', _user.id);
        if(error){ console.error('Failed to load results', error); _resultsCache = []; return; }
        _resultsCache = data.map(_rowToResult);
    }
    function getAllResults(){
        return _resultsCache;
    }
    async function saveResult(result){
        if(!_user) throw new Error('You must be signed in to save a result.');
        const row = {
            user_id: _user.id,
            subject: result.subject,
            level: result.level,
            score: result.score,
            total: result.total,
            percentage: result.percentage,
            duration_sec: result.durationSec
        };
        const { data, error } = await supabaseClient.from('results').insert(row).select().single();
        if(error) throw error;
        const record = _rowToResult(data);
        _resultsCache.push(record);
        return record;
    }
    function getResults(subject, level){
        return getAllResults().filter(r =>
            (!subject || r.subject === subject) &&
            (!level || r.level === level)
        );
    }
    function getBestScore(subject, level){
        const rs = getResults(subject, level);
        if(!rs.length) return null;
        return Math.max(...rs.map(r => r.percentage));
    }
    function getStats(){
        const all = getAllResults();
        const examsTaken = all.length;
        const avg = examsTaken ? Math.round(all.reduce((a,r) => a + r.percentage, 0) / examsTaken) : 0;
        const highest = examsTaken ? Math.max(...all.map(r => r.percentage)) : 0;
        return { examsTaken, avg, highest };
    }

    // ---- Detailed progress helpers -------------------------------------
    function _reviewerResults(){
        return getAllResults();
    }
    // Best score + attempt count per subject/level, plus a per-subject average
    // across whichever tiers have been attempted at least once.
    function getSubjectBreakdown(){
        const results = _reviewerResults();
        return SUBJECTS.map(s => {
            const levels = {};
            LEVELS.forEach(l => {
                const lvlResults = results.filter(r => r.subject === s.id && r.level === l.id);
                levels[l.id] = {
                    best: lvlResults.length ? Math.max(...lvlResults.map(r => r.percentage)) : null,
                    attempts: lvlResults.length
                };
            });
            const bests = LEVELS.map(l => levels[l.id].best).filter(b => b !== null);
            const avg = bests.length ? Math.round(bests.reduce((a,b) => a+b, 0) / bests.length) : null;
            const totalAttempts = LEVELS.reduce((sum, l) => sum + levels[l.id].attempts, 0);
            return { subject: s, levels, avg, totalAttempts };
        });
    }
    // Most recent exam attempts, newest first.
    function getRecentResults(limit){
        return _reviewerResults()
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit || 10);
    }
    // Subject/level tiers whose best score is still below the passing mark.
    function getWeakAreas(threshold){
        threshold = threshold === undefined ? 75 : threshold;
        const results = _reviewerResults();
        const weak = [];
        SUBJECTS.forEach(s => {
            LEVELS.forEach(l => {
                const lvlResults = results.filter(r => r.subject === s.id && r.level === l.id);
                if(!lvlResults.length) return;
                const best = Math.max(...lvlResults.map(r => r.percentage));
                if(best < threshold) weak.push({ subject: s, level: l, best });
            });
        });
        return weak.sort((a, b) => a.best - b.best);
    }
    // All attempts in chronological order, for plotting a trend line.
    function getTrendData(){
        return _reviewerResults().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    // Clears this user's saved exam results/stats in Supabase. Leaves the
    // question bank and every other user's results untouched.
    async function resetProgress(){
        if(!_user) return;
        const { error } = await supabaseClient.from('results').delete().eq('user_id', _user.id);
        if(error) throw error;
        _resultsCache = [];
    }

    // ---- Import / export (backup) --------------------------------------
    function exportData(){
        return JSON.stringify({
            questions:getAllQuestions(),
            results:getAllResults(),
            exportedAt:new Date().toISOString(),
            version:1
        }, null, 2);
    }
    // Import a JSON backup. Questions get inserted into Supabase (admin-only,
    // enforced by RLS); "replace" first deletes every existing question.
    async function importData(json, mode){
        let parsed;
        try{ parsed = JSON.parse(json); } catch(e){ throw new Error('That file isn\'t valid JSON.'); }
        const incomingQ = Array.isArray(parsed.questions) ? parsed.questions : [];

        if(mode === 'replace'){
            const existing = getAllQuestions();
            for(const q of existing) await deleteQuestion(q.id);
        }
        const existingIds = new Set(mode === 'replace' ? [] : getAllQuestions().map(q => q.id));
        for(const q of incomingQ){
            if(existingIds.has(q.id)) continue; // skip duplicates on merge
            await addQuestion(q);
        }
        // Note: results are per-user and tied to your own account, so
        // imported results aren't restored here — only the question bank is.
    }

    // ---- Dark mode (shared across pages, still just a local UI pref) --
    function getDarkMode(){ return _read(KEYS.SETTINGS, {}).dark === true; }
    function setDarkMode(val){
        const s = _read(KEYS.SETTINGS, {});
        s.dark = val;
        _write(KEYS.SETTINGS, s);
    }
    function initDarkMode(){
        if(getDarkMode()) document.body.classList.add('dark');
        const btn = document.getElementById('darkModeBtn');
        if(!btn) return;
        const icon = btn.querySelector('i');
        const sync = () => { if(icon) icon.className = document.body.classList.contains('dark') ? 'fa-solid fa-sun' : 'fa-solid fa-moon'; };
        sync();
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            setDarkMode(document.body.classList.contains('dark'));
            sync();
        });
    }

    return {
        SUBJECTS, LEVELS,
        getAllQuestions, getQuestions, getQuestion, addQuestion, updateQuestion, deleteQuestion, getQuestionCounts,
        bulkAddQuestions, parseCSV,
        buildExam,
        getAllResults, saveResult, getResults, getBestScore, getStats,
        getSubjectBreakdown, getRecentResults, getWeakAreas, getTrendData, resetProgress,
        exportData, importData,
        initDarkMode,
        initSession, signUp, signIn, signOut, getUser, getDisplayName, isAdmin,
        loadQuestions, loadResults
    };
})();