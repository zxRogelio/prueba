import { Router } from "express";
import { privateResponse, privacyIpLimiter, requirePrivacySession } from "../../middleware/privacySecurity.js";
import { privacyFailure } from "../../controllers/privacyController.js";
import { listAdministrativeCancellations, administrativeCancellationDetail, decideCancellation } from "../../services/accountCancellationAdminService.js";

const router = Router();
router.use(privateResponse, privacyIpLimiter, requirePrivacySession);
const endpoint = (run) => async (req, res) => {
  try { res.json(await run(req)); } catch (error) { privacyFailure(error, res); }
};
router.get("/", endpoint((req) => listAdministrativeCancellations(req.user, req.query)));
router.get("/:requestId", endpoint((req) => administrativeCancellationDetail(req.user, req.params.requestId)));
router.post("/:requestId/decisions", endpoint((req) => decideCancellation(req.user, req.authSession.id, req.params.requestId, req.body, req.headers["idempotency-key"])));
export default router;
