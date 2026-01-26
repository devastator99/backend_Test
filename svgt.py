import cv2
import numpy as np
import svgwrite
from PIL import Image, ImageFilter

def precise_image_to_svg(input_path, output_path="perfect_output.svg",
                         blur_strength=1.0, detail=0.0015, min_area=250):
    """
    Converts an image into a high-fidelity SVG with smooth edges and accurate colors.
    
    Args:
        input_path (str): Path to input image.
        output_path (str): SVG save path.
        blur_strength (float): Gaussian blur for smoother tracing (0.5 - 2.0).
        detail (float): Lower = smoother curves, higher = more detailed outlines.
        min_area (int): Minimum contour area to keep.
    """

    # Load and normalize image
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise FileNotFoundError(f"Cannot open {input_path}")

    h, w = img.shape[:2]

    # Handle alpha channels (if present)
    if img.shape[2] == 4:
        alpha = img[:, :, 3]
        white_bg = np.ones_like(img[:, :, :3]) * 255
        img = np.where(alpha[..., None] == 0, white_bg, img[:, :, :3])

    # --- PREPROCESSING ---
    # Convert to grayscale and apply light Gaussian blur
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (0, 0), blur_strength)

    # Auto threshold (adaptive to lighting)
    thr = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 15, 8
    )

    # Smooth edges and fill holes
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3))
    clean = cv2.morphologyEx(thr, cv2.MORPH_CLOSE, kernel, iterations=2)
    clean = cv2.morphologyEx(clean, cv2.MORPH_OPEN, kernel, iterations=1)

    # --- CONTOUR DETECTION ---
    contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

    # --- SVG CREATION ---
    dwg = svgwrite.Drawing(output_path, size=(w, h), viewBox=f"0 0 {w} {h}")
    bg_rgb = tuple(int(c) for c in img[0, 0])
    bg_hex = '#%02x%02x%02x' % (bg_rgb[2], bg_rgb[1], bg_rgb[0])
    dwg.add(dwg.rect(insert=(0, 0), size=(w, h), fill=bg_hex))

    for contour in contours:
        if cv2.contourArea(contour) < min_area:
            continue

        # Smooth path using Douglas-Peucker approximation
        peri = cv2.arcLength(contour, True)
        epsilon = detail * peri
        smooth_contour = cv2.approxPolyDP(contour, epsilon, True)

        # Extract centroid color
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cx, cy = int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])
        else:
            cx, cy = smooth_contour[0][0]
        b, g, r = img[min(max(cy, 0), h-1), min(max(cx, 0), w-1)]
        fill_color = f"#{r:02x}{g:02x}{b:02x}"

        # Build smooth SVG path
        path_data = []
        for i, pt in enumerate(smooth_contour):
            x, y = pt[0]
            cmd = "M" if i == 0 else "L"
            path_data.append(f"{cmd} {x},{y}")
        path_data.append("Z")

        dwg.add(dwg.path(d=" ".join(path_data), fill=fill_color, stroke='none'))

    dwg.save()
    print(f"✅ Perfect SVG saved to {output_path}")

# Example usage
if __name__ == "__main__":
    precise_image_to_svg("input.jpg", "perfect_output.svg")
