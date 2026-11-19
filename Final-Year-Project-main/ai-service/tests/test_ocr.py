import io
import pytest
from PIL import Image, ImageDraw, ImageFont
from app.ocr.ocr_engine import ocr_engine
from app.translation.engine import translation_engine


def get_test_font(size: int = 32):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def create_text_image(text: str, format: str = "PNG", size: tuple = (600, 150), bg_color="white", text_color="black") -> bytes:
    img = Image.new("RGB", size, color=bg_color)
    draw = ImageDraw.Draw(img)
    font = get_test_font(32)
    draw.text((30, 45), text, fill=text_color, font=font)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_ocr_normal_text_image():
    # Test with Mohammad Aadil text in JPEG format (which previously caused JFIF LDDL LDDL bug)
    data = create_text_image("Mohammad Aadil", format="JPEG")
    res = ocr_engine.extract_text_from_image(data, "aadil_sample.jpg")

    assert res["success"] is True
    assert "Mohammad" in res["extracted_text"]
    assert "Aadil" in res["extracted_text"]
    # Ensure binary JFIF or raw byte artifacts never appear
    assert "JFIF" not in res["extracted_text"]
    assert "LDDL" not in res["extracted_text"]
    assert res["confidence"] >= 0.70
    assert "format_verified" in res["preprocessing_applied"]


def test_ocr_medical_emergency_text():
    data = create_text_image("Where is the hospital?", format="PNG")
    res = ocr_engine.extract_text_from_image(data, "hospital.png")

    assert res["success"] is True
    assert "hospital" in res["extracted_text"].lower()
    assert res["confidence"] >= 0.70


def test_ocr_noisy_low_contrast_image():
    # Low contrast: text color (160, 160, 160) on background (220, 220, 220)
    data = create_text_image("Doctor Appointment", format="PNG", bg_color=(220, 220, 220), text_color=(150, 150, 150))
    res = ocr_engine.extract_text_from_image(data, "low_contrast.png")

    assert res["success"] is True
    assert "format_verified" in res["preprocessing_applied"]
    assert "doctor" in res["extracted_text"].lower() or "appointment" in res["extracted_text"].lower()


def test_ocr_empty_blank_image():
    # Pure blank white image with zero text
    img = Image.new("RGB", (300, 300), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    data = buf.getvalue()

    res = ocr_engine.extract_text_from_image(data, "blank.jpg")
    assert res["success"] is True
    assert res["extracted_text"] == ""
    assert res["confidence"] == 0.0
    assert "No legible text detected" in res["notice"]


def test_ocr_unsupported_format():
    res = ocr_engine.extract_text_from_image(b"fake_content", "document.pdf")
    assert res["success"] is False
    assert "Unsupported format" in res["error"]


def test_ocr_corrupted_image_bytes():
    res = ocr_engine.extract_text_from_image(b"short", "corrupt.jpg")
    assert res["success"] is False
    assert "too short" in res["error"] or "magic bytes" in res["error"]


def test_ocr_end_to_end_image_to_sign_flow():
    # Simulate full pipeline: Image -> OCR -> Translation Engine -> ASL Gloss
    data = create_text_image("Please help me doctor", format="PNG")
    ocr_res = ocr_engine.extract_text_from_image(data, "notice.png")
    assert ocr_res["success"] is True
    extracted = ocr_res["extracted_text"]

    trans_res = translation_engine.process(extracted, strategy="rag_grounded")
    assert "DOCTOR" in trans_res["asl_gloss"]
    assert "HELP" in trans_res["asl_gloss"]
    assert len(trans_res["signs"]) > 0


def test_ocr_speech_bubble_fixture():
    # Representative fixture: Large outlined speech bubble with dark text on light background
    w, h = 700, 450
    img = Image.new("RGB", (w, h), (245, 245, 245))
    draw = ImageDraw.Draw(img)
    # Speech bubble outline
    draw.rounded_rectangle([30, 20, 670, 340], radius=50, fill="white", outline="black", width=6)
    # Speech bubble tail
    draw.polygon([(160, 340), (120, 420), (220, 340)], fill="white", outline="black", width=6)
    font = get_test_font(36)
    draw.text((180, 150), "HEY, BUDDY", fill="black", font=font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    res = ocr_engine.extract_text_from_image(buf.getvalue(), "speech_bubble_fixture.png")

    assert res["success"] is True
    # Ensure it did not collapse into numeric artifacts like '11'
    assert res["extracted_text"] != "11"
    assert "BUDDY" in res["extracted_text"].upper()
    assert res["confidence"] >= 0.70
    assert res["is_low_confidence"] is False


def test_ocr_isolated_numeric_artifact_low_confidence():
    # When an image yields an isolated numeric artifact (e.g. '11' from border lines)
    img = Image.new("RGB", (200, 100), "white")
    draw = ImageDraw.Draw(img)
    font = get_test_font(36)
    draw.text((50, 25), "11", fill="black", font=font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    res = ocr_engine.extract_text_from_image(buf.getvalue(), "numeric_artifact.png")

    assert res["success"] is True
    assert res["extracted_text"] == "11"
    # Pure numeric output without words must receive low confidence and warning flag
    assert res["confidence"] <= 0.30
    assert res["is_low_confidence"] is True
    assert "Low-confidence" in res["notice"]


def test_ocr_candidate_scoring_prefers_words_over_artifacts():
    # Verify candidate scorer penalizes artifacts and rewards lexical words
    score_11 = ocr_engine._score_ocr_candidate("11")
    score_buddy = ocr_engine._score_ocr_candidate("BUDDY")
    score_hey_buddy = ocr_engine._score_ocr_candidate("HEY, BUDDY")

    assert score_hey_buddy > score_buddy > score_11
    assert score_11 == 0.1
    assert ocr_engine._score_ocr_candidate("") == 0.0

