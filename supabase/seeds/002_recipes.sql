-- ─── Recipe Seed Data — 40 Curated Recipes ───────────────────────
-- Run after 001_protocols.sql and 003_meal_plans migration

insert into recipes (title, description, dietary_tags, seasons, ingredients, instructions, macros, image_query, sensitivity_flags, is_ai_generated, is_public, prep_time_minutes, servings)
values

-- ═══════════════════════════════════════════════
-- ENS / MABC PROTOCOL SPECIFIC (8 recipes)
-- ═══════════════════════════════════════════════

(
  'Boron-Rich Stone Fruit Almond Bowl',
  'A therapeutic breakfast bowl rich in dietary boron — a trace mineral critical for hormone regulation, calcium metabolism, and the MABC protocol. Raisins, prunes, almonds, and avocado deliver boron in a bioavailable whole-food matrix.',
  '{"ens-protocol","mabc","gluten-free","dairy-free","vegan"}',
  '{"summer","fall"}',
  '[
    {"name":"raisins","amount":"2","unit":"tbsp"},
    {"name":"pitted prunes","amount":"4","unit":"pieces"},
    {"name":"dried apricots","amount":"4","unit":"pieces"},
    {"name":"raw almonds","amount":"1/4","unit":"cup"},
    {"name":"ripe avocado","amount":"1/2","unit":"piece"},
    {"name":"canned chickpeas","amount":"1/2","unit":"cup"},
    {"name":"fresh lemon juice","amount":"1","unit":"tbsp"},
    {"name":"extra-virgin olive oil","amount":"1","unit":"tbsp"},
    {"name":"sea salt","amount":"1/4","unit":"tsp"},
    {"name":"fresh mint leaves","amount":"6","unit":"pieces"}
  ]',
  '1. Rinse and drain chickpeas; pat dry with a paper towel.
2. Dice avocado into 1/2-inch cubes and toss with lemon juice to prevent browning.
3. Roughly chop prunes and apricots into bite-sized pieces.
4. Combine chickpeas, avocado, raisins, prunes, apricots, and almonds in a bowl.
5. Drizzle with olive oil and sprinkle with sea salt.
6. Garnish with fresh mint leaves.
7. Serve immediately or store avocado separately if prepping ahead.',
  '{"calories":420,"protein_g":11,"carbs_g":52,"fat_g":21,"fiber_g":9}',
  'almond fruit bowl',
  '{"gluten","dairy"}',
  false, true, 10, 1
),

(
  'Magnesium Restoration Greens & Seeds Bowl',
  'A magnesium-first therapeutic bowl drawing from the highest whole-food sources: pumpkin seeds, dark leafy greens, and black beans. Supports nervous system regulation and the parasympathetic restoration phase of the ENS protocol.',
  '{"ens-protocol","mabc","gluten-free","dairy-free","vegan","paleo-adjacent"}',
  '{"spring","fall","winter"}',
  '[
    {"name":"baby spinach","amount":"2","unit":"cups"},
    {"name":"Swiss chard leaves","amount":"1","unit":"cup"},
    {"name":"cooked black beans","amount":"1/2","unit":"cup"},
    {"name":"raw pumpkin seeds","amount":"3","unit":"tbsp"},
    {"name":"85% dark chocolate","amount":"1","unit":"square"},
    {"name":"roasted sweet potato","amount":"1/2","unit":"cup"},
    {"name":"tahini","amount":"1","unit":"tbsp"},
    {"name":"garlic clove","amount":"1","unit":"piece"},
    {"name":"apple cider vinegar","amount":"1","unit":"tsp"},
    {"name":"sea salt and black pepper","amount":"to taste","unit":""}
  ]',
  '1. Massage spinach and Swiss chard with a pinch of sea salt until slightly wilted.
2. Roast sweet potato at 400°F for 20 minutes or use pre-roasted cubes.
3. Warm black beans in a small pan with minced garlic until fragrant.
4. Whisk tahini with apple cider vinegar and 2 tbsp warm water to make dressing.
5. Arrange greens, beans, and sweet potato in a bowl.
6. Top with pumpkin seeds and drizzle with tahini dressing.
7. Grate or roughly chop dark chocolate over the top as a magnesium finisher.
8. Season with salt and pepper.',
  '{"calories":390,"protein_g":16,"carbs_g":44,"fat_g":18,"fiber_g":12}',
  'dark leafy greens seeds',
  '{"dairy","gluten"}',
  false, true, 25, 1
),

(
  'ENS Bone Broth & Collagen Healing Soup',
  'The foundational gut-healing soup of the ENS Restoration Protocol. High-quality bone broth delivers collagen peptides, glycine, and glutamine — the three key substrates for intestinal lining repair and tight junction restoration.',
  '{"ens-protocol","mabc","gut-healing","gluten-free","dairy-free","paleo","aip"}',
  '{"fall","winter"}',
  '[
    {"name":"organic beef or chicken bone broth","amount":"4","unit":"cups"},
    {"name":"collagen peptide powder","amount":"2","unit":"scoops"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"garlic cloves","amount":"3","unit":"pieces"},
    {"name":"turmeric powder","amount":"1","unit":"tsp"},
    {"name":"zucchini","amount":"1","unit":"medium"},
    {"name":"shiitake mushrooms","amount":"1/2","unit":"cup"},
    {"name":"coconut aminos","amount":"1","unit":"tbsp"},
    {"name":"fresh lemon juice","amount":"1","unit":"tbsp"},
    {"name":"sea salt","amount":"to taste","unit":""}
  ]',
  '1. Bring bone broth to a gentle simmer in a medium saucepan over medium heat.
2. Mince garlic and grate fresh ginger; add both to the broth.
3. Add turmeric, coconut aminos, and shiitake mushrooms. Simmer 10 minutes.
4. Spiralize or thinly slice zucchini; add to the pot in the final 3 minutes.
5. Remove from heat. Stir in collagen powder until fully dissolved.
6. Finish with fresh lemon juice and adjust salt.
7. Serve immediately — collagen degrades when boiled, so keep below a rolling boil.',
  '{"calories":210,"protein_g":24,"carbs_g":12,"fat_g":6,"fiber_g":2}',
  'bone broth soup bowl',
  '{"soy","gluten","dairy"}',
  false, true, 20, 2
),

(
  'Marshmallow Root Gut-Soothing Porridge',
  'A deeply therapeutic morning porridge built around marshmallow root — a demulcent herb that coats and soothes inflamed intestinal mucosa. Slippery elm adds additional mucilaginous protection for leaky gut repair.',
  '{"ens-protocol","gut-healing","gluten-free","dairy-free","vegan"}',
  '{"fall","winter"}',
  '[
    {"name":"gluten-free rolled oats","amount":"1/2","unit":"cup"},
    {"name":"slippery elm bark powder","amount":"1","unit":"tsp"},
    {"name":"marshmallow root powder","amount":"1","unit":"tsp"},
    {"name":"coconut milk","amount":"1","unit":"cup"},
    {"name":"raw honey","amount":"1","unit":"tsp"},
    {"name":"ground cinnamon","amount":"1/2","unit":"tsp"},
    {"name":"collagen peptides","amount":"1","unit":"scoop"},
    {"name":"fresh blueberries","amount":"1/4","unit":"cup"}
  ]',
  '1. Combine coconut milk and oats in a small saucepan over medium-low heat.
2. Stir in slippery elm and marshmallow root powders; stir until no lumps remain.
3. Cook, stirring frequently, for 5–7 minutes until thick and creamy.
4. Remove from heat and stir in collagen peptides and cinnamon.
5. Sweeten with raw honey (add after cooling slightly to preserve enzymes).
6. Transfer to a bowl and top with fresh blueberries.
7. Serve warm. Best consumed on an empty stomach for maximum mucosal contact time.',
  '{"calories":320,"protein_g":16,"carbs_g":38,"fat_g":12,"fiber_g":5}',
  'oat porridge blueberries',
  '{"gluten","dairy","sugar"}',
  false, true, 15, 1
),

(
  'Anti-Candida Coconut-Oregano Chicken Thighs',
  'Antifungal herbs oregano and thyme combined with coconut oil create a therapeutic dish that targets Candida overgrowth. Garlic adds allicin — one of the most clinically studied natural antifungals. Low sugar, no grains.',
  '{"ens-protocol","anti-candida","paleo","gluten-free","dairy-free","keto"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"boneless chicken thighs","amount":"4","unit":"pieces"},
    {"name":"coconut oil","amount":"2","unit":"tbsp"},
    {"name":"garlic cloves","amount":"5","unit":"pieces"},
    {"name":"fresh oregano leaves","amount":"2","unit":"tbsp"},
    {"name":"fresh thyme sprigs","amount":"4","unit":"pieces"},
    {"name":"lemon zest","amount":"1","unit":"tsp"},
    {"name":"sea salt","amount":"1","unit":"tsp"},
    {"name":"black pepper","amount":"1/2","unit":"tsp"},
    {"name":"red chili flakes","amount":"1/4","unit":"tsp"}
  ]',
  '1. Preheat oven to 400°F (205°C).
