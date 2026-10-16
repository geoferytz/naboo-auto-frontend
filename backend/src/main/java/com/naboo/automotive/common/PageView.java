package com.naboo.automotive.common;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public record PageView<T>(List<T> items, long totalCount, int page, int size, int totalPages) {

    public static final int MAX_PAGE_SIZE = 50;

    public static <E, T> PageView<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageView<>(page.map(mapper).getContent(), page.getTotalElements(), page.getNumber(), page.getSize(),
                page.getTotalPages());
    }

    public static PageRequest request(Integer page, Integer size, Sort sort) {
        int p = page == null ? 0 : Math.max(page, 0);
        int s = size == null ? 20 : Math.clamp(size, 1, MAX_PAGE_SIZE);
        return PageRequest.of(p, s, sort);
    }
}
