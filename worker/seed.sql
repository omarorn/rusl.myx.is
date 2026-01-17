-- =============================================
-- RUSL.MYX.IS Seed Data
-- =============================================

-- SORPA sveitarfélög (Reykjavík, Kópavogur, etc.)
INSERT OR REPLACE INTO bin_rules (sveitarfelag, bin_name, bin_name_is, color, icon, examples) VALUES
('reykjavik', 'paper', 'Pappír og pappi', '#2563eb', '📄', '["dagblöð","tímarit","kassar","TetraPak","umbúðapappír"]'),
('reykjavik', 'plastic', 'Plastumbúðir', '#16a34a', '♻️', '["plastflöskur","plastpokar","plastumbúðir","dósir"]'),
('reykjavik', 'food', 'Matarleifar', '#a16207', '🍎', '["matarleifar","kaffigrút","eggjakurn","grænmeti"]'),
('reykjavik', 'mixed', 'Blandaður úrgangur', '#6b7280', '🗑️', '["bleyjur","ryksugupoki","keramik","3D print","bíóplast"]');

-- Akureyri (annað kerfi)
INSERT OR REPLACE INTO bin_rules (sveitarfelag, bin_name, bin_name_is, color, icon, examples) VALUES
('akureyri', 'food', 'Lífrænt', '#16a34a', '🍎', '["matarleifar","garðaúrgangur"]'),
('akureyri', 'mixed', 'Blandað', '#6b7280', '🗑️', '["allt annað - flokka á gámastöð"]');


-- Fun facts á íslensku
INSERT INTO fun_facts (fact_is, category) VALUES
('Ein plastflaska tekur 450 ár að brotna niður í náttúrunni.', 'plastic'),
('Endurvinnsla á einum álburk sparar nógu mikla orku til að keyra sjónvarp í 3 klukkustundir.', 'metal'),
('Pappír er hægt að endurvinna 5-7 sinnum áður en trefjarnir verða of stuttar.', 'paper'),
('Íslendingar framleiða um 500 kg af úrgangi á mann á ári.', 'general'),
('Matarúrgangur sem fer á urðunarstað framleiðir metangas sem er 25x verri en CO2.', 'food'),
('3D prentað PLA plast er EKKI endurunnið á Íslandi - það fer í blandað.', '3dprint'),
('TetraPak fer í pappír á Íslandi þrátt fyrir að vera úr blönduðu efni.', 'paper'),
('Froðuplast (svampplast) má EKKI setja í plasttunnu - það fer á gámastöð.', 'plastic');