2. Mince garlic. Mix with coconut oil, oregano, thyme leaves, lemon zest, salt, pepper, and chili flakes into a paste.
3. Pat chicken thighs completely dry with paper towels — crucial for crispy skin.
4. Rub the herb paste generously over and under the skin.
5. Place skin-side up on an oven-safe skillet or rimmed baking sheet.
6. Roast 30–35 minutes until skin is golden and internal temperature reaches 165°F.
7. Rest 5 minutes before serving. Pan drippings are medicinal — spoon over each piece.',
  '{"calories":380,"protein_g":38,"carbs_g":3,"fat_g":24,"fiber_g":1}',
  'herb roasted chicken',
  '{"gluten","dairy","corn","soy"}',
  false, true, 40, 4
),

(
  'Gut-Healing Bone Broth Ramen',
  'A MABC protocol-friendly ramen that replaces inflammatory wheat noodles with kelp noodles and fortifies the base with bone broth collagen. Miso provides probiotic compounds to support microbiome diversity during ENS restoration.',
  '{"ens-protocol","mabc","gluten-free","dairy-free"}',
  '{"fall","winter"}',
  '[
    {"name":"beef or chicken bone broth","amount":"3","unit":"cups"},
    {"name":"kelp noodles","amount":"1","unit":"package"},
    {"name":"white miso paste","amount":"1","unit":"tbsp"},
    {"name":"soft-boiled egg","amount":"1","unit":"piece"},
    {"name":"baby bok choy","amount":"2","unit":"heads"},
    {"name":"scallions","amount":"2","unit":"stalks"},
    {"name":"sesame seeds","amount":"1","unit":"tsp"},
    {"name":"coconut aminos","amount":"2","unit":"tsp"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"collagen peptides","amount":"1","unit":"scoop"}
  ]',
  '1. Rinse kelp noodles in warm water; soak 10 minutes, then drain.
2. Bring bone broth to a gentle simmer. Add grated ginger and coconut aminos.
3. Dissolve miso paste in a small bowl with 2 tbsp warm broth, then stir into pot. Do not boil after adding miso.
4. Blanch bok choy in the broth for 2 minutes; remove and set aside.
5. Stir collagen peptides into the hot broth until dissolved.
6. Divide kelp noodles between bowls; ladle hot broth over them.
7. Top with halved soft-boiled egg, bok choy, sliced scallions, and sesame seeds.',
  '{"calories":280,"protein_g":26,"carbs_g":18,"fat_g":10,"fiber_g":3}',
  'ramen soup bowl',
  '{"eggs","soy","gluten"}',
  false, true, 20, 2
),

(
  'MABC Boron & Magnesium Energy Balls',
  'A therapeutic snack delivering both boron (from raisins, almonds, chickpea flour) and magnesium (from pumpkin seeds, dark chocolate) in a compact, travel-friendly form. Designed for sustained energy between meals during protocol.',
  '{"ens-protocol","mabc","gluten-free","vegan","no-bake"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"Medjool dates","amount":"8","unit":"pieces"},
    {"name":"raw almonds","amount":"1/2","unit":"cup"},
    {"name":"raisins","amount":"3","unit":"tbsp"},
    {"name":"pumpkin seeds","amount":"3","unit":"tbsp"},
    {"name":"85% dark chocolate chips","amount":"2","unit":"tbsp"},
    {"name":"almond butter","amount":"2","unit":"tbsp"},
    {"name":"sea salt","amount":"1/4","unit":"tsp"},
    {"name":"vanilla extract","amount":"1/2","unit":"tsp"}
  ]',
  '1. Pit dates and process in a food processor until a sticky paste forms.
2. Add almonds and pulse until coarsely chopped (not powder — texture is important).
3. Add raisins, pumpkin seeds, almond butter, salt, and vanilla. Pulse 5–6 times to combine.
4. Transfer mixture to a bowl; fold in dark chocolate chips by hand.
5. Roll into 12 balls (about 1.5 tbsp each). Compress firmly so they hold shape.
6. Refrigerate 30 minutes to firm up before eating.
7. Store in an airtight container in the refrigerator up to 2 weeks.',
  '{"calories":145,"protein_g":4,"carbs_g":16,"fat_g":8,"fiber_g":2}',
  'energy balls dates',
  '{"tree-nuts","dairy","gluten"}',
  false, true, 15, 12
),

(
  'Anti-Inflammatory Turmeric Bone Broth Elixir',
  'A therapeutic morning elixir combining the gut-healing power of bone broth with the anti-inflammatory potency of turmeric, black pepper, and ginger. Black pepper increases curcumin bioavailability by 2000%. Intended as a daily foundational practice.',
  '{"ens-protocol","mabc","anti-inflammatory","paleo","aip","keto","gluten-free","dairy-free"}',
  '{"fall","winter"}',
  '[
    {"name":"quality bone broth","amount":"8","unit":"oz"},
    {"name":"ground turmeric","amount":"1","unit":"tsp"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"black pepper","amount":"1/4","unit":"tsp"},
    {"name":"coconut oil","amount":"1","unit":"tsp"},
    {"name":"fresh lemon juice","amount":"1","unit":"tbsp"},
    {"name":"raw honey","amount":"1/2","unit":"tsp"}
  ]',
  '1. Heat bone broth in a small saucepan until steaming but not boiling.
2. Grate fresh ginger directly into the broth.
3. Add turmeric, black pepper, and coconut oil. Whisk vigorously or use an immersion blender until frothy.
4. Remove from heat. Add lemon juice and honey.
5. Pour into a mug and drink immediately while hot.
6. Practice note: consume this 20–30 minutes before breakfast for maximum absorption.',
  '{"calories":85,"protein_g":8,"carbs_g":6,"fat_g":3,"fiber_g":0}',
  'turmeric golden broth',
  '{"dairy","gluten","soy"}',
  false, true, 5, 1
),

-- ═══════════════════════════════════════════════
-- ANTI-INFLAMMATORY (6 recipes)
-- ═══════════════════════════════════════════════

(
  'Turmeric Golden Milk Latte',
  'A deeply calming, anti-inflammatory beverage rooted in Ayurvedic tradition. Curcumin in turmeric modulates NF-κB pathways to reduce systemic inflammation. Warming spices support bile flow and liver detoxification.',
  '{"anti-inflammatory","vegan","gluten-free","dairy-free","keto"}',
  '{"fall","winter"}',
  '[
    {"name":"full-fat coconut milk","amount":"1.5","unit":"cups"},
    {"name":"ground turmeric","amount":"1","unit":"tsp"},
    {"name":"ground cinnamon","amount":"1/2","unit":"tsp"},
    {"name":"ground ginger","amount":"1/4","unit":"tsp"},
    {"name":"black pepper","amount":"1/8","unit":"tsp"},
    {"name":"cardamom","amount":"1/8","unit":"tsp"},
    {"name":"raw honey","amount":"1","unit":"tsp"},
    {"name":"vanilla extract","amount":"1/4","unit":"tsp"}
  ]',
  '1. Combine coconut milk, turmeric, cinnamon, ginger, pepper, and cardamom in a small saucepan.
2. Whisk over medium heat until steaming and fragrant — about 4 minutes.
3. Remove from heat; whisk in honey and vanilla.
4. Use a milk frother or immersion blender for a frothy texture.
5. Pour into a mug and serve warm. Sprinkle a pinch of cinnamon on top.',
  '{"calories":240,"protein_g":3,"carbs_g":12,"fat_g":22,"fiber_g":1}',
  'golden milk latte',
  '{"dairy","soy","sugar"}',
  false, true, 8, 1
),

(
  'Wild Salmon & Avocado Omega-3 Power Bowl',
  'A clinically constructed omega-3 delivery system. Wild salmon provides EPA and DHA while avocado supplies oleic acid and fat-soluble vitamins. Together they support neurological function, reduce inflammatory markers, and feed the ENS.',
  '{"anti-inflammatory","paleo","gluten-free","dairy-free","keto"}',
  '{"spring","summer"}',
  '[
    {"name":"wild-caught salmon fillet","amount":"6","unit":"oz"},
    {"name":"ripe avocado","amount":"1","unit":"whole"},
    {"name":"mixed greens","amount":"2","unit":"cups"},
    {"name":"cucumber","amount":"1/2","unit":"piece"},
    {"name":"radishes","amount":"4","unit":"pieces"},
    {"name":"fresh dill","amount":"2","unit":"tbsp"},
    {"name":"lemon","amount":"1","unit":"whole"},
    {"name":"extra-virgin olive oil","amount":"1","unit":"tbsp"},
    {"name":"capers","amount":"1","unit":"tbsp"},
    {"name":"sea salt and black pepper","amount":"to taste","unit":""}
  ]',
  '1. Season salmon with salt, pepper, and half the dill.
2. Heat 1 tsp olive oil in a skillet over medium-high. Sear salmon skin-side up for 4 minutes. Flip; cook 3 more minutes until just opaque.
3. While salmon cooks, slice cucumber and radishes into thin rounds.
4. Halve and slice avocado; toss with 1 tsp lemon juice to prevent browning.
5. Arrange mixed greens in a bowl; top with cucumber, radishes, and avocado.
6. Flake warm salmon over the bowl.
7. Whisk remaining olive oil with lemon juice and capers for dressing.
8. Drizzle dressing over; finish with fresh dill.',
  '{"calories":510,"protein_g":42,"carbs_g":14,"fat_g":32,"fiber_g":8}',
  'salmon avocado bowl',
  '{"shellfish","dairy","gluten","soy"}',
  false, true, 20, 1
),

