package com.naboo.automotive.common;

/** Public catalogue facets without loading vehicle details or images. */
public record VehicleSearchOption(String make, String model, int year) {
}
