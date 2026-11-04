// FarmerMate knowledge base.
// Short guides summarising widely published extension advice (ICAR, state agricultural
// universities, FAO IPM material). They are written for this prototype and should be
// reviewed by an agronomist before real-world use. Add more guides by adding objects here.

export const GUIDES = [
  {
    id: 'tomato-early-blight',
    title: 'Tomato: early blight',
    crops: ['tomato', 'potato'],
    text: `Early blight is caused by the fungus Alternaria solani. Signs: dark brown spots with concentric rings (a "target" pattern), often with a yellow halo, starting on older lower leaves. Stems can get dark lesions and fruit can rot near the stalk. It spreads in warm weather (24–29°C) with high humidity, dew or rain splash.
Management: remove and destroy infected lower leaves; do not compost them. Mulch the soil so spores do not splash up. Water at the base (drip is best), never on the leaves, and water in the morning. Space and stake plants for airflow. Spray a protective fungicide such as mancozeb, chlorothalonil or a copper fungicide at the label dose, repeating at the interval on the label, especially before humid or rainy spells. Rotate away from tomato, potato, chilli and brinjal for 2–3 years and use healthy seed.`,
  },
  {
    id: 'tomato-late-blight',
    title: 'Tomato and potato: late blight',
    crops: ['tomato', 'potato'],
    text: `Late blight is caused by Phytophthora infestans, a water mould. Signs: large, irregular, water-soaked grey-green patches that turn brown-black, often with white fuzzy growth on the leaf underside in humid mornings. Fruit and tubers get firm brown rot. It spreads extremely fast in cool (10–20°C), wet, foggy or cloudy weather and can destroy a field in a week.
Management: act immediately. Remove and destroy infected plants. Spray a fungicide effective against oomycetes (for example products with metalaxyl + mancozeb, cymoxanil + mancozeb, or dimethomorph) at the label dose; preventive mancozeb sprays are advised when cool, humid weather is forecast. Avoid overhead irrigation. For potato, earth up the rows to protect tubers and cut haulms before harvest if disease is present. Use certified healthy seed tubers and resistant varieties where available.`,
  },
  {
    id: 'tomato-leaf-curl',
    title: 'Tomato: leaf curl virus and whitefly',
    crops: ['tomato', 'chilli', 'cotton'],
    text: `Tomato leaf curl disease is caused by a virus spread by whiteflies (Bemisia tabaci). Signs: leaves curl upward and become small, thick and crinkled with yellow edges; plants are stunted and set few fruits. There is no cure for infected plants.
Management is about controlling whitefly and preventing early infection: raise nursery seedlings under 40–50 mesh insect net, uproot and destroy infected plants early, remove weeds that host whitefly, and use yellow sticky traps (around 10–12 per acre) to monitor. Grow a border crop such as maize or sorghum. Neem seed kernel extract (5%) or neem oil can suppress whitefly. If chemical control is needed, use a recommended insecticide at label dose and rotate chemical groups to avoid resistance. Choose leaf-curl tolerant varieties.`,
  },
  {
    id: 'tomato-fruit-borer',
    title: 'Tomato: fruit borer (Helicoverpa)',
    crops: ['tomato', 'cotton', 'chickpea'],
    text: `The tomato fruit borer, Helicoverpa armigera, is a caterpillar that bores round holes in fruit, often with droppings near the hole. One larva damages several fruits.
Management: install pheromone traps (about 5 per acre) to monitor moths. Plant African marigold as a trap crop (1 row for every 16 rows of tomato). Hand-pick and destroy damaged fruit and larvae. Release Trichogramma egg parasitoids or spray Bacillus thuringiensis (Bt) or HaNPV (a natural virus) in the evening when larvae are young. Neem seed kernel extract 5% helps against early stages. Use chemical insecticides only when damage crosses the economic threshold, at label dose, and respect the pre-harvest interval on the label.`,
  },
  {
    id: 'wheat-rust',
    title: 'Wheat: yellow, brown and black rust',
    crops: ['wheat'],
    text: `Rusts are fungal diseases. Yellow (stripe) rust: yellow powdery stripes along the leaf veins; favoured by cool (10–15°C) humid weather, common in north India in January–February. Brown (leaf) rust: scattered orange-brown pustules on leaves at 15–25°C. Black (stem) rust: dark red-brown elongated pustules on stems and leaves in warmer weather. Rubbing a leaf leaves coloured powder on your finger.
Management: grow rust-resistant varieties recommended for your zone and sow on time. Avoid excess nitrogen. Scout fields from January, especially near shelterbelts. At first appearance spray a recommended fungicide such as propiconazole or tebuconazole at label dose, and repeat after about 15 days if needed. Report yellow rust outbreaks to the local agriculture department.`,
  },
  {
    id: 'rice-blast',
    title: 'Rice: blast',
    crops: ['rice'],
    text: `Rice blast is caused by the fungus Magnaporthe oryzae. Signs: spindle or diamond-shaped spots with grey centres and brown edges on leaves; "neck blast" makes the panicle neck turn black and break so grains stay empty. It is favoured by high humidity, long dew periods, cloudy weather, cool nights and too much nitrogen.
Management: use resistant varieties and treat seed with a fungicide (for example carbendazim or Trichoderma/Pseudomonas bioagents). Apply nitrogen in split doses instead of all at once and avoid excess. Keep bunds clean of grassy weeds. At first leaf symptoms or at booting in blast-prone weather, spray a recommended fungicide such as tricyclazole or azoxystrobin at label dose.`,
  },
  {
    id: 'rice-bph',
    title: 'Rice: brown planthopper',
    crops: ['rice'],
    text: `The brown planthopper (BPH) is a small brown insect that sucks sap at the base of rice plants. Heavy attack causes "hopper burn": circular patches of plants drying and collapsing. Dense planting, high nitrogen and standing water favour it.
Management: tap plants over water to check numbers at the base. Leave 20 cm alleys every 2–3 metres for airflow and sunlight. Avoid excess nitrogen. Drain the field for a few days when numbers rise. Do not use synthetic pyrethroids, which kill natural enemies (spiders, mirid bugs) and cause BPH resurgence. If numbers exceed the threshold advised locally, spray a recommended insecticide such as pymetrozine or dinotefuran at label dose, directed at the base of the plants.`,
  },
  {
    id: 'onion-thrips-blotch',
    title: 'Onion: thrips and purple blotch',
    crops: ['onion', 'garlic'],
    text: `Thrips are tiny insects that rasp leaves, causing silvery-white streaks and twisted, drying leaf tips; they are worst in dry, warm weather. Purple blotch (Alternaria porri) causes small white sunken spots that grow into purple-brown lesions with yellow edges; it is worst in humid or rainy weather and often follows thrips damage.
Management: use healthy seedlings, plant a border of maize or wheat (2 rows) to block thrips, and use blue sticky traps to monitor. Spray neem oil or a recommended insecticide such as fipronil or spinosad when thrips build up, adding a sticker/spreader because onion leaves are waxy. For purple blotch, spray mancozeb or a recommended triazole fungicide at label dose at first symptoms and before humid spells. Avoid excess nitrogen and ensure good drainage. Stop irrigation 10–15 days before harvest and cure bulbs well.`,
  },
  {
    id: 'cotton-pink-bollworm',
    title: 'Cotton: pink bollworm',
    crops: ['cotton'],
    text: `Pink bollworm larvae feed inside flowers and bolls. Signs: "rosette" flowers that do not open fully, small exit holes, stained lint and damaged seeds inside opened bolls. It now attacks many Bt cotton varieties.
Management: sow on time and avoid extending the crop with late irrigation; terminate the crop by December-January and destroy stalks so the pest cannot carry over. Do not store cotton seed and stalks near fields. Install pheromone traps (about 5 per acre) from 45 days after sowing to monitor; mating disruption products can be used. Remove and destroy rosette flowers. Spray recommended insecticides only when trap catches or damaged bolls cross the local threshold, rotating chemical groups.`,
  },
  {
    id: 'maize-fall-armyworm',
    title: 'Maize: fall armyworm',
    crops: ['maize', 'sorghum'],
    text: `Fall armyworm (Spodoptera frugiperda) larvae feed in the whorl of young maize plants. Signs: ragged holes and "window-pane" scraping on leaves, sawdust-like droppings in the whorl. Larger larvae have an inverted "Y" mark on the head and four dark spots in a square near the tail.
Management: scout fields twice a week in the first 40 days. Put sand or a sand-lime mix in the whorl of young plants. Install pheromone traps. Intercrop with legumes (such as pulses) and conserve natural enemies. Biopesticides such as Bacillus thuringiensis, Metarhizium or neem-based products work on young larvae. If damage exceeds about 10% of plants, spray a recommended insecticide such as emamectin benzoate, spinetoram or chlorantraniliprole into the whorl at label dose.`,
  },
  {
    id: 'powdery-downy-mildew',
    title: 'Powdery mildew and downy mildew (vegetables, grapes)',
    crops: ['grape', 'cucumber', 'pumpkin', 'okra', 'pea', 'chilli'],
    text: `Powdery mildew: white, flour-like powder on the upper surface of leaves; favoured by dry days with cool, humid nights. Downy mildew: yellow angular patches on top of leaves with grey-purple fuzzy growth underneath; favoured by wet, humid weather and leaf wetness.
Management: give plants space and airflow, remove badly infected leaves and avoid wetting leaves when irrigating. For powdery mildew, sulphur-based fungicides (avoid in very hot weather above about 32°C), or recommended systemic fungicides at label dose. For downy mildew, use protective sprays like mancozeb or copper before wet spells and recommended systemic products once it appears. Rotate fungicide groups to slow resistance.`,
  },
  {
    id: 'irrigation-weather',
    title: 'Irrigation and spraying around the weather',
    crops: ['all'],
    text: `Water early in the morning so leaves dry quickly; evening watering keeps leaves wet overnight and favours fungal disease. If good rain (around 10 mm or more) is forecast within a day or two, skip or reduce irrigation. Drip irrigation saves 30–50% water and keeps leaves dry; mulching cuts evaporation. Check soil moisture by squeezing soil from root depth: if it crumbles, irrigate; if it forms a sticky ball, wait.
Spraying: spray in calm conditions (wind under about 10–15 km/h) in early morning or late afternoon, not in strong midday heat. Most sprays need 4–6 hours without rain to stick; do not spray if rain is expected sooner. High humidity plus warm temperatures raise fungal disease risk, so preventive fungicide sprays are best timed before those spells. Hot, dry, windy weather raises mite and thrips risk and crop water need. Frost risk below about 4°C: light irrigation in the evening can protect crops.`,
  },
  {
    id: 'soil-fertilizer',
    title: 'Soil health and fertilizer basics',
    crops: ['all'],
    text: `Test soil every 2–3 years. In India, the government Soil Health Card scheme gives free soil tests with crop-wise fertilizer recommendations through the local agriculture office or Krishi Vigyan Kendra (KVK). Nitrogen (N) drives leafy growth; too much makes soft growth that attracts pests and disease. Phosphorus (P) helps roots and flowering. Potassium (K) improves fruit quality and stress tolerance.
Common deficiency signs: nitrogen, older leaves turn pale yellow evenly; potassium, scorched yellow-brown leaf edges on older leaves; zinc, small leaves and yellow stripes or "khaira" in rice; iron, yellow young leaves with green veins. Apply nitrogen in split doses rather than all at sowing. Add organic matter (farmyard manure, compost, vermicompost, green manure) to improve soil structure and water holding. Use biofertilizers such as Rhizobium for pulses and Azotobacter or PSB for cereals.`,
  },
  {
    id: 'ipm-safety',
    title: 'Integrated pest management and pesticide safety',
    crops: ['all'],
    text: `Integrated pest management (IPM) means: prevent first (resistant varieties, crop rotation, clean seed, field hygiene), monitor regularly (scouting, sticky and pheromone traps), use biological and mechanical controls (natural enemies, neem, hand-picking), and use chemical pesticides only when pest levels cross the economic threshold.
Safety: always read and follow the label for dose, mixing and the pre-harvest interval (days to wait before harvest). Wear gloves, a mask, long sleeves and eye protection while mixing and spraying. Do not spray against the wind, do not eat, drink or smoke while spraying, and wash well afterwards. Keep pesticides locked away from children and food, and never reuse empty containers. Do not mix products unless the label allows it. Rotate chemical groups to slow resistance. In case of poisoning symptoms (dizziness, vomiting, breathing trouble), get medical help immediately and take the label with you.`,
  },
  {
    id: 'potato-general',
    title: 'Potato: common problems',
    crops: ['potato'],
    text: `Besides late and early blight, common potato problems include: black scurf (black crusts on tubers; use healthy seed and treat seed), common scab (rough corky patches; keep soil moist during tuber formation and avoid fresh manure and high soil pH), aphids that spread viruses (mosaic, leaf roll; use certified seed, rogue out sick plants, cut haulms on time in seed crops), and green tubers from sunlight exposure (earth up properly).
Store only healthy, cured tubers in a cool, dark, ventilated place. Rotate potato with cereals and avoid planting after tomato, brinjal or chilli.`,
  },
  {
    id: 'when-to-get-help',
    title: 'When to ask a local expert',
    crops: ['all'],
    text: `Some problems need someone to see the field: sudden wilting of many plants, unknown pests spreading quickly, suspected virus outbreaks, or anything after a pesticide spray has failed. In India, farmers can call the Kisan Call Centre on 1800-180-1551 (toll free) for advice in local languages, or visit the nearest Krishi Vigyan Kendra (KVK) or agriculture extension officer. Carry a fresh sample in a plastic bag and photos of the whole field and close-ups.`,
  },
];