(
  'Ginger Carrot Immune Soup',
  'A warming, immune-modulating soup built on the powerful combination of beta-carotene from carrots and the anti-inflammatory, antimicrobial effects of fresh ginger. Bone broth base adds gut-supportive glycine and proline.',
  '{"anti-inflammatory","vegan","paleo","aip","gluten-free","dairy-free"}',
  '{"fall","winter"}',
  '[
    {"name":"large carrots","amount":"6","unit":"pieces"},
    {"name":"fresh ginger","amount":"2","unit":"inches"},
    {"name":"garlic cloves","amount":"4","unit":"pieces"},
    {"name":"yellow onion","amount":"1","unit":"medium"},
    {"name":"vegetable or bone broth","amount":"4","unit":"cups"},
    {"name":"coconut milk","amount":"1/2","unit":"cup"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"sea salt","amount":"1","unit":"tsp"},
    {"name":"fresh lime juice","amount":"1","unit":"tbsp"},
    {"name":"cilantro","amount":"2","unit":"tbsp"}
  ]',
  '1. Peel and roughly chop carrots and onion.
2. Sauté onion in coconut oil over medium heat for 5 minutes until translucent.
3. Add minced garlic and grated ginger; cook 2 minutes until fragrant.
4. Add carrots and broth; bring to a boil, then reduce to a simmer.
5. Cook 20 minutes until carrots are very tender when pierced with a fork.
6. Using an immersion blender, blend until completely smooth.
7. Stir in coconut milk and lime juice. Season with salt.
8. Serve topped with fresh cilantro and a swirl of coconut cream if desired.',
  '{"calories":195,"protein_g":5,"carbs_g":28,"fat_g":9,"fiber_g":6}',
  'carrot ginger soup',
  '{"dairy","gluten","soy"}',
  false, true, 30, 4
),

(
  'Blueberry Antioxidant Smoothie Bowl',
  'Wild blueberries contain the highest known antioxidant density of any fruit, with anthocyanins that cross the blood-brain barrier to reduce neuroinflammation. Chia seeds and flax add omega-3s and lignans for hormone support.',
  '{"anti-inflammatory","vegan","gluten-free","dairy-free"}',
  '{"spring","summer"}',
  '[
    {"name":"frozen wild blueberries","amount":"1.5","unit":"cups"},
    {"name":"frozen banana","amount":"1","unit":"piece"},
    {"name":"coconut milk","amount":"1/2","unit":"cup"},
    {"name":"chia seeds","amount":"1","unit":"tbsp"},
    {"name":"ground flaxseed","amount":"1","unit":"tbsp"},
    {"name":"raw honey","amount":"1","unit":"tsp"},
    {"name":"toppings: fresh blueberries","amount":"1/4","unit":"cup"},
    {"name":"granola (GF)","amount":"2","unit":"tbsp"},
    {"name":"hemp seeds","amount":"1","unit":"tbsp"}
  ]',
  '1. Blend frozen blueberries, frozen banana, and coconut milk until thick and smooth (use minimal liquid for spoonable consistency).
2. Stir in chia seeds, flaxseed, and honey at low speed.
3. Pour into a bowl — consistency should be thick enough to hold toppings.
4. Arrange fresh blueberries, granola, and hemp seeds artfully on top.
5. Consume immediately — chia seeds will thicken further if left to sit.',
  '{"calories":340,"protein_g":8,"carbs_g":62,"fat_g":10,"fiber_g":12}',
  'blueberry smoothie bowl',
  '{"gluten","dairy","sugar"}',
  false, true, 10, 1
),

(
  'Wild-Caught Sardines on Avocado Toast',
  'Sardines are the most nutrient-dense small fish: rich in EPA/DHA omega-3s, vitamin D, B12, selenium, and CoQ10. Combined with anti-inflammatory avocado on GF bread, this is a clinical omega-3 intervention in meal form.',
  '{"anti-inflammatory","gluten-free","dairy-free","mediterranean"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"wild-caught sardines in olive oil","amount":"1","unit":"can"},
    {"name":"ripe avocado","amount":"1","unit":"whole"},
    {"name":"GF sourdough or seed bread","amount":"2","unit":"slices"},
    {"name":"fresh lemon juice","amount":"1","unit":"tbsp"},
    {"name":"red onion","amount":"1/4","unit":"small"},
    {"name":"capers","amount":"1","unit":"tbsp"},
    {"name":"fresh parsley","amount":"2","unit":"tbsp"},
    {"name":"red chili flakes","amount":"1/4","unit":"tsp"},
    {"name":"sea salt and cracked pepper","amount":"to taste","unit":""}
  ]',
  '1. Toast bread until golden and firm.
2. Mash avocado with lemon juice, salt, and pepper to a chunky spread.
3. Spread avocado thickly on each toast slice.
4. Drain sardines (reserve oil for the dressing). Arrange sardines over avocado.
5. Top with thinly sliced red onion, capers, and fresh parsley.
6. Drizzle sardine oil over everything for additional omega-3s.
7. Finish with chili flakes and cracked black pepper.',
  '{"calories":440,"protein_g":28,"carbs_g":32,"fat_g":24,"fiber_g":9}',
  'sardine avocado toast',
  '{"shellfish","gluten","dairy"}',
  false, true, 10, 2
),

(
  'Anti-Inflammatory Turmeric Lentil Dal',
  'Red lentils are a therapeutic food — high in folate, iron, and prebiotic fiber that feeds anti-inflammatory Lactobacillus species. Turmeric, cumin, and coriander amplify the anti-inflammatory effect through different molecular pathways.',
  '{"anti-inflammatory","vegan","gluten-free","dairy-free"}',
  '{"fall","winter"}',
  '[
    {"name":"red lentils","amount":"1","unit":"cup"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"yellow onion","amount":"1","unit":"medium"},
    {"name":"garlic cloves","amount":"4","unit":"pieces"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"ground turmeric","amount":"1.5","unit":"tsp"},
    {"name":"ground cumin","amount":"1","unit":"tsp"},
    {"name":"ground coriander","amount":"1","unit":"tsp"},
    {"name":"diced tomatoes","amount":"1","unit":"can"},
    {"name":"vegetable broth","amount":"2","unit":"cups"},
    {"name":"coconut milk","amount":"1/2","unit":"cup"},
    {"name":"fresh lemon juice","amount":"2","unit":"tbsp"},
    {"name":"sea salt","amount":"to taste","unit":""}
  ]',
  '1. Rinse lentils until water runs clear; set aside.
2. Sauté onion in coconut oil over medium heat for 6 minutes until soft.
3. Add minced garlic and grated ginger; cook 2 minutes.
4. Add turmeric, cumin, and coriander; stir and toast spices for 1 minute.
5. Add diced tomatoes (with liquid) and cook 3 minutes until slightly thickened.
6. Add lentils and vegetable broth; bring to a boil then simmer 20 minutes.
7. Stir in coconut milk; simmer 5 more minutes until thick and creamy.
8. Finish with fresh lemon juice and salt. Serve over cauliflower rice or on its own.',
  '{"calories":380,"protein_g":18,"carbs_g":56,"fat_g":10,"fiber_g":14}',
  'lentil dal bowl',
  '{"dairy","gluten","soy","nightshades"}',
  false, true, 35, 4
),

-- ═══════════════════════════════════════════════
-- PALEO (5 recipes)
-- ═══════════════════════════════════════════════

(
  'Grass-Fed Beef & Broccoli Stir-Fry',
  'Grass-fed beef delivers conjugated linoleic acid (CLA), a powerful anti-inflammatory fatty acid absent in grain-fed beef. Paired with sulforaphane-rich broccoli and coconut aminos (grain-free soy alternative) for full Paleo compliance.',
  '{"paleo","gluten-free","dairy-free"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"grass-fed flank steak","amount":"1","unit":"lb"},
    {"name":"broccoli florets","amount":"3","unit":"cups"},
    {"name":"garlic cloves","amount":"4","unit":"pieces"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"coconut aminos","amount":"3","unit":"tbsp"},
    {"name":"sesame oil","amount":"1","unit":"tbsp"},
    {"name":"arrowroot starch","amount":"1","unit":"tsp"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"green onions","amount":"3","unit":"stalks"},
    {"name":"sesame seeds","amount":"1","unit":"tsp"}
  ]',
  '1. Slice flank steak thinly against the grain. Toss with arrowroot starch, pinch of salt, and 1 tbsp coconut aminos.
2. Blanch broccoli in boiling water for 2 minutes; drain and set aside.
3. Heat coconut oil in a wok or large skillet over high heat until shimmering.
4. Sear beef in a single layer for 90 seconds; flip, cook 60 more seconds. Remove from pan.
5. In the same pan, add garlic and ginger; cook 30 seconds.
6. Add broccoli and toss 2 minutes over high heat.
7. Return beef to pan; add remaining coconut aminos and sesame oil. Toss everything together.
8. Serve topped with sliced green onions and sesame seeds.',
  '{"calories":420,"protein_g":38,"carbs_g":14,"fat_g":22,"fiber_g":4}',
  'beef broccoli stir fry',
  '{"soy","gluten","dairy","corn"}',
  false, true, 25, 3
),

