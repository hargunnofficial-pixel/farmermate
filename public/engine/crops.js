// Crop and threat data for FarmerMate's "farm brain".
// Pure data + maths: no browser or server code here, so the same files run in the app and in the tests.
//
// SOURCES (simplified for a prototype; an agronomist should review before real use)
// - Growth stage lengths and crop coefficients (Kc): FAO Irrigation and Drainage Paper 56, tables 11 and 12.
// - Disease weather rules: classic "infection period" models: warm/cool temperature band + hours of leaf wetness
//   (for example the Hyre and Wallin late blight rules, and the 10-10-24 rule for grape downy mildew).

// The four FAO-56 growth stages, in farmer words.
export const STAGES = [
  { id: 'establish', en: 'Establishing', hi: 'जमाव' },
  { id: 'grow', en: 'Growing', hi: 'बढ़वार' },
  { id: 'peak', en: 'Flowering & filling', hi: 'फूल और भराव' },
  { id: 'ripen', en: 'Ripening', hi: 'पकाव' },
];

// days: length of each of the four stages. kc: [initial, mid-season, end].
export const CROP_DATA = {
  tomato: { days: [30, 40, 45, 30], kc: [0.6, 1.15, 0.8], threats: ['lateBlight', 'earlyBlight', 'whitefly'] },
  potato: { days: [25, 30, 45, 30], kc: [0.5, 1.15, 0.75], threats: ['lateBlight', 'earlyBlight'] },
  wheat: { days: [15, 25, 50, 30], kc: [0.4, 1.15, 0.3], threats: ['rust', 'powdery'] },
  rice: { days: [30, 30, 60, 30], kc: [1.05, 1.2, 0.9], threats: ['blast'], flooded: true },
  onion: { days: [15, 25, 70, 40], kc: [0.7, 1.05, 0.75], threats: ['purpleBlotch', 'downy'] },
  cotton: { days: [30, 50, 60, 55], kc: [0.35, 1.18, 0.6], threats: ['whitefly'] },
  maize: { days: [20, 35, 40, 30], kc: [0.3, 1.2, 0.5], threats: ['leafBlight'] },
  chilli: { days: [30, 35, 40, 20], kc: [0.6, 1.05, 0.9], threats: ['anthracnose', 'powdery', 'whitefly'] },
  sugarcane: { days: [35, 60, 190, 120], kc: [0.4, 1.25, 0.75], threats: ['redRot'] },
  grape: { days: [20, 40, 120, 60], kc: [0.3, 0.85, 0.45], threats: ['downy', 'powdery'], perennial: true },
};

