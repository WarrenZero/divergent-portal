-- ─── Migration 012: Book Seeds ───────────────────────────────
-- Add is_public column
ALTER TABLE vault_items
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Drop the old content_type CHECK constraint and replace it with one
-- that includes 'book_recommendation'
ALTER TABLE vault_items
  DROP CONSTRAINT IF EXISTS vault_items_content_type_check;

ALTER TABLE vault_items
  ADD CONSTRAINT vault_items_content_type_check
  CHECK (content_type IN (
    'article',
    'document',
    'protocol_resource',
    'clinical_science',
    'book_recommendation'
  ));

-- Seed 11 recommended books — each in its own DO block for idempotency

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'Gut — Giulia Enders' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'Gut — Giulia Enders',
      'book_recommendation',
      $body$Foundation: Digestion

Warren's note: The most accessible book ever written about the digestive system. Enders explains in plain language why your gut is your second brain — and what happens when it's out of balance. I recommend this to every client before their first session.

Key insights: The gut-brain connection, why gut bacteria affect mood, how digestion actually works from mouth to exit.

Best for: Anyone with GI symptoms, bloating, constipation, or unexplained fatigue.

Where to find it: Available at most public libraries and on Amazon.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'Why We Get Sick — Benjamin Bikman' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'Why We Get Sick — Benjamin Bikman',
      'book_recommendation',
      $body$Foundation: Blood Sugar

Warren's note: Bikman — a world-class metabolic researcher — makes the case that insulin resistance is the root driver behind most chronic disease. If you deal with energy crashes, brain fog, or stubborn weight, this book explains why.

Key insights: How insulin resistance develops silently, why blood sugar stability matters for every system in the body, and what dietary changes have the most impact.

Best for: Clients with blood sugar imbalances, fatigue, mood swings, or metabolic concerns.

Where to find it: Available on Amazon and most major booksellers.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'The Omega-3 Connection — Andrew Stoll' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'The Omega-3 Connection — Andrew Stoll',
      'book_recommendation',
      $body$Foundation: Essential Fats

Warren's note: A pioneering work on the role of omega-3 fatty acids in mental and physical health. Dr. Stoll conducted the first double-blind trials showing omega-3s could match antidepressants for mood stabilization. Required reading if you experience mood instability, brain fog, or joint inflammation.

Key insights: The omega-3 to omega-6 ratio and why modern diets are deeply imbalanced, how EPA and DHA support neurotransmitter function, anti-inflammatory signaling pathways.

Best for: Clients with mood challenges, neurological symptoms, or inflammatory patterns.

Where to find it: Available on Amazon and through most libraries.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'Nourishing Traditions — Sally Fallon' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'Nourishing Traditions — Sally Fallon',
      'book_recommendation',
      $body$Foundation: Minerals

Warren's note: This is the foundational text of the Weston A. Price movement and one of the most important books in my library. Fallon and nutritional anthropologist Mary Enig restore the wisdom of traditional food preparation — fermentation, bone broth, soaking grains, and animal fats. It reframes everything we've been told about "healthy eating."

Key insights: Why traditional cultures had far better mineral status than modern ones, the role of fat-soluble vitamins A, D, and K2, how to prepare foods to maximize nutrient absorption.

Best for: Every client — this is foundational to understanding real food.

Where to find it: Available on Amazon. The physical book is worth owning.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'Vitamin K2 and the Calcium Paradox — Kate Rheaume-Bleue' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'Vitamin K2 and the Calcium Paradox — Kate Rheaume-Bleue',
      'book_recommendation',
      $body$Foundation: Vitamins

Warren's note: This book answers a question that puzzled researchers for decades: why do people taking calcium supplements sometimes end up with more heart disease? The answer is vitamin K2 — the missing mineral director that tells calcium where to go. Essential reading for anyone concerned about bone health, cardiovascular health, or dental health.

Key insights: The critical difference between K1 and K2, how K2 activates proteins that move calcium into bones and out of arteries, food sources of K2 and why they've disappeared from the modern diet.

Best for: Clients with bone density concerns, cardiovascular risk, or dental calcification.

Where to find it: Available on Amazon and most libraries.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'Primal Body, Primal Mind — Nora Gedgaudas' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'Primal Body, Primal Mind — Nora Gedgaudas',
      'book_recommendation',
      $body$Foundation: Protein

Warren's note: Nora Gedgaudas brings together ancestral nutrition science, neuroscience, and clinical practice in a way that no other book has matched. Her work on protein quality, fat metabolism, and neurological health is directly incorporated into the ENS protocols.

