export async function up({ queryInterface, Sequelize, transaction }) {
  await queryInterface.createTable(
    {
      schema: "core",
      tableName: "MigrationSmokeTests",
    },
    {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      note: {
        type: Sequelize.DataTypes.STRING(120),
        allowNull: false,
        defaultValue: "migration-smoke-test",
      },
      createdAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.DataTypes.NOW,
      },
      updatedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.DataTypes.NOW,
      },
    },
    { transaction }
  );
}

export async function down({ queryInterface, transaction }) {
  await queryInterface.dropTable(
    {
      schema: "core",
      tableName: "MigrationSmokeTests",
    },
    { transaction }
  );
}
