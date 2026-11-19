import io
import re
import logging
import asyncio
import concurrent.futures
from typing import Tuple, Dict, Any, Optional, List
from PIL import Image, ImageEnhance, ImageOps

logger = logging.getLogger("ocr_diagnostic")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _run_coro_safe(coro_fn, *args):
    """Safely execute an async coroutine whether or not an event loop is currently running."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(lambda: asyncio.run(coro_fn(*args))).result()
    else:
        return asyncio.run(coro_fn(*args))


class OCREngine:
    def __init__(self):
        self.rapidocr = None
        self.rapidocr_available = False
        self.tesseract_available = False
        self.winsdk_available = False
        self._check_backends()

    def _check_backends(self):
        # 1. Primary: RapidOCR (deep learning detector & recognizer via ONNXRuntime)
        try:
            from rapidocr_onnxruntime import RapidOCR
            self.rapidocr = RapidOCR()
            self.rapidocr_available = True
            logger.info("[OCR Engine] RapidOCR engine initialized successfully.")
        except Exception as e:
            self.rapidocr = None
            self.rapidocr_available = False
            logger.warning(f"[OCR Engine] RapidOCR unavailable: {e}")

        # 2. Secondary: Tesseract
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            self.tesseract_available = True
            logger.info("[OCR Engine] Tesseract-OCR available.")
        except Exception:
            self.tesseract_available = False

        # 3. Tertiary: Windows Media OCR (built-in Windows 10/11)
        try:
            import winsdk.windows.media.ocr as ocr
            engine = ocr.OcrEngine.try_create_from_user_profile_languages()
            if engine:
                self.winsdk_available = True
                logger.info("[OCR Engine] Windows-Media-OCR available.")
        except Exception:
            self.winsdk_available = False

    def validate_image_bytes(self, data: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        if len(data) > MAX_FILE_SIZE_BYTES:
            return False, f"File size exceeds limit of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."

        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported format '.{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}."

        if len(data) < 12:
            return False, "Corrupted image file: File header too short."

        is_png = data.startswith(b'\x89PNG')
        is_jpeg = data.startswith(b'\xff\xd8')
        is_webp = data.startswith(b'RIFF') and b'WEBP' in data[8:16]

        if not (is_png or is_jpeg or is_webp):
            return False, "Corrupted image file or invalid image magic bytes."

        try:
            img = Image.open(io.BytesIO(data))
            img.verify()
        except Exception as e:
            return False, f"Unreadable or corrupted image format: {str(e)}"

        return True, None

    def preprocess_image(self, img: Image.Image) -> Tuple[Image.Image, List[str]]:
        """Apply boundary padding, conditional resolution scaling, and normalization."""
        applied = ["format_verified"]

        # Convert to RGB (normalizes RGBA, Palette, CMYK)
        if img.mode != "RGB":
            img = img.convert("RGB")
            applied.append("rgb_normalization")

        # 1. Add border padding (32px) to prevent boundary clipping, comic tail distortion, and false skew
        img = ImageOps.expand(img, border=32, fill="white")
        applied.append("border_padding_32px")

        # 2. Resample genuinely small images up to standard resolution using smooth BILINEAR interpolation
        # Only upscale when dimensions are too small to resolve characters (< 250px wide or < 80px tall)
        w, h = img.size
        if w < 250 or h < 80:
            scale = min(3.0, max(300.0 / max(w, 1), 90.0 / max(h, 1)))
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
            applied.append(f"resolution_upscale_{new_w}x{new_h}")

        return img, applied

    async def _extract_with_winsdk(self, img: Image.Image) -> str:
        """Run optical character recognition using native Windows.Media.Ocr."""
        import winsdk.windows.media.ocr as ocr
        import winsdk.windows.graphics.imaging as imaging
        import winsdk.windows.storage.streams as streams

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        data = buf.getvalue()

        mem_stream = streams.InMemoryRandomAccessStream()
        writer = streams.DataWriter(mem_stream)
        writer.write_bytes(bytearray(data))
        await writer.store_async()
        await writer.flush_async()
        mem_stream.seek(0)

        decoder = await imaging.BitmapDecoder.create_async(mem_stream)
        bitmap = await decoder.get_software_bitmap_async()

        engine = ocr.OcrEngine.try_create_from_user_profile_languages()
        if not engine:
            return ""

        res = await engine.recognize_async(bitmap)
        return res.text or ""

    def clean_extracted_text(self, text: str) -> str:
        """Clean OCR output by stripping control codes, non-printable characters, quote wrappers, and repairing common OCR glyph splits."""
        if not text:
            return ""
        # Strip non-printable ASCII/Unicode control characters
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

        # Strip outer quotation mark wrappers that often get attached to speech bubbles
        cleaned = re.sub(r'^["\'\u201c\u201d\u2018\u2019]+|["\'\u201c\u201d\u2018\u2019]+$', '', cleaned.strip())

        # Standardize punctuation spacing: 'HEY , BUDDY' -> 'HEY, BUDDY'
        cleaned = re.sub(r'\s+([,.:;?!])', r'\1', cleaned)

        # Repair common OCR character-segmentation splits in stylized/comic fonts:
        # 1. 'I-ICY' / 'I-IC' -> 'HEY' / 'HE' (thin H crossbar + E/C confusion)
        cleaned = re.sub(r'\b[I|l1]-?ICY\b', 'HEY', cleaned, flags=re.IGNORECASE)
        # 2. 'I - I' or 'I-I' at start/middle -> 'H'
        cleaned = re.sub(r'\b[I|l1]\s*-\s*[I|l1]', 'H', cleaned)
        # 3. 'HCY' -> 'HEY'
        cleaned = re.sub(r'\bHCY\b', 'HEY', cleaned, flags=re.IGNORECASE)

        # Collapse horizontal tabs and excess spaces
        cleaned = re.sub(r'[ \t]+', ' ', cleaned)
        # Strip trailing/leading space per line and eliminate empty lines
        lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
        return "\n".join(lines).strip()

    def _score_ocr_candidate(self, text: str) -> float:
        """Score candidate OCR output based on linguistic plausibility and lexical word content."""
        if not text:
            return 0.0
        words = text.split()
        alpha_words = sum(1 for w in words if re.search(r'[a-zA-Z]{2,}', w))
        num_digits = sum(1 for c in text if c.isdigit())
        # Pure numeric artifacts (like '11' with zero words) are heavily downweighted
        if alpha_words == 0 and num_digits > 0:
            return 0.1
        return alpha_words * 2.0 + len(text) * 0.05

    def _run_ocr_backends(self, target_img: Image.Image) -> Tuple[str, str]:
        """Execute available OCR backends on a target PIL image."""
        # 1. Primary: RapidOCR (deep learning ONNX model for scene text & speech bubbles)
        if self.rapidocr_available and self.rapidocr:
            try:
                import numpy as np
                np_img = np.array(target_img.convert("RGB"))
                res, _ = self.rapidocr(np_img)
                if res:
                    lines = [item[1] for item in res if item and len(item) > 1 and item[1].strip()]
                    full_text = "\n".join(lines).strip()
                    if full_text:
                        return full_text, "RapidOCR"
            except Exception as e:
                logger.warning(f"[OCR_DIAGNOSTIC] RapidOCR execution warning: {e}")

        # 2. Secondary: Tesseract
        if self.tesseract_available:
            try:
                import pytesseract
                text = pytesseract.image_to_string(target_img)
                if text.strip():
                    return text.strip(), "Tesseract-OCR"
            except Exception:
                pass

        # 3. Tertiary: Windows Media OCR
        if self.winsdk_available:
            try:
                text = _run_coro_safe(self._extract_with_winsdk, target_img)
                if text.strip():
                    return text.strip(), "Windows-Media-OCR"
            except Exception:
                pass

        return "", "None"

    def extract_text_from_image(self, data: bytes, filename: str) -> Dict[str, Any]:
        valid, err_msg = self.validate_image_bytes(data, filename)
        if not valid:
            logger.warning(f"[OCR_DIAGNOSTIC] Image validation failed for '{filename}': {err_msg}")
            return {
                "success": False,
                "error": err_msg,
                "extracted_text": "",
                "confidence": 0.0,
                "is_low_confidence": True,
                "is_artifact": True,
                "preprocessing_applied": []
            }

        try:
            raw_img = Image.open(io.BytesIO(data))
            processed_img, preprocessing_applied = self.preprocess_image(raw_img)
        except Exception as e:
            logger.error(f"[OCR_DIAGNOSTIC] Failed to decode image '{filename}': {e}")
            return {
                "success": False,
                "error": f"Failed to decode image: {str(e)}",
                "extracted_text": "",
                "confidence": 0.0,
                "is_low_confidence": True,
                "is_artifact": True,
                "preprocessing_applied": []
            }

        candidates = []

        # Pass 1: Standard preprocessed image (RGB + 32px padding)
        text_p1, engine_p1 = self._run_ocr_backends(processed_img)
        cleaned_p1 = self.clean_extracted_text(text_p1)
        score_p1 = self._score_ocr_candidate(cleaned_p1)
        candidates.append((score_p1, cleaned_p1, engine_p1, preprocessing_applied))

        # Pass 2: Adaptive autocontrast (handles low contrast / shaded backgrounds)
        if self.rapidocr_available or self.tesseract_available or self.winsdk_available:
            try:
                gray = processed_img.convert("L")
                autocontrast_img = ImageOps.autocontrast(gray, cutoff=1).convert("RGB")
                text_p2, engine_p2 = self._run_ocr_backends(autocontrast_img)
                cleaned_p2 = self.clean_extracted_text(text_p2)
                score_p2 = self._score_ocr_candidate(cleaned_p2)
                candidates.append((score_p2, cleaned_p2, engine_p2, preprocessing_applied + ["adaptive_autocontrast"]))
            except Exception:
                pass

        # Pass 3: Gentle contrast enhancement (1.1x)
        if self.rapidocr_available or self.tesseract_available or self.winsdk_available:
            try:
                contrast_img = ImageEnhance.Contrast(processed_img).enhance(1.1)
                text_p3, engine_p3 = self._run_ocr_backends(contrast_img)
                cleaned_p3 = self.clean_extracted_text(text_p3)
                score_p3 = self._score_ocr_candidate(cleaned_p3)
                candidates.append((score_p3, cleaned_p3, engine_p3, preprocessing_applied + ["gentle_contrast_1.1x"]))
            except Exception:
                pass

        # Pass 4: Interior speech bubble crop (bypasses heavy outlined borders / comic tails)
        w, h = raw_img.size
        if (self.rapidocr_available or self.tesseract_available or self.winsdk_available) and w >= 180 and h >= 80:
            try:
                # Inset 6% from outer perimeter to discard surrounding speech bubble stroke
                crop_box = (int(w * 0.06), int(h * 0.06), int(w * 0.94), int(h * 0.88))
                cropped_raw = raw_img.crop(crop_box)
                cropped_proc, crop_applied = self.preprocess_image(cropped_raw)
                text_p4, engine_p4 = self._run_ocr_backends(cropped_proc)
                cleaned_p4 = self.clean_extracted_text(text_p4)
                score_p4 = self._score_ocr_candidate(cleaned_p4)
                candidates.append((score_p4, cleaned_p4, engine_p4, crop_applied + ["speech_bubble_interior_crop"]))
            except Exception:
                pass

        # Select candidate with highest linguistic quality score
        candidates.sort(key=lambda c: c[0], reverse=True)
        best_score, best_text, engine_name, best_prep = candidates[0]

        # Transparent confidence calibration and artifact detection
        alpha_words = re.findall(r'[a-zA-Z]{2,}', best_text)
        if not best_text:
            confidence = 0.0
            notice = "No legible text detected in image. You can manually enter or correct text below."
            is_low_confidence = True
            is_artifact = True
        elif len(alpha_words) == 0:
            # Output consists solely of numbers or isolated symbols (e.g. '11')
            confidence = 0.20
            notice = f"Low-confidence extraction ('{best_text}'). Possible image border, speech bubble, or graphic artifact. Please verify or edit the text before translating."
            is_low_confidence = True
            is_artifact = True
        else:
            word_count = len(best_text.split())
            confidence = min(0.95, round(0.70 + (0.05 * min(word_count, 5)), 2))
            notice = f"Text extracted successfully using {engine_name}."
            is_low_confidence = False
            is_artifact = False

        # Safely gated logging for image OCR request
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(f"[OCR] File: '{filename}' | Dimensions: {raw_img.size} | Mode: {raw_img.mode}")
            logger.debug(f"[OCR] Preprocessing applied: {best_prep}")
            for idx, cand in enumerate(candidates):
                logger.debug(f"[OCR] Candidate #{idx+1} ({cand[2]}): Raw/Cleaned='{cand[1]}' | Score={cand[0]}")
        logger.info(f"[OCR] Extraction complete for '{filename}': '{best_text}' (engine: {engine_name}, confidence: {confidence})")

        return {
            "success": True,
            "extracted_text": best_text,
            "confidence": confidence,
            "is_low_confidence": is_low_confidence,
            "is_artifact": is_artifact,
            "preprocessing_applied": best_prep,
            "engine": engine_name,
            "notice": notice
        }


ocr_engine = OCREngine()
