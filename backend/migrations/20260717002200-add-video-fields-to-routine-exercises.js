export async function up({ queryInterface, Sequelize, transaction }) {
  const table = { schema: "core", tableName: "RoutineExercises" };

  await queryInterface.addColumn(
    table,
    "videoUrl",
    {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    },
    { transaction }
  );

  await queryInterface.addColumn(
    table,
    "videoPublicId",
    {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    },
    { transaction }
  );

  await queryInterface.addColumn(
    table,
    "videoType",
    {
      type: Sequelize.DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "none",
    },
    { transaction }
  );

  await queryInterface.sequelize.query(
    `
    UPDATE core."RoutineExercises"
    SET "videoType" = 'none'
    WHERE "videoType" IS NULL;
    `,
    { transaction }
  );

  await queryInterface.sequelize.query(
    `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'routine_exercises_video_type_check'
      ) THEN
        ALTER TABLE core."RoutineExercises"
          ADD CONSTRAINT "routine_exercises_video_type_check"
          CHECK ("videoType" IN ('none', 'upload', 'youtube', 'external'));
      END IF;
    END $$;
    `,
    { transaction }
  );
}

export async function down({ queryInterface, transaction }) {
  const table = { schema: "core", tableName: "RoutineExercises" };

  await queryInterface.sequelize.query(
    `
    ALTER TABLE core."RoutineExercises"
      DROP CONSTRAINT IF EXISTS "routine_exercises_video_type_check";
    `,
    { transaction }
  );
  await queryInterface.removeColumn(table, "videoType", { transaction });
  await queryInterface.removeColumn(table, "videoPublicId", { transaction });
  await queryInterface.removeColumn(table, "videoUrl", { transaction });
}
