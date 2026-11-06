import cv2
import numpy as np


def apply_mask(img: np.ndarray, mask_path: str, fill_color=(255, 255, 255)) -> np.ndarray:
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise RuntimeError(f"Failed to read mask: {mask_path}")

    h, w = img.shape[:2]

    if mask.shape != (h, w):
        mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)

    mask_bool = mask > 127

    result = np.full_like(img, fill_color, dtype=img.dtype)

    result[mask_bool] = img[mask_bool]
    return result
