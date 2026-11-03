-- Receipts move from the server's disk into the database, so every app instance can serve them.
ALTER TABLE expenses DROP COLUMN attachment_path;

CREATE TABLE expense_attachments (
  id bigint NOT NULL AUTO_INCREMENT,
  expense_id bigint NOT NULL,
  data mediumblob NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_expense_attachments_expense (expense_id),
  CONSTRAINT fk_attachments_expense FOREIGN KEY (expense_id) REFERENCES expenses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit trail. expense_id deliberately has no foreign key so entries survive a deleted expense.
CREATE TABLE expense_history (
  id bigint NOT NULL AUTO_INCREMENT,
  expense_id bigint NOT NULL,
  user_id bigint NOT NULL,
  action varchar(20) NOT NULL,
  details varchar(2000) DEFAULT NULL,
  created_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_expense_history_expense (expense_id),
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Account lockout after repeated failed logins
ALTER TABLE users
  ADD COLUMN failed_logins int NOT NULL DEFAULT 0,
  ADD COLUMN locked_until datetime(6) DEFAULT NULL;

-- Login sessions shared by all app instances (Spring Session JDBC schema for MySQL)
CREATE TABLE SPRING_SESSION (
  PRIMARY_ID char(36) NOT NULL,
  SESSION_ID char(36) NOT NULL,
  CREATION_TIME bigint NOT NULL,
  LAST_ACCESS_TIME bigint NOT NULL,
  MAX_INACTIVE_INTERVAL int NOT NULL,
  EXPIRY_TIME bigint NOT NULL,
  PRINCIPAL_NAME varchar(100) DEFAULT NULL,
  PRIMARY KEY (PRIMARY_ID),
  UNIQUE KEY SPRING_SESSION_IX1 (SESSION_ID),
  KEY SPRING_SESSION_IX2 (EXPIRY_TIME),
  KEY SPRING_SESSION_IX3 (PRINCIPAL_NAME)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC;

CREATE TABLE SPRING_SESSION_ATTRIBUTES (
  SESSION_PRIMARY_ID char(36) NOT NULL,
  ATTRIBUTE_NAME varchar(200) NOT NULL,
  ATTRIBUTE_BYTES blob NOT NULL,
  PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
  CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID) REFERENCES SPRING_SESSION (PRIMARY_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC;
