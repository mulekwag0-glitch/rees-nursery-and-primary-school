-- Add full_name and gender to students table for pupils who don't have auth accounts
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;

-- Make user_id nullable since pupils don't need auth accounts
ALTER TABLE public.students ALTER COLUMN user_id DROP NOT NULL;

-- Delete existing test students
DELETE FROM results WHERE student_course_id IN (SELECT id FROM student_courses WHERE student_id IN (SELECT id FROM students));
DELETE FROM student_courses WHERE student_id IN (SELECT id FROM students);
DELETE FROM attendance WHERE student_id IN (SELECT id FROM students);
DELETE FROM payments WHERE student_id IN (SELECT id FROM students);
DELETE FROM document_logs WHERE student_id IN (SELECT id FROM students);
DELETE FROM students;

-- Insert 132 real pupils
DO $$
DECLARE
  v_class_map jsonb := '{
    "Baby class": "c3ab2526-5335-4f62-b023-61b24d2c21bb",
    "Middle": "c21eaf0d-8d9d-4a2d-929c-8d33bf79c761",
    "Top": "648c970f-6993-485d-a15b-e31019ad4b19",
    "Primary one": "66400780-3162-4107-8cda-2b75909652b6",
    "Primary Two": "1f320ed1-fe25-491a-bd38-ffb20552ed25",
    "Primary Three": "bb6de381-f1e1-40e7-bccf-221e6e72a06a",
    "Primary Four": "2f5283a0-7cd8-47f3-a111-43ca9e98b584",
    "primary five": "90ba2028-e56b-4ad9-aa5c-c2ed15f07a6a",
    "primary six": "f916cc43-d1d9-476a-8a56-d404bf2fa440",
    "primary seven": "22992565-2abc-4318-8c1a-a42a0b2c1592"
  }';
  v_pupil record;
  v_counter int := 0;
