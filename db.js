/* ============================================================
   CPA Board Reviewer — Data Layer ("Backend")
   Everything lives in localStorage. This file is the single
   source of truth for reading/writing questions & results, so
   every page (admin, subject, exam, dashboard) talks to the
   SAME api instead of touching localStorage directly.
   ============================================================ */

const CPA = (() => {

    const KEYS = {
        QUESTIONS: 'cpa_v1_questions',
        RESULTS:   'cpa_v1_results',
        SETTINGS:  'cpa_v1_settings'
    };

    // ---- Admin passcode (fixed, hardcoded) -----------------------------
    // The plain passcode is never stored anywhere in this file or in
    // localStorage — only its SHA-256 hash is kept here. Whatever the
    // admin types is hashed the same way and compared against this value.
    // To change the passcode: compute sha256(newPasscode) and replace the
    // hex string below.
    const ADMIN_PASSCODE_HASH = '7958658692d41287f68f32f26fd988180684d8777bf9f13634356d21d1e81a6f';

    async function _sha256Hex(text){
        const enc = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

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

   const supabaseClient = supabase.createClient(
     'https://skosmgyicuwvlybkqdal.supabase.co',
     'skosmgyicuwvlybkqdal'
);
    // ---- Questions ---------------------------------------------------
    function getAllQuestions(){
        return _read(KEYS.QUESTIONS, []);
    }
    function getQuestions(subject, level){
        return getAllQuestions().filter(q => q.subject === subject && (!level || q.level === level));
    }
    function getQuestion(id){
        return getAllQuestions().find(q => q.id === id) || null;
    }
    function addQuestion(q){
        const all = getAllQuestions();
        const now = new Date().toISOString();
        const record = Object.assign({
            id:_uid(),
            type:'mcq',
            choices:[],
            correctIndex:0,
            answer:'',
            solution:'',
            explanation:'',
            createdAt:now,
            updatedAt:now
        }, q);
        all.push(record);
        _write(KEYS.QUESTIONS, all);
        return record;
    }
    function updateQuestion(id, patch){
        const all = getAllQuestions();
        const idx = all.findIndex(q => q.id === id);
        if(idx === -1) return null;
        all[idx] = Object.assign({}, all[idx], patch, { updatedAt:new Date().toISOString() });
        _write(KEYS.QUESTIONS, all);
        return all[idx];
    }
    function deleteQuestion(id){
        const all = getAllQuestions().filter(q => q.id !== id);
        _write(KEYS.QUESTIONS, all);
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
    function bulkAddQuestions(rows, defaults){
        defaults = defaults || {};
        const added = [];
        const errors = [];

        rows.forEach((raw, i) => {
            const rowNum = i + 2; // +2 assumes a header row at line 1 (CSV-friendly numbering)
            try{
                const record = _normalizeBulkRow(raw, defaults);
                added.push(addQuestion(record));
            }catch(e){
                errors.push({ row: rowNum, message: e.message, raw });
            }
        });

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
    function getAllResults(){
        return _read(KEYS.RESULTS, []);
    }
    function saveResult(result){
        const all = getAllResults();
        const record = Object.assign({
            id:_uid(),
            date:new Date().toISOString(),
            reviewer:getReviewerName()
        }, result);
        all.push(record);
        _write(KEYS.RESULTS, all);
        return record;
    }
    function getResults(subject, level, reviewer){
        return getAllResults().filter(r =>
            (!subject || r.subject === subject) &&
            (!level || r.level === level) &&
            (reviewer === undefined || (r.reviewer || '') === reviewer)
        );
    }
    function getBestScore(subject, level, reviewer){
        const rs = getResults(subject, level, reviewer === undefined ? getReviewerName() : reviewer);
        if(!rs.length) return null;
        return Math.max(...rs.map(r => r.percentage));
    }
    function getStats(reviewer){
        const name = reviewer === undefined ? getReviewerName() : reviewer;
        const all = getAllResults().filter(r => (r.reviewer || '') === name);
        const examsTaken = all.length;
        const avg = examsTaken ? Math.round(all.reduce((a,r) => a + r.percentage, 0) / examsTaken) : 0;
        const highest = examsTaken ? Math.max(...all.map(r => r.percentage)) : 0;
        return { examsTaken, avg, highest };
    }

    // ---- Detailed progress helpers -------------------------------------
    function _reviewerResults(reviewer){
        const name = reviewer === undefined ? getReviewerName() : reviewer;
        return getAllResults().filter(r => (r.reviewer || '') === name);
    }
    // Best score + attempt count per subject/level, plus a per-subject average
    // across whichever tiers have been attempted at least once.
    function getSubjectBreakdown(reviewer){
        const results = _reviewerResults(reviewer);
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
    function getRecentResults(limit, reviewer){
        return _reviewerResults(reviewer)
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit || 10);
    }
    // Subject/level tiers whose best score is still below the passing mark.
    function getWeakAreas(threshold, reviewer){
        threshold = threshold === undefined ? 75 : threshold;
        const results = _reviewerResults(reviewer);
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
    function getTrendData(reviewer){
        return _reviewerResults(reviewer).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    // Clears only this reviewer's saved exam results/stats. Leaves the
    // question bank and every other reviewer's results untouched.
    function resetProgress(reviewer){
        const name = reviewer === undefined ? getReviewerName() : reviewer;
        const remaining = getAllResults().filter(r => (r.reviewer || '') !== name);
        _write(KEYS.RESULTS, remaining);
    }

    // ---- Import / export (backup, since this is local-only storage) --
    function exportData(){
        return JSON.stringify({
            questions:getAllQuestions(),
            results:getAllResults(),
            exportedAt:new Date().toISOString(),
            version:1
        }, null, 2);
    }
    function importData(json, mode){
        let parsed;
        try{ parsed = JSON.parse(json); } catch(e){ throw new Error('That file isn\'t valid JSON.'); }
        const incomingQ = Array.isArray(parsed.questions) ? parsed.questions : [];
        const incomingR = Array.isArray(parsed.results) ? parsed.results : [];
        if(mode === 'replace'){
            _write(KEYS.QUESTIONS, incomingQ);
            _write(KEYS.RESULTS, incomingR);
        } else {
            const existingQ = getAllQuestions();
            const existingIds = new Set(existingQ.map(q => q.id));
            const merged = existingQ.concat(incomingQ.filter(q => !existingIds.has(q.id)));
            _write(KEYS.QUESTIONS, merged);
            const existingR = getAllResults();
            _write(KEYS.RESULTS, existingR.concat(incomingR));
        }
    }
    function clearAll(){
        localStorage.removeItem(KEYS.QUESTIONS);
        localStorage.removeItem(KEYS.RESULTS);
    }

    // ---- Dark mode (shared across pages) ------------------------------
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

    // ---- Reviewer identity (name only, remembered on this device) -----
    function getReviewerName(){ return (_read(KEYS.SETTINGS, {}).reviewerName || '').trim(); }
    function setReviewerName(name){
        const s = _read(KEYS.SETTINGS, {});
        s.reviewerName = (name || '').trim();
        _write(KEYS.SETTINGS, s);
    }
    function clearReviewerName(){
        const s = _read(KEYS.SETTINGS, {});
        delete s.reviewerName;
        _write(KEYS.SETTINGS, s);
    }

    // ---- Admin passcode check (fixed passcode, hash comparison only) ----
    // Returns a Promise<boolean>. The typed value is hashed client-side and
    // compared to the hardcoded ADMIN_PASSCODE_HASH — the plain passcode
    // never touches localStorage or any variable beyond this function call.
    async function checkAdminPasscode(code){
        const hash = await _sha256Hex((code || '').trim());
        return hash === ADMIN_PASSCODE_HASH;
    }
    function isAdminAuthed(){ return _read(KEYS.SETTINGS, {}).adminAuthed === true; }
    function setAdminAuthed(val){
        const s = _read(KEYS.SETTINGS, {});
        s.adminAuthed = val;
        _write(KEYS.SETTINGS, s);
    }

    return {
        SUBJECTS, LEVELS,
        getAllQuestions, getQuestions, getQuestion, addQuestion, updateQuestion, deleteQuestion, getQuestionCounts,
        bulkAddQuestions, parseCSV,
        buildExam,
        getAllResults, saveResult, getResults, getBestScore, getStats,
        getSubjectBreakdown, getRecentResults, getWeakAreas, getTrendData, resetProgress,
        exportData, importData, clearAll,
        initDarkMode,
        getReviewerName, setReviewerName, clearReviewerName,
        checkAdminPasscode, isAdminAuthed, setAdminAuthed
    };
})();