(
  'Sweet Potato Turkey Bowl with Chimichurri',
  'A complete Paleo meal featuring ground turkey for lean protein, roasted sweet potato for slow-release carbohydrates, and a fresh chimichurri packed with chlorophyll and polyphenols from herbs.',
  '{"paleo","gluten-free","dairy-free","anti-inflammatory"}',
  '{"fall","winter"}',
  '[
    {"name":"ground turkey","amount":"1","unit":"lb"},
    {"name":"sweet potato","amount":"2","unit":"medium"},
    {"name":"fresh parsley","amount":"1","unit":"cup"},
    {"name":"fresh cilantro","amount":"1/2","unit":"cup"},
    {"name":"garlic cloves","amount":"3","unit":"pieces"},
    {"name":"red wine vinegar","amount":"2","unit":"tbsp"},
    {"name":"olive oil","amount":"4","unit":"tbsp"},
    {"name":"red chili flakes","amount":"1/2","unit":"tsp"},
    {"name":"sea salt","amount":"to taste","unit":""},
    {"name":"mixed greens","amount":"2","unit":"cups"}
  ]',
  '1. Preheat oven to 425°F. Cube sweet potato, toss with 1 tbsp olive oil and salt, roast 25 minutes until caramelized.
2. While potatoes roast, make chimichurri: blend parsley, cilantro, garlic, red wine vinegar, remaining olive oil, chili flakes, and salt until chunky.
3. Brown ground turkey in a skillet over medium-high heat, breaking up, until cooked through. Season with salt and pepper.
4. Divide mixed greens between bowls.
5. Top with roasted sweet potato and seasoned turkey.
6. Spoon chimichurri generously over everything.',
  '{"calories":480,"protein_g":36,"carbs_g":38,"fat_g":20,"fiber_g":6}',
  'turkey bowl sweet potato',
  '{"dairy","gluten","soy"}',
  false, true, 35, 4
),

(
  'Cauliflower Rice Egg Fried "Rice"',
  'A Paleo transformation of a comfort classic. Cauliflower rice provides sulforaphane while being completely grain-free. Pastured eggs add choline for liver methylation support. This dish genuinely satisfies the fried rice craving.',
  '{"paleo","gluten-free","dairy-free","low-carb"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"cauliflower head","amount":"1","unit":"large"},
    {"name":"pastured eggs","amount":"3","unit":"pieces"},
    {"name":"garlic cloves","amount":"3","unit":"pieces"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"frozen peas and carrots","amount":"1/2","unit":"cup"},
    {"name":"coconut aminos","amount":"2","unit":"tbsp"},
    {"name":"sesame oil","amount":"2","unit":"tsp"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"green onions","amount":"3","unit":"stalks"}
  ]',
  '1. Process cauliflower into rice-sized pieces using a food processor or grater. Pat dry with paper towels.
2. Heat coconut oil in a large wok over high heat.
3. Add cauliflower rice in a single layer; cook without stirring for 3 minutes until golden on the bottom.
4. Push rice to one side. Scramble eggs in the empty space until just set.
5. Add garlic, ginger, peas, and carrots; stir-fry everything together for 2 minutes.
6. Drizzle with coconut aminos and sesame oil; toss well.
7. Finish with sliced green onions.',
  '{"calories":260,"protein_g":14,"carbs_g":22,"fat_g":13,"fiber_g":6}',
  'cauliflower fried rice',
  '{"eggs","soy","gluten","dairy"}',
  false, true, 20, 3
),

(
  'Bacon, Avocado & Arugula Paleo Salad',
  'Pastured pork bacon provides B vitamins, oleic acid, and a satisfaction factor that prevents overeating. Arugula delivers peppery glucosinolates for liver phase II detoxification. A simple, satiating Paleo meal.',
  '{"paleo","gluten-free","dairy-free","keto"}',
  '{"spring","summer"}',
  '[
    {"name":"uncured pastured bacon","amount":"4","unit":"strips"},
    {"name":"ripe avocado","amount":"1","unit":"whole"},
    {"name":"arugula","amount":"3","unit":"cups"},
    {"name":"cherry tomatoes","amount":"1","unit":"cup"},
    {"name":"red onion","amount":"1/4","unit":"small"},
    {"name":"fresh lemon juice","amount":"2","unit":"tbsp"},
    {"name":"extra-virgin olive oil","amount":"2","unit":"tbsp"},
    {"name":"Dijon mustard","amount":"1","unit":"tsp"},
    {"name":"sea salt and cracked pepper","amount":"to taste","unit":""}
  ]',
  '1. Cook bacon in a cold skillet, slowly bringing heat to medium. Cook until crisp, about 8 minutes. Drain on paper towels.
2. Make dressing: whisk lemon juice, olive oil, and Dijon with a pinch of salt.
3. Halve cherry tomatoes; thinly slice red onion.
4. Slice or cube avocado.
5. Toss arugula with dressing; plate immediately.
6. Top with avocado, tomatoes, red onion, and crumbled bacon.
7. Season with cracked black pepper.',
  '{"calories":390,"protein_g":14,"carbs_g":16,"fat_g":32,"fiber_g":8}',
  'bacon avocado salad',
  '{"dairy","gluten","eggs","nightshades"}',
  false, true, 15, 2
),

(
  'Zucchini Noodle Bolognese',
  'A deeply nourishing Paleo pasta alternative. Grass-fed beef provides complete amino acids and zinc. Zucchini noodles maintain the satisfying twirl of pasta while keeping inflammation low and eliminating grain lectins.',
  '{"paleo","gluten-free","dairy-free","anti-inflammatory"}',
  '{"summer","fall"}',
  '[
    {"name":"grass-fed ground beef","amount":"1","unit":"lb"},
    {"name":"large zucchini","amount":"4","unit":"pieces"},
    {"name":"crushed tomatoes","amount":"1","unit":"can"},
    {"name":"yellow onion","amount":"1","unit":"medium"},
    {"name":"garlic cloves","amount":"4","unit":"pieces"},
    {"name":"carrot","amount":"1","unit":"large"},
    {"name":"celery stalk","amount":"2","unit":"pieces"},
    {"name":"olive oil","amount":"2","unit":"tbsp"},
    {"name":"dried oregano","amount":"1","unit":"tsp"},
    {"name":"fresh basil","amount":"1/4","unit":"cup"},
    {"name":"sea salt and pepper","amount":"to taste","unit":""}
  ]',
  '1. Spiralize zucchini into noodles; salt lightly and let rest 10 minutes. Pat dry.
2. Finely dice onion, carrot, and celery (the soffritto base).
3. Sauté soffritto in olive oil over medium heat for 8 minutes until soft and sweet.
4. Add garlic; cook 1 minute. Add ground beef and brown completely, 8 minutes.
5. Add crushed tomatoes and oregano; simmer 20 minutes until thick.
6. Sauté zucchini noodles in 1 tsp olive oil over high heat for 2 minutes only — do not overcook.
7. Plate noodles and top with Bolognese. Garnish with fresh basil.',
  '{"calories":450,"protein_g":34,"carbs_g":22,"fat_g":24,"fiber_g":6}',
  'zucchini pasta bolognese',
  '{"dairy","gluten","nightshades"}',
  false, true, 40, 4
),

-- ═══════════════════════════════════════════════
-- KETO (5 recipes)
-- ═══════════════════════════════════════════════

(
  'Classic Avocado & Egg Salad Lettuce Wraps',
  'A keto-ideal meal high in fat and protein with minimal carbohydrates. Avocado provides monounsaturated fats and potassium for electrolyte balance on a ketogenic diet. Mayonnaise from pastured eggs supports fat adaptation.',
  '{"keto","paleo","gluten-free","dairy-free"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"hard-boiled eggs","amount":"4","unit":"pieces"},
    {"name":"ripe avocado","amount":"2","unit":"whole"},
    {"name":"avocado oil mayonnaise","amount":"2","unit":"tbsp"},
    {"name":"Dijon mustard","amount":"1","unit":"tsp"},
    {"name":"fresh lemon juice","amount":"1","unit":"tbsp"},
    {"name":"celery stalk","amount":"2","unit":"pieces"},
    {"name":"fresh chives","amount":"2","unit":"tbsp"},
    {"name":"butter lettuce leaves","amount":"8","unit":"pieces"},
    {"name":"sea salt and pepper","amount":"to taste","unit":""}
  ]',
  '1. Peel and roughly chop hard-boiled eggs.
2. Mash avocado in a bowl, leaving some chunks for texture.
3. Mix in mayonnaise, Dijon, lemon juice, salt, and pepper.
4. Fold in chopped eggs, diced celery, and chives.
5. Taste and adjust seasoning.
6. Spoon into butter lettuce cups (2 per serving).
7. Serve immediately or refrigerate filling up to 24 hours (without lettuce).',
  '{"calories":380,"protein_g":14,"carbs_g":8,"fat_g":34,"fiber_g":5}',
  'avocado egg salad',
  '{"eggs","dairy","gluten"}',
  false, true, 15, 4
),

