// lines.json → lines.tsv (key, voice, spoken text). Subtitles keep the original text;
// only what the voice reads gets pronunciation help.
//
// The Hebrew voice guesses vowels, so words that can be read two ways get niqqud here,
// and English terms are spelled the way people say them. To fix a word: add it to SAY,
// run `node tools/narration/speakable.mjs`, delete its clips and run generate.sh again.
import fs from 'node:fs';

const HEB = 'א-תְ-ׇ';
// whole-word replacement (Hebrew has no \b): not preceded/followed by a Hebrew letter or niqqud
const word = (w, prefixes = '') => new RegExp(`(?<![${HEB}])(${prefixes ? `[${prefixes}]?` : ''})${w}(?![${HEB}])`, 'g');

// [written, spoken, allowed one-letter prefixes (ו ה ב ל מ ש כ)]
const SAY = [
  // names
  ['גליץ[׳\']', "גְּלִיץ'", 'ומשל'],
  ['פינג', 'פִּינְג', 'ולמש'],
  // network words the voice tends to misread
  ['נתבים', 'נַתָּבִים', 'והבלמש'],
  ['נתב', 'נַתָּב', 'והבלמש'],
  ['ניתוב', 'נִיתּוּב', 'והבלמש'],
  ['מסוע', 'מַסּוֹעַ', 'והבלמש'],
  ['מסוף', 'מָסוֹף', 'והבלמש'],
  ['סשן', 'סֶשֶׁן', 'והבלמש'],
  ['מנות', 'מָנוֹת', 'והבלמש'],
  ['מנה', 'מָנָה', 'והבלמש'],
  ['מסגרות', 'מִסְגָּרוֹת', 'והבלמש'],
  ['מסגרת', 'מִסְגֶּרֶת', 'והבלמש'],
  ['יומן', 'יוֹמָן', 'והבלמש'],
  ['המרכזייה', 'הַמִּרְכָּזִיָּה', 'ובלמש'],
  ['מרכזייה', 'מִרְכָּזִיָּה', 'ובלמש'],
  ['תדריך', 'תִּדְרִיךְ', 'והבלמש'],
  ['המחוג', 'הַמָּחוֹג', 'ובלמש'],
  ['מפסקים', 'מַפְסְקִים', 'והבלמש'],
  ['צפצופים', 'צִפְצוּפִים', 'והבלמש'],
  ['פענוח', 'פִּעְנוּחַ', 'והבלמש'],
  ['לפענח', 'לְפַעְנֵחַ', 'ו'],
  ['מפענחים', 'מְפַעַנְחִים', 'ו'],
  ['פוענח', 'פֻּעְנַח', 'ו'],
  ['ממוספרים', 'מְמֻסְפָּרִים', 'ו'],
  ['מזהה', 'מְזַהֶה', 'והבלמש'],
  ['קידוד', 'קִידּוּד', 'והבלמש'],
  ['הסגל', 'הַסֶּגֶל', 'ובלמש'],
  ['מדמה', 'מְדַמָּה', 'ו'],
  ['סיב', 'סִיב', 'והבלמש'],
  ['פדיחה', 'פַדִּיחָה', 'ו'],
  // verbs whose spelling is also a different, more common word
  ['חודש', 'חֻדַּשׁ', ''],
  ['שוחזר', 'שֻׁחְזַר', 'ו'],
  ['אושרו', 'אֻשְּׁרוּ', 'ו'],
  ['מנותק', 'מְנֻתָּק', 'ו'],
  ['תיקנו', 'תִּיקַּנּוּ', 'ו'],
  ['תשוו', 'תַּשְׁווּ', 'ו'],
  ['אות-אות', 'אוֹת אוֹת', ''],
];

// English terms and codes, spelled out
const EN = [
  [/Wi-Fi/g, 'וַיי־פַיי'],
  [/HTTP\/HTTPS/g, 'אֵייץ׳ טִי טִי פִּי, וְאֵייץ׳ טִי טִי פִּי אֶס,'],
  [/HTTPS/g, 'אֵייץ׳ טִי טִי פִּי אֶס'],
  [/HTTP/g, 'אֵייץ׳ טִי טִי פִּי'],
  [/SMTP/g, 'אֶס אֶם טִי פִּי'],
  [/FTP/g, 'אֶף טִי פִּי'],
  [/TCP/g, 'טִי סִי פִּי'],
  [/UDP/g, 'יוּ דִי פִּי'],
  [/\s*\(ACK\)/g, ', אֶק'],
  [/ACK/g, 'אֶק'],
  [/MAC/g, 'מֶק'],
  [/OSI/g, 'אוֹ אֶס אַיי'],
  [/IP/g, 'אַיי פִּי'],
  [/R(\d)/g, 'אָר $1'],
  [/(^|\s)0 ו-1/g, '$1אֶפֶס וְאַחַת'],
  [/זה 0/g, 'זֶה אֶפֶס'],
  [/זה 1/g, 'זֶה אַחַת'],
  [/ה-(?=[א-ת])/g, 'הַ'],
  [/ב-(?=[א-ת])/g, 'בְּ'],
  [/ו-(?=[א-ת])/g, 'וְ'],
];

// English layer names in "LAYER 02 · DATA LINK נפתחה" → the Hebrew layer name
const LAYER_HE = { 'DATA LINK': 'שכבת הקו', NETWORK: 'שכבת הרשת', TRANSPORT: 'שכבת התעבורה', SESSION: 'שכבת השיחה', PRESENTATION: 'שכבת הייצוג', APPLICATION: 'שכבת היישום', PHYSICAL: 'השכבה הפיזית' };

export function speakable(text) {
  let t = text
    .replace(/ד[״"]ר/g, 'דוֹקְטוֹר')
    .replace(/LAYER 0(\d)\s*·\s*([A-Z ]+?)(?= [א-ת])/g, (_, n, en) => `שכבה ${n}, ${LAYER_HE[en.trim()] || en},`)
    .replace(/LAYER 0(\d)/g, 'שכבה $1')
    .replace(/(\S)- /g, '$1, ') // "שימו לב- הנה" → a short pause
    .replace(/\s*[–·]\s*/g, ', ')
    .replace(/[״"]/g, '')
    .replace(/\t|\n/g, ' ');
  for (const [w, say, pre] of SAY) t = t.replace(word(w, pre), (m, p) => p + say);
  for (const [re, say] of EN) t = t.replace(re, say);
  return t.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('speakable.mjs')) {
  const lines = JSON.parse(fs.readFileSync('tools/narration/lines.json', 'utf8'));
  fs.writeFileSync('tools/narration/lines.tsv', lines.map((l) => [l.key, l.who === 'glitch' ? 'he-IL-AvriNeural' : 'he-IL-HilaNeural', speakable(l.text)].join('\t')).join('\n') + '\n', 'utf8');
  console.log('ok', lines.length);
}
