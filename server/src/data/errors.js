const UNIQUE_VIOLATION = '23505';

class DuplicateEmailError extends Error {
  constructor(email, options) {
    super(`An account already uses ${email}. Log in instead, or sign up with another email.`, options);
    this.name = 'DuplicateEmailError';
    this.email = email;
  }
}

class AlreadyMemberError extends Error {
  constructor(userId, campaignId, options) {
    super(`User ${userId} is already in campaign ${campaignId}.`, options);
    this.name = 'AlreadyMemberError';
    this.userId = userId;
    this.campaignId = campaignId;
  }
}

class InviteCodeTakenError extends Error {
  constructor(inviteCode, options) {
    super(`Invite code ${inviteCode} is already used by another campaign. Generate a new one and try again.`, options);
    this.name = 'InviteCodeTakenError';
    this.inviteCode = inviteCode;
  }
}

function isUniqueViolation(err, constraint) {
  return err instanceof Error && err.code === UNIQUE_VIOLATION && err.constraint === constraint;
}

module.exports = { DuplicateEmailError, AlreadyMemberError, InviteCodeTakenError, isUniqueViolation };
