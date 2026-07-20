import { Brand } from "./Brand.js";
import { Category } from "./Category.js";
import { Product } from "./Product.js";
import { ProductImage } from "./ProductImage.js";
import { AboutPage } from "./AboutPage.js";
import { AboutValue } from "./AboutValue.js";
import { AboutTeamMember } from "./AboutTeamMember.js";
import { User } from "./User.js";
import { Session } from "./Session.js";
import { UserProfile } from "./UserProfile.js";
import { UserWeightHistory } from "./UserWeightHistory.js";
import { UserCalorieHistory } from "./UserCalorieHistory.js";
import { Routine } from "./Routine.js";
import { RoutineExercise } from "./RoutineExercise.js";
import { TrainerProfile } from "./TrainerProfile.js";
import { TrainerClient } from "./TrainerClient.js";
import { TrainerAgendaItem } from "./TrainerAgendaItem.js";
import { MembershipPlan } from "./MembershipPlan.js";
import { Cart } from "./Cart.js";
import { CartItem } from "./CartItem.js";
import { Order } from "./Order.js";
import { OrderItem } from "./OrderItem.js";
import { Payment } from "./Payment.js";
import { PaymentWebhookEvent } from "./PaymentWebhookEvent.js";
import { PaymentRefund } from "./PaymentRefund.js";
import { PaymentRefundItem } from "./PaymentRefundItem.js";
import { UserSubscription } from "./UserSubscription.js";
import { Receipt } from "./Receipt.js";
import { SubscriptionGroup } from "./SubscriptionGroup.js";
import { SubscriptionGroupMember } from "./SubscriptionGroupMember.js";
import { BehaviorEvent } from "./BehaviorEvent.js";
import { InventoryMovement } from "./InventoryMovement.js";
import { ProductPriceHistory } from "./ProductPriceHistory.js";
import { Promotion } from "./Promotion.js";
import { PromotionProduct } from "./PromotionProduct.js";
import { OrderDiscount } from "./OrderDiscount.js";
import { SubscriptionEvent } from "./SubscriptionEvent.js";

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
// ===============================
// MEMBERSHIPS / PAYMENTS
// ===============================

// USER -> CARTS
User.hasMany(Cart, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "carts",
});

Cart.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

// CART -> ORDER
Cart.belongsTo(Order, {
  foreignKey: "convertedOrderId",
  targetKey: "id",
  as: "convertedOrder",
});

Order.hasOne(Cart, {
  foreignKey: "convertedOrderId",
  sourceKey: "id",
  as: "sourceCart",
});

// CART -> ITEMS
Cart.hasMany(CartItem, {
  foreignKey: "cartId",
  sourceKey: "id",
  as: "items",
  onDelete: "CASCADE",
  hooks: true,
});

CartItem.belongsTo(Cart, {
  foreignKey: "cartId",
  targetKey: "id",
  as: "cart",
});

// CART ITEM -> PRODUCT
Product.hasMany(CartItem, {
  foreignKey: "productId",
  sourceKey: "id_producto",
  as: "cartItems",
});

CartItem.belongsTo(Product, {
  foreignKey: "productId",
  targetKey: "id_producto",
  as: "product",
});

// USER -> ORDERS
User.hasMany(Order, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "customerOrders",
});

Order.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "customer",
});

User.hasMany(Order, {
  foreignKey: "createdBy",
  sourceKey: "id",
  as: "createdOrders",
});

Order.belongsTo(User, {
  foreignKey: "createdBy",
  targetKey: "id",
  as: "createdByUser",
});

// ORDER -> ITEMS
Order.hasMany(OrderItem, {
  foreignKey: "orderId",
  sourceKey: "id",
  as: "items",
  onDelete: "CASCADE",
  hooks: true,
});

OrderItem.belongsTo(Order, {
  foreignKey: "orderId",
  targetKey: "id",
  as: "order",
});

// ORDER ITEM -> PRODUCT
Product.hasMany(OrderItem, {
  foreignKey: "productId",
  sourceKey: "id_producto",
  as: "orderItems",
});

OrderItem.belongsTo(Product, {
  foreignKey: "productId",
  targetKey: "id_producto",
  as: "product",
});

