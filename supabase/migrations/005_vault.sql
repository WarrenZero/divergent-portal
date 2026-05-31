-- ─── Client Vault ─────────────────────────────────────────────────
-- Practitioner-curated educational resources shared with each client

create table if not exists vault_items (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid references clients(id) on delete cascade,
  practitioner_id       uuid references practitioners(id),
  title                 text not null,
  content_type          text check (content_type in ('article', 'document', 'protocol_resource')),
  body                  text,
  file_url              text,
  estimated_read_minutes integer default 3,
  is_read               boolean default false,
  is_bookmarked         boolean default false,
  created_at            timestamptz default now()
);

create index if not exists idx_vault_items_client      on vault_items(client_id);
create index if not exists idx_vault_items_practitioner on vault_items(practitioner_id);

alter table vault_items enable row level security;

-- Clients see only their own items
do $$ begin
  create policy "Clients see own vault items"
    on vault_items for select using (
      client_id = (
        select id from clients where clerk_user_id = auth.jwt() ->> 'sub'
      )
    );
exception when duplicate_object then null;
end $$;

-- Clients can update read/bookmark status on their own items
do $$ begin
  create policy "Clients update own vault items"
    on vault_items for update using (
      client_id = (
        select id from clients where clerk_user_id = auth.jwt() ->> 'sub'
      )
    );
exception when duplicate_object then null;
end $$;

-- Practitioners see items they created for their clients
do $$ begin
  create policy "Practitioners manage vault items"
    on vault_items for all using (
      practitioner_id = (
        select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
      )
    );
exception when duplicate_object then null;
end $$;


-- ─── Seed: ENS Signal-to-Noise Protocol resources ─────────────────
-- Inserts 3 educational articles for any client on the ENS / Signal-to-Noise protocol.
-- Uses dollar quoting to avoid apostrophe escaping issues.

do $seed$
declare
  v_rec record;
