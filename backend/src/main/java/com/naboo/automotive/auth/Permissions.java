package com.naboo.automotive.auth;

/** Method-security expressions shared by GraphQL controllers. Every protected operation must use one of these. */
public final class Permissions {

    public static final String STAFF = "hasAnyRole('SUPER_ADMIN','MANAGER','SALES_AGENT','RENTAL_AGENT','SERVICE_ADVISOR',"
            + "'MECHANIC','INVENTORY_MANAGER','FINANCE_OFFICER')";
    public static final String VEHICLE_MANAGE = "hasAnyRole('SUPER_ADMIN','MANAGER','SALES_AGENT')";
    public static final String SERVICE_CATALOGUE_MANAGE = "hasAnyRole('SUPER_ADMIN','MANAGER')";
    public static final String CONTACT_ENQUIRY_VIEW = "hasAnyRole('SUPER_ADMIN','MANAGER','SALES_AGENT','SERVICE_ADVISOR')";

    private Permissions() {
    }
}
