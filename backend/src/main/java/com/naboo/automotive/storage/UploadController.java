package com.naboo.automotive.storage;

import java.io.IOException;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.rentals.RentalService;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleImageInput;
import com.naboo.automotive.vehicles.VehicleService;
import com.naboo.automotive.vehicles.VehicleViews.ImageView;
import com.naboo.automotive.vehicles.VehicleViews.VehicleView;

/** Multipart uploads (GraphQL is not used for binary transfer). */
@RestController
public class UploadController {

    static final long MAX_BYTES = 10L * 1024 * 1024;

    private final ImageProcessor images;
    private final FileStorage storage;
    private final VehicleService vehicles;
    private final RentalService rentals;

    public UploadController(ImageProcessor images, FileStorage storage, VehicleService vehicles, RentalService rentals) {
        this.images = images;
        this.storage = storage;
        this.vehicles = vehicles;
        this.rentals = rentals;
    }

    @PostMapping("/api/uploads/vehicles/{vehicleId}/images")
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public ResponseEntity<ImageView> uploadVehicleImage(@PathVariable UUID vehicleId, @RequestParam("file") MultipartFile file,
            @RequestParam("altText") String altText, @AuthenticationPrincipal Jwt jwt) throws IOException {
        String alt = validateAlt(altText);
        String url = store(file, "vehicles");
        try {
            VehicleView view = vehicles.addImage(vehicleId, new VehicleImageInput(url, alt, null), CurrentUser.id(jwt));
            return ResponseEntity.ok(findImage(view.images(), url));
        } catch (RuntimeException e) {
            storage.deleteQuietly(url);
            throw e;
        }
    }

    @PostMapping("/api/uploads/rentals/{vehicleId}/images")
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public ResponseEntity<ImageView> uploadRentalImage(@PathVariable UUID vehicleId, @RequestParam("file") MultipartFile file,
            @RequestParam("altText") String altText, @AuthenticationPrincipal Jwt jwt) throws IOException {
        String alt = validateAlt(altText);
        String url = store(file, "rentals");
        try {
            var view = rentals.addImage(vehicleId, new VehicleImageInput(url, alt, null), CurrentUser.id(jwt));
            return ResponseEntity.ok(findImage(view.images(), url));
        } catch (RuntimeException e) {
            storage.deleteQuietly(url);
            throw e;
        }
    }

    private String store(MultipartFile file, String folder) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new BusinessRuleException("INVALID_FILE_SIZE", "Photos must be between 1 byte and 10 MB.");
        }
        return storage.storePublic(folder, images.toWebJpeg(file.getBytes()), "jpg");
    }

    private static String validateAlt(String altText) {
        String alt = altText == null ? "" : altText.trim();
        if (alt.isEmpty() || alt.length() > 200) {
            throw new BusinessRuleException("INVALID_ALT_TEXT", "Describe the photo in 1 to 200 characters.");
        }
        return alt;
    }

    private static ImageView findImage(java.util.List<ImageView> images, String url) {
        return images.stream().filter(i -> i.url().equals(url)).findFirst().orElseThrow();
    }
}