begin
  for v_rec in (
    select distinct c.id as client_id, c.practitioner_id
    from clients c
    join client_protocols cp on cp.client_id = c.id
    join protocols p on p.id = cp.protocol_id
    where (p.name ilike '%signal%' or p.name ilike '%ens%' or p.name ilike '%restoration%')
      and cp.is_active = true
      and c.practitioner_id is not null
  ) loop

    -- Only seed if this client has no vault items yet
    if not exists (select 1 from vault_items where client_id = v_rec.client_id) then

      insert into vault_items (client_id, practitioner_id, title, content_type, body, estimated_read_minutes)
      values (
        v_rec.client_id,
        v_rec.practitioner_id,
        'Understanding Boron and Your Nervous System',
        'protocol_resource',
        $b1$Boron is a trace mineral quietly working in the background of your nervous system health. Found naturally in raisins, prunes, almonds, and avocado — all featured prominently in your protocol — boron's clinical significance extends far beyond typical nutrition textbooks.

What Boron Actually Does

At a physiological level, boron acts as a cofactor for several enzyme systems involved in mineral metabolism. It regulates how your body processes calcium, magnesium, and vitamin D — three nutrients foundational to both bone density and neurological signaling. Low boron status has been linked to reduced cognitive performance, impaired hand-eye coordination, and disrupted circadian rhythms.

The ENS Connection

Your enteric nervous system (ENS) relies on a precise mineral environment to maintain its signaling integrity. When boron is insufficient, the calcium-to-magnesium ratio can become dysregulated — creating a mineral environment that promotes sympathetic dominance rather than the parasympathetic tone your protocol is designed to restore.

Why It's in Your Protocol

The MABC component of your protocol specifically targets boron repletion through food-first sources. Research suggests that dietary boron from whole food sources is absorbed more efficiently than supplemental forms. This is why the boron-rich foods in your protocol — raisins, almonds, prunes, chickpeas — are not interchangeable with supplements.

What to Watch For

As boron status improves, clients commonly report improved sleep depth, reduced joint stiffness in the morning, and better mental clarity in the afternoon hours. These improvements are gradual — typically emerging over 3–6 weeks of consistent dietary adherence.$b1$,
        4
      );

      insert into vault_items (client_id, practitioner_id, title, content_type, body, estimated_read_minutes)
      values (
        v_rec.client_id,
        v_rec.practitioner_id,
        'The ENS and Your Second Brain — What Your Gut Is Telling You',
        'protocol_resource',
        $b2$Your gut has a mind of its own — and that is not a metaphor.

The enteric nervous system is a semi-autonomous neural network containing over 500 million neurons embedded in the walls of your gastrointestinal tract. Spanning from the esophagus to the rectum, this network is capable of directing digestion, immune response, and hormone release entirely independently of the central nervous system.

The Neurotransmitter Connection

Approximately 95% of your body's serotonin is produced in the gut — not the brain. Your ENS neurons produce and respond to more than 30 neurotransmitters, including dopamine, acetylcholine, and substance P. This means your digestive function and your emotional state are biochemically intertwined in ways that conventional medicine is only beginning to understand.

Bidirectional Communication

The vagus nerve serves as the primary communication highway between the ENS and the brain. Importantly, approximately 80–90% of the signals traveling this nerve go from gut to brain — not the other way around. This means your digestive health directly shapes your mood, stress response, and cognitive clarity.

What Disrupts ENS Signaling

Several factors commonly seen in clinical practice disrupt ENS function: dysbiosis (microbial imbalance) alters neurotransmitter production; intestinal permeability allows bacterial metabolites to activate the ENS inappropriately; chronic sympathetic dominance reduces gut motility and digestive enzyme secretion; and mineral depletion — particularly magnesium — disrupts smooth muscle signaling.

Your Protocol's Approach

The ENS Restoration Protocol targets these disruptions systematically. The sequential phases address: first, reducing the inflammatory load on the ENS; second, restoring the mineral environment for signal clarity; and third, rebuilding mucosal integrity to normalize the gut-brain axis.$b2$,
        5
      );

      insert into vault_items (client_id, practitioner_id, title, content_type, body, estimated_read_minutes)
      values (
        v_rec.client_id,
        v_rec.practitioner_id,
        'Week 1 of Your Protocol — What to Expect',
        'protocol_resource',
        $b3$The first week of your protocol is a transition period. Understanding what is happening in your body — and what is normal versus what needs attention — will help you navigate it with less anxiety and more precision.

The Adaptation Phase

When the body begins receiving new nutritional inputs and reducing inflammatory foods, a brief adjustment period is common. Some clients experience mild fatigue in days 2–4 as their body redistributes energy toward repair processes rather than inflammation management. This is not a sign the protocol is not working — it is a sign it is.

Common Week 1 Experiences

Mild digestive changes — increased or decreased motility as the microbiome adjusts. Both are normal in the first 3–5 days.

Afternoon energy dip — as blood sugar regulation shifts toward more stable patterns, the former afternoon crash may temporarily feel more pronounced before it improves.

Sleep depth changes — many clients report unusually vivid dreams or changes in sleep architecture in week 1. This is often associated with shifts in neurotransmitter precursor availability.

Mood variation — gut-brain axis recalibration can produce 1–3 days of emotional variability. This typically resolves by day 7.

When to Log in Your Daily Pulse

The daily check-in data Warren reviews is most valuable during week 1. Even small observations — meal timing, energy at specific hours, bowel changes — create a baseline that guides every subsequent session. Please log every day this week, even if nothing seems significant.

What Is Coming in Week 2

Week 2 introduces the targeted supplement protocol for your specific mineral profile. By then, your digestive system will have begun adapting to the dietary changes, making nutrient absorption more efficient for the therapeutic agents that follow.$b3$,
        3
      );

    end if;
  end loop;
end $seed$;