// ORDER ITEM -> MEMBERSHIP PLAN
MembershipPlan.hasMany(OrderItem, {
  foreignKey: "membershipPlanId",
  sourceKey: "id",
  as: "orderItems",
});

OrderItem.belongsTo(MembershipPlan, {
  foreignKey: "membershipPlanId",
  targetKey: "id",
  as: "membershipPlan",
});

// ORDER ITEM -> USER SUBSCRIPTION
OrderItem.hasOne(UserSubscription, {
  foreignKey: "orderItemId",
  sourceKey: "id",
  as: "userSubscription",
});

UserSubscription.belongsTo(OrderItem, {
  foreignKey: "orderItemId",
  targetKey: "id",
  as: "orderItem",
});

// ORDER ITEM -> SUBSCRIPTION GROUP
OrderItem.hasOne(SubscriptionGroup, {
  foreignKey: "orderItemId",
  sourceKey: "id",
  as: "subscriptionGroup",
});

SubscriptionGroup.belongsTo(OrderItem, {
  foreignKey: "orderItemId",
  targetKey: "id",
  as: "orderItem",
});

// ORDER -> PAYMENTS
Order.hasMany(Payment, {
  foreignKey: "orderId",
  sourceKey: "id",
  as: "payments",
});

Payment.belongsTo(Order, {
  foreignKey: "orderId",
  targetKey: "id",
  as: "order",
});

// PAYMENT -> WEBHOOK EVENTS
Payment.hasMany(PaymentWebhookEvent, {
  foreignKey: "paymentId",
  sourceKey: "id",
  as: "webhookEvents",
});

PaymentWebhookEvent.belongsTo(Payment, {
  foreignKey: "paymentId",
  targetKey: "id",
  as: "payment",
});

// PAYMENT -> REFUNDS
Payment.hasMany(PaymentRefund, {
  foreignKey: "paymentId",
  sourceKey: "id",
  as: "refunds",
});

PaymentRefund.belongsTo(Payment, {
  foreignKey: "paymentId",
  targetKey: "id",
  as: "payment",
});

// ORDER -> PAYMENT REFUNDS
Order.hasMany(PaymentRefund, {
  foreignKey: "orderId",
  sourceKey: "id",
  as: "refunds",
});

PaymentRefund.belongsTo(Order, {
  foreignKey: "orderId",
  targetKey: "id",
  as: "order",
});

// USER -> REQUESTED REFUNDS
User.hasMany(PaymentRefund, {
  foreignKey: "requestedBy",
  sourceKey: "id",
  as: "requestedPaymentRefunds",
});

PaymentRefund.belongsTo(User, {
  foreignKey: "requestedBy",
  targetKey: "id",
  as: "requestedByUser",
});

// PAYMENT REFUND -> ITEMS
PaymentRefund.hasMany(PaymentRefundItem, {
  foreignKey: "refundId",
  sourceKey: "id",
  as: "items",
  onDelete: "CASCADE",
  hooks: true,
});

PaymentRefundItem.belongsTo(PaymentRefund, {
  foreignKey: "refundId",
  targetKey: "id",
  as: "refund",
});

OrderItem.hasMany(PaymentRefundItem, {
  foreignKey: "orderItemId",
  sourceKey: "id",
  as: "refundItems",
});

PaymentRefundItem.belongsTo(OrderItem, {
  foreignKey: "orderItemId",
  targetKey: "id",
  as: "orderItem",
});

// USER -> PAYMENTS
User.hasMany(Payment, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "payments",
});

Payment.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

// MEMBERSHIP PLAN -> PAYMENTS
MembershipPlan.hasMany(Payment, {
  foreignKey: "planId",
  sourceKey: "id",
  as: "payments",
});

Payment.belongsTo(MembershipPlan, {
  foreignKey: "planId",
  targetKey: "id",
  as: "plan",
});

// USER -> SUBSCRIPTIONS
User.hasMany(UserSubscription, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "subscriptions",
});

UserSubscription.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

// MEMBERSHIP PLAN -> SUBSCRIPTIONS
MembershipPlan.hasMany(UserSubscription, {
  foreignKey: "planId",
  sourceKey: "id",
  as: "subscriptions",
});

UserSubscription.belongsTo(MembershipPlan, {
  foreignKey: "planId",
  targetKey: "id",
  as: "plan",
});

