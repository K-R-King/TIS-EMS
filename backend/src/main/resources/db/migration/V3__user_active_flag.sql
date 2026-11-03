-- Accounts can be deactivated instead of deleted, so people who leave lose access
-- while their name stays on the expenses, comments and history they are part of.
ALTER TABLE users ADD COLUMN active bit(1) NOT NULL DEFAULT b'1';
