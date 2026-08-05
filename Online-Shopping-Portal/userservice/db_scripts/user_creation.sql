CREATE DATABASE IF NOT EXISTS user_management;

USE user_management;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(40) NOT NULL,
    name VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    mobile VARCHAR(20) UNIQUE,
    password VARCHAR(100),
    insert_date DATE,
    expire_date DATE,
    PRIMARY KEY (id)
);