BEGIN
  FOR v_pupil IN
    SELECT * FROM (VALUES
      ('KUSASIRA JOY ABIGAIL','Baby class','Female','0764088321'),
      ('KHAUKHA ELIJAH TRAVOR','Baby class','Male','0792882161'),
      ('AMUTUHAIRE ELIZABETH','Baby class','Male','0782378658'),
      ('HARITH ISSA','Baby class','Male','0771524005'),
      ('NADUNGA BLESSING EMMA','Baby class','Female','0751037328'),
      ('KITUYI FAVOR EVA','Baby class','Female','0705966373'),
      ('WABUSIMBA ABEL','Baby class','Male','0775986722'),
      ('NEKESA FAITH','Baby class','Female','0764800610'),
      ('WANZUSI MILKA','Baby class','Female','07645960'),
      ('NANZUKI JESSE','Baby class','Male','0754532611'),
      ('ATIM ANNASTASIA OKEMA','Baby class','Female','0783929593'),
      ('NAKUTI CONIE JESSLINE','Baby class','Female','0745419352'),
      ('WANDITI MOSES','Baby class','Male','0745419352'),
      ('MUNULE KHARIM','Baby class','Male','0774492106'),
      ('KABANA SAMIA','Baby class','Female','0763593590'),
      ('WATERA ZOEY AMARIS','Baby class','Female','0703967823'),
      ('KOMAGUM ALVIN','Baby class','Male','0773760014'),
      ('GAMUSI CRYSTAL KANSIIME','Baby class','Female','0778804943'),
      ('COMRADE JESUS','Baby class','Male','0771966323'),
      ('WAMAWUNGO HAMISI','Baby class','Male','0766207240'),
      ('AKASIA BADRU','Baby class','Male','0750221512'),
      ('NAWUMBE FAITH','Baby class','Female','078947422'),
      ('LIAM KAYDEN MANDA','Middle','Male','0775618626'),
      ('LANDO JODAN LEVI','Middle','Male','0787501658'),
      ('ISAAC ASINUT KE','Middle','Male','0771651505'),
      ('NEKESA DIVINE','Middle','Female','0772498119'),
      ('OKELLO ARONE LAGEN','Middle','Male','0772359376'),
      ('WILLIAM MASOLO KAKA','Middle','Male','0782358656'),
      ('FAVOUR NAMUTOSI','Middle','Female','0747436175'),
      ('NAIGAGA REEM','Middle','Female','0752971187'),
      ('LUKYAMUZI TAJI','Middle','Male','0781325566'),
      ('EMANUELLA NAMBUBA MIRIAM','Middle','Female','0779215601'),
      ('CHEPTOYEK ARIELA','Middle','Female','0773757440'),
      ('GWANYI FELIX ERIC','Middle','Male','0759014088'),
      ('OMARA DYLLAN MATHIAS','Middle','Male','0778392927'),
      ('MUSUNGU HANNAH BLESSING','Middle','Female','0778051072'),
      ('WAMBEDE EMA','Middle','Male','0789925910'),
      ('ALOBO MARIA','Middle','Female','0779431908'),
      ('RAHIM SIRAJ','Middle','Male','0788800098'),
      ('HOZZANA JOY LUGALA','Middle','Female','0780617637'),
      ('JAILA BLESSING OZIMA','Middle','Female','0761403814'),
      ('AMUGE ROSE MERCY','Middle','Female','0764800610'),
      ('ATIM NOELLA','Top','Female','0783929593'),
      ('MICHAEL JEREMIAH WAFULA','Top','Male','0789555140'),
      ('MARTHA KHAINZA','Top','Female','0778405043'),
      ('IMMACULATE HAPPINESS','Top','Female','0761091892'),
      ('DOROTHY NAMATAKA','Top','Female','0772867198'),
      ('HUSNA SABANO','Top','Female','0780284185'),
      ('KIRABO ABIGAIL KAILAH','Top','Female','0788825735'),
      ('MARIA ANGELLA GONZA','Top','Female','0772557350'),
      ('MARTHA NAMATAKA','Top','Female','0771537964'),
      ('KHALIFA MUHSIN','Top','Male','0751353220'),
      ('ISRAEL LANDO','Top','Male','0705140751'),
      ('ADRIAN WELISHE','Top','Male','0784336893'),
      ('MARTHA BLESSING AMUMPEIRE','Top','Female','0782378658'),
      ('JOTHAM WONDEJJE','Top','Male','0774697416'),
      ('JEREMIAH WANYERA','Top','Male','0782583153'),
      ('MACKLYN MAYA MUTONYI','Top','Female','0760971194'),
      ('ELIJAH NATOORO','Top','Male','0705207000'),
      ('JOSHUA OKITOI','Top','Male','0778908873'),
      ('AJAMBO BRITNEY CHAGAWO','Top','Female','0702892748'),
      ('ANNA LUCY AMUGA','Top','Female','0763024826'),
      ('BENNAH AKOSIO','Top','Female','0780838699'),
      ('MELISA OMAIDO','Top','Female','0782015234'),
      ('JEREMIAH WAGOTA','Top','Male','0784444786'),
      ('ALISHA WOKURI','Top','Female','0787245591'),
      ('NASIKE JANE','Primary one','Female','0787037619'),
      ('EMA KIMEKYE','Primary one','Male','0773166531'),
      ('BUTEME ABIGAEL NAFUNA','Primary one','Female','0780481380'),
      ('WABUSIMBA ARTHUR','Primary one','Male','0775986722'),
      ('MUTONYI QUEENTH','Primary one','Female','0760971194'),
      ('MALINGA GABRIEL','Primary one','Male','0774106430'),
      ('KISIRO JASPER NATHAN','Primary one','Male','0783360003'),
      ('ONEK GOODLUCK','Primary one','Male','0757560077'),
      ('WANDA JORDAN','Primary one','Male','0779215601'),
      ('GUSEWU EDRISA','Primary one','Male','0780607734'),
      ('NAMONO FAVOUR SUSAN','Primary one','Female','0789925910'),
      ('BUYI EMANUEL','Primary one','Male','078947422'),
      ('NAMALISHE SWABULA','Primary one','Female','0773156103'),
      ('ABER JULIANA','Primary one','Female','0779629215'),
      ('ALOYO LYDIA','Primary one','Female','0780996945'),
      ('MICAH MAINA','Primary one','Female','0782611460'),
      ('AZIIBO RAUL','Primary one','Male','0778855145'),
      ('NASAWALI DENTONI','Primary one','Male','0792817785'),
      ('NAMATAKA PRECIOUS ANNE MARY','Primary one','Female','0774492106'),
      ('JUMA OFANA','Primary one','Male','0705805345'),
      ('ACHIRO LUCY','Primary Two','Male','0745413101'),
      ('LANDO MERCY GRACE','Primary Two','Female','0787501658'),
      ('OGENERWOT ETHAN','Primary Two','Male','0773760014'),
      ('OJAKOL EDGER','Primary Two','Male','0705207000'),
      ('SIBEKE ADRIAN','Primary Two','Male','0772532562'),
      ('NANZUKI PRECIOUS','Primary Two','Female','0754532611'),
      ('NAMALWA AMINA','Primary Two','Female','0703999843'),
      ('NAMBOZO ANISHA','Primary Three','Female','0778163792'),
      ('KWEMBOI ARTHUR','Primary Three','Male','0773757440'),
      ('HUSNA KHALIFA','Primary Three','Male','0751353220'),
      ('KIKOMEKO KARIM','Primary Three','Male','0703999843'),
      ('KEDI STEPHEN OKIRIA','Primary Three','Male','0774106430'),
      ('NAMAGA TRICIA','Primary Three','Female','0778855145'),
      ('AMINAKE DORCUS','Primary Three','Female','0778855145'),
      ('MADANDA EDWIN','Primary Three','Male','0774912393'),
      ('SAMATHA MAINA','Primary Three','Female','0782611460'),
      ('MUKOMBA ELIJAH','Primary Three','Male','0774492106'),
      ('WAKI NELSON','Primary Three','Male','0766207240'),
      ('NAKAPUYA PRINCESS','Primary Three','Female','0772865494'),
      ('WANDEGA RAHIM','Primary Four','Male','0778163792'),
      ('IMURAN NABUSOBA','Primary Four','Female','0783067584'),
      ('NYMROD EDULA EPEET','Primary Four','Female','0766292656'),
      ('EMALU LEANA','Primary Four','Female','0705645920'),
      ('NASMU SHUKRAN','Primary Four','Male','0394853534'),
      ('NIMARO DIVINE','Primary Four','Male','0774312765'),
      ('AKANTORANA LEVI LAKER','Primary Four','Male','0772532562'),
      ('MADAYA MATHEW','Primary Four','Male','0774697832'),
      ('NAFUNA MAGRATE','Primary Four','Female','0772865494'),
      ('NAGAMI TOPISTA','Primary Four','Female','0785019909'),
      ('AKERA ELIJIAH','primary five','Male','0773760014'),
      ('MAJEMBE ELIAS','primary five','Male','0765999039'),
      ('MUTONYI SHALOM','primary five','Female','0760971194'),
      ('LUNYORO NORAH','primary five','Female','0779215601'),
      ('OBONGI GIDION','primary five','Male','0782645806'),
      ('AYEBALE MATHEW','primary five','Male','0784966698'),
      ('MUSUNGU HAPPIE','primary five','Female','0772532562'),
      ('COMRADE VICTORIA','primary five','Female','0771966323'),
      ('NANZUKI PEACE','primary five','Female','0754532611'),
      ('BURUHAN BAFUNA','primary six','Male','0752971187'),
      ('GOODLUCK JONATHAN OPIO','primary six','Male','0766292656'),
      ('AKOTEKE ABEL','primary six','Male','0788660266'),
      ('AJAMBO MARTHA','primary six','Female','0782456265'),
      ('BALESE IVAN','primary seven','Male','0765999039'),
      ('LUBANGANKENE INNOCENT','primary seven','Female','0775518103')
    ) AS t(name, class, gender, parent_phone)
  LOOP
    v_counter := v_counter + 1;
    INSERT INTO students (student_id, full_name, gender, program_id, status, parent_contact, user_id)
    VALUES (
      'REES/2026/' || LPAD(v_counter::text, 3, '0'),
      v_pupil.name,
      v_pupil.gender,
      (v_class_map->>v_pupil.class)::uuid,
      'active',
      v_pupil.parent_phone,
      NULL
    );
  END LOOP;
END $$;