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
  {
    id: 'chilli-anthracnose',
    title: 'Chilli: anthracnose (fruit rot and dieback)',
    crops: ['chilli', 'capsicum'],
    text: `Anthracnose is caused by Colletotrichum fungi. Signs: sunken, dark, circular spots on ripening fruits, often with rings of tiny black dots; fruits turn straw-coloured and rot. Twigs can die back from the tip. It spreads by rain splash and infected seed, and is worst in warm (25–30°C), wet weather during fruiting.
Management: use healthy or treated seed and disease-free seedlings. Pick and destroy infected fruits; do not leave them in the field. Avoid overhead irrigation and wide-space plants for airflow. Spray a recommended fungicide (for example mancozeb, copper oxychloride or azoxystrobin-type products) at the label dose from flowering when wet weather is forecast, and rotate products. Harvest on dry days and dry fruits quickly on clean sheets, not on bare soil.`,
  },
  {
    id: 'chilli-thrips-mites',
    title: 'Chilli: leaf curl from thrips and mites',
    crops: ['chilli', 'capsicum'],
    text: `Chilli leaf curl ("murda") is usually caused by sucking pests, sometimes together with a virus. Thrips make leaves curl upward and boat-shaped with silvery patches; yellow mites make leaves curl downward with long leaf stalks, like an inverted boat. Plants stay stunted and drop flowers. Both build up in hot, dry weather.
Management: check the underside of young leaves with a hand lens every week. Use blue sticky traps for thrips and yellow for whitefly. Spray neem oil or neem seed kernel extract early. If pests keep rising, use a recommended insecticide for thrips or a miticide (acaricide) for mites at the label dose: ordinary insecticides do not kill mites. Avoid repeated use of the same product, and avoid too much nitrogen, which makes soft growth pests love. Grow a border of maize or sorghum to slow pests flying in.`,
  },
  {
    id: 'maize-leaf-blight',
    title: 'Maize: turcicum (northern) leaf blight',
    crops: ['maize', 'sorghum'],
    text: `Turcicum leaf blight is caused by the fungus Exserohilum turcicum. Signs: long, cigar-shaped grey-green to tan lesions, 3–15 cm, starting on lower leaves and moving up. Severe attacks before tasselling can cut yield heavily. It is favoured by moderate temperatures (18–27°C), heavy dew, and cloudy, humid weather. The fungus survives on old maize residue.
Management: grow tolerant hybrids recommended for your area. Rotate with a non-cereal crop and plough in or remove infected residue. Avoid very dense planting. If lesions appear on leaves below the cob before tasselling and wet weather continues, spray a recommended fungicide such as mancozeb or a triazole at the label dose. Balanced fertiliser, especially enough potash, helps plants resist it.`,
  },
  {
    id: 'sugarcane-red-rot',
    title: 'Sugarcane: red rot',
    crops: ['sugarcane'],
    text: `Red rot is caused by the fungus Colletotrichum falcatum and is the most damaging sugarcane disease in India. Signs: the third or fourth leaf from the top yellows and dries, then the whole crown withers. Split the cane lengthwise: the inside is red with white cross-wise patches and has a sour, alcoholic smell. It spreads through infected setts (planting pieces), rain, irrigation water and waterlogging.
Management: there is no cure once a cane is infected. Plant only healthy setts from a disease-free field and choose resistant varieties recommended locally. Treat setts with a recommended fungicide before planting. Uproot and burn infected clumps as soon as you see them. Do not let water flow from a diseased field to a healthy one, improve drainage, and do not keep a ratoon (regrowth) crop from an infected field. Rotate with another crop for 2–3 years.`,
  },
  {
    id: 'sugarcane-borers',
    title: 'Sugarcane: early shoot borer and top borer',
    crops: ['sugarcane'],
    text: `Early shoot borer attacks young cane in the first 3 months, mostly in hot, dry weather: the central shoot dries into a "dead heart" that pulls out easily and smells bad. Top borer tunnels into the growing point later, causing a dead heart with a bunchy top of side shoots and rows of shot holes on leaves.
Management: plant early where possible, and keep the soil moist with light, frequent irrigation and trash mulching in the hot months: dry soil favours shoot borer. Remove and destroy dead hearts and egg masses. Earth up the crop at about 45 days. Release Trichogramma egg parasitoid cards where available from your sugar mill or KVK. Use a recommended insecticide at the label dose only when damage is heavy.`,
  },
  {
    id: 'cotton-sucking-pests',
    title: 'Cotton: whitefly, jassids, aphids and thrips',
    crops: ['cotton'],
    text: `Sucking pests feed on sap from the leaf underside. Jassids (leafhoppers) make leaf edges turn yellow then red and curl down ("hopper burn"). Whitefly causes sticky honeydew, black sooty mould and can spread cotton leaf curl virus. Aphids and thrips curl and crinkle young leaves. They build up in hot, dry spells and after too much nitrogen or too many early sprays that kill their natural enemies.
Management: avoid insecticide sprays in the first 60 days if you can, so ladybirds, lacewings and spiders can work. Scout weekly and act only above the local threshold. Use yellow sticky traps, and spray neem-based products first. If needed, use a recommended selective insecticide at the label dose and rotate chemical groups. Do not mix several insecticides together. Remove weeds that host whitefly, and avoid very late sowing.`,
  },
  {
    id: 'rice-water-blb',
    title: 'Rice: water management and bacterial leaf blight',
    crops: ['rice'],
    text: `Water: rice does not need deep standing water all season. Keep 2–5 cm of water after transplanting, and never let the field dry at tillering, panicle initiation and flowering. Alternate wetting and drying (letting water drop to about 15 cm below the soil surface before re-flooding) can save a quarter of the water without losing yield. Drain the field 10–15 days before harvest.
Bacterial leaf blight: yellow to straw-coloured wavy stripes from the leaf tip down the edges, often after storms and with heavy nitrogen. In the morning, cut leaves may show milky ooze. No spray cures it well. Use resistant varieties and clean seed, apply nitrogen in split doses rather than all at once, drain the field for a few days when it appears, and do not move water from infected to healthy fields.`,
  },
  {
    id: 'wheat-growing',
    title: 'Wheat: sowing time, irrigation stages and yellowing',
    crops: ['wheat'],
    text: `Sow on time: in north India, the first half of November is best; late sowing loses yield every week because the crop meets heat at grain filling. Use treated, certified seed.
Irrigation by stage matters more than the number of irrigations. The most critical is crown root initiation (CRI), about 20–25 days after sowing: never miss it. Then tillering, jointing, flowering, milk and dough stages. If water is short, protect CRI, jointing and milk stage. Do not irrigate on windy days late in the season, because the crop can lodge (fall over).
Yellowing: general pale yellow on old leaves usually means nitrogen is short; yellow stripes in powdery lines that rub off on your fingers mean yellow rust, which needs fast action; yellowing after heavy irrigation on heavy soil is often waterlogging.`,
  },
  {
    id: 'onion-growing',
    title: 'Onion: nursery, bulb growth and storage',
    crops: ['onion', 'garlic'],
    text: `Raise seedlings on raised beds with good drainage; damping-off (seedlings falling over at the soil line) comes from wet, crowded beds. Transplant at 6–8 weeks.
Onion has shallow roots, so it needs light, frequent irrigation, especially while bulbs are swelling. Stop irrigation 10–15 days before harvest, when about half the tops have fallen over: late watering causes rots in storage. Too much nitrogen late in the season gives thick necks and poor keeping quality; sulphur improves pungency and storage.
Harvest in dry weather. Cure bulbs in the field for a few days with the tops covering the bulbs from the sun, then in shade until the necks are tight and dry. Store in a cool, dry, airy structure in thin layers, and sort out rotting bulbs regularly.`,
  },
  {
    id: 'nutrient-deficiency',
    title: 'Reading leaves: nutrient deficiency symptoms',
    crops: ['all'],
    text: `Where the symptom starts tells you a lot. Nutrients that move inside the plant (nitrogen, phosphorus, potassium, magnesium) show first on OLD lower leaves. Nutrients that do not move (iron, zinc, sulphur, calcium, boron) show first on YOUNG top leaves.
Nitrogen: even pale yellow on old leaves, weak growth. Phosphorus: dark, dull leaves with purple tints, poor roots. Potassium: yellow then brown scorched leaf edges on old leaves. Magnesium: yellow between green veins on old leaves. Iron: yellow between veins on the youngest leaves, common on high-pH soils. Zinc: small leaves, short internodes, pale bands; "khaira" in rice. Sulphur: uniform yellow on young leaves. Calcium: blossom end rot in tomato, tip burn. Boron: hollow or cracked stems and fruits, poor fruit set.
Disease spots are usually irregular or ringed and scattered; deficiencies are usually symmetric and follow a pattern. Confirm with a soil test before applying large amounts.`,
  },
  {
    id: 'spray-best-practice',
    title: 'Spraying: best time to spray, weather and doing it right',
    crops: ['all'],
    text: `Spray in the early morning or evening when wind is low (under about 10–12 km/h), it is not hot, and no rain is expected for at least 6 hours. Hot afternoons make spray evaporate and can scorch leaves; wind causes drift onto you and neighbouring crops. Evening sprays are safest for bees during flowering.
Use clean water, measure the product, and follow the label dose: more is not better and speeds up resistance. Cover both sides of the leaves; many pests and diseases sit on the underside. Do not mix products unless the labels allow it. Rotate between chemical groups rather than brands. Respect the pre-harvest interval (waiting days before harvest).
Wear gloves, a mask, long sleeves and shoes; never eat, drink or smoke while spraying; wash after. Triple-rinse empty containers and never reuse them.`,
  },
  {
    id: 'crop-water-need',
    title: 'How much water a crop needs at each stage',
    crops: ['all'],
    text: `A crop's water use depends on the weather and on its growth stage. Agronomists estimate it as reference evapotranspiration (ET0, how much water a field of short grass would use that day, in mm) multiplied by a crop coefficient (Kc). Kc is low for small seedlings (about 0.3–0.6), highest when the crop fully covers the ground and is flowering or filling (about 1.05–1.25), and drops again as it ripens. One mm of water equals one litre per square metre, or about 4,000 litres per acre.
So a full-grown crop on a hot, dry, windy day can need 6–8 mm, while the same crop as a seedling needs 2 mm. Subtract useful rain. Drip irrigation loses the least water; flood irrigation needs extra to cover losses. Sandy soils need smaller, more frequent irrigations than clay soils. Water stress at flowering and grain or fruit filling costs the most yield.`,
  },
  {
    id: 'organic-inputs',
    title: 'Low-cost organic and biological options',
    crops: ['all'],
    text: `Neem: neem seed kernel extract and neem oil sprays deter and slow down sucking pests and young caterpillars; they work best early, on small pest numbers, sprayed in the evening. Traps: yellow sticky traps for whitefly and aphids, blue for thrips, pheromone traps to monitor moths such as fruit borer, pink bollworm and fall armyworm. Light traps catch many night-flying moths.
Biologicals: Trichoderma mixed with compost protects roots from wilt and rot fungi; Trichogramma cards control borer eggs; Bt (Bacillus thuringiensis) and NPV kill caterpillars without harming helpful insects; Beauveria and Metarhizium fungi attack many pests in humid weather.
Soil: well-rotted farmyard manure or compost, green manure crops like dhaincha or sunhemp, and mulching improve soil life and water holding. Organic methods are strongest at prevention; a severe outbreak may still need a targeted product.`,
  },
  {
    id: 'seed-nursery',
    title: 'Seed treatment and healthy seedlings',
    crops: ['all'],
    text: `Many diseases start on the seed or in the nursery. Buy certified seed where possible and check the germination of saved seed by sprouting 100 seeds in a damp cloth: under about 80% means use more seed or replace it.
Treat seed before sowing with a recommended fungicide or with Trichoderma; for pulses, add the right Rhizobium culture last. Treated seed is poison: never eat it or feed it to animals.
For nursery crops (tomato, chilli, onion, rice), use raised beds or trays with clean soil or cocopeat, sow thinly, and water lightly in the morning. Crowded, overwatered seedlings get damping-off. Cover with insect net to keep whitefly and thrips, which carry viruses, off young plants. Harden seedlings by reducing water for a few days before transplanting, and transplant in the evening.`,
  },
  {
    id: 'weeds',
    title: 'Weed control: the critical period',
    crops: ['all'],
    text: `Weeds do most of their damage early. For most field crops the critical period is roughly the first third of the season (about 15–45 days after sowing for wheat, maize and cotton; the first 6 weeks for onion and transplanted vegetables). Keep the crop clean then and later weeds matter much less.
Combine methods: clean seed, a stale seedbed (irrigate, let weeds sprout, then destroy them before sowing), correct spacing so the crop shades the soil quickly, mulching in vegetables, and timely hand or mechanical weeding. Crop rotation breaks weed cycles.
If using herbicides, pick the product for your crop and weed type, apply at the right crop stage with a flat-fan nozzle on moist soil, and follow the label dose exactly: wrong product or timing can kill the crop. Rotate herbicide groups; repeated use of one group has created resistant weeds such as Phalaris minor in wheat.`,
  },
  {
    id: 'harvest-storage',
    title: 'Harvest and storage: keeping what you grew',
    crops: ['all'],
    text: `A large share of losses happens after harvest. Harvest grain at the right maturity and dry it well before storing: roughly 12% moisture or less for wheat and maize, 14% or less for paddy. A simple test: a dry grain cracks sharply between the teeth. Dry on clean tarpaulins, not bare ground.
Store in clean, dry, insect-proof containers. Hermetic (airtight) bags or metal bins protect grain without chemicals. Keep bags off the floor on pallets and away from walls. Clean out old grain and dust, where storage pests hide, before the new crop goes in.
For vegetables and fruit: harvest in the cool of the morning, handle gently, keep produce in shade, sort out damaged pieces, and use ventilated crates rather than sacks. Check mandi prices before deciding when to sell.`,
  },
];
