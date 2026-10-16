package com.naboo.automotive.users;

public enum Role {
    SUPER_ADMIN,
    MANAGER,
    SALES_AGENT,
    RENTAL_AGENT,
    SERVICE_ADVISOR,
    MECHANIC,
    INVENTORY_MANAGER,
    FINANCE_OFFICER,
    CUSTOMER;

    public boolean isStaff() {
        return this != CUSTOMER;
    }
}
