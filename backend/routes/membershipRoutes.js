import { Router } from "express";
import {
  listMembershipPlans,
  getMembershipPlanById,
  getMyActiveSubscription,
  listMyMembershipPayments,
  createManualMembershipPayment,
  createManualGroupMembershipPayment,
  addMemberToMyGroup,
  listMyGroupInvitations,
  acceptGroupInvitation,
  listPendingSubscriptionGroups,
  approveSubscriptionGroup,
} from "../controllers/membershipController.js";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";

const router = Router();

router.get("/plans", listMembershipPlans);
router.get("/plans/:id", getMembershipPlanById);

router.get(
  "/me/subscription",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  getMyActiveSubscription
);

router.get(
  "/me/payments",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  listMyMembershipPayments
);

router.post(
  "/admin/manual-payment",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  createManualMembershipPayment
);

router.post(
  "/admin/manual-group-payment",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  createManualGroupMembershipPayment
);

router.get(
  "/admin/groups/pending",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  listPendingSubscriptionGroups
);

router.patch(
  "/admin/groups/:groupId/approve",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  approveSubscriptionGroup
);

router.post(
  "/groups/:groupId/members",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente"),
  addMemberToMyGroup
);

router.get(
  "/groups/invitations/me",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente"),
  listMyGroupInvitations
);

router.patch(
  "/groups/invitations/:memberId/accept",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente"),
  acceptGroupInvitation
);

export default router;