(
  'Pesto Zucchini Noodles with Macadamia',
  'A true keto-aligned pasta substitute. Basil pesto made with macadamia nuts (instead of pine nuts) provides monounsaturated fats optimal for ketone production. Zucchini noodles deliver hydration and electrolytes with minimal net carbs.',
  '{"keto","gluten-free","dairy-free","vegan"}',
  '{"summer"}',
  '[
    {"name":"large zucchini","amount":"4","unit":"pieces"},
    {"name":"fresh basil","amount":"2","unit":"cups"},
    {"name":"macadamia nuts","amount":"1/3","unit":"cup"},
    {"name":"garlic cloves","amount":"2","unit":"pieces"},
    {"name":"nutritional yeast","amount":"2","unit":"tbsp"},
    {"name":"extra-virgin olive oil","amount":"1/3","unit":"cup"},
    {"name":"fresh lemon juice","amount":"2","unit":"tbsp"},
    {"name":"sea salt","amount":"1/2","unit":"tsp"},
    {"name":"cherry tomatoes","amount":"1/2","unit":"cup"}
  ]',
  '1. Spiralize zucchini into noodles. Salt lightly, let rest 10 minutes, then pat very dry.
2. Blend basil, macadamia nuts, garlic, nutritional yeast, lemon juice, and salt in a food processor.
3. With processor running, drizzle in olive oil until smooth and creamy.
4. Taste and adjust salt and lemon.
5. Toss zucchini noodles with pesto until evenly coated.
6. Plate and top with halved cherry tomatoes.
7. Serve at room temperature — do not heat pesto.',
  '{"calories":420,"protein_g":8,"carbs_g":12,"fat_g":40,"fiber_g":4}',
  'zucchini pesto pasta',
  '{"dairy","gluten","tree-nuts","nightshades"}',
  false, true, 20, 3
),

(
  'Keto Bulletproof Mushroom Soup',
  'A deeply satiating keto soup that blends high-fat coconut cream and grass-fed butter for sustained ketone production. Mushrooms provide beta-glucans for immune modulation. A clinical fat-fueling meal for fast oxidizers.',
  '{"keto","gluten-free","anti-inflammatory"}',
  '{"fall","winter"}',
  '[
    {"name":"cremini mushrooms","amount":"1","unit":"lb"},
    {"name":"shallots","amount":"3","unit":"pieces"},
    {"name":"garlic cloves","amount":"3","unit":"pieces"},
    {"name":"grass-fed butter","amount":"2","unit":"tbsp"},
    {"name":"chicken bone broth","amount":"2","unit":"cups"},
    {"name":"full-fat coconut cream","amount":"1/2","unit":"cup"},
    {"name":"fresh thyme","amount":"4","unit":"sprigs"},
    {"name":"dry sherry or white wine","amount":"2","unit":"tbsp"},
    {"name":"truffle oil","amount":"1","unit":"tsp"},
    {"name":"sea salt and white pepper","amount":"to taste","unit":""}
  ]',
  '1. Thinly slice mushrooms. Mince shallots and garlic.
2. Melt butter in a large pot over medium-high heat until foamy.
3. Add mushrooms in a single layer; cook without stirring for 5 minutes to develop deep color.
4. Add shallots and garlic; cook 3 minutes.
5. Deglaze with sherry, scraping up all browned bits.
6. Add broth and thyme; simmer 15 minutes.
7. Remove thyme. Blend soup until completely smooth using an immersion blender.
8. Stir in coconut cream; heat through but do not boil.
9. Finish with truffle oil, salt, and white pepper.',
  '{"calories":280,"protein_g":8,"carbs_g":14,"fat_g":22,"fiber_g":3}',
  'creamy mushroom soup',
  '{"dairy","gluten","soy"}',
  false, true, 30, 4
),

(
  'Keto Chocolate Fat Bombs',
  'High-fat keto snacks designed to boost ketone production between meals. Coconut oil provides MCTs that bypass lymphatic absorption and convert directly to ketones in the liver — the optimal fuel for slow oxidizer ketogenic protocols.',
  '{"keto","vegan","gluten-free","dairy-free","no-bake"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"coconut oil","amount":"1/2","unit":"cup"},
    {"name":"cocoa butter","amount":"1/4","unit":"cup"},
    {"name":"85% dark cacao powder","amount":"3","unit":"tbsp"},
    {"name":"almond butter","amount":"2","unit":"tbsp"},
    {"name":"stevia or monk fruit sweetener","amount":"2","unit":"tsp"},
    {"name":"vanilla extract","amount":"1","unit":"tsp"},
    {"name":"sea salt flakes","amount":"1/4","unit":"tsp"},
    {"name":"chopped almonds","amount":"2","unit":"tbsp"}
  ]',
  '1. Gently melt coconut oil and cocoa butter together in a double boiler.
2. Remove from heat; whisk in cacao powder until smooth with no lumps.
3. Add almond butter, sweetener, and vanilla. Mix thoroughly.
4. Taste and adjust sweetness.
5. Pour into silicone molds or a mini-muffin tin lined with paper cups.
6. Sprinkle with sea salt flakes and chopped almonds.
7. Freeze for 30 minutes or refrigerate for 2 hours until firm.
8. Store in freezer; bring to room temperature 5 minutes before eating.',
  '{"calories":180,"protein_g":2,"carbs_g":4,"fat_g":19,"fiber_g":2}',
  'chocolate fat bombs',
  '{"tree-nuts","dairy","soy"}',
  false, true, 10, 12
),

(
  'Keto Sesame-Crusted Tuna Steak',
  'A restaurant-quality keto meal with an ideal macronutrient profile. Sashimi-grade tuna provides over 50g protein, DHA for brain health, and virtually zero carbohydrates. Sesame crust adds healthy fats and a satisfying crunch.',
  '{"keto","paleo","gluten-free","dairy-free","anti-inflammatory"}',
  '{"spring","summer"}',
  '[
    {"name":"sashimi-grade ahi tuna steaks","amount":"2","unit":"6-oz pieces"},
    {"name":"sesame seeds (white and black)","amount":"4","unit":"tbsp"},
    {"name":"coconut aminos","amount":"2","unit":"tbsp"},
    {"name":"sesame oil","amount":"2","unit":"tbsp"},
    {"name":"avocado oil","amount":"1","unit":"tbsp"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"garlic clove","amount":"1","unit":"piece"},
    {"name":"scallions","amount":"2","unit":"stalks"},
    {"name":"avocado","amount":"1","unit":"whole"}
  ]',
  '1. Mix sesame oil, coconut aminos, minced ginger, and garlic into a marinade. Marinate tuna 15 minutes.
2. Spread sesame seeds on a flat plate. Remove tuna from marinade; press all sides firmly into seeds to coat.
3. Heat avocado oil in a cast-iron skillet over high heat until smoking.
4. Sear tuna 60–90 seconds per side — interior should remain raw/rare.
5. Slice thinly against the grain.
6. Fan slices over sliced avocado and garnish with scallions.
7. Drizzle remaining marinade over plated tuna.',
  '{"calories":460,"protein_g":54,"carbs_g":6,"fat_g":24,"fiber_g":3}',
  'seared tuna steak',
  '{"shellfish","soy","gluten","dairy","sesame"}',
  false, true, 25, 2
),

-- ═══════════════════════════════════════════════
-- VEGAN / PLANT-BASED (5 recipes)
-- ═══════════════════════════════════════════════

(
  'Healing Red Lentil Dahl',
  'A therapeutic plant-based classic. Red lentils provide complete protein when combined with rice, plus 14g of prebiotic fiber per serving. The spice blend creates a powerful anti-inflammatory and digestive-supportive meal.',
  '{"vegan","gluten-free","dairy-free","anti-inflammatory"}',
  '{"fall","winter"}',
  '[
    {"name":"red lentils","amount":"1.5","unit":"cups"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"mustard seeds","amount":"1","unit":"tsp"},
    {"name":"cumin seeds","amount":"1","unit":"tsp"},
    {"name":"yellow onion","amount":"1","unit":"large"},
    {"name":"garlic cloves","amount":"5","unit":"pieces"},
    {"name":"fresh ginger","amount":"1.5","unit":"inches"},
    {"name":"ground turmeric","amount":"1","unit":"tsp"},
    {"name":"garam masala","amount":"1","unit":"tsp"},
    {"name":"crushed tomatoes","amount":"1","unit":"cup"},
    {"name":"vegetable broth","amount":"3","unit":"cups"},
    {"name":"spinach","amount":"2","unit":"cups"},
    {"name":"fresh lemon juice","amount":"2","unit":"tbsp"}
  ]',
  '1. Rinse lentils until water runs clear.
2. Heat coconut oil; add mustard and cumin seeds. Let them pop (30 seconds).
3. Add onion; cook 8 minutes until deeply golden.
4. Add garlic and ginger; cook 2 minutes.
5. Add turmeric and garam masala; stir 1 minute.
6. Add tomatoes, broth, and lentils. Bring to boil; simmer 20 minutes, stirring occasionally.
7. Stir in spinach until wilted. Add lemon juice.
8. Serve over basmati rice or cauliflower rice with fresh cilantro.',
  '{"calories":360,"protein_g":20,"carbs_g":56,"fat_g":7,"fiber_g":16}',
  'red lentil dal',
  '{"dairy","gluten","nightshades"}',
  false, true, 35, 4
),

