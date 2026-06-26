import { Brand } from "./Brand.js";
import { Category } from "./Category.js";
import { Product } from "./Product.js";
import { ProductImage } from "./ProductImage.js";
import { AboutPage } from "./AboutPage.js";
import { AboutValue } from "./AboutValue.js";
import { AboutTeamMember } from "./AboutTeamMember.js";
import { User } from "./User.js";
import { UserProfile } from "./UserProfile.js";
import { UserWeightHistory } from "./UserWeightHistory.js";
import { UserCalorieHistory } from "./UserCalorieHistory.js";
import { Routine } from "./Routine.js";
import { RoutineExercise } from "./RoutineExercise.js";
import { TrainerProfile } from "./TrainerProfile.js";
import { TrainerClient } from "./TrainerClient.js";
import { TrainerAgendaItem } from "./TrainerAgendaItem.js";


// ✅ Category(id_categoria) <-> Brand(categoryId)
Category.hasMany(Brand, {
  foreignKey: "categoryId",
  sourceKey: "id_categoria",
});
Brand.belongsTo(Category, {
  foreignKey: "categoryId",
  targetKey: "id_categoria",
});

// ✅ Brand(id_marca) <-> Product(brandId)
Brand.hasMany(Product, { foreignKey: "brandId", sourceKey: "id_marca" });
Product.belongsTo(Brand, { foreignKey: "brandId", targetKey: "id_marca" });

// ✅ Category(id_categoria) <-> Product(categoryId)
Category.hasMany(Product, {
  foreignKey: "categoryId",
  sourceKey: "id_categoria",
});
Product.belongsTo(Category, {
  foreignKey: "categoryId",
  targetKey: "id_categoria",
});

// ✅ Product(id_producto) <-> ProductImage(productId)
Product.hasMany(ProductImage, {
  foreignKey: "productId",
  sourceKey: "id_producto",
  as: "images",
  onDelete: "CASCADE",
});
ProductImage.belongsTo(Product, {
  foreignKey: "productId",
  targetKey: "id_producto",
});

// AboutPage -> Values
AboutPage.hasMany(AboutValue, {
  foreignKey: "aboutPageId",
  sourceKey: "id",
  as: "values",
  onDelete: "CASCADE",
  hooks: true,
});

AboutValue.belongsTo(AboutPage, {
  foreignKey: "aboutPageId",
  targetKey: "id",
  as: "aboutPage",
});

// AboutPage -> Team
AboutPage.hasMany(AboutTeamMember, {
  foreignKey: "aboutPageId",
  sourceKey: "id",
  as: "teamMembers",
  onDelete: "CASCADE",
  hooks: true,
});

AboutTeamMember.belongsTo(AboutPage, {
  foreignKey: "aboutPageId",
  targetKey: "id",
  as: "aboutPage",
});

// USER -> PROFILE
User.hasOne(UserProfile, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "profile",
  onDelete: "CASCADE",
  hooks: true,
});
UserProfile.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

// USER -> WEIGHT HISTORY
User.hasMany(UserWeightHistory, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "weightHistory",
  onDelete: "CASCADE",
  hooks: true,
});
UserWeightHistory.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

// USER -> CALORIE HISTORY
User.hasMany(UserCalorieHistory, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "calorieHistory",
  onDelete: "CASCADE",
  hooks: true,
});
UserCalorieHistory.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});
// USER -> ROUTINES
User.hasMany(Routine, {
  foreignKey: "trainerId",
  sourceKey: "id",
  as: "trainerRoutines",
  onDelete: "CASCADE",
  hooks: true,
});

Routine.belongsTo(User, {
  foreignKey: "trainerId",
  targetKey: "id",
  as: "trainer",
});

// ROUTINE -> EXERCISES
Routine.hasMany(RoutineExercise, {
  foreignKey: "routineId",
  sourceKey: "id",
  as: "exercises",
  onDelete: "CASCADE",
  hooks: true,
});

RoutineExercise.belongsTo(Routine, {
  foreignKey: "routineId",
  targetKey: "id",
  as: "routine",
});
// TRAINER -> PROFILE
User.hasOne(TrainerProfile, {
  foreignKey: "trainerId",
  sourceKey: "id",
  as: "trainerProfile",
  onDelete: "CASCADE",
  hooks: true,
});

TrainerProfile.belongsTo(User, {
  foreignKey: "trainerId",
  targetKey: "id",
  as: "trainer",
});

// TRAINER -> CLIENTS
User.hasMany(TrainerClient, {
  foreignKey: "trainerId",
  sourceKey: "id",
  as: "assignedClients",
  onDelete: "CASCADE",
  hooks: true,
});

TrainerClient.belongsTo(User, {
  foreignKey: "trainerId",
  targetKey: "id",
  as: "trainer",
});

User.hasMany(TrainerClient, {
  foreignKey: "clientId",
  sourceKey: "id",
  as: "clientTrainerLinks",
  onDelete: "CASCADE",
  hooks: true,
});

TrainerClient.belongsTo(User, {
  foreignKey: "clientId",
  targetKey: "id",
  as: "client",
});

// TRAINER -> AGENDA
User.hasMany(TrainerAgendaItem, {
  foreignKey: "trainerId",
  sourceKey: "id",
  as: "agendaItems",
  onDelete: "CASCADE",
  hooks: true,
});

TrainerAgendaItem.belongsTo(User, {
  foreignKey: "trainerId",
  targetKey: "id",
  as: "trainer",
});
export {
  Brand,
  Category,
  Product,
  ProductImage,
  AboutPage,
  AboutValue,
  AboutTeamMember,
  User,
  UserProfile,
  UserWeightHistory,
  UserCalorieHistory,
  Routine,
  RoutineExercise,
  TrainerProfile,
  TrainerClient,
  TrainerAgendaItem,
};