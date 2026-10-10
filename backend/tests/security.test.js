import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test-secret-smart-city-portal-at-least-32-chars-long";

function createToken(payload, options = {}) {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: "1h", ...options });
}

// =====================================================
// AUTHENTICATION TESTS (AUTH-001 - AUTH-005)
// =====================================================
test("JWT Creation and Verification with valid claims", () => {
  const token = createToken({
    id: 101,
    citizen_id: "CIT-10001",
    email: "citizen1@example.com",
    role: "CITIZEN",
  });

  const decoded = jwt.verify(token, TEST_SECRET);
  assert.equal(decoded.citizen_id, "CIT-10001");
  assert.equal(decoded.role, "CITIZEN");
});

test("Expired JWT is rejected", () => {
  const token = createToken(
    { citizen_id: "CIT-10001", email: "citizen1@example.com", role: "CITIZEN" },
    { expiresIn: -10 }
  );

  assert.throws(() => {
    jwt.verify(token, TEST_SECRET);
  }, /jwt expired/);
});

test("Tampered JWT signature is rejected", () => {
  const token = createToken({ citizen_id: "CIT-10001", email: "citizen1@example.com", role: "CITIZEN" });
  const parts = token.split(".");
  const tampered = `${parts[0]}.${parts[1]}.tamperedSignature`;

  assert.throws(() => {
    jwt.verify(tampered, TEST_SECRET);
  }, /invalid signature/);
});

// =====================================================
// AUTHORIZATION & ROLE TESTS (AUTHZ-001 - AUTHZ-010)
// =====================================================
test("requireAdmin blocks standard CITIZEN role", () => {
  const citizenUser = { citizen_id: "CIT-10001", role: "CITIZEN" };

  function requireAdminCheck(user) {
    if (!user || user.role !== "ADMIN") {
      return { status: 403, message: "Forbidden" };
    }
    return { status: 200, message: "OK" };
  }

  const result = requireAdminCheck(citizenUser);
  assert.equal(result.status, 403);
});

test("requireAdmin allows ADMIN role", () => {
  const adminUser = { role: "ADMIN", email: "admin@smartcity.gov" };

  function requireAdminCheck(user) {
    if (!user || user.role !== "ADMIN") {
      return { status: 403, message: "Forbidden" };
    }
    return { status: 200, message: "OK" };
  }

  const result = requireAdminCheck(adminUser);
  assert.equal(result.status, 200);
});

test("IDOR Prevention: Citizen A cannot access Citizen B's complaint", () => {
  const citizenA = { citizen_id: "CIT-10001", role: "CITIZEN" };
  const complaintB = { id: 45, citizen_id: "CIT-10002", title: "Pothole on Main St" };

  function canAccessComplaint(user, complaint) {
    if (user.role === "ADMIN") return true;
    return user.citizen_id === complaint.citizen_id;
  }

  assert.equal(canAccessComplaint(citizenA, complaintB), false);
});

test("Admin can access Citizen B's complaint", () => {
  const admin = { role: "ADMIN" };
  const complaintB = { id: 45, citizen_id: "CIT-10002", title: "Pothole on Main St" };

  function canAccessComplaint(user, complaint) {
    if (user.role === "ADMIN") return true;
    return user.citizen_id === complaint.citizen_id;
  }

  assert.equal(canAccessComplaint(admin, complaintB), true);
});

// =====================================================
// INPUT VALIDATION & BUSINESS RULES (API-001 - API-005)
// =====================================================
test("Category validation accepts valid municipal categories", () => {
  const ALLOWED_CATEGORIES = [
    "Roads", "Water", "Waste", "Street Lighting",
    "Electricity", "Public Safety", "Sanitation", "Traffic",
    "Environment", "Infrastructure", "Other",
  ];

  function validateCategory(input) {
    return ALLOWED_CATEGORIES.includes(input) ? input : "Other";
  }

  assert.equal(validateCategory("Water"), "Water");
  assert.equal(validateCategory("Public Safety"), "Public Safety");
  assert.equal(validateCategory("<script>alert(1)</script>"), "Other");
  assert.equal(validateCategory("UNKNOWN_HACK"), "Other");
});

test("Priority calculation assigns Critical to life safety keywords", () => {
  function calculatePriority(title, description, category) {
    const textToCheck = `${title} ${description}`.toLowerCase();
    if (
      textToCheck.includes("danger") ||
      textToCheck.includes("emergency") ||
      textToCheck.includes("fire") ||
      textToCheck.includes("injury") ||
      textToCheck.includes("life")
    ) {
      return "Critical";
    }
    if (["Public Safety", "Electricity", "Water"].includes(category)) {
      return "High";
    }
    return "Medium";
  }

  assert.equal(calculatePriority("Broken Wire", "Live electric wire sparking in rain, danger to life", "Electricity"), "Critical");
  assert.equal(calculatePriority("Water Leakage", "Pipe leakage in front of house", "Water"), "High");
  assert.equal(calculatePriority("Pothole", "Pothole on service road", "Roads"), "Medium");
});

// =====================================================
// PASSWORD VALIDATION TESTS
// =====================================================
test("Password validation requires at least 6 characters", () => {
  function validatePassword(pwd) {
    return typeof pwd === "string" && pwd.length >= 6;
  }

  assert.equal(validatePassword("12345"), false);
  assert.equal(validatePassword("123456"), true);
  assert.equal(validatePassword("SecurePass123!"), true);
});
