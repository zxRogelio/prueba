-- 1. Rutinas sin ejercicios.
SELECT
  r."id",
  r."title",
  r."status"
FROM core."Routines" r
LEFT JOIN core."RoutineExercises" re ON re."routineId" = r."id"
GROUP BY r."id", r."title", r."status"
HAVING COUNT(re."id") = 0
ORDER BY r."createdAt" DESC;

-- Diagnostico general de cobertura de video por rutina.
SELECT
  r."id",
  r."title",
  r."status",
  r."videoUrl" AS "legacyRoutineVideoUrl",
  r."videoPublicId" AS "legacyRoutineVideoPublicId",
  COUNT(re."id")::integer AS "exerciseCount",
  COUNT(re."id") FILTER (
    WHERE re."videoUrl" IS NOT NULL
      AND re."videoType" IS NOT NULL
      AND re."videoType" <> 'none'
  )::integer AS "exercisesWithVideo",
  COUNT(re."id") FILTER (
    WHERE re."videoUrl" IS NULL
      OR re."videoType" IS NULL
      OR re."videoType" = 'none'
  )::integer AS "exercisesWithoutVideo"
FROM core."Routines" r
LEFT JOIN core."RoutineExercises" re ON re."routineId" = r."id"
GROUP BY
  r."id",
  r."title",
  r."status",
  r."videoUrl",
  r."videoPublicId"
ORDER BY r."createdAt" DESC;

-- 2. Rutinas pending_review sin todos los videos.
SELECT
  r."id",
  r."title",
  r."status",
  re."id" AS "exerciseId",
  re."name",
  re."dayNumber",
  re."videoUrl",
  re."videoType",
  CASE
    WHEN re."id" IS NULL THEN 'routine_without_exercises'
    WHEN re."videoUrl" IS NULL THEN 'missing_video_url'
    WHEN re."videoType" IS NULL THEN 'missing_video_type'
    WHEN re."videoType" = 'none' THEN 'video_type_none'
    ELSE 'unknown'
  END AS "reason"
FROM core."Routines" r
LEFT JOIN core."RoutineExercises" re ON re."routineId" = r."id"
WHERE r."status" = 'pending_review'
  AND (
    re."id" IS NULL
    OR re."videoUrl" IS NULL
    OR re."videoType" IS NULL
    OR re."videoType" = 'none'
  )
ORDER BY r."createdAt" DESC, re."dayNumber", re."order";

-- 3. Rutinas published sin todos los videos.
SELECT
  r."id",
  r."title",
  r."status",
  re."id" AS "exerciseId",
  re."name",
  re."dayNumber",
  re."videoUrl",
  re."videoType",
  CASE
    WHEN re."id" IS NULL THEN 'routine_without_exercises'
    WHEN re."videoUrl" IS NULL THEN 'missing_video_url'
    WHEN re."videoType" IS NULL THEN 'missing_video_type'
    WHEN re."videoType" = 'none' THEN 'video_type_none'
    ELSE 'unknown'
  END AS "reason"
FROM core."Routines" r
LEFT JOIN core."RoutineExercises" re ON re."routineId" = r."id"
WHERE r."status" = 'published'
  AND (
    re."id" IS NULL
    OR re."videoUrl" IS NULL
    OR re."videoType" IS NULL
    OR re."videoType" = 'none'
  )
ORDER BY r."createdAt" DESC, re."dayNumber", re."order";

-- 4. Ejercicios videoType none con videoUrl.
SELECT
  re."id",
  re."routineId",
  re."name",
  re."videoUrl",
  re."videoType"
FROM core."RoutineExercises" re
WHERE re."videoType" = 'none'
  AND re."videoUrl" IS NOT NULL
ORDER BY re."updatedAt" DESC;

-- 5. Ejercicios videoType upload sin videoPublicId.
SELECT
  re."id",
  re."routineId",
  re."name",
  re."videoUrl",
  re."videoType",
  re."videoPublicId"
FROM core."RoutineExercises" re
WHERE re."videoType" = 'upload'
  AND re."videoPublicId" IS NULL
ORDER BY re."updatedAt" DESC;

-- 6. Ejercicios con videoPublicId pero videoUrl null.
SELECT
  re."id",
  re."routineId",
  re."name",
  re."videoUrl",
  re."videoType",
  re."videoPublicId"
FROM core."RoutineExercises" re
WHERE re."videoPublicId" IS NOT NULL
  AND re."videoUrl" IS NULL
ORDER BY re."updatedAt" DESC;

-- 7. URLs externas con videoPublicId.
SELECT
  re."id",
  re."routineId",
  re."name",
  re."videoUrl",
  re."videoType",
  re."videoPublicId"
FROM core."RoutineExercises" re
WHERE re."videoType" IN ('youtube', 'external')
  AND re."videoPublicId" IS NOT NULL
ORDER BY re."updatedAt" DESC;

-- 8. Ejercicios huerfanos.
SELECT
  re."id",
  re."routineId",
  re."name"
FROM core."RoutineExercises" re
LEFT JOIN core."Routines" r ON r."id" = re."routineId"
WHERE r."id" IS NULL
ORDER BY re."updatedAt" DESC;

-- 9. Rutinas con video general heredado.
SELECT
  r."id",
  r."title",
  r."status",
  r."videoUrl" AS "legacyRoutineVideoUrl",
  r."videoPublicId" AS "legacyRoutineVideoPublicId",
  r."videoType" AS "legacyRoutineVideoType"
FROM core."Routines" r
WHERE r."videoUrl" IS NOT NULL
   OR r."videoPublicId" IS NOT NULL
   OR COALESCE(r."videoType", 'none') <> 'none'
ORDER BY r."updatedAt" DESC;

-- 10. Videos duplicados por videoPublicId.
SELECT
  re."videoPublicId",
  COUNT(*)::integer AS "usageCount",
  ARRAY_AGG(re."id" ORDER BY re."updatedAt" DESC) AS "exerciseIds",
  ARRAY_AGG(re."routineId" ORDER BY re."updatedAt" DESC) AS "routineIds"
FROM core."RoutineExercises" re
WHERE re."videoPublicId" IS NOT NULL
GROUP BY re."videoPublicId"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Tipos de video inconsistentes.
SELECT
  re."id",
  re."routineId",
  re."name",
  re."videoUrl",
  re."videoType",
  re."videoPublicId"
FROM core."RoutineExercises" re
WHERE re."videoType" IS NULL
   OR re."videoType" NOT IN ('none', 'upload', 'youtube', 'external')
ORDER BY re."updatedAt" DESC;
