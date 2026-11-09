-- Reparación para bases de datos que ya estaban migradas antes de corregir el
-- orden de las migraciones. NO borra datos ni cambia tablas de la aplicación.
--
-- Tres carpetas se renombraron para que corran antes de las migraciones que
-- dependen de ellas. Prisma identifica cada migración por el nombre de su
-- carpeta, así que aquí se actualiza ese nombre en su tabla de control. El SQL
-- de las migraciones no cambió, por lo que los checksums siguen siendo válidos.
--
-- Se ejecuta una vez, desde backend/, y se puede repetir sin efecto:
--
--   npx prisma db execute --file prisma/repair/renombrar-migraciones.sql
--   npx prisma migrate deploy

DO $$
BEGIN
  -- Base vacía: no hay nada que reparar.
  IF to_regclass('"_prisma_migrations"') IS NULL THEN
    RETURN;
  END IF;

  UPDATE "_prisma_migrations"
     SET migration_name = '20261022154000_roles_expediente_alumno_eventos'
   WHERE migration_name = '20261022190838_roles_expediente_alumno_eventos';

  UPDATE "_prisma_migrations"
     SET migration_name = '20261022154100_tutores_notificaciones_metodo_pago'
   WHERE migration_name = '20261022195619_tutores_notificaciones_metodo_pago';

  UPDATE "_prisma_migrations"
     SET migration_name = '20261022154200_clave_profesor_y_alumnos_por_profesor'
   WHERE migration_name = '20261022203000_clave_profesor_y_alumnos_por_profesor';

  -- Quien probó la rama feature/paypal-smart-buttons tiene aplicada una
  -- migración que no llegó a main. Crea el mismo índice que
  -- 20261109120000_paypal_referencias, que fallaría al encontrarlo. Se retira
  -- el índice (migrate deploy lo vuelve a crear enseguida) y su registro.
  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations"
     WHERE migration_name = '20261029120000_paypal_external_reference_unique'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM "_prisma_migrations"
       WHERE migration_name = '20261109120000_paypal_referencias'
    ) THEN
      DROP INDEX IF EXISTS "Payment_externalReference_key";
    END IF;

    DELETE FROM "_prisma_migrations"
     WHERE migration_name = '20261029120000_paypal_external_reference_unique';
  END IF;
END $$;