// PAYMENT -> SUBSCRIPTIONS
Payment.hasMany(UserSubscription, {
  foreignKey: "paymentId",
  sourceKey: "id",
  as: "subscriptions",
});

UserSubscription.belongsTo(Payment, {
  foreignKey: "paymentId",
  targetKey: "id",
  as: "payment",
});

// PAYMENT -> RECEIPT
Payment.hasOne(Receipt, {
  foreignKey: "paymentId",
  sourceKey: "id",
  as: "receipt",
  onDelete: "CASCADE",
  hooks: true,
});

Receipt.belongsTo(Payment, {
  foreignKey: "paymentId",
  targetKey: "id",
  as: "payment",
});

// ORDER -> RECEIPTS
Order.hasMany(Receipt, {
  foreignKey: "orderId",
  sourceKey: "id",
  as: "receipts",
});

Receipt.belongsTo(Order, {
  foreignKey: "orderId",
  targetKey: "id",
  as: "order",
});

// MEMBERSHIP PLAN -> SUBSCRIPTION GROUPS
MembershipPlan.hasMany(SubscriptionGroup, {
  foreignKey: "planId",
  sourceKey: "id",
  as: "subscriptionGroups",
});

SubscriptionGroup.belongsTo(MembershipPlan, {
  foreignKey: "planId",
  targetKey: "id",
  as: "plan",
});

// USER OWNER -> SUBSCRIPTION GROUPS
User.hasMany(SubscriptionGroup, {
  foreignKey: "ownerUserId",
  sourceKey: "id",
  as: "ownedSubscriptionGroups",
});

SubscriptionGroup.belongsTo(User, {
  foreignKey: "ownerUserId",
  targetKey: "id",
  as: "owner",
});

// PAYMENT -> SUBSCRIPTION GROUP
// constraints:false evita problemas de ciclo entre Payment y SubscriptionGroup
Payment.hasOne(SubscriptionGroup, {
  foreignKey: "paymentId",
  sourceKey: "id",
  as: "subscriptionGroup",
  constraints: false,
});

SubscriptionGroup.belongsTo(Payment, {
  foreignKey: "paymentId",
  targetKey: "id",
  as: "payment",
  constraints: false,
});

// SUBSCRIPTION GROUP -> MEMBERS
SubscriptionGroup.hasMany(SubscriptionGroupMember, {
  foreignKey: "groupId",
  sourceKey: "id",
  as: "members",
  onDelete: "CASCADE",
  hooks: true,
});

SubscriptionGroupMember.belongsTo(SubscriptionGroup, {
  foreignKey: "groupId",
  targetKey: "id",
  as: "group",
});

// USER -> SUBSCRIPTION GROUP MEMBER
User.hasMany(SubscriptionGroupMember, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "groupMemberships",
});

SubscriptionGroupMember.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

// SUBSCRIPTION GROUP -> USER SUBSCRIPTIONS
SubscriptionGroup.hasMany(UserSubscription, {
  foreignKey: "groupId",
  sourceKey: "id",
  as: "userSubscriptions",
});

UserSubscription.belongsTo(SubscriptionGroup, {
  foreignKey: "groupId",
  targetKey: "id",
  as: "group",
});

// USER / SESSION -> BEHAVIOR EVENTS
User.hasMany(BehaviorEvent, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "behaviorEvents",
});

BehaviorEvent.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

Session.hasMany(BehaviorEvent, {
  foreignKey: "sessionId",
  sourceKey: "id",
  as: "behaviorEvents",
});

BehaviorEvent.belongsTo(Session, {
  foreignKey: "sessionId",
  targetKey: "id",
  as: "session",
});

// PRODUCT -> INVENTORY MOVEMENTS
Product.hasMany(InventoryMovement, {
  foreignKey: "productId",
  sourceKey: "id_producto",
  as: "inventoryMovements",
});

InventoryMovement.belongsTo(Product, {
  foreignKey: "productId",
  targetKey: "id_producto",
  as: "product",
});

OrderItem.hasMany(InventoryMovement, {
  foreignKey: "orderItemId",
  sourceKey: "id",
  as: "inventoryMovements",
});

InventoryMovement.belongsTo(OrderItem, {
  foreignKey: "orderItemId",
  targetKey: "id",
  as: "orderItem",
});

