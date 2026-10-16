package com.naboo.automotive.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.naboo.automotive.config.AppProperties;

/**
 * Local-disk storage. Files get server-generated names; client file names are never used.
 * {@code public/} is served at {@code /uploads/public/**}; {@code private/} is never served directly.
 */
@Component
public class FileStorage {

    public static final String PUBLIC_URL_PREFIX = "/uploads/public/";
    private static final Logger log = LoggerFactory.getLogger(FileStorage.class);

    private final Path root;

    public FileStorage(AppProperties properties) {
        this.root = Path.of(properties.storage().localDir()).toAbsolutePath().normalize();
    }

    public Path publicRoot() {
        return root.resolve("public");
    }

    public Path privateRoot() {
        return root.resolve("private");
    }

    /** Stores bytes under {@code public/<folder>/} and returns the public URL. */
    public String storePublic(String folder, byte[] bytes, String extension) {
        String name = UUID.randomUUID() + "." + extension;
        write(publicRoot().resolve(folder).resolve(name), bytes);
        return PUBLIC_URL_PREFIX + folder + "/" + name;
    }

    /** Stores bytes under {@code private/<folder>/} and returns the storage key (relative path). */
    public String storePrivate(String folder, byte[] bytes, String extension) {
        String key = folder + "/" + UUID.randomUUID() + "." + extension;
        write(privateRoot().resolve(key), bytes);
        return key;
    }

    public byte[] readPrivate(String key) {
        try {
            return Files.readAllBytes(resolveInside(privateRoot(), key));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Deletes a public file after the current transaction commits (no-op for external URLs). */
    public void deletePublicAfterCommit(String url) {
        if (url == null || !url.startsWith(PUBLIC_URL_PREFIX)) {
            return;
        }
        Path path = resolveInside(publicRoot(), url.substring(PUBLIC_URL_PREFIX.length()));
        Runnable delete = () -> {
            try {
                Files.deleteIfExists(path);
            } catch (IOException e) {
                log.warn("Could not delete stored file {}", path.getFileName());
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    delete.run();
                }
            });
        } else {
            delete.run();
        }
    }

    public void deleteQuietly(String url) {
        if (url != null && url.startsWith(PUBLIC_URL_PREFIX)) {
            try {
                Files.deleteIfExists(resolveInside(publicRoot(), url.substring(PUBLIC_URL_PREFIX.length())));
            } catch (IOException e) {
                log.warn("Could not delete stored file");
            }
        }
    }

    private static Path resolveInside(Path base, String relative) {
        Path resolved = base.resolve(relative).normalize();
        if (!resolved.startsWith(base)) {
            throw new IllegalArgumentException("Path escapes storage root");
        }
        return resolved;
    }

    private static void write(Path path, byte[] bytes) {
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