(
  'Therapeutic Chickpea & Spinach Curry',
  'Chickpeas are among the highest plant sources of zinc and folate. Combined with iron-rich spinach and fat-soluble spice activation from coconut oil, this curry maximizes nutrient bioavailability in a single pot.',
  '{"vegan","gluten-free","dairy-free","anti-inflammatory"}',
  '{"fall","winter"}',
  '[
    {"name":"canned chickpeas","amount":"2","unit":"cans"},
    {"name":"baby spinach","amount":"4","unit":"cups"},
    {"name":"coconut milk","amount":"1","unit":"can"},
    {"name":"diced tomatoes","amount":"1","unit":"can"},
    {"name":"yellow onion","amount":"1","unit":"large"},
    {"name":"garlic cloves","amount":"5","unit":"pieces"},
    {"name":"fresh ginger","amount":"1.5","unit":"inches"},
    {"name":"ground turmeric","amount":"1","unit":"tsp"},
    {"name":"curry powder","amount":"2","unit":"tsp"},
    {"name":"smoked paprika","amount":"1","unit":"tsp"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"}
  ]',
  '1. Drain and rinse chickpeas. Pat dry.
2. Sauté onion in coconut oil over medium heat until golden, 8 minutes.
3. Add garlic and ginger; cook 2 minutes until fragrant.
4. Add all spices; stir and toast 1 minute.
5. Add tomatoes and cook down 5 minutes.
6. Add chickpeas and coconut milk; simmer 15 minutes until sauce thickens.
7. Stir in spinach until completely wilted.
8. Serve over brown rice with naan (GF if needed) or flatbread.',
  '{"calories":410,"protein_g":16,"carbs_g":50,"fat_g":18,"fiber_g":12}',
  'chickpea spinach curry',
  '{"dairy","gluten","nightshades"}',
  false, true, 30, 4
),

(
  'Quinoa Power Bowl with Tahini Dressing',
  'Quinoa is the only grain that provides all essential amino acids in significant quantities. Combined with roasted vegetables and tahini (sesame-based and rich in methionine), this bowl provides a complete therapeutic plant-based protein profile.',
  '{"vegan","gluten-free","dairy-free","anti-inflammatory"}',
  '{"spring","summer"}',
  '[
    {"name":"quinoa","amount":"1","unit":"cup"},
    {"name":"roasted sweet potato","amount":"1","unit":"cup"},
    {"name":"roasted beets","amount":"1","unit":"cup"},
    {"name":"baby kale","amount":"2","unit":"cups"},
    {"name":"edamame","amount":"1/2","unit":"cup"},
    {"name":"tahini","amount":"3","unit":"tbsp"},
    {"name":"lemon juice","amount":"2","unit":"tbsp"},
    {"name":"garlic clove","amount":"1","unit":"piece"},
    {"name":"maple syrup","amount":"1","unit":"tsp"},
    {"name":"pumpkin seeds","amount":"2","unit":"tbsp"}
  ]',
  '1. Cook quinoa: rinse, then simmer in 2 cups water for 15 minutes. Fluff and cool.
2. Roast sweet potato and beets at 400°F with olive oil and salt until caramelized, 25 minutes.
3. Make tahini dressing: blend tahini, lemon juice, garlic, maple syrup, and 3 tbsp water until smooth.
4. Massage kale with a pinch of salt.
5. Build bowl: quinoa as the base, then kale, roasted vegetables, and edamame.
6. Drizzle generously with tahini dressing.
7. Finish with pumpkin seeds.',
  '{"calories":480,"protein_g":18,"carbs_g":68,"fat_g":16,"fiber_g":12}',
  'quinoa power bowl',
  '{"soy","dairy","gluten","sesame"}',
  false, true, 40, 2
),

(
  'Ginger-Marinated Tempeh Stir-Fry',
  'Fermented tempeh delivers far superior digestibility compared to unfermented soy products. Fermentation neutralizes phytic acid and creates beneficial compounds. The ginger-garlic marinade activates Nrf2 anti-inflammatory pathways.',
  '{"vegan","gluten-free","dairy-free","anti-inflammatory"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"tempeh","amount":"8","unit":"oz"},
    {"name":"broccoli","amount":"2","unit":"cups"},
    {"name":"snap peas","amount":"1","unit":"cup"},
    {"name":"red bell pepper","amount":"1","unit":"piece"},
    {"name":"coconut aminos","amount":"3","unit":"tbsp"},
    {"name":"sesame oil","amount":"1","unit":"tbsp"},
    {"name":"fresh ginger","amount":"1.5","unit":"inches"},
    {"name":"garlic cloves","amount":"3","unit":"pieces"},
    {"name":"lime juice","amount":"1","unit":"tbsp"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"}
  ]',
  '1. Cut tempeh into 1-inch cubes. Marinate in coconut aminos, sesame oil, grated ginger, garlic, and lime juice for at least 15 minutes.
2. Chop broccoli into florets; slice bell pepper; trim snap peas.
3. Heat coconut oil in wok over high heat.
4. Remove tempeh from marinade (reserve it). Sear tempeh until golden on all sides, about 6 minutes. Remove.
5. Stir-fry vegetables in the same wok, 4 minutes, over high heat.
6. Return tempeh; pour in reserved marinade. Toss and cook 2 minutes until sauce coats everything.
7. Serve over cauliflower rice or brown rice.',
  '{"calories":360,"protein_g":24,"carbs_g":24,"fat_g":18,"fiber_g":6}',
  'tempeh stir fry',
  '{"soy","gluten","dairy","nightshades"}',
  false, true, 30, 2
),

(
  'Vanilla Chia Pudding with Berry Compote',
  'Chia seeds are one of the richest plant sources of ALA omega-3s and provide a remarkable 11g of fiber per ounce. The gel formed in coconut milk slows glucose absorption, making this an ideal therapeutic breakfast for blood sugar dysregulation.',
  '{"vegan","gluten-free","dairy-free","keto-friendly"}',
  '{"spring","summer"}',
  '[
    {"name":"chia seeds","amount":"1/3","unit":"cup"},
    {"name":"full-fat coconut milk","amount":"1.5","unit":"cups"},
    {"name":"vanilla extract","amount":"1","unit":"tsp"},
    {"name":"maple syrup","amount":"1","unit":"tbsp"},
    {"name":"mixed berries","amount":"1","unit":"cup"},
    {"name":"lemon juice","amount":"1","unit":"tbsp"},
    {"name":"raw honey","amount":"1","unit":"tsp"},
    {"name":"toasted coconut flakes","amount":"2","unit":"tbsp"}
  ]',
  '1. Whisk chia seeds into coconut milk with vanilla and maple syrup.
2. Let rest 5 minutes; stir again to prevent clumping.
3. Cover and refrigerate for minimum 4 hours or overnight.
4. For the berry compote: warm berries in a small pan with honey and lemon juice over medium-low heat for 5 minutes.
5. Mash berries lightly with a fork to create a chunky sauce. Cool.
6. Serve chia pudding topped with berry compote and toasted coconut flakes.',
  '{"calories":380,"protein_g":8,"carbs_g":34,"fat_g":24,"fiber_g":14}',
  'chia pudding berries',
  '{"dairy","gluten","sugar"}',
  false, true, 10, 2
),

-- ═══════════════════════════════════════════════
-- AIP AUTOIMMUNE PROTOCOL (4 recipes)
-- ═══════════════════════════════════════════════

(
  'AIP Slow-Cooked Lamb & Root Vegetable Stew',
  'AIP-compliant lamb stew eliminating all potential immune triggers — no nightshades, grains, dairy, eggs, legumes, or nuts. Lamb is the most tolerated meat protein on AIP. Root vegetables provide safe carbohydrates during the elimination phase.',
  '{"aip","paleo","gluten-free","dairy-free","anti-inflammatory"}',
  '{"fall","winter"}',
  '[
    {"name":"lamb shoulder, cubed","amount":"1.5","unit":"lbs"},
    {"name":"turnips","amount":"2","unit":"medium"},
    {"name":"parsnips","amount":"2","unit":"medium"},
    {"name":"carrots","amount":"3","unit":"large"},
    {"name":"yellow onion","amount":"1","unit":"large"},
    {"name":"garlic cloves","amount":"4","unit":"pieces"},
    {"name":"bone broth","amount":"2","unit":"cups"},
    {"name":"fresh rosemary","amount":"2","unit":"sprigs"},
    {"name":"fresh thyme","amount":"4","unit":"sprigs"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"apple cider vinegar","amount":"1","unit":"tbsp"},
    {"name":"sea salt","amount":"to taste","unit":""}
  ]',
  '1. Pat lamb dry; season with sea salt.
2. Brown lamb in batches in coconut oil over high heat, 3 minutes per side. Remove.
3. Sauté onion and garlic in the same pot until soft, 5 minutes.
4. Deglaze with apple cider vinegar, scraping up all browned bits.
5. Return lamb; add broth, rosemary, and thyme.
6. Add chunked turnips, parsnips, and carrots.
7. Bring to a boil; reduce to lowest simmer. Cover and cook 2.5 hours until lamb is fork-tender.
8. Adjust salt. Remove herb sprigs before serving.',
  '{"calories":480,"protein_g":40,"carbs_g":28,"fat_g":22,"fiber_g":6}',
  'lamb stew root vegetables',
  '{"dairy","gluten","eggs","soy","nightshades","lectins","nuts","corn"}',
  false, true, 180, 4
),