Key insights: How our evolutionary dietary history shapes our current nutritional needs, the role of fat as primary fuel for the brain, why adequate protein is non-negotiable for neurological function, and how carbohydrate excess drives neurodegeneration.

Best for: Clients with neurological symptoms, mood disorders, or those interested in the evolutionary basis of their protocol.

Where to find it: Available on Amazon. Updated edition released 2019.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'An Elegant Defense — Matt Richtel' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'An Elegant Defense — Matt Richtel',
      'book_recommendation',
      $body$Foundation: Immune System

Warren's note: A Pulitzer Prize-winning journalist follows four people navigating serious immune challenges — and in the process writes the most compelling explanation of the immune system I've ever read. Richtel makes immunology accessible without dumbing it down. After reading this, you'll understand why foundational nutrition is always immune support.

Key insights: How the immune system's two branches (innate and adaptive) work together, why immune dysregulation drives both autoimmune disease and vulnerability to infection, and the lifestyle factors that most influence immune calibration.

Best for: Clients with autoimmune patterns, frequent illness, or inflammatory conditions.

Where to find it: Available on Amazon and at most public libraries.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'Why Zebras Don''t Get Ulcers — Robert Sapolsky' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'Why Zebras Don''t Get Ulcers — Robert Sapolsky',
      'book_recommendation',
      $body$Foundation: Adrenal/Stress

Warren's note: Stanford neuroscientist Robert Sapolsky wrote the definitive popular science book on stress physiology — and it happens to be one of the funniest science books ever written. Understanding why chronic psychological stress is biologically so damaging is foundational to understanding adrenal dysregulation and why your body responds the way it does.

Key insights: Why short-term stress is adaptive but chronic stress is destructive, how the HPA axis drives cortisol dysregulation, the connections between stress, digestion, immunity, and cardiovascular health.

Best for: Any client dealing with chronic stress, adrenal fatigue, sleep disruption, or burnout.

Where to find it: Available everywhere books are sold. Third edition is the definitive version.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'Clean — Alejandro Junger' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'Clean — Alejandro Junger',
      'book_recommendation',
      $body$Foundation: Liver/Detox

Warren's note: Dr. Junger's book demystifies detoxification — separating the legitimate science from the wellness industry noise. His clinical experience with elimination protocols maps closely to the principles behind the ENS Restoration Protocol. This is the approachable introduction to why we support the liver first.

Key insights: How the liver's two-phase detoxification process works and what it needs to function, why the modern toxic load exceeds the liver's evolved capacity, practical dietary approaches to support hepatic clearance.

Best for: Clients beginning an elimination or restoration protocol, or those with unexplained symptoms, skin issues, or chemical sensitivities.

Where to find it: Available on Amazon and most libraries.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'The Hormone Cure — Sara Gottfried' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'The Hormone Cure — Sara Gottfried',
      'book_recommendation',
      $body$Foundation: Hormones

Warren's note: Dr. Sara Gottfried trained at Harvard and MIT and brings that rigor to functional hormone medicine. Her book is the clearest explanation I've found of how to identify hormonal imbalances through symptoms before resorting to lab testing — and the nutritional and lifestyle interventions that work first.

Key insights: The interconnection of cortisol, estrogen, progesterone, testosterone, and thyroid hormones, how to read your body's signals as a hormonal map, and the foundational nutritional steps that restore hormonal balance.

Best for: Clients with hormonal symptoms — irregular cycles, mood swings, fatigue, libido changes, or perimenopausal/menopausal patterns.

Where to find it: Available on Amazon and most booksellers.$body$,
      3,
      true
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault_items WHERE title = 'The Body Keeps the Score — Bessel van der Kolk' AND is_public = true) THEN
    INSERT INTO vault_items (title, content_type, body, estimated_read_minutes, is_public)
    VALUES (
      'The Body Keeps the Score — Bessel van der Kolk',
      'book_recommendation',
      $body$Foundation: Mind

Warren's note: This is the most important book I've read in the last decade. Dr. van der Kolk — one of the world's leading trauma researchers — shows how unresolved trauma is stored in the body, not just the mind, and how it reshapes physiology over time. Understanding this transforms how we think about chronic illness, digestive dysfunction, and nervous system dysregulation.

Key insights: The neuroscience of trauma and how it rewires the autonomic nervous system, why talk therapy alone is often insufficient for somatic healing, and why body-based approaches — including nutrition and movement — are essential parts of recovery.

Best for: Every client. This book contextualizes why parasympathetic-first care matters.

Where to find it: Available everywhere. One of the best-selling health books of the last decade.$body$,
      3,
      true
    );
  END IF;
END $$;