User.hasMany(InventoryMovement, {
  foreignKey: "createdBy",
  sourceKey: "id",
  as: "createdInventoryMovements",
});

InventoryMovement.belongsTo(User, {
  foreignKey: "createdBy",
  targetKey: "id",
  as: "createdByUser",
});

// PRODUCT -> PRICE HISTORY
Product.hasMany(ProductPriceHistory, {
  foreignKey: "productId",
  sourceKey: "id_producto",
  as: "priceHistory",
});

ProductPriceHistory.belongsTo(Product, {
  foreignKey: "productId",
  targetKey: "id_producto",
  as: "product",
});

User.hasMany(ProductPriceHistory, {
  foreignKey: "changedBy",
  sourceKey: "id",
  as: "changedProductPrices",
});

ProductPriceHistory.belongsTo(User, {
  foreignKey: "changedBy",
  targetKey: "id",
  as: "changedByUser",
});

// PROMOTIONS -> PRODUCTS
Promotion.hasMany(PromotionProduct, {
  foreignKey: "promotionId",
  sourceKey: "id",
  as: "products",
  onDelete: "CASCADE",
  hooks: true,
});

PromotionProduct.belongsTo(Promotion, {
  foreignKey: "promotionId",
  targetKey: "id",
  as: "promotion",
});

Product.hasMany(PromotionProduct, {
  foreignKey: "productId",
  sourceKey: "id_producto",
  as: "promotionLinks",
});

PromotionProduct.belongsTo(Product, {
  foreignKey: "productId",
  targetKey: "id_producto",
  as: "product",
});

// ORDER DISCOUNTS
Order.hasMany(OrderDiscount, {
  foreignKey: "orderId",
  sourceKey: "id",
  as: "discounts",
  onDelete: "CASCADE",
  hooks: true,
});

OrderDiscount.belongsTo(Order, {
  foreignKey: "orderId",
  targetKey: "id",
  as: "order",
});

OrderItem.hasMany(OrderDiscount, {
  foreignKey: "orderItemId",
  sourceKey: "id",
  as: "discounts",
});

OrderDiscount.belongsTo(OrderItem, {
  foreignKey: "orderItemId",
  targetKey: "id",
  as: "orderItem",
});

Promotion.hasMany(OrderDiscount, {
  foreignKey: "promotionId",
  sourceKey: "id",
  as: "orderDiscounts",
});

OrderDiscount.belongsTo(Promotion, {
  foreignKey: "promotionId",
  targetKey: "id",
  as: "promotion",
});

// SUBSCRIPTION EVENTS
UserSubscription.hasMany(SubscriptionEvent, {
  foreignKey: "subscriptionId",
  sourceKey: "id",
  as: "events",
});

SubscriptionEvent.belongsTo(UserSubscription, {
  foreignKey: "subscriptionId",
  targetKey: "id",
  as: "subscription",
});

User.hasMany(SubscriptionEvent, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "subscriptionEvents",
});

SubscriptionEvent.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});

Order.hasMany(SubscriptionEvent, {
  foreignKey: "orderId",
  sourceKey: "id",
  as: "subscriptionEvents",
});

SubscriptionEvent.belongsTo(Order, {
  foreignKey: "orderId",
  targetKey: "id",
  as: "order",
});

Payment.hasMany(SubscriptionEvent, {
  foreignKey: "paymentId",
  sourceKey: "id",
  as: "subscriptionEvents",
});

SubscriptionEvent.belongsTo(Payment, {
  foreignKey: "paymentId",
  targetKey: "id",
  as: "payment",
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
  Session,
  UserProfile,
  UserWeightHistory,
  UserCalorieHistory,
  Routine,
  RoutineExercise,
  TrainerProfile,
  TrainerClient,
  TrainerAgendaItem,
  MembershipPlan,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  PaymentWebhookEvent,
  PaymentRefund,
  PaymentRefundItem,
  UserSubscription,
  Receipt,
  SubscriptionGroup,
  SubscriptionGroupMember,
  BehaviorEvent,
  InventoryMovement,
  ProductPriceHistory,
  Promotion,
  PromotionProduct,
  OrderDiscount,
  SubscriptionEvent,
};