(
  'AIP Coconut Chicken Soup',
  'A profoundly comforting AIP soup that eliminates every Phase 1 elimination protocol trigger. The combination of bone broth and collagen-supporting vegetables provides the gut-healing substrate needed during the inflammation recovery phase.',
  '{"aip","paleo","gluten-free","dairy-free"}',
  '{"fall","winter"}',
  '[
    {"name":"bone-in chicken thighs","amount":"2","unit":"lbs"},
    {"name":"coconut milk","amount":"1","unit":"can"},
    {"name":"bone broth","amount":"3","unit":"cups"},
    {"name":"sweet potato","amount":"2","unit":"medium"},
    {"name":"spinach","amount":"2","unit":"cups"},
    {"name":"garlic cloves","amount":"4","unit":"pieces"},
    {"name":"fresh ginger","amount":"1.5","unit":"inches"},
    {"name":"turmeric","amount":"1","unit":"tsp"},
    {"name":"lemon juice","amount":"2","unit":"tbsp"},
    {"name":"fresh cilantro","amount":"1/4","unit":"cup"}
  ]',
  '1. Simmer chicken thighs in bone broth for 30 minutes until cooked through. Remove chicken; shred meat.
2. Add coconut milk, minced garlic, grated ginger, and turmeric to the broth.
3. Cube sweet potato; add to broth. Simmer 15 minutes until tender.
4. Return shredded chicken to pot.
5. Add spinach; stir until wilted.
6. Finish with lemon juice. Taste for salt.
7. Serve topped with fresh cilantro.',
  '{"calories":420,"protein_g":38,"carbs_g":24,"fat_g":20,"fiber_g":4}',
  'coconut chicken soup',
  '{"dairy","gluten","eggs","soy","nightshades","lectins","nuts"}',
  false, true, 50, 4
),

(
  'AIP Cassava Flatbread with Herb Olive Oil',
  'The only AIP-compliant grain-free flatbread. Cassava flour (from tapioca root) provides starch without lectins, phytates, or any AIP trigger compounds. Pairs with herb-infused olive oil for a satisfying and safe bread substitute.',
  '{"aip","vegan","gluten-free","dairy-free","paleo"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"cassava flour","amount":"1","unit":"cup"},
    {"name":"warm water","amount":"1/2","unit":"cup"},
    {"name":"olive oil","amount":"3","unit":"tbsp"},
    {"name":"sea salt","amount":"1/2","unit":"tsp"},
    {"name":"fresh rosemary","amount":"2","unit":"tbsp"},
    {"name":"fresh thyme","amount":"1","unit":"tbsp"},
    {"name":"garlic (for oil)","amount":"2","unit":"cloves"}
  ]',
  '1. Mix cassava flour and sea salt in a bowl.
2. Add olive oil and warm water; knead into a smooth dough (add water 1 tsp at a time if too dry).
3. Divide into 4 equal balls; roll each between two sheets of parchment to 1/8 inch thick.
4. Cook each flatbread in a dry cast-iron skillet over medium-high heat, 2–3 minutes per side until blistered.
5. For herb oil: warm olive oil in a small pan with smashed garlic, rosemary, and thyme over low heat for 5 minutes (do not fry). Remove from heat; infuse 10 more minutes.
6. Brush flatbreads with warm herb oil before serving.',
  '{"calories":220,"protein_g":2,"carbs_g":32,"fat_g":10,"fiber_g":2}',
  'cassava flatbread herbs',
  '{"dairy","gluten","eggs","soy","nuts","nightshades","corn","lectins"}',
  false, true, 25, 4
),

(
  'AIP Turmeric Cauliflower Soup',
  'A Phase 1 AIP-compliant soup that delivers clinical doses of curcumin through concentrated turmeric combined with fat for absorption. Cauliflower provides sulforaphane without the goitrogenic risk of raw cruciferous vegetables when cooked.',
  '{"aip","vegan","paleo","gluten-free","dairy-free","anti-inflammatory"}',
  '{"fall","winter"}',
  '[
    {"name":"cauliflower head","amount":"1","unit":"large"},
    {"name":"coconut milk","amount":"1","unit":"can"},
    {"name":"vegetable or bone broth","amount":"2","unit":"cups"},
    {"name":"yellow onion","amount":"1","unit":"large"},
    {"name":"garlic cloves","amount":"5","unit":"pieces"},
    {"name":"ground turmeric","amount":"2","unit":"tsp"},
    {"name":"fresh ginger","amount":"1","unit":"inch"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"sea salt and white pepper","amount":"to taste","unit":""},
    {"name":"fresh cilantro and coconut cream","amount":"to garnish","unit":""}
  ]',
  '1. Roast cauliflower florets at 425°F with 1 tbsp coconut oil and salt for 25 minutes until golden.
2. Sauté onion in remaining coconut oil over medium heat until translucent.
3. Add garlic, ginger, and turmeric; stir and cook 2 minutes.
4. Add roasted cauliflower and broth; bring to a simmer.
5. Add coconut milk. Blend completely smooth with an immersion blender.
6. Strain for an ultra-silky texture if desired.
7. Season with salt and white pepper. Serve with a swirl of coconut cream and fresh cilantro.',
  '{"calories":260,"protein_g":6,"carbs_g":24,"fat_g":18,"fiber_g":6}',
  'cauliflower turmeric soup',
  '{"dairy","gluten","eggs","soy","nightshades","nuts"}',
  false, true, 40, 4
),

-- ═══════════════════════════════════════════════
-- MEDITERRANEAN (4 recipes)
-- ═══════════════════════════════════════════════

(
  'Greek Sardine Salad with Lemon-Herb Vinaigrette',
  'The traditional Mediterranean diet research consistently links sardine consumption to reduced cardiovascular inflammatory markers. This salad combines the full spectrum of Mediterranean anti-inflammatory foods in one bowl.',
  '{"mediterranean","gluten-free","dairy-free","anti-inflammatory"}',
  '{"spring","summer"}',
  '[
    {"name":"wild sardines in olive oil","amount":"2","unit":"cans"},
    {"name":"mixed greens","amount":"3","unit":"cups"},
    {"name":"cherry tomatoes","amount":"1","unit":"cup"},
    {"name":"kalamata olives","amount":"1/3","unit":"cup"},
    {"name":"cucumber","amount":"1","unit":"piece"},
    {"name":"red onion","amount":"1/4","unit":"piece"},
    {"name":"fresh parsley","amount":"1/4","unit":"cup"},
    {"name":"fresh dill","amount":"2","unit":"tbsp"},
    {"name":"lemon juice","amount":"3","unit":"tbsp"},
    {"name":"extra-virgin olive oil","amount":"3","unit":"tbsp"},
    {"name":"Dijon mustard","amount":"1","unit":"tsp"},
    {"name":"sea salt and pepper","amount":"to taste","unit":""}
  ]',
  '1. Whisk lemon juice, olive oil, Dijon, salt, and pepper for the vinaigrette.
2. Arrange mixed greens in a large bowl.
3. Top with halved cherry tomatoes, sliced cucumber, sliced red onion, and kalamata olives.
4. Drain sardines (reserve oil) and arrange over the salad.
5. Scatter fresh parsley and dill over everything.
6. Drizzle with vinaigrette and a little of the sardine olive oil for maximum omega-3s.
7. Toss gently at the table.',
  '{"calories":390,"protein_g":30,"carbs_g":14,"fat_g":26,"fiber_g":5}',
  'greek salad sardines',
  '{"shellfish","dairy","gluten","nightshades"}',
  false, true, 15, 2
),

(
  'Classic Hummus & Roasted Vegetable Plate',
  'Hummus provides both soluble fiber and plant protein while tahini adds sesamin — a lignan compound with demonstrated liver-protective activity. The roasted vegetable plate delivers carotenoids activated by the fat in olive oil.',
  '{"mediterranean","vegan","gluten-free","dairy-free"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"canned chickpeas","amount":"1","unit":"can"},
    {"name":"tahini","amount":"3","unit":"tbsp"},
    {"name":"garlic cloves","amount":"2","unit":"pieces"},
    {"name":"fresh lemon juice","amount":"3","unit":"tbsp"},
    {"name":"extra-virgin olive oil","amount":"4","unit":"tbsp"},
    {"name":"ice water","amount":"3","unit":"tbsp"},
    {"name":"ground cumin","amount":"1/2","unit":"tsp"},
    {"name":"zucchini","amount":"1","unit":"medium"},
    {"name":"red bell pepper","amount":"1","unit":"piece"},
    {"name":"eggplant","amount":"1","unit":"small"},
    {"name":"fresh parsley","amount":"2","unit":"tbsp"},
    {"name":"paprika","amount":"1/4","unit":"tsp"}
  ]',
  '1. Roast cubed zucchini, bell pepper, and eggplant at 425°F with olive oil and salt for 25 minutes.
2. For hummus: blend chickpeas (reserve liquid), tahini, garlic, lemon juice, and cumin until smooth.
3. With blender running, drizzle in olive oil then ice water for the creamiest texture.
4. Taste and adjust lemon and salt.
5. Spread hummus in a wide shallow bowl; create a well in the center with the back of a spoon.
6. Fill the well with warm roasted vegetables.
7. Drizzle with olive oil; dust with paprika; scatter parsley.',
  '{"calories":380,"protein_g":12,"carbs_g":40,"fat_g":20,"fiber_g":10}',
  'hummus roasted vegetables',
  '{"dairy","gluten","sesame","nightshades"}',
  false, true, 35, 3
),

