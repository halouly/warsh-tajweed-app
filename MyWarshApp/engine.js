// --- WARSH ENGINE ---

// 1. Constants
const SUKUN = '\u0652';
const SHADDA = '\u0651';
const FATHA = '\u064E';
const DAMMA = '\u064F';
const KASRA = '\u0650';
const TANWEEN = ['\u064B', '\u064C', '\u064D'];
const ALIF_KHANJARIA = '\u0670';
const HAMZA = 'ءأإؤئ';

// Rule Sets
const QALQ = 'قطبجد';
const IDGH_GH = 'ينمو';
const IDGH_NO = 'لر';
const IKHFA = 'تثجدذزسشصضطظفقك';
const MADD = 'اوىي' + ALIF_KHANJARIA;

// 2. Helpers
function isLtr(c) { return c >= '\u0600' && c <= '\u06FF'; }

function getDiac(t, i) {
    let diacs = [];
    for (let j = i + 1; j < t.length; j++) {
        if (isLtr(t[j])) break;
        diacs.push(t[j]);
    }
    return diacs;
}

function has(t, i, c) {
    const d = getDiac(t, i);
    return d.includes(c);
}

function nextL(t, i) {
    for (let j = i + 1; j < t.length; j++) {
        if (isLtr(t[j])) return { c: t[j], i: j };
    }
    return null;
}

function prevL(t, i) {
    for (let j = i - 1; j >= 0; j--) {
        if (isLtr(t[j])) return { c: t[j], i: j };
    }
    return null;
}

function endW(t, i) {
    const n = nextL(t, i);
    return !n || t.slice(i + 1, n.i).includes(' ');
}

// 3. Detection Function
function detect(t) {
    const a = [];
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (!isLtr(c)) continue;
        
        const n = nextL(t, i);
        const p = prevL(t, i);
        const end = endW(t, i);

        // Qalqalah
        if (QALQ.includes(c) && (has(t, i, SUKUN) || (end && !has(t, i, SHADDA))))
            a.push({ s: i, e: i + 1, cls: 'tj-qalqalah' });

        // Noon sakinah
        if (c === 'ن' && (has(t, i, SUKUN) || end) && n && !has(t, i, SHADDA)) {
            if (IDGH_GH.includes(n.c)) { 
                a.push({ s: i, e: i + 1, cls: 'tj-silent' }); 
                a.push({ s: n.i, e: n.i + 1, cls: 'tj-ghunnah' });
            }
            else if (IDGH_NO.includes(n.c)) a.push({ s: i, e: i + 1, cls: 'tj-silent' });
            else if (n.c === 'ب') a.push({ s: i, e: i + 1, cls: 'tj-ghunnah' });
            else if (IKHFA.includes(n.c)) a.push({ s: i, e: i + 1, cls: 'tj-ghunnah' });
        }

        // Tanween
        let tw = getDiac(t, i).find(x => TANWEEN.includes(x));
        if (tw && n && (IDGH_GH.includes(n.c) || IKHFA.includes(n.c) || n.c === 'ب'))
            a.push({ s: i, e: i + 1, cls: 'tj-ghunnah' });

        // Meem sakinah
        if (c === 'م' && (has(t, i, SUKUN) || end) && n) {
            if (n.c === 'م') { 
                a.push({ s: i, e: i + 1, cls: 'tj-silent' }); 
                a.push({ s: n.i, e: n.i + 1, cls: 'tj-ghunnah' });
            }
            else if (n.c === 'ب') a.push({ s: i, e: i + 1, cls: 'tj-ghunnah' });
        }

        // Ghunnah mushaddad
        if ((c === 'م' || c === 'ن') && has(t, i, SHADDA)) 
            a.push({ s: i, e: i + 1, cls: 'tj-ghunnah' });

        // Lam shamsiyyah
        if (c === 'ل' && p && (p.c === 'ا' || p.c === '\u0671') && n && 'تثدذرزسشصضطظلن'.includes(n.c))
            a.push({ s: i, e: i + 1, cls: 'tj-silent' });

        // Madd
        if (MADD.includes(c)) {
            if (n && HAMZA.includes(n.c)) a.push({ s: i, e: i + 1, cls: 'tj-madd' });
            else if (n && (has(t, n.i, SUKUN) || has(t, n.i, SHADDA))) a.push({ s: i, e: i + 1, cls: 'tj-madd' });
        }

        // Ra
        if (c === 'ر') {
            if (has(t, i, FATHA) || has(t, i, DAMMA)) a.push({ s: i, e: i + 1, cls: 'tj-ra-heavy' });
            else if (has(t, i, KASRA)) a.push({ s: i, e: i + 1, cls: 'tj-ra-light' });
        }
    }
    return a;
}

// 4. APPLY FUNCTION (Corrected)
function apply(text, rules) {
    if (!rules || rules.length === 0) return text;
    let charClasses = new Array(text.length).fill(null);
    
    rules.forEach(r => {
        for (let i = r.s; i < r.e; i++) {
            if (!charClasses[i]) charClasses[i] = r.cls;
        }
    });

    let out = '';
    let currentClass = null;

    for (let i = 0; i < text.length; i++) {
        let cls = charClasses[i];
        if (cls !== currentClass) {
            if (currentClass) out += '</span>';
            if (cls) out += `<span class="${cls}">`;
            currentClass = cls;
        }
        out += text[i];
    }
    if (currentClass) out += '</span>';
    return out;
}

window.detect = detect;
window.apply = apply;
