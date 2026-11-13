
const crypto = require('crypto');

const PROVIDER = 'mock';
const MIN_WATCH_MS = 5000;
const SESSION_TTL_MS = 2 * 60 * 1000;

const getSecret = () => {
  const secret = process.env.AD_VERIFICATION_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('AD_VERIFICATION_SECRET is missing');
  }

  return secret;
};

const sign = payload =>
  crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');

const createAdSession = ({ userId, placement }) => {
  const now = Date.now();

  const payload = {
    sessionId: crypto.randomUUID(),
    userId: String(userId),
    placement,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const proofToken = `${encoded}.${sign(encoded)}`;

  return {
    sessionId: payload.sessionId,
    proofToken,
    placement,
    provider: PROVIDER,
    minWatchMs: MIN_WATCH_MS,
    expiresAt: payload.expiresAt
  };
};

const verifyAdCompletion = ({ proofToken, userId, placement }) => {
  if (!proofToken || typeof proofToken !== 'string') {
    throw new Error('Ad proof token is required');
  }

  const [encoded, receivedSignature] = proofToken.split('.');

  if (!encoded || !receivedSignature) {
    throw new Error('Invalid ad proof token');
  }

  const expectedSignature = sign(encoded);

  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    throw new Error('Ad verification failed');
  }

  const payload = JSON.parse(
    Buffer.from(encoded, 'base64url').toString('utf8')
  );

  if (payload.userId !== String(userId)) {
    throw new Error('Ad session user mismatch');
  }

  if (payload.placement !== placement) {
    throw new Error('Ad placement mismatch');
  }

  if (Date.now() > payload.expiresAt) {
    throw new Error('Ad session expired');
  }

  if (Date.now() - payload.issuedAt < MIN_WATCH_MS) {
    throw new Error('Please complete the ad before claiming reward');
  }

  return {
    verified: true,
    provider: PROVIDER,
    sessionId: payload.sessionId,
    placement: payload.placement
  };
};

module.exports = {
  createAdSession,
  verifyAdCompletion
};
