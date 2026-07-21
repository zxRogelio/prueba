import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  Brand,
  Category,
  InventoryMovement,
  MembershipPlan,
  Order,
  OrderDiscount,
  OrderItem,
  Payment,
  PaymentRefund,
  Product,
  Receipt,
  SubscriptionEvent,
  SubscriptionGroup,
  SubscriptionGroupMember,
  User,
  UserSubscription,
} from "../models/index.js";
import { refundPayment } from "../controllers/paymentController.js";
import { createOrder } from "../services/orderService.js";
import { registerManualPayment } from "../services/paymentService.js";
import { createReceipt } from "../services/receiptService.js";
import {
  activateMembershipsFromOrder,
  activateSubscriptionGroupMembers,
} from "../services/membershipActivationService.js";

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(email, role) {
  return User.create({
    email,
    role,
    isVerified: true,
    isPendingApproval: false,
    authMethod: "normal",
    provider: "local",
  });
}

async function callRefund({ admin, paymentId, body }) {
  const response = createMockResponse();

  await refundPayment(
    {
      params: { paymentId },
      body,
      user: {
        id: admin.id,
        role: "administrador",
      },
    },
    response
  );

  return response;
}

async function createPlan({ suffix, type = "individual", maxPeople = 1 }) {
  return MembershipPlan.create({
    name: `Verify Refund ${type} ${suffix}`,
    slug: `verify-refund-${type}-${suffix}`,
    description: "Temporary verification plan; removed after this script.",
    type,
    durationDays: 30,
    price: "100.00",
    pricePerPerson: type === "group" ? "50.00" : null,
    minPeople: type === "group" ? 2 : 1,
    maxPeople,
    requiresStudentProof: false,
    accessLevel: "standard",
    benefits: [],
    isActive: true,
    sortOrder: 9999,
  });
}

async function createProductCatalog({ suffix, index, stock = 10, price = "50.00" }) {
  const baseId = Number(String(Date.now()).slice(-7)) + index * 1000;
  const category = await Category.create({
    id_categoria: baseId,
    name: `Verify Refund Category ${suffix}-${index}`,
    active: true,
  });
  const brand = await Brand.create({
    id_marca: baseId,
    name: `Verify Refund Brand ${suffix}-${index}`,
    categoryId: category.id_categoria,
    active: true,
  });
  const product = await Product.create({
    id_producto: baseId,
    name: `Verify Refund Product ${suffix}-${index}`,
    brandId: brand.id_marca,
    categoryId: category.id_categoria,
    price,
    stock,
    status: "Activo",
    productType: "Ropa",
    description: "Temporary verification product.",
  });

  return { category, brand, product };
}

async function createPaidMembership({
  admin,
  client,
  plan,
  paymentIds,
  orderIds,
  reference,
}) {
  const order = await createOrder({
    userId: client.id,
    channel: "reception",
    status: "pending_payment",
    createdBy: admin.id,
    items: [
      {
        itemType: "membership",
        membershipPlanId: plan.id,
        quantity: 1,
      },
    ],
  });
  orderIds.push(order.id);

  const payment = await registerManualPayment({
    orderId: order.id,
    method: "cash",
    provider: "none",
    reference,
    createdBy: admin.id,
  });
  paymentIds.push(payment.id);

  await activateMembershipsFromOrder({
    orderId: order.id,
    paymentId: payment.id,
    createdBy: admin.id,
  });
  await createReceipt({
    orderId: order.id,
    paymentId: payment.id,
    createdBy: admin.id,
  });

  return { order, payment };
}

async function createPaidGroup({
  admin,
  owner,
  member,
  plan,
  paymentIds,
  orderIds,
  reference,
}) {
  const order = await createOrder({
    userId: owner.id,
    channel: "reception",
    status: "pending_payment",
    createdBy: admin.id,
    items: [
      {
        itemType: "group_membership",
        membershipPlanId: plan.id,
        quantity: 1,
        metadata: {
          memberEmails: [member.email],
        },
      },
    ],
  });
  orderIds.push(order.id);

  const payment = await registerManualPayment({
    orderId: order.id,
    method: "cash",
    provider: "none",
    reference,
    createdBy: admin.id,
  });
  paymentIds.push(payment.id);

  await activateMembershipsFromOrder({
    orderId: order.id,
    paymentId: payment.id,
    createdBy: admin.id,
  });
  const group = await SubscriptionGroup.findOne({
    where: { paymentId: payment.id },
  });

  await activateSubscriptionGroupMembers({
    groupId: group.id,
    approvedBy: admin.id,
    forceApprovePending: true,
  });
  await createReceipt({
    orderId: order.id,
    paymentId: payment.id,
    createdBy: admin.id,
  });

  return { order, payment, group };
}

