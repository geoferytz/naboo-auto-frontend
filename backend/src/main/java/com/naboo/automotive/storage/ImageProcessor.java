package com.naboo.automotive.storage;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import org.springframework.stereotype.Component;

import com.naboo.automotive.common.BusinessRuleException;

/**
 * Validates uploaded photos by content (not by file name or client-supplied type), guards against decompression
 * bombs, and re-encodes to a resized JPEG. Re-encoding discards all metadata (EXIF, including GPS location).
 */
@Component
public class ImageProcessor {

    static final long MAX_PIXELS = 40_000_000L;
    static final int MAX_EDGE = 2000;

    public record ProcessedImage(byte[] bytes, String extension) {}

    public byte[] toWebJpeg(byte[] input) {
        return encodeJpeg(resize(validateAndDecode(input), false));
    }

    /** Like {@link #toWebJpeg} but keeps PNGs with real transparency as PNG instead of flattening to white. */
    public ProcessedImage toWebImage(byte[] input) {
        BufferedImage source = validateAndDecode(input);
        boolean alpha = hasTransparency(source);
        BufferedImage target = resize(source, alpha);
        return alpha
            ? new ProcessedImage(encodePng(target), "png")
            : new ProcessedImage(encodeJpeg(target), "jpg");
    }

    private static BufferedImage validateAndDecode(byte[] input) {
        if (!isJpeg(input) && !isPng(input)) {
            throw new BusinessRuleException("UNSUPPORTED_IMAGE", "Only JPEG and PNG photos are accepted.");
        }
        return decode(input);
    }

    private static boolean hasTransparency(BufferedImage image) {
        if (!image.getColorModel().hasAlpha()) {
            return false;
        }
        // Only treat it as transparent if at least one pixel is actually non-opaque.
        int w = image.getWidth();
        int h = image.getHeight();
        for (int y = 0; y < h; y += 4) {
            for (int x = 0; x < w; x += 4) {
                if ((image.getRGB(x, y) >>> 24) < 0xFF) {
                    return true;
                }
            }
        }
        return false;
    }

    private static BufferedImage resize(BufferedImage source, boolean alpha) {
        int w = source.getWidth();
        int h = source.getHeight();
        double scale = Math.min(1.0, (double) MAX_EDGE / Math.max(w, h));
        int tw = Math.max(1, (int) Math.round(w * scale));
        int th = Math.max(1, (int) Math.round(h * scale));

        BufferedImage target = new BufferedImage(tw, th, alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        Graphics2D g = target.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            if (!alpha) {
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, tw, th);
            }
            g.drawImage(source, 0, 0, tw, th, null);
        } finally {
            g.dispose();
        }
        return target;
    }

    private static byte[] encodePng(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (!ImageIO.write(image, "png", out)) {
                throw new IllegalStateException("PNG encoding failed");
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("PNG encoding failed", e);
        }
    }

    private static BufferedImage decode(byte[] input) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                throw invalid();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels <= 0 || pixels > MAX_PIXELS) {
                    throw new BusinessRuleException("IMAGE_TOO_LARGE", "Photo dimensions are too large (max 40 megapixels).");
                }
                BufferedImage image = reader.read(0);
                if (image == null) {
                    throw invalid();
                }
                return image;
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw invalid();
        }
    }

    private static byte[] encodeJpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream(); ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.85f);
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
            ios.flush();
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("JPEG encoding failed", e);
        } finally {
            writer.dispose();
        }
    }

    static boolean isJpeg(byte[] b) {
        return b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
    }

    static boolean isPng(byte[] b) {
        return b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
    }

    private static BusinessRuleException invalid() {
        return new BusinessRuleException("INVALID_IMAGE", "The file is not a readable image.");
    }
}
