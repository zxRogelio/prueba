import { Router } from "express";
import { getProfile, patchProfile, getConsents, postConsent, getPrivacyPreferences, patchPrivacyPreferences,
  postCancellation, getCancellationRequest, getCancellationRequests } from "../controllers/privacyController.js";
import { privateResponse, privacyIpLimiter, requirePrivacySession } from "../middleware/privacySecurity.js";

const router = Router();
const protect = [privateResponse, privacyIpLimiter, requirePrivacySession];
// Register these alongside the existing /user routes. There is one /profile GET.
router.get("/profile", ...protect, getProfile);
router.patch("/profile", ...protect, patchProfile);
router.get("/privacy-consents", ...protect, getConsents);
router.post("/privacy-consents", ...protect, postConsent);
router.get("/privacy-preferences", ...protect, getPrivacyPreferences);
router.patch("/privacy-preferences", ...protect, patchPrivacyPreferences);
router.post("/account-cancellation-requests", ...protect, postCancellation);
router.get("/account-cancellation-requests", ...protect, getCancellationRequests);
router.get("/account-cancellation-requests/:requestId", ...protect, getCancellationRequest);
export default router;