(
  'Olive Oil & Herb Roasted Fish',
  'A Mediterranean preparation that perfectly preserves the omega-3 integrity of white fish. Olive oil''s high monounsaturated fat content prevents oxidation during cooking. Lemon and herbs provide liver-supportive compounds.',
  '{"mediterranean","paleo","gluten-free","dairy-free","anti-inflammatory","aip"}',
  '{"spring","summer"}',
  '[
    {"name":"sea bass or branzino fillets","amount":"4","unit":"6-oz pieces"},
    {"name":"extra-virgin olive oil","amount":"4","unit":"tbsp"},
    {"name":"lemon","amount":"2","unit":"whole"},
    {"name":"fresh rosemary","amount":"4","unit":"sprigs"},
    {"name":"fresh thyme","amount":"6","unit":"sprigs"},
    {"name":"garlic cloves","amount":"4","unit":"pieces"},
    {"name":"capers","amount":"2","unit":"tbsp"},
    {"name":"sea salt and cracked pepper","amount":"to taste","unit":""}
  ]',
  '1. Preheat oven to 400°F. Lay a bed of rosemary, thyme, and sliced garlic in a baking dish.
2. Lay fish fillets skin-side down over the herbs.
3. Generously drizzle olive oil over each fillet.
4. Slice lemons; arrange half the slices under and half over the fish.
5. Season with sea salt and cracked pepper.
6. Scatter capers around the fish.
7. Roast 12–15 minutes until fish flakes easily when tested at its thickest point.
8. Spoon pan juices over each fillet before serving.',
  '{"calories":320,"protein_g":38,"carbs_g":4,"fat_g":18,"fiber_g":1}',
  'herb roasted fish lemon',
  '{"shellfish","dairy","gluten","eggs","soy"}',
  false, true, 20, 4
),

(
  'Lemon Herb Mediterranean Grain Bowl',
  'A complete Mediterranean longevity bowl. Farro provides resistant starch for microbiome diversity. Combined with plant polyphenols from fresh herbs, olives, and olive oil, this bowl mirrors the dietary patterns associated with the longest-lived Mediterranean populations.',
  '{"mediterranean","vegan","dairy-free","anti-inflammatory"}',
  '{"spring","summer"}',
  '[
    {"name":"cooked farro","amount":"1.5","unit":"cups"},
    {"name":"roasted red peppers","amount":"1/2","unit":"cup"},
    {"name":"kalamata olives","amount":"1/3","unit":"cup"},
    {"name":"sun-dried tomatoes","amount":"1/4","unit":"cup"},
    {"name":"arugula","amount":"2","unit":"cups"},
    {"name":"fresh basil","amount":"1/2","unit":"cup"},
    {"name":"fresh parsley","amount":"1/3","unit":"cup"},
    {"name":"lemon juice","amount":"3","unit":"tbsp"},
    {"name":"extra-virgin olive oil","amount":"3","unit":"tbsp"},
    {"name":"garlic clove","amount":"1","unit":"piece"},
    {"name":"pine nuts","amount":"2","unit":"tbsp"}
  ]',
  '1. Combine warm farro, roasted peppers, olives, and sun-dried tomatoes in a large bowl.
2. Whisk lemon juice, olive oil, and minced garlic for dressing.
3. Toss farro mixture with half the dressing.
4. Add arugula, basil, and parsley; toss gently.
5. Taste and add remaining dressing as needed.
6. Plate and top with toasted pine nuts.',
  '{"calories":440,"protein_g":12,"carbs_g":58,"fat_g":20,"fiber_g":8}',
  'mediterranean grain bowl',
  '{"gluten","dairy","tree-nuts","nightshades"}',
  false, true, 20, 3
),

-- ═══════════════════════════════════════════════
-- GLUTEN-FREE COMFORT (3 recipes)
-- ═══════════════════════════════════════════════

(
  'Fluffy Almond Flour Banana Pancakes',
  'A therapeutic gluten-free pancake that provides more protein and healthy fat than conventional pancakes while eliminating gluten and refined flour. Bananas naturally sweeten without added sugar and provide resistant starch for gut health.',
  '{"gluten-free","paleo","dairy-free"}',
  '{"spring","summer","fall","winter"}',
  '[
    {"name":"almond flour","amount":"1","unit":"cup"},
    {"name":"ripe banana","amount":"1","unit":"large"},
    {"name":"eggs","amount":"2","unit":"large"},
    {"name":"coconut milk","amount":"1/4","unit":"cup"},
    {"name":"vanilla extract","amount":"1","unit":"tsp"},
    {"name":"baking soda","amount":"1/2","unit":"tsp"},
    {"name":"cinnamon","amount":"1/2","unit":"tsp"},
    {"name":"coconut oil","amount":"1","unit":"tbsp"},
    {"name":"fresh berries","amount":"1","unit":"cup"},
    {"name":"maple syrup","amount":"to serve","unit":""}
  ]',
  '1. Mash banana thoroughly in a bowl.
2. Whisk in eggs, coconut milk, and vanilla.
3. Add almond flour, cinnamon, and baking soda; stir until just combined (some lumps are fine).
4. Let batter rest 3 minutes — it will thicken.
5. Heat coconut oil in a non-stick pan over medium-low heat (lower than regular pancakes — almond flour burns easily).
6. Pour 1/4 cup batter per pancake. Cook 3–4 minutes until bubbles form and edges set.
7. Flip carefully; cook 2–3 more minutes.
8. Serve with fresh berries and a small drizzle of maple syrup.',
  '{"calories":320,"protein_g":12,"carbs_g":28,"fat_g":20,"fiber_g":4}',
  'almond flour pancakes',
  '{"eggs","tree-nuts","dairy","sugar"}',
  false, true, 20, 2
),

(
  'GF Pho-Inspired Rice Noodle Soup',
  'Vietnamese pho is one of the most therapeutically constructed soups — the long-simmered bone broth delivers collagen, glycine, and glutamine. Using rice noodles makes it naturally gluten-free without compromising the profound healing character of the dish.',
  '{"gluten-free","dairy-free","paleo-adjacent","gut-healing"}',
  '{"fall","winter"}',
  '[
    {"name":"rice noodles","amount":"6","unit":"oz"},
    {"name":"beef or chicken bone broth","amount":"6","unit":"cups"},
    {"name":"star anise","amount":"3","unit":"pieces"},
    {"name":"cinnamon stick","amount":"1","unit":"piece"},
    {"name":"whole cloves","amount":"4","unit":"pieces"},
    {"name":"fresh ginger","amount":"2","unit":"inches"},
    {"name":"onion, charred","amount":"1","unit":"halved"},
    {"name":"thinly sliced beef (sirloin or brisket)","amount":"6","unit":"oz"},
    {"name":"bean sprouts","amount":"1","unit":"cup"},
    {"name":"fresh basil and mint","amount":"1","unit":"cup"},
    {"name":"lime","amount":"2","unit":"pieces"},
    {"name":"fish sauce","amount":"2","unit":"tbsp"}
  ]',
  '1. Toast star anise, cinnamon, and cloves in a dry pan until fragrant, 2 minutes.
2. Char ginger and halved onion directly over gas flame or under broiler until blackened.
3. Combine broth, toasted spices, charred ginger and onion in a large pot; simmer 30 minutes. Strain.
4. Add fish sauce to strained broth; adjust seasoning.
5. Cook rice noodles per package instructions; drain.
6. Slice beef paper-thin.
7. Bring broth to a rolling boil. Divide noodles between bowls.
8. Pour boiling broth over noodles — it cooks the beef.
9. Lay raw beef slices over the top.
10. Serve with bean sprouts, herbs, and lime wedges on the side.',
  '{"calories":380,"protein_g":32,"carbs_g":44,"fat_g":8,"fiber_g":2}',
  'pho noodle soup',
  '{"gluten","dairy","soy","shellfish"}',
  false, true, 45, 4
),

(
  'Almond Flour Blueberry Muffins',
  'A therapeutic baked good that delivers antioxidant-rich blueberries alongside 7g of protein per muffin from almond flour and eggs. These replace nutrient-void conventional muffins with a genuine therapeutic food that supports blood sugar stability.',
  '{"gluten-free","paleo","dairy-free"}',
  '{"spring","summer"}',
  '[
    {"name":"almond flour","amount":"2","unit":"cups"},
    {"name":"eggs","amount":"3","unit":"large"},
    {"name":"coconut oil","amount":"1/4","unit":"cup"},
    {"name":"raw honey","amount":"3","unit":"tbsp"},
    {"name":"vanilla extract","amount":"1","unit":"tsp"},
    {"name":"baking soda","amount":"1/2","unit":"tsp"},
    {"name":"sea salt","amount":"1/4","unit":"tsp"},
    {"name":"fresh blueberries","amount":"1","unit":"cup"},
    {"name":"lemon zest","amount":"1","unit":"tsp"}
  ]',
  '1. Preheat oven to 350°F. Line a muffin tin with parchment cups.
2. Beat eggs with melted coconut oil, honey, and vanilla until combined.
3. Stir in almond flour, baking soda, salt, and lemon zest. Batter will be thick.
4. Fold in blueberries gently — do not overmix.
5. Fill each muffin cup 2/3 full.
6. Bake 20–22 minutes until golden on top and a toothpick comes out clean.
7. Cool 10 minutes in the pan before removing — almond flour muffins are fragile when hot.
8. Store at room temperature 2 days or refrigerate up to 5 days.',
  '{"calories":245,"protein_g":7,"carbs_g":14,"fat_g":19,"fiber_g":3}',
  'blueberry almond muffins',
  '{"eggs","tree-nuts","dairy","sugar"}',
  false, true, 30, 10
);
