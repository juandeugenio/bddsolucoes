-- =============================================================
-- BDD Soluções Financeiras - Schema MySQL 8+
-- InnoDB, utf8mb4, IDs UUID CHAR(36)
-- =============================================================

CREATE TABLE IF NOT EXISTS `Users` (
  `Id` CHAR(36) NOT NULL,
  `UserName` VARCHAR(256) NULL,
  `NormalizedUserName` VARCHAR(256) NULL,
  `Email` VARCHAR(256) NULL,
  `NormalizedEmail` VARCHAR(256) NULL,
  `EmailConfirmed` TINYINT(1) NOT NULL DEFAULT 0,
  `PasswordHash` LONGTEXT NULL,
  `PhoneNumber` VARCHAR(256) NULL,
  `ConcurrencyStamp` LONGTEXT NULL,
  `DefaultCurrency` VARCHAR(3) NOT NULL DEFAULT 'R$',
  `ActiveTenantId` CHAR(36) NULL,
  `Plan` INT NOT NULL DEFAULT 0,
  `PlanExpiresAt` DATETIME(6) NULL,
  `PinHash` LONGTEXT NULL,
  `Timezone` VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  `NotificationsEnabled` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_Users_UserName` (`NormalizedUserName`),
  UNIQUE KEY `IX_Users_Email` (`NormalizedEmail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Roles` (
  `Id` CHAR(36) NOT NULL,
  `Name` VARCHAR(256) NULL,
  `NormalizedName` VARCHAR(256) NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_Roles_NormalizedName` (`NormalizedName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `UserRoles` (
  `UserId` CHAR(36) NOT NULL,
  `RoleId` CHAR(36) NOT NULL,
  PRIMARY KEY (`UserId`, `RoleId`),
  KEY `IX_UserRoles_RoleId` (`RoleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `UserClaims` (
  `Id` INT NOT NULL AUTO_INCREMENT,
  `UserId` CHAR(36) NOT NULL,
  `ClaimType` LONGTEXT NULL,
  `ClaimValue` LONGTEXT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_UserClaims_UserId` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `UserLogins` (
  `LoginProvider` VARCHAR(128) NOT NULL,
  `ProviderKey` VARCHAR(128) NOT NULL,
  `ProviderDisplayName` VARCHAR(256) NULL,
  `UserId` CHAR(36) NOT NULL,
  PRIMARY KEY (`LoginProvider`, `ProviderKey`),
  KEY `IX_UserLogins_UserId` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `UserTokens` (
  `UserId` CHAR(36) NOT NULL,
  `LoginProvider` VARCHAR(128) NOT NULL,
  `Name` VARCHAR(128) NOT NULL,
  `Value` LONGTEXT NULL,
  PRIMARY KEY (`UserId`, `LoginProvider`, `Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- Domínio financeiro
-- =============================================================

CREATE TABLE IF NOT EXISTS `FinanceTenants` (
  `Id` CHAR(36) NOT NULL,
  `OwnerUserId` VARCHAR(128) NOT NULL,
  `Name` VARCHAR(80) NOT NULL,
  `ControlMode` INT NOT NULL DEFAULT 0,
  `CreatedAt` DATETIME(6) NOT NULL,
  `Plan` INT NOT NULL DEFAULT 0,
  `PlanExpiresAt` DATETIME(6) NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_FinanceTenants_OwnerUserId` (`OwnerUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `FinanceTenantMembers` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `UserId` VARCHAR(128) NOT NULL,
  `Name` VARCHAR(80) NULL,
  `Email` VARCHAR(160) NULL,
  `Role` INT NOT NULL DEFAULT 1,
  `JoinedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_FinanceTenantMembers_TenantId_UserId` (`TenantId`, `UserId`),
  CONSTRAINT `FK_FinanceTenantMembers_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `FinanceTenants` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `FinanceTenantInvites` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `Email` VARCHAR(160) NULL,
  `Token` VARCHAR(64) NULL,
  `CreatedByUserId` VARCHAR(128) NULL,
  `Status` INT NOT NULL DEFAULT 0,
  `AcceptedByUserId` VARCHAR(128) NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  `ExpiresAt` DATETIME(6) NULL,
  `AcceptedAt` DATETIME(6) NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_FinanceTenantInvites_Token` (`Token`),
  KEY `IX_FinanceTenantInvites_TenantId` (`TenantId`),
  CONSTRAINT `FK_FinanceTenantInvites_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `FinanceTenants` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Wallets` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `Name` VARCHAR(60) NOT NULL,
  `Icon` VARCHAR(32) NULL,
  `Color` VARCHAR(9) NULL,
  `InitialBalance` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `Currency` VARCHAR(3) NOT NULL DEFAULT 'R$',
  `Kind` INT NOT NULL DEFAULT 2,
  `IsArchived` TINYINT(1) NOT NULL DEFAULT 0,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Wallets_TenantId` (`TenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Categories` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `Name` VARCHAR(60) NOT NULL,
  `Icon` VARCHAR(32) NULL,
  `Color` VARCHAR(9) NULL,
  `Type` INT NOT NULL DEFAULT 0,
  `ParentId` CHAR(36) NULL,
  `IsArchived` TINYINT(1) NOT NULL DEFAULT 0,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_Categories_TenantId_Name` (`TenantId`, `Name`),
  KEY `IX_Categories_ParentId` (`ParentId`),
  CONSTRAINT `FK_Categories_Categories_ParentId` FOREIGN KEY (`ParentId`) REFERENCES `Categories` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `CreditCards` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `Name` VARCHAR(60) NOT NULL,
  `Icon` VARCHAR(32) NULL,
  `Color` VARCHAR(9) NULL,
  `ClosingDay` INT NOT NULL DEFAULT 1,
  `DueDay` INT NOT NULL DEFAULT 5,
  `Limit` DECIMAL(18,2) NULL,
  `IsArchived` TINYINT(1) NOT NULL DEFAULT 0,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_CreditCards_TenantId` (`TenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `SplitGroups` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `Name` VARCHAR(80) NOT NULL,
  `Currency` VARCHAR(3) NOT NULL DEFAULT 'R$',
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_SplitGroups_TenantId` (`TenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `SplitMembers` (
  `Id` CHAR(36) NOT NULL,
  `GroupId` CHAR(36) NOT NULL,
  `UserId` VARCHAR(128) NULL,
  `Name` VARCHAR(80) NOT NULL,
  `Email` VARCHAR(160) NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  CONSTRAINT `FK_SplitMembers_SplitGroups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `SplitGroups` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `SplitEntries` (
  `Id` CHAR(36) NOT NULL,
  `GroupId` CHAR(36) NOT NULL,
  `PayerMemberId` CHAR(36) NOT NULL,
  `Title` VARCHAR(120) NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `Date` DATETIME(6) NOT NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  CONSTRAINT `FK_SplitEntries_SplitGroups_GroupId` FOREIGN KEY (`GroupId`) REFERENCES `SplitGroups` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SplitEntries_SplitMembers_PayerMemberId` FOREIGN KEY (`PayerMemberId`) REFERENCES `SplitMembers` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `SplitShares` (
  `Id` CHAR(36) NOT NULL,
  `EntryId` CHAR(36) NOT NULL,
  `MemberId` CHAR(36) NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (`Id`),
  CONSTRAINT `FK_SplitShares_SplitEntries_EntryId` FOREIGN KEY (`EntryId`) REFERENCES `SplitEntries` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SplitShares_SplitMembers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `SplitMembers` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Transactions` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `WalletId` CHAR(36) NULL,
  `CategoryId` CHAR(36) NULL,
  `CardId` CHAR(36) NULL,
  `CounterWalletId` CHAR(36) NULL,
  `RecurringSourceId` CHAR(36) NULL,
  `PayerMemberId` CHAR(36) NULL,
  `Kind` INT NOT NULL DEFAULT 0,
  `IsPaid` TINYINT(1) NOT NULL DEFAULT 1,
  `PaidDate` DATE NULL,
  `Obs` LONGTEXT NULL,
  `PaymentMethodName` VARCHAR(60) NULL,
  `Amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `Currency` VARCHAR(3) NOT NULL DEFAULT 'R$',
  `Note` VARCHAR(200) NULL,
  `Date` DATETIME(6) NOT NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  `UpdatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Transactions_TenantId_Date` (`TenantId`, `Date`),
  KEY `IX_Transactions_WalletId` (`WalletId`),
  KEY `IX_Transactions_CategoryId` (`CategoryId`),
  KEY `IX_Transactions_CardId` (`CardId`),
  KEY `IX_Transactions_CounterWalletId` (`CounterWalletId`),
  KEY `IX_Transactions_PayerMemberId` (`PayerMemberId`),
  CONSTRAINT `FK_Transactions_Wallets_WalletId` FOREIGN KEY (`WalletId`) REFERENCES `Wallets` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Transactions_Categories_CategoryId` FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_Transactions_Cards_CardId` FOREIGN KEY (`CardId`) REFERENCES `CreditCards` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_Transactions_CounterWallet_CounterWalletId` FOREIGN KEY (`CounterWalletId`) REFERENCES `Wallets` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_Transactions_FinanceTenantMembers_PayerMemberId` FOREIGN KEY (`PayerMemberId`) REFERENCES `FinanceTenantMembers` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `CategoryLimits` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `CategoryId` CHAR(36) NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `Period` VARCHAR(7) NULL,
  `UpdatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_CategoryLimits_TenantId_CategoryId_Period` (`TenantId`, `CategoryId`, `Period`),
  CONSTRAINT `FK_CategoryLimits_Categories_CategoryId` FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `RecurringTransactions` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `WalletId` CHAR(36) NULL,
  `CategoryId` CHAR(36) NULL,
  `Kind` INT NOT NULL DEFAULT 0,
  `Amount` DECIMAL(18,2) NOT NULL,
  `Currency` VARCHAR(3) NOT NULL DEFAULT 'R$',
  `Note` VARCHAR(200) NULL,
  `Frequency` INT NOT NULL DEFAULT 2,
  `StartDate` DATE NOT NULL,
  `EndDate` DATE NULL,
  `NextDueDate` DATE NOT NULL,
  `LastGeneratedDate` DATE NULL,
  `Enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_RecurringTransactions_TenantId_NextDueDate` (`TenantId`, `NextDueDate`),
  CONSTRAINT `FK_RecurringTransactions_Wallets_WalletId` FOREIGN KEY (`WalletId`) REFERENCES `Wallets` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_RecurringTransactions_Categories_CategoryId` FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ExchangeRates` (
  `Id` CHAR(36) NOT NULL,
  `FromCurrency` VARCHAR(3) NOT NULL,
  `ToCurrency` VARCHAR(3) NOT NULL,
  `Rate` DECIMAL(18,8) NOT NULL,
  `Date` DATE NOT NULL,
  `Source` VARCHAR(32) NOT NULL DEFAULT 'manual',
  `CreatedByUserId` VARCHAR(128) NULL,
  `UpdatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_ExchangeRates_From_To_Date` (`FromCurrency`, `ToCurrency`, `Date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PushSubscriptions` (
  `Id` CHAR(36) NOT NULL,
  `UserId` CHAR(36) NOT NULL,
  `Endpoint` TEXT NULL,
  `EndpointHash` CHAR(64) NOT NULL,
  `P256Dh` VARCHAR(256) NULL,
  `Auth` VARCHAR(256) NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_PushSubscriptions_EndpointHash` (`EndpointHash`),
  KEY `IX_PushSubscriptions_UserId` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Attachments` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `TransactionId` CHAR(36) NULL,
  `FileName` VARCHAR(255) NULL,
  `ContentType` VARCHAR(100) NULL,
  `Data` LONGBLOB NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Attachments_TenantId` (`TenantId`),
  CONSTRAINT `FK_Attachments_Transactions_TransactionId` FOREIGN KEY (`TransactionId`) REFERENCES `Transactions` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `AnalyticsEvents` (
  `Id` CHAR(36) NOT NULL,
  `UserId` VARCHAR(128) NOT NULL,
  `EventName` VARCHAR(80) NOT NULL,
  `Data` VARCHAR(4000) NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_AnalyticsEvents_UserId_CreatedAt` (`UserId`, `CreatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `DataVersions` (
  `TenantId` CHAR(36) NOT NULL,
  `Version` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`TenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PaymentMethods` (
  `Id` CHAR(36) NOT NULL,
  `TenantId` CHAR(36) NOT NULL,
  `Name` VARCHAR(60) NOT NULL,
  `CreatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_PaymentMethods_TenantId` (`TenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela para passkeys (paridade com Identity v3, opcional)
CREATE TABLE IF NOT EXISTS `UserPasskeys` (
  `CredentialId` VARCHAR(255) NOT NULL,
  `UserId` CHAR(36) NOT NULL,
  `Data` JSON NULL,
  PRIMARY KEY (`CredentialId`),
  KEY `IX_UserPasskeys_UserId` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;