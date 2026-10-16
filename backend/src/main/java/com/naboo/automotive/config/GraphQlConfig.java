package com.naboo.automotive.config;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Locale;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

import graphql.GraphQLContext;
import graphql.analysis.MaxQueryComplexityInstrumentation;
import graphql.analysis.MaxQueryDepthInstrumentation;
import graphql.execution.CoercedVariables;
import graphql.language.StringValue;
import graphql.language.Value;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import graphql.schema.GraphQLScalarType;

@Configuration(proxyBeanMethods = false)
public class GraphQlConfig {

    @Bean
    RuntimeWiringConfigurer scalarWiring() {
        return builder -> builder.scalar(dateTimeScalar()).scalar(dateScalar());
    }

    @Bean
    MaxQueryDepthInstrumentation maxQueryDepthInstrumentation() {
        return new MaxQueryDepthInstrumentation(12);
    }

    @Bean
    MaxQueryComplexityInstrumentation maxQueryComplexityInstrumentation() {
        return new MaxQueryComplexityInstrumentation(1000);
    }

    /** ISO-8601 instant, always serialised in UTC (e.g. 2026-01-31T09:00:00Z). */
    static GraphQLScalarType dateTimeScalar() {
        return GraphQLScalarType.newScalar()
                .name("DateTime")
                .description("ISO-8601 timestamp, serialised in UTC")
                .coercing(new Coercing<Instant, String>() {
                    @Override
                    public String serialize(Object value, GraphQLContext ctx, Locale locale) {
                        return switch (value) {
                            case Instant i -> i.toString();
                            case OffsetDateTime o -> o.toInstant().toString();
                            default -> throw new CoercingSerializeException("Expected an Instant");
                        };
                    }

                    @Override
                    public Instant parseValue(Object input, GraphQLContext ctx, Locale locale) {
                        try {
                            return OffsetDateTime.parse(input.toString()).toInstant();
                        } catch (DateTimeParseException e) {
                            throw new CoercingParseValueException("Invalid ISO-8601 timestamp with offset");
                        }
                    }

                    @Override
                    public Instant parseLiteral(Value<?> input, CoercedVariables vars, GraphQLContext ctx, Locale locale) {
                        if (input instanceof StringValue s) {
                            try {
                                return OffsetDateTime.parse(s.getValue()).toInstant();
                            } catch (DateTimeParseException e) {
                                throw new CoercingParseLiteralException("Invalid ISO-8601 timestamp with offset");
                            }
                        }
                        throw new CoercingParseLiteralException("Expected a string");
                    }
                })
                .build();
    }

    /** ISO-8601 calendar date (e.g. 2026-03-15), used for rental windows and quotation validity. */
    static GraphQLScalarType dateScalar() {
        return GraphQLScalarType.newScalar()
                .name("Date")
                .description("ISO-8601 calendar date (YYYY-MM-DD)")
                .coercing(new Coercing<LocalDate, String>() {
                    @Override
                    public String serialize(Object value, GraphQLContext ctx, Locale locale) {
                        if (value instanceof LocalDate d) {
                            return d.toString();
                        }
                        throw new CoercingSerializeException("Expected a LocalDate");
                    }

                    @Override
                    public LocalDate parseValue(Object input, GraphQLContext ctx, Locale locale) {
                        try {
                            return LocalDate.parse(input.toString());
                        } catch (DateTimeParseException e) {
                            throw new CoercingParseValueException("Invalid ISO-8601 date");
                        }
                    }

                    @Override
                    public LocalDate parseLiteral(Value<?> input, CoercedVariables vars, GraphQLContext ctx, Locale locale) {
                        if (input instanceof StringValue s) {
                            try {
                                return LocalDate.parse(s.getValue());
                            } catch (DateTimeParseException e) {
                                throw new CoercingParseLiteralException("Invalid ISO-8601 date");
                            }
                        }
                        throw new CoercingParseLiteralException("Expected a string");
                    }
                })
                .build();
    }
}
