INSERT INTO users (email, password_hash, display_name) VALUES
  ('gm@example.com', '!', 'Mira'),
  ('thorne@example.com', '!', 'Sam'),
  ('pip@example.com', '!', 'Alex');

INSERT INTO campaigns (name, description, invite_code) VALUES
  ('The Sunken Keep', 'A flooded fortress on the coast, and something living in the lower halls.', 'KEEP42');

INSERT INTO memberships (user_id, campaign_id, role)
SELECT u.id, c.id, CASE WHEN u.email = 'gm@example.com' THEN 'GM'::member_role ELSE 'PLAYER'::member_role END
FROM users u CROSS JOIN campaigns c;

INSERT INTO characters (campaign_id, owner_id, name, race, char_class, level, hit_points, ability_scores, gold)
SELECT c.id, u.id, v.name, v.race, v.char_class, v.level, v.hit_points, v.ability_scores::jsonb, v.gold
FROM (VALUES
  ('thorne@example.com', 'Thorne', 'Dwarf', 'Fighter', 3, 31, '{"str":16,"dex":12,"con":15,"int":8,"wis":11,"cha":10}', 45),
  ('pip@example.com', 'Pip', 'Halfling', 'Rogue', 3, 20, '{"str":8,"dex":17,"con":12,"int":13,"wis":10,"cha":14}', 112)
) AS v (email, name, race, char_class, level, hit_points, ability_scores, gold)
JOIN users u ON u.email = v.email
CROSS JOIN campaigns c;

INSERT INTO session_notes (campaign_id, author_id, title, body, session_date, is_gm_only)
SELECT c.id, u.id, v.title, v.body, v.session_date::date, v.is_gm_only
FROM (VALUES
  ('Session 1: The causeway', 'The party crossed at low tide and found the gate chained from the inside.', '2026-10-17', false),
  ('Session 2: Lower halls', 'Pip picked the cellar lock. Thorne held the stairs against two drowned guards.', '2026-10-24', false),
  ('Keeper''s secret', 'The castellan is still alive and is the one flooding the halls.', '2026-10-24', true)
) AS v (title, body, session_date, is_gm_only)
JOIN users u ON u.email = 'gm@example.com'
CROSS JOIN campaigns c;

INSERT INTO dice_rolls (campaign_id, user_id, expression, results, modifier, total, rolled_at)
SELECT c.id, u.id, v.expression, v.results::integer[], v.modifier, v.total, v.rolled_at::timestamptz
FROM (VALUES
  ('thorne@example.com', '1d20+5', '{14}', 5, 19, '2026-10-24 19:05:00-05'),
  ('pip@example.com', '2d6+3', '{4,6}', 3, 13, '2026-10-24 19:07:00-05'),
  ('gm@example.com', '1d8', '{2}', 0, 2, '2026-10-24 19:08:00-05')
) AS v (email, expression, results, modifier, total, rolled_at)
JOIN users u ON u.email = v.email
CROSS JOIN campaigns c;
