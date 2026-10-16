package com.naboo.automotive.storage;

import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Serves public uploads (listing photos). File names are random UUIDs, so they can be cached long-term. */
@Configuration(proxyBeanMethods = false)
public class StorageWebConfig implements WebMvcConfigurer {

    private final FileStorage storage;

    public StorageWebConfig(FileStorage storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(FileStorage.PUBLIC_URL_PREFIX + "**")
                .addResourceLocations(storage.publicRoot().toUri().toString())
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }
}
