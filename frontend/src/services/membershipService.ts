import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export type MembershipPlan = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: "visit" | "individual" | "student" | "group";
  durationDays: number;
  price: string | number;
  pricePerPerson?: string | number | null;
  minPeople: number;
  maxPeople: number;
  requiresStudentProof: boolean;
  accessLevel: string;
  benefits: string[];
  isActive: boolean;
  sortOrder: number;
};

export type ManualPaymentPayload = {
  userId: string;
  planId: string;
  method: "cash" | "transfer" | "card_terminal";
  provider?: "none" | "bank_transfer" | "mercadopago_terminal";
  idempotencyKey?: string;
  reference?: string;
  notes?: string;
  startsAt?: string;
};

export type ManualGroupPaymentPayload = {
  ownerUserId: string;
  planId: string;
  method: "cash" | "transfer" | "card_terminal";
  provider?: "none" | "bank_transfer" | "mercadopago_terminal";
  idempotencyKey?: string;
  reference?: string;
  notes?: string;
  startsAt?: string;
  memberEmails?: string[];
};

export async function getMembershipPlans() {
  const response = await axios.get(`${API_URL}/memberships/plans`);
  return response.data;
}

export async function getMembershipPlanById(planId: string) {
  const response = await axios.get(`${API_URL}/memberships/plans/${planId}`);
  return response.data;
}

export async function getMyActiveSubscription() {
  const response = await axios.get(
    `${API_URL}/memberships/me/subscription`,
    authHeaders()
  );

  return response.data;
}

export async function getMyMembershipPayments() {
  const response = await axios.get(
    `${API_URL}/memberships/me/payments`,
    authHeaders()
  );

  return response.data;
}

export async function createManualMembershipPayment(
  payload: ManualPaymentPayload
) {
  const response = await axios.post(
    `${API_URL}/memberships/admin/manual-payment`,
    payload,
    authHeaders()
  );

  return response.data;
}

export async function createManualGroupMembershipPayment(
  payload: ManualGroupPaymentPayload
) {
  const response = await axios.post(
    `${API_URL}/memberships/admin/manual-group-payment`,
    payload,
    authHeaders()
  );

  return response.data;
}

export async function getPendingSubscriptionGroups() {
  const response = await axios.get(
    `${API_URL}/memberships/admin/groups/pending`,
    authHeaders()
  );

  return response.data;
}

export async function approveSubscriptionGroup(
  groupId: string,
  forceApprovePending = false
) {
  const response = await axios.patch(
    `${API_URL}/memberships/admin/groups/${groupId}/approve`,
    { forceApprovePending },
    authHeaders()
  );

  return response.data;
}

export async function addMemberToMyGroup(groupId: string, invitedEmail: string) {
  const response = await axios.post(
    `${API_URL}/memberships/groups/${groupId}/members`,
    { invitedEmail },
    authHeaders()
  );

  return response.data;
}

export async function getMyGroupInvitations() {
  const response = await axios.get(
    `${API_URL}/memberships/groups/invitations/me`,
    authHeaders()
  );

  return response.data;
}

export async function acceptGroupInvitation(memberId: string) {
  const response = await axios.patch(
    `${API_URL}/memberships/groups/invitations/${memberId}/accept`,
    {},
    authHeaders()
  );

  return response.data;
}
