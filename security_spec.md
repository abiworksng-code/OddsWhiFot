# ODDSWHIZ AI Security Specification

## 1. Data Invariants
- A `Slip` must belong to a valid `User`.
- `Match` data can only be modified by administrative entities.
- `Analysis` is linked to a `Match` and must contain a confidence score.
- Users cannot elevate their own `role`.

## 2. The Dirty Dozen Payloads (Rejection Tests)

1. **Identity Spoofing**: Attempt to create a `Slip` with `userId` of another user.
2. **Privilege Escalation**: Attempt to update `role` in `User` profile to 'admin'.
3. **Shadow Update**: Add `isVerified: true` to a `Match` document.
4. **Orphaned Write**: Create an `Analysis` for a non-existent `matchId`.
5. **PII Leak**: Authenticated user trying to read another user's PII in `/users/{userId}`.
6. **Query Scraping**: Attempting a `list` on `/users` without a `uid` filter.
7. **Temporal Violation**: Setting a `createdAt` in the future or past, rather than `request.time`.
8. **Resource Poisoning**: Sending a 1MB string for a `league` name.
9. **Value Poisoning**: Setting `confidence.score` to 999 (out of range).
10. **State Shortcutting**: Updating a `Slip` after it's been "locked" or "settled" (if implemented).
11. **Malicious ID**: Creating a document with ID `../../secrets`.
12. **Anonymous Write**: Attempting to create a `Slip` without being signed in.

## 3. Test Runner
(A `firestore.rules.test.ts` would normally verify these, but I will implement the rules to block them directly.)
