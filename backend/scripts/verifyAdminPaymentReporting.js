import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { authorizeRole } from "../middleware/authMiddleware.js";
import {
  Brand,
  Category,
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  PaymentWebhookEvent,
  Product,
  Receipt,
  User,
} from "../models/index.js";
import {
  exportAdminPaymentsCsv,
  getAdminPaymentDetail,
  getAdminPaymentsChart,
  getAdminPaymentsSummary,
  listAdminPaymentsReport,
  listAdminRefunds,
} from "../services/adminPaymentReportingService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

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

async function createOrderWithItem({
  userId,
  createdBy,
  orderNumber,
  status,
  amount,
  date,
  item,
}) {
  const order = await Order.create({
    userId,
    orderNumber,
    status,
    channel: "online",
    subtotal: amount,
    discountTotal: "0.00",
    taxTotal: "0.00",
    total: amount,
    currency: "MXN",
    paidAt: status === "paid" || status === "refunded" ? date : null,
    refundedAt: status === "refunded" ? date : null,
    createdBy,
    metadata: {
      verification: "admin_payment_reporting",
    },
    createdAt: date,
    updatedAt: date,
  });

  await OrderItem.create({
    orderId: order.id,
    itemType: item.itemType,
    productId: item.productId ?? null,
    membershipPlanId: item.membershipPlanId ?? null,
    quantity: 1,
    unitPrice: amount,
    discountAmount: "0.00",
    subtotal: amount,
    itemNameSnapshot: item.name,
    itemDescriptionSnapshot: null,
    durationDaysSnapshot: item.itemType === "product" ? null : 30,
    metadata: {
      verification: "admin_payment_reporting",
    },
    createdAt: date,
    updatedAt: date,
  });

  return order;
}

async function createPayment({
  userId,
  orderId,
  amount,
  method,
  provider,
  status,
  date,
  suffix,
}) {
  return Payment.create({
    userId,
    orderId,
    paymentType: "membership",
    amount,
    method,
    source: method === "online_checkout" ? "online_checkout" : "admin_manual",
    provider,
    providerPreferenceId:
      provider === "mercadopago_checkout" ? `pref-${suffix}-${randomUUID()}` : null,
    providerPaymentId:
      provider === "mercadopago_checkout" ? `mp-${suffix}-${randomUUID()}` : null,
    externalReference: orderId,
    status,
    currency: "MXN",
    paidAt: status === "paid" || status === "refunded" ? date : null,
    approvedAt: status === "paid" || status === "refunded" ? date : null,
    refundedAt: status === "refunded" ? date : null,
    metadata: {
      verification: "admin_payment_reporting",
    },
    createdAt: date,
    updatedAt: date,
  });
}

async function insertRefund({ payment, amount, status, date, requestedBy }) {
  const refundId = randomUUID();

  await sequelize.query(
    `
    INSERT INTO "core"."PaymentRefunds" (
      "id",
      "paymentId",
      "orderId",
      "providerRefundId",
      "amount",
      "reason",
      "status",
      "requestedBy",
      "requestedAt",
      "approvedAt",
      "metadata",
      "createdAt",
      "updatedAt"
    ) VALUES (
      :id,
      :paymentId,
      :orderId,
      :providerRefundId,
      :amount,
      :reason,
      :status,
      :requestedBy,
      :requestedAt,
      :approvedAt,
      :metadata::jsonb,
      :createdAt,
      :updatedAt
    );
    `,
    {
      replacements: {
        id: refundId,
        paymentId: payment.id,
        orderId: payment.orderId,
        providerRefundId: `refund-${refundId}`,
        amount,
        reason: "Verificacion panel admin",
        status,
        requestedBy,
        requestedAt: date,
        approvedAt: status === "approved" ? date : null,
        metadata: JSON.stringify({
          verification: "admin_payment_reporting",
        }),
        createdAt: date,
        updatedAt: date,
      },
    }
  );

  return refundId;
}

