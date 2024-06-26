CREATE DATABASE crypto_trading;

USE crypto_trading;

CREATE TABLE holdings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    value DECIMAL(18, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE balance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(18, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/* adding a default value or we don't have money to make more money! */
INSERT INTO balance (id, amount) VALUES (1, 10000) ON DUPLICATE KEY UPDATE amount = amount;