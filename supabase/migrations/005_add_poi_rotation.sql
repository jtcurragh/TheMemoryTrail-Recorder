-- Add rotation to pois (0, 90, 180, 270 degrees)
alter table pois add column if not exists rotation smallint default 0;

-- Constrain to valid values
alter table pois drop constraint if exists pois_rotation_check;
alter table pois add constraint pois_rotation_check
  check (rotation in (0, 90, 180, 270));
