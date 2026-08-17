package com.example.calendaronline.budget.model;

/**
 * Common default values, category names and constants for Budget operations.
 */
public final class BudgetDefaults {

    public static final String CATEGORY_OTHER = "Altro";
    public static final String CATEGORY_SUBSCRIPTIONS = "Abbonamenti";
    public static final String CATEGORY_DEBTS = "Debiti";
    public static final String CATEGORY_SAVINGS = "Salvadanaio";
    public static final String CATEGORY_FLEXIA = "Flexia";

    public static final String DESC_FLEXIA_DEFAULT = "Flexia";
    public static final String DESC_FLEXIA_REMOVED = "Flexia rimossa";
    public static final String DESC_SAVINGS_DEPOSIT_PREFIX = "Deposito salvadanaio: ";
    public static final String DESC_SAVINGS_WITHDRAW_PREFIX = "Prelievo salvadanaio: ";
    public static final String DESC_SAVINGS_REVERSE_DEPOSIT_PREFIX = "Storno versamento: ";
    public static final String DESC_SAVINGS_REVERSE_WITHDRAW_PREFIX = "Annullamento prelievo: ";
    public static final String DESC_SAVINGS_MODIFY_PREFIX = "Modifica versamento salvadanaio: ";

    private BudgetDefaults() {
        // Prevent instantiation
    }
}