// kind 'wet'    : risk grows with hours of leaf wetness (humidity >= 90% or rain) inside a temperature band
// kind 'rain'   : needs real rain plus mild temperatures (downy mildew), falls back to the wet rule
// kind 'dry'    : likes warm, dry days with humid nights (powdery mildew)
// kind 'hotdry' : sucking pests that build up in hot, dry weather
export const THREATS = {
  lateBlight: {
    en: 'Late blight', hi: 'पछेती झुलसा', kind: 'wet', band: [10, 24], med: 6, high: 10, guide: 'tomato-late-blight',
    do: { en: 'Check lower leaves for grey-green wet patches. A protective fungicide before the wet spell works best.', hi: 'निचली पत्तियों पर गीले धूसर धब्बे देखें। नमी वाले मौसम से पहले बचाव वाला फफूंदनाशक सबसे अच्छा काम करता है।' },
  },
  earlyBlight: {
    en: 'Early blight', hi: 'अगेती झुलसा', kind: 'wet', band: [22, 30], med: 6, high: 10, guide: 'tomato-early-blight',
    do: { en: 'Look for brown spots with rings on old leaves. Remove them and keep leaves dry.', hi: 'पुरानी पत्तियों पर छल्लेदार भूरे धब्बे देखें। उन्हें हटाएँ और पत्तियाँ सूखी रखें।' },
  },
  rust: {
    en: 'Rust', hi: 'रतुआ', kind: 'wet', band: [10, 25], med: 4, high: 8, guide: 'wheat-rust',
    do: { en: 'Walk the field and look for yellow or brown powdery stripes on leaves.', hi: 'खेत में घूमकर पत्तियों पर पीली या भूरी पाउडर जैसी धारियाँ देखें।' },
  },
  blast: {
    en: 'Blast', hi: 'ब्लास्ट (झोंका)', kind: 'wet', band: [20, 28], med: 8, high: 12, guide: 'rice-blast',
    do: { en: 'Look for spindle-shaped spots with grey centres. Avoid extra urea now.', hi: 'धूसर बीच वाले आँख जैसे धब्बे देखें। अभी ज़्यादा यूरिया न डालें।' },
  },
  purpleBlotch: {
    en: 'Purple blotch', hi: 'बैंगनी धब्बा', kind: 'wet', band: [21, 30], med: 8, high: 12, guide: 'onion-thrips-blotch',
    do: { en: 'Check leaves for purple patches with yellow edges. Control thrips, they open the door for it.', hi: 'पत्तियों पर पीले किनारे वाले बैंगनी धब्बे देखें। थ्रिप्स पर काबू रखें, वही रोग का रास्ता खोलते हैं।' },
  },
  anthracnose: {
    en: 'Anthracnose', hi: 'एन्थ्रेक्नोज (फल सड़न)', kind: 'wet', band: [24, 31], med: 8, high: 12, guide: 'chilli-anthracnose',
    do: { en: 'Look for sunken dark spots on fruits. Pick and destroy affected fruits.', hi: 'फलों पर धँसे हुए काले धब्बे देखें। खराब फल तोड़कर नष्ट करें।' },
  },
  leafBlight: {
    en: 'Leaf blight', hi: 'पत्ती झुलसा', kind: 'wet', band: [18, 27], med: 6, high: 10, guide: 'maize-leaf-blight',
    do: { en: 'Look for long grey-brown cigar-shaped patches on lower leaves.', hi: 'निचली पत्तियों पर लंबे धूसर-भूरे धब्बे देखें।' },
  },
  redRot: {
    en: 'Red rot', hi: 'लाल सड़न', kind: 'wet', band: [25, 33], med: 10, high: 14, guide: 'sugarcane-red-rot',
    do: { en: 'Watch for drying top leaves. Split a suspect cane: red inside with white patches means red rot.', hi: 'ऊपर की सूखती पत्तियाँ देखें। शक वाला गन्ना चीरें: अंदर लाल रंग और सफेद धब्बे हों तो लाल सड़न है।' },
  },
  downy: {
    en: 'Downy mildew', hi: 'डाउनी मिल्ड्यू', kind: 'rain', band: [10, 25], med: 8, high: 12, rainMm: 10, guide: 'powdery-downy-mildew',
    do: { en: 'Check leaf undersides for white-grey fuzz after wet nights. Improve airflow.', hi: 'गीली रातों के बाद पत्ती के नीचे सफेद-धूसर रोएँ देखें। हवा का बहाव बढ़ाएँ।' },
  },
  powdery: {
    en: 'Powdery mildew', hi: 'पाउडरी मिल्ड्यू', kind: 'dry', band: [18, 30], guide: 'powdery-downy-mildew',
    do: { en: 'Look for white powder on leaves. It spreads in dry days with humid nights, not in rain.', hi: 'पत्तियों पर सफेद पाउडर देखें। यह बारिश में नहीं, सूखे दिन और नम रातों में फैलता है।' },
  },
  whitefly: {
    en: 'Whitefly & sucking pests', hi: 'सफेद मक्खी और रस चूसक कीट', kind: 'hotdry', guide: 'tomato-leaf-curl',
    do: { en: 'Shake plants and check leaf undersides. Use yellow sticky traps to keep watch.', hi: 'पौधे हिलाकर पत्तियों के नीचे देखें। निगरानी के लिए पीले चिपचिपे ट्रैप लगाएँ।' },
  },
};

// What to focus on in each stage (same for every crop; crop-specific advice comes from the AI chat).
export const STAGE_TASKS = {
  establish: {
    en: ['Keep the top soil moist but not flooded', 'Fill gaps where seeds or seedlings failed', 'Weed early: young plants lose most to weeds'],
    hi: ['ऊपरी मिट्टी नम रखें, पानी भरने न दें', 'जहाँ पौधे नहीं जमे वहाँ दोबारा लगाएँ', 'शुरू में ही निराई करें: छोटे पौधों को खरपतवार सबसे ज़्यादा नुकसान करते हैं'],
  },
  grow: {
    en: ['Give the first top-dressing of nitrogen in split doses', 'Scout twice a week for pests and leaf spots', 'Earth up or stake plants that need support'],
    hi: ['नाइट्रोजन की पहली खुराक टुकड़ों में दें', 'हफ्ते में दो बार कीट और धब्बों की जाँच करें', 'जिन पौधों को सहारा चाहिए उन पर मिट्टी चढ़ाएँ या बाँधें'],
  },
  peak: {
    en: ['Never let the crop run short of water now: this stage decides the yield', 'Spray only in the evening so bees and pollinators are safe', 'Watch closely for disease: the canopy is dense and stays wet'],
    hi: ['अभी पानी की कमी बिल्कुल न होने दें: यही अवस्था उपज तय करती है', 'छिड़काव सिर्फ शाम को करें ताकि मधुमक्खियाँ सुरक्षित रहें', 'रोग पर कड़ी नज़र रखें: घनी फसल देर तक गीली रहती है'],
  },
  ripen: {
    en: ['Reduce irrigation as the crop matures', 'Check the pre-harvest interval on the label before any spray', 'Plan harvest for dry days and arrange storage or transport'],
    hi: ['फसल पकने पर सिंचाई कम करें', 'किसी भी छिड़काव से पहले लेबल पर कटाई से पहले का अंतराल देखें', 'कटाई सूखे दिनों में करें और भंडारण या ढुलाई का इंतज़ाम करें'],
  },
};