async function createPaidProductOrder({
  admin,
  client,
  product,
  quantity,
  paymentIds,
  orderIds,
  reference,
}) {
  const order = await createOrder({
    userId: client.id,
    channel: "reception",
    status: "pending_payment",
    createdBy: admin.id,
    items: [
      {
        itemType: "product",
        productId: product.id_producto,
        quantity,
      },
    ],
  });
  orderIds.push(order.id);

  const payment = await registerManualPayment({
    orderId: order.id,
    method: "cash",
    provider: "none",
    reference,
    createdBy: admin.id,
  });
  paymentIds.push(payment.id);

  await createReceipt({
    orderId: order.id,
    paymentId: payment.id,
    createdBy: admin.id,
  });

  const orderItem = await OrderItem.findOne({
    where: {
      orderId: order.id,
      itemType: "product",
    },
  });

  return { order, payment, orderItem };
}

async function cleanup({
  emails,
  planIds,
  productIds,
  brandBusinessIds,
  categoryBusinessIds,
  paymentIds,
  orderIds,
}) {
  await sequelize.transaction(async (transaction) => {
    if (paymentIds.length > 0) {
      await SubscriptionEvent.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      const groups = await SubscriptionGroup.findAll({
        where: { paymentId: { [Op.in]: paymentIds } },
        attributes: ["id"],
        transaction,
      });
      const groupIds = groups.map((group) => group.id);

      if (groupIds.length > 0) {
        await SubscriptionGroupMember.destroy({
          where: { groupId: { [Op.in]: groupIds } },
          transaction,
        });
      }

      await UserSubscription.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await SubscriptionGroup.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Receipt.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await PaymentRefund.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Payment.destroy({
        where: { id: { [Op.in]: paymentIds } },
        transaction,
      });
    }

    if (orderIds.length > 0) {
      const orderItems = await OrderItem.findAll({
        where: { orderId: { [Op.in]: orderIds } },
        attributes: ["id"],
        transaction,
      });
      const orderItemIds = orderItems.map((item) => item.id);

      if (orderItemIds.length > 0) {
        await InventoryMovement.destroy({
          where: { orderItemId: { [Op.in]: orderItemIds } },
          transaction,
        });
      }

      await OrderDiscount.destroy({
        where: { orderId: { [Op.in]: orderIds } },
        transaction,
      });
      await OrderItem.destroy({
        where: { orderId: { [Op.in]: orderIds } },
        transaction,
      });
      await Order.destroy({
        where: { id: { [Op.in]: orderIds } },
        transaction,
      });
    }

    if (productIds.length > 0) {
      await InventoryMovement.destroy({
        where: { productId: { [Op.in]: productIds } },
        transaction,
      });
      await Product.destroy({
        where: { id_producto: { [Op.in]: productIds } },
        transaction,
      });
    }

    if (brandBusinessIds.length > 0) {
      await Brand.destroy({
        where: { id_marca: { [Op.in]: brandBusinessIds } },
        transaction,
      });
    }

    if (categoryBusinessIds.length > 0) {
      await Category.destroy({
        where: { id_categoria: { [Op.in]: categoryBusinessIds } },
        transaction,
      });
    }

    if (planIds.length > 0) {
      await MembershipPlan.destroy({
        where: { id: { [Op.in]: planIds } },
        transaction,
      });
    }

    await User.destroy({
      where: { email: { [Op.in]: emails } },
      transaction,
    });
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `verify-refund-effects-admin-${suffix}@example.com`;
  const clientEmail = `verify-refund-effects-client-${suffix}@example.com`;
  const ownerEmail = `verify-refund-effects-owner-${suffix}@example.com`;
  const memberEmail = `verify-refund-effects-member-${suffix}@example.com`;
  const emails = [adminEmail, clientEmail, ownerEmail, memberEmail];
  const planIds = [];
  const productIds = [];
  const brandBusinessIds = [];
  const categoryBusinessIds = [];
  const paymentIds = [];
  const orderIds = [];
  const results = {};

  try {
    const admin = await createUser(adminEmail, "administrador");
    const client = await createUser(clientEmail, "cliente");
    const owner = await createUser(ownerEmail, "cliente");
    const member = await createUser(memberEmail, "cliente");
    const individualPlan = await createPlan({
      suffix: `${suffix}-individual`,
      type: "individual",
    });
    const groupPlan = await createPlan({
      suffix: `${suffix}-group`,
      type: "group",
      maxPeople: 2,
    });
    planIds.push(individualPlan.id, groupPlan.id);

    const individual = await createPaidMembership({
      admin,
      client,
      plan: individualPlan,
      paymentIds,
      orderIds,
      reference: `individual-${suffix}`,
    });
    const individualRefund = await callRefund({
      admin,
      paymentId: individual.payment.id,
      body: {
        providerRefundId: `refund-individual-${suffix}`,
        reason: "full individual membership refund",
      },
    });
    const individualSubscription = await UserSubscription.findOne({
      where: { paymentId: individual.payment.id },
    });
    const individualReceipt = await Receipt.findOne({
      where: { paymentId: individual.payment.id },
    });

    assert(individualRefund.statusCode === 200, "Reembolso individual debe responder 200.");
    assert(
      individualSubscription?.status === "cancelled",
      `Suscripcion individual debia cancelarse; quedo ${individualSubscription?.status}.`
    );
    assert(
      individualReceipt?.status === "cancelled",
      `Recibo individual debia cancelarse; quedo ${individualReceipt?.status}.`
    );
    results.fullIndividualMembership = {
      statusCode: individualRefund.statusCode,
      subscriptionStatus: individualSubscription.status,
      receiptStatus: individualReceipt.status,
    };

    const group = await createPaidGroup({
      admin,
      owner,
      member,
      plan: groupPlan,
      paymentIds,
      orderIds,
      reference: `group-${suffix}`,
    });
    const groupRefund = await callRefund({
      admin,
      paymentId: group.payment.id,
      body: {
        providerRefundId: `refund-group-${suffix}`,
        reason: "full group refund",
      },
    });
    const cancelledGroup = await SubscriptionGroup.findByPk(group.group.id);
    const groupMembers = await SubscriptionGroupMember.findAll({
      where: { groupId: group.group.id },
    });
    const groupSubscriptions = await UserSubscription.findAll({
      where: { paymentId: group.payment.id },
    });

    assert(groupRefund.statusCode === 200, "Reembolso grupal debe responder 200.");
    assert(
      cancelledGroup?.status === "cancelled",
      `Grupo debia cancelarse; quedo ${cancelledGroup?.status}.`
    );
    assert(
      groupMembers.every((groupMember) => groupMember.status === "removed"),
      "Todos los integrantes del grupo debian quedar removed."
    );
    assert(
      groupSubscriptions.length === 2 &&
        groupSubscriptions.every((subscription) => subscription.status === "cancelled"),
      "Las suscripciones del grupo debian cancelarse."
    );
    results.fullGroupPackage = {
      statusCode: groupRefund.statusCode,
      groupStatus: cancelledGroup.status,
      memberStatuses: groupMembers.map((groupMember) => groupMember.status),
      subscriptionStatuses: groupSubscriptions.map((subscription) => subscription.status),
    };

    const fullProductCatalog = await createProductCatalog({
      suffix,
      index: 1,
      stock: 10,
      price: "50.00",
    });
    productIds.push(fullProductCatalog.product.id_producto);
    brandBusinessIds.push(fullProductCatalog.brand.id_marca);
    categoryBusinessIds.push(fullProductCatalog.category.id_categoria);
    const fullProduct = await createPaidProductOrder({
      admin,
      client,
      product: fullProductCatalog.product,
      quantity: 2,
      paymentIds,
      orderIds,
      reference: `full-product-${suffix}`,
    });
    const stockAfterSale = Number(
      (await Product.findOne({
        where: { id_producto: fullProductCatalog.product.id_producto },
      })).stock
    );
    const fullProductRefund = await callRefund({
      admin,
      paymentId: fullProduct.payment.id,
      body: {
        providerRefundId: `refund-full-product-${suffix}`,
        reason: "full product refund",
      },
    });
    const stockAfterFullRefund = Number(
      (await Product.findOne({
        where: { id_producto: fullProductCatalog.product.id_producto },
      })).stock
    );
    const fullReturnCount = await InventoryMovement.count({
      where: {
        orderItemId: fullProduct.orderItem.id,
        movementType: "return",
      },
    });

    assert(fullProductRefund.statusCode === 200, "Reembolso completo producto debe responder 200.");
    assert(stockAfterSale === 8, `Stock tras venta completa esperado 8; fue ${stockAfterSale}.`);
    assert(
      stockAfterFullRefund === 10,
      `Stock tras reembolso completo esperado 10; fue ${stockAfterFullRefund}.`
    );
    assert(fullReturnCount === 1, `Debe existir 1 movimiento return; hay ${fullReturnCount}.`);
    results.fullProductRefund = {
      statusCode: fullProductRefund.statusCode,
      stockAfterSale,
      stockAfterRefund: stockAfterFullRefund,
      returnMovements: fullReturnCount,
    };

    const partialProductCatalog = await createProductCatalog({
      suffix,
      index: 2,
      stock: 10,
      price: "50.00",
    });
    productIds.push(partialProductCatalog.product.id_producto);
    brandBusinessIds.push(partialProductCatalog.brand.id_marca);
    categoryBusinessIds.push(partialProductCatalog.category.id_categoria);
    const partialProduct = await createPaidProductOrder({
      admin,
      client,
      product: partialProductCatalog.product,
      quantity: 3,
      paymentIds,
      orderIds,
      reference: `partial-product-${suffix}`,
    });
    const partialBody = {
      providerRefundId: `refund-partial-product-${suffix}`,
      amount: "50.00",
      reason: "partial product refund",
      items: [
        {
          orderItemId: partialProduct.orderItem.id,
          quantity: 1,
          amount: "50.00",
          restock: true,
        },
      ],
    };
    const partialProductRefund = await callRefund({
      admin,
      paymentId: partialProduct.payment.id,
      body: partialBody,
    });
    const retryPartialRefund = await callRefund({
      admin,
      paymentId: partialProduct.payment.id,
      body: partialBody,
    });
    const partialPaymentAfter = await Payment.findByPk(partialProduct.payment.id);
    const partialOrderAfter = await Order.findByPk(partialProduct.order.id);
    const partialReceipt = await Receipt.findOne({
      where: { paymentId: partialProduct.payment.id },
    });
    const partialStockAfterRetry = Number(
      (await Product.findOne({
        where: { id_producto: partialProductCatalog.product.id_producto },
      })).stock
    );
    const partialRefundCount = await PaymentRefund.count({
      where: { paymentId: partialProduct.payment.id },
    });
    const partialReturnCount = await InventoryMovement.count({
      where: {
        orderItemId: partialProduct.orderItem.id,
        movementType: "return",
      },
    });

    assert(partialProductRefund.statusCode === 200, "Reembolso parcial producto debe responder 200.");
    assert(
      retryPartialRefund.statusCode === 200,
      `Retry del reembolso parcial debe responder 200; respondio ${retryPartialRefund.statusCode}: ${JSON.stringify(retryPartialRefund.body)}.`
    );
    assert(
      retryPartialRefund.body.refund.id === partialProductRefund.body.refund.id,
      "Retry debe devolver el mismo PaymentRefund."
    );
    assert(
      partialPaymentAfter.status === "paid",
      `Pago parcial debe permanecer paid; quedo ${partialPaymentAfter.status}.`
    );
    assert(
      partialOrderAfter.status === "partially_refunded",
      `Orden parcial debe quedar partially_refunded; quedo ${partialOrderAfter.status}.`
    );
    assert(
      partialReceipt.status === "issued",
      `Recibo parcial debe seguir issued; quedo ${partialReceipt.status}.`
    );
    assert(
      partialStockAfterRetry === 8,
      `Stock parcial tras retry esperado 8; fue ${partialStockAfterRetry}.`
    );
    assert(partialRefundCount === 1, `Retry no debe crear otro refund; hay ${partialRefundCount}.`);
    assert(partialReturnCount === 1, `Retry no debe crear otro return; hay ${partialReturnCount}.`);
    results.partialProductRefundAndRetry = {
      firstStatusCode: partialProductRefund.statusCode,
      retryStatusCode: retryPartialRefund.statusCode,
      paymentStatus: partialPaymentAfter.status,
      orderStatus: partialOrderAfter.status,
      receiptStatus: partialReceipt.status,
      stockAfterRetry: partialStockAfterRetry,
      refundCount: partialRefundCount,
      returnMovements: partialReturnCount,
    };

    const rollbackCatalog = await createProductCatalog({
      suffix,
      index: 3,
      stock: 10,
      price: "50.00",
    });
    productIds.push(rollbackCatalog.product.id_producto);
    brandBusinessIds.push(rollbackCatalog.brand.id_marca);
    categoryBusinessIds.push(rollbackCatalog.category.id_categoria);
    const rollbackProduct = await createPaidProductOrder({
      admin,
      client,
      product: rollbackCatalog.product,
      quantity: 1,
      paymentIds,
      orderIds,
      reference: `rollback-product-${suffix}`,
    });
    const rollbackProviderRefundId = `refund-rollback-${suffix}`;

    InventoryMovement.addHook("beforeCreate", "verifyRefundRollback", (movement) => {
      if (
        movement.movementType === "return" &&
        movement.notes === "force secondary failure"
      ) {
        throw new Error("forced secondary refund failure");
      }
    });

    const rollbackResponse = await callRefund({
      admin,
      paymentId: rollbackProduct.payment.id,
      body: {
        providerRefundId: rollbackProviderRefundId,
        amount: "50.00",
        reason: "force secondary failure",
        items: [
          {
            orderItemId: rollbackProduct.orderItem.id,
            quantity: 1,
            amount: "50.00",
            restock: true,
          },
        ],
      },
    });

    InventoryMovement.removeHook("beforeCreate", "verifyRefundRollback");

    const rollbackRefundCount = await PaymentRefund.count({
      where: { providerRefundId: rollbackProviderRefundId },
    });
    const rollbackPaymentAfter = await Payment.findByPk(rollbackProduct.payment.id);
    const rollbackOrderAfter = await Order.findByPk(rollbackProduct.order.id);
    const rollbackStockAfter = Number(
      (await Product.findOne({
        where: { id_producto: rollbackCatalog.product.id_producto },
      })).stock
    );

    assert(rollbackResponse.statusCode === 500, "Fallo secundario debe responder 500.");
    assert(rollbackRefundCount === 0, `Rollback no debe persistir refund; hay ${rollbackRefundCount}.`);
    assert(
      rollbackPaymentAfter.status === "paid",
      `Rollback debe dejar pago paid; quedo ${rollbackPaymentAfter.status}.`
    );
    assert(
      rollbackOrderAfter.status === "paid",
      `Rollback debe dejar orden paid; quedo ${rollbackOrderAfter.status}.`
    );
    assert(rollbackStockAfter === 9, `Rollback debe dejar stock en 9; fue ${rollbackStockAfter}.`);
    results.secondaryFailureRollback = {
      statusCode: rollbackResponse.statusCode,
      refundCount: rollbackRefundCount,
      paymentStatus: rollbackPaymentAfter.status,
      orderStatus: rollbackOrderAfter.status,
      stockAfterRollback: rollbackStockAfter,
    };

    console.log("Verificacion OK: efectos completos de reembolso.");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    InventoryMovement.removeHook("beforeCreate", "verifyRefundRollback");
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await cleanup({
      emails,
      planIds,
      productIds,
      brandBusinessIds,
      categoryBusinessIds,
      paymentIds,
      orderIds,
    });
    await sequelize.close();
  }
}

await main();
