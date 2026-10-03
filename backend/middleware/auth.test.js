import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import process from "node:process";

process.env.JWT_SECRET = "test-secret-for-auth-middleware-32-bytes";

const { authenticateToken, requireAdmin } = await import("./auth.js");

const secret = process.env.JWT_SECRET;

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createToken(claims, options) {
  return jwt.sign(claims, secret, {
    algorithm: "HS256",
    issuer: "citizen-portal",
    audience: "citizen-portal-api",
    expiresIn: "7d",
    ...options,
  });
}

test("authenticateToken rejects missing credentials", () => {
  const res = createResponse();
  let nextCalled = false;

  authenticateToken({ method: "GET", path: "/", headers: {} }, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("authenticateToken allows OPTIONS requests without a token", () => {
  let nextCalled = false;

  authenticateToken(
    { method: "OPTIONS", path: "/api/complaints", headers: {} },
    createResponse(),
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
});

test("authenticateToken bypasses login and registration paths", () => {
  for (const path of [
    "/api/citizens/login",
    "/api/citizens/register",
    "/api/citizens/admin/login",
  ]) {
    let nextCalled = false;

    authenticateToken(
      { method: "POST", path, headers: {} },
      createResponse(),
      () => {
        nextCalled = true;
      }
    );

    assert.equal(nextCalled, true, `${path} should bypass token verification`);
  }
});

test("authenticateToken rejects invalid tokens", () => {
  const res = createResponse();

  authenticateToken(
    {
      method: "GET",
      path: "/",
      headers: { authorization: "Bearer invalid-token" },
    },
    res,
    () => assert.fail("next should not run")
  );

  assert.equal(res.statusCode, 401);
});

test("authenticateToken rejects expired tokens and unsupported roles", () => {
  const expiredToken = createToken(
    {
      citizen_id: "CIT-10001",
      email: "citizen@example.com",
      role: "CITIZEN",
    },
    { expiresIn: -1 }
  );
  const invalidRoleToken = createToken({
    citizen_id: "CIT-10001",
    email: "citizen@example.com",
    role: "SUPERUSER",
  });

  for (const token of [expiredToken, invalidRoleToken]) {
    const res = createResponse();
    authenticateToken(
      {
        method: "GET",
        path: "/",
        headers: { authorization: `Bearer ${token}` },
      },
      res,
      () => assert.fail("next should not run")
    );
    assert.equal(res.statusCode, 401);
  }
});

test("authenticateToken attaches only the expected user claims", () => {
  const token = createToken({
    citizen_id: "CIT-10001",
    email: "citizen@example.com",
    role: "CITIZEN",
    private_claim: "not exposed",
  });
  const req = {
    method: "GET",
    path: "/",
    headers: { authorization: `Bearer ${token}` },
  };
  let nextCalled = false;

  authenticateToken(req, createResponse(), () => {
    nextCalled = true;
  });

  assert.deepEqual(req.user, {
    citizen_id: "CIT-10001",
    email: "citizen@example.com",
    role: "CITIZEN",
  });
  assert.equal(nextCalled, true);
});

test("authenticateToken accepts a token from the HttpOnly cookie", () => {
  const token = createToken({
    citizen_id: null,
    email: "admin@example.com",
    role: "ADMIN",
  });
  const req = {
    method: "GET",
    path: "/",
    headers: { cookie: `other=value; token=${token}` },
  };

  authenticateToken(req, createResponse(), () => {});

  assert.deepEqual(req.user, {
    citizen_id: null,
    email: "admin@example.com",
    role: "ADMIN",
  });
});

test("authenticateToken rejects malformed bearer headers even when a cookie exists", () => {
  const token = createToken({
    citizen_id: "CIT-10001",
    email: "citizen@example.com",
    role: "CITIZEN",
  });
  const res = createResponse();

  authenticateToken(
    {
      method: "GET",
      path: "/",
      headers: {
        authorization: "Basic credentials",
        cookie: `token=${token}`,
      },
    },
    res,
    () => assert.fail("next should not run")
  );

  assert.equal(res.statusCode, 401);
});

test("requireAdmin allows only ADMIN users", () => {
  let nextCalled = false;

  requireAdmin({ user: { role: "ADMIN" } }, createResponse(), () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("requireAdmin returns 403 to citizens and unauthenticated requests", () => {
  for (const req of [{ user: { role: "CITIZEN" } }, {}]) {
    const res = createResponse();

    requireAdmin(req, res, () => assert.fail("next should not run"));

    assert.equal(res.statusCode, 403);
  }
});