async function cleanup({ suffix, emails, planIds, product, brand, category }) {
  const payments = await Payment.findAll({
    where: {
      metadata: {
        verification: "admin_payment_reporting",
      },
    },
    attributes: ["id", "orderId"],
  });
  const paymentIds = payments.map((payment) => payment.id);
  const orderIds = [
    ...new Set(payments.map((payment) => payment.orderId).filter(Boolean)),
  ];

  await sequelize.transaction(async (transaction) => {
    if (paymentIds.length > 0) {
      await PaymentWebhookEvent.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Receipt.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await sequelize.query(
        'DELETE FROM "core"."PaymentRefunds" WHERE "paymentId" IN (:paymentIds);',
        {
          replacements: { paymentIds },
          transaction,
        }
      );
      await Payment.destroy({
        where: { id: { [Op.in]: paymentIds } },
        transaction,
      });
    }

    if (orderIds.length > 0) {
      await OrderItem.destroy({
        where: { orderId: { [Op.in]: orderIds } },
        transaction,
      });
      await Order.destroy({
        where: { id: { [Op.in]: orderIds } },
        transaction,
      });
    }

    await MembershipPlan.destroy({
      where: { id: { [Op.in]: planIds } },
      transaction,
    });

    if (product?.id) {
      await Product.destroy({ where: { id: product.id }, transaction });
    }
    if (brand?.id) {
      await Brand.destroy({ where: { id: brand.id }, transaction });
    }
    if (category?.id) {
      await Category.destroy({ where: { id: category.id }, transaction });
    }

    await User.destroy({
      where: { email: { [Op.in]: emails } },
      transaction,
    });
    await PaymentWebhookEvent.destroy({
      where: {
        providerEventId: {
          [Op.like]: `verify-admin-reporting-${suffix}%`,
        },
      },
      transaction,
    });
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `verify-admin-reporting-admin-${suffix}@example.com`;
  const clientEmail = `verify-admin-reporting-client-${suffix}@example.com`;
  const orderPrefix = `VAR-${String(Date.now()).slice(-8)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const from = "2099-07-10";
  const to = "2099-07-12";
  const planIds = [];
  let product = null;
  let brand = null;
  let category = null;

  try {
    const emptySummary = await getAdminPaymentsSummary({
      from: "2099-01-01",
      to: "2099-01-02",
    });

    assert(emptySummary.grossRevenue === 0, "Resumen vacio debia ser 0.");

    const admin = await createUser(adminEmail, "administrador");
    const client = await createUser(clientEmail, "cliente");
    const numericSuffix = Math.floor(100000000 + Math.random() * 800000000);

    category = await Category.create({
      id_categoria: numericSuffix,
      name: `Verify Reporting Category ${suffix}`,
      active: true,
    });
    brand = await Brand.create({
      id_marca: numericSuffix,
      name: `Verify Reporting Brand ${suffix}`,
      active: true,
      categoryId: category.id_categoria,
    });
    product = await Product.create({
      id_producto: numericSuffix,
      name: `Verify Reporting Product ${suffix}`,
      brandId: brand.id_marca,
      categoryId: category.id_categoria,
      price: "200.00",
      stock: 20,
      status: "Activo",
      productType: "Ropa",
      description: "Temporary reporting product.",
    });
    const individualPlan = await MembershipPlan.create({
      name: `Verify Reporting Individual ${suffix}`,
      slug: `verify-reporting-individual-${suffix}`,
      type: "individual",
      durationDays: 30,
      price: "100.00",
      minPeople: 1,
      maxPeople: 1,
      accessLevel: "standard",
      isActive: true,
    });
    const groupPlan = await MembershipPlan.create({
      name: `Verify Reporting Group ${suffix}`,
      slug: `verify-reporting-group-${suffix}`,
      type: "group",
      durationDays: 30,
      price: "300.00",
      pricePerPerson: "150.00",
      minPeople: 2,
      maxPeople: 2,
      accessLevel: "standard",
      isActive: true,
    });
    planIds.push(individualPlan.id, groupPlan.id);

    const paidMembershipOrder = await createOrderWithItem({
      userId: client.id,
      createdBy: admin.id,
      orderNumber: `${orderPrefix}-001`,
      status: "paid",
      amount: "100.00",
      date: new Date("2099-07-10T12:00:00.000Z"),
      item: {
        itemType: "membership",
        membershipPlanId: individualPlan.id,
        name: "Membresia individual",
      },
    });
    const paidProductOrder = await createOrderWithItem({
      userId: client.id,
      createdBy: admin.id,
      orderNumber: `${orderPrefix}-002`,
      status: "paid",
      amount: "200.00",
      date: new Date("2099-07-11T12:00:00.000Z"),
      item: {
        itemType: "product",
        productId: product.id_producto,
        name: "Producto",
      },
    });
    const refundedGroupOrder = await createOrderWithItem({
      userId: client.id,
      createdBy: admin.id,
      orderNumber: `${orderPrefix}-003`,
      status: "refunded",
      amount: "300.00",
      date: new Date("2099-07-12T12:00:00.000Z"),
      item: {
        itemType: "group_membership",
        membershipPlanId: groupPlan.id,
        name: "Membresia grupal",
      },
    });
    const pendingOrder = await createOrderWithItem({
      userId: client.id,
      createdBy: admin.id,
      orderNumber: `${orderPrefix}-004`,
      status: "pending_payment",
      amount: "400.00",
      date: new Date("2099-07-11T13:00:00.000Z"),
      item: {
        itemType: "membership",
        membershipPlanId: individualPlan.id,
        name: "Pendiente",
      },
    });
    const failedOrder = await createOrderWithItem({
      userId: client.id,
      createdBy: admin.id,
      orderNumber: `${orderPrefix}-005`,
      status: "pending_payment",
      amount: "500.00",
      date: new Date("2099-07-11T14:00:00.000Z"),
      item: {
        itemType: "product",
        productId: product.id_producto,
        name: "Fallido",
      },
    });

    const paidMembershipPayment = await createPayment({
      userId: client.id,
      orderId: paidMembershipOrder.id,
      amount: "100.00",
      method: "cash",
      provider: "none",
      status: "paid",
      date: new Date("2099-07-10T12:10:00.000Z"),
      suffix,
    });
    const paidProductPayment = await createPayment({
      userId: client.id,
      orderId: paidProductOrder.id,
      amount: "200.00",
      method: "transfer",
      provider: "bank_transfer",
      status: "paid",
      date: new Date("2099-07-11T12:10:00.000Z"),
      suffix,
    });
    const refundedGroupPayment = await createPayment({
      userId: client.id,
      orderId: refundedGroupOrder.id,
      amount: "300.00",
      method: "online_checkout",
      provider: "mercadopago_checkout",
      status: "refunded",
      date: new Date("2099-07-12T12:10:00.000Z"),
      suffix,
    });
    await createPayment({
      userId: client.id,
      orderId: pendingOrder.id,
      amount: "400.00",
      method: "card_terminal",
      provider: "mercadopago_terminal",
      status: "pending",
      date: new Date("2099-07-11T13:10:00.000Z"),
      suffix,
    });
    await createPayment({
      userId: client.id,
      orderId: failedOrder.id,
      amount: "500.00",
      method: "online_checkout",
      provider: "mercadopago_checkout",
      status: "failed",
      date: new Date("2099-07-11T14:10:00.000Z"),
      suffix,
    });

    await Receipt.create({
      paymentId: paidMembershipPayment.id,
      orderId: paidMembershipOrder.id,
      folio: `RCPT-${suffix}-001`.slice(0, 78),
      status: "issued",
      issuedAt: new Date("2099-07-10T12:12:00.000Z"),
      metadata: { verification: "admin_payment_reporting" },
      createdBy: admin.id,
    });
    await insertRefund({
      payment: paidProductPayment,
      amount: "50.00",
      status: "approved",
      date: new Date("2099-07-11T15:00:00.000Z"),
      requestedBy: admin.id,
    });
    await insertRefund({
      payment: refundedGroupPayment,
      amount: "300.00",
      status: "approved",
      date: new Date("2099-07-12T15:00:00.000Z"),
      requestedBy: admin.id,
    });
    await PaymentWebhookEvent.create({
      provider: "mercadopago_checkout",
      providerEventId: `verify-admin-reporting-${suffix}-duplicate`,
      eventType: "payment",
      paymentId: paidMembershipPayment.id,
      providerPaymentId: "provider-payment-reporting",
      signatureValid: true,
      payload: {
        headers: {
          xSignature: "super-secret-signature",
        },
      },
      processingStatus: "processed",
      processedAt: new Date("2099-07-10T12:15:00.000Z"),
    });

    const filters = { from, to };
    const summary = await getAdminPaymentsSummary(filters);

    assert(summary.grossRevenue === 300, `grossRevenue=${summary.grossRevenue}`);
    assert(summary.approvedRefunds === 350, `approvedRefunds=${summary.approvedRefunds}`);
    assert(summary.netRevenue === -50, `netRevenue=${summary.netRevenue}`);
    assert(summary.paidCount === 2, `paidCount=${summary.paidCount}`);
    assert(summary.pendingCount === 1, `pendingCount=${summary.pendingCount}`);
    assert(summary.failedCount === 1, `failedCount=${summary.failedCount}`);
    assert(summary.refundedCount === 1, `refundedCount=${summary.refundedCount}`);
    assert(summary.averageTicket === 150, `averageTicket=${summary.averageTicket}`);

    const afterWebhookSummary = await getAdminPaymentsSummary(filters);
    assert(
      afterWebhookSummary.grossRevenue === summary.grossRevenue,
      "Un webhook duplicado no debe incrementar ingresos."
    );

    const cashSummary = await getAdminPaymentsSummary({
      ...filters,
      method: "cash",
    });
    assert(cashSummary.grossRevenue === 100, "Filtro metodo cash incorrecto.");

    const dateSummary = await getAdminPaymentsSummary({
      from: "2099-07-11",
      to: "2099-07-11",
    });
    assert(dateSummary.pendingCount === 1, "Filtro por fecha no incluyo pendiente.");

    const list = await listAdminPaymentsReport({
      ...filters,
      page: 1,
      limit: 2,
    });
    assert(list.pagination.total === 5, `total=${list.pagination.total}`);
    assert(list.payments.length === 2, `page size=${list.payments.length}`);

    const csv = await exportAdminPaymentsCsv(filters);
    assert(csv.includes("Monto neto"), "CSV no incluye encabezados esperados.");
    assert(csv.split("\r\n").length === 6, "CSV debia tener encabezado y 5 filas.");

    const chart = await getAdminPaymentsChart({ ...filters, groupBy: "day" });
    assert(chart.length >= 3, "Grafica diaria debia devolver periodos.");

    const refunds = await listAdminRefunds({ ...filters, refundStatus: "approved" });
    assert(refunds.pagination.total === 2, "Reembolsos aprobados incorrectos.");

    const detail = await getAdminPaymentDetail(paidMembershipPayment.id);
    const detailText = JSON.stringify(detail);
    assert(
      !detailText.includes("super-secret-signature"),
      "Detalle no debe exponer firmas completas."
    );

    const response = createMockResponse();
    let nextCalled = false;
    authorizeRole("administrador")(
      { user: { id: client.id, role: "cliente" } },
      response,
      () => {
        nextCalled = true;
      }
    );
    assert(response.statusCode === 403 && !nextCalled, "Cliente no debe pasar rutas admin.");

    console.log("Verificacion OK: panel administrativo de pagos.");
    console.log({
      emptySummaryGrossRevenue: emptySummary.grossRevenue,
      grossRevenue: summary.grossRevenue,
      approvedRefunds: summary.approvedRefunds,
      netRevenue: summary.netRevenue,
      paidCount: summary.paidCount,
      pendingCount: summary.pendingCount,
      failedCount: summary.failedCount,
      refundedCount: summary.refundedCount,
      averageTicket: summary.averageTicket,
      paginationTotal: list.pagination.total,
      csvRows: csv.split("\r\n").length - 1,
      chartPoints: chart.length,
      refunds: refunds.pagination.total,
      nonAdminStatusCode: response.statusCode,
      duplicateWebhookDoesNotChangeRevenue: true,
      cleanedUp: true,
    });
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await cleanup({
      suffix,
      emails: [adminEmail, clientEmail],
      planIds,
      product,
      brand,
      category,
    });
    await sequelize.close();
  }
}

await main();
