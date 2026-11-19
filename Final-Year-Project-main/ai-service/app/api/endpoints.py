from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from typing import List, Optional
import time
import re
import logging

logger = logging.getLogger("ocr_diagnostic")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
from app.schemas.translation import (
    TextTranslationRequest,
    TranscriptTranslationRequest,
    TranslationResponse,
    RetrievalRequest,
    RetrievalResponse,
    RetrievedEntry,
    EvaluationRequest,
    EvaluationResponse
)
from app.translation.engine import translation_engine
from app.retrieval.vector_rag import rag_retriever
from app.ocr.ocr_engine import ocr_engine
from app.speech.speech_engine import speech_engine
from app.evaluation.benchmark_runner import benchmark_runner

router = APIRouter()


@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "asl-bridge-ai-service",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "components": {
            "nlp_transformer": "ready",
            "vector_rag_retriever": "ready" if rag_retriever.is_indexed else "initializing",
            "ocr_engine": "ready",
            "speech_engine": "ready",
            "benchmark_runner": "ready"
        }
    }


@router.get("/models/status")
def get_models_status():
    return {
        "active_models": [
            {
                "name": "ASL Topic-Comment Syntactic Engine",
                "version": "1.2.0",
                "type": "Linguistic Grammar Transformer",
                "status": "loaded"
            },
            {
                "name": "Vector RAG Embedder (TF-IDF + Cosine)",
                "version": "1.0.0",
                "type": "Knowledge Retriever",
                "status": "loaded",
                "indexed_entries": len(rag_retriever.records)
            },
            {
                "name": "OCR Preprocessing Pipeline",
                "version": "1.1.0",
                "type": "Optical Character Recognition",
                "status": "available",
                "engine": "Tesseract / Fallback Filter"
            }
        ]
    }


@router.post("/translate/text", response_model=TranslationResponse)
def translate_text(req: TextTranslationRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Input text must not be empty.")
    
    result = translation_engine.process(req.text, strategy=req.strategy)
    return result


@router.post("/translate/transcript", response_model=TranslationResponse)
def translate_transcript(req: TranscriptTranslationRequest):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript must not be empty.")

    result = translation_engine.process(req.transcript, strategy=req.strategy)
    
    # Enrich with speech recognition confidence
    if req.audio_confidence is not None:
        result["confidence"]["speech_confidence"] = round(req.audio_confidence, 2)
        # Update overall label if speech recognition was uncertain
        if req.audio_confidence < 0.65:
            result["confidence"]["overall_label"] += " (Low audio clarity)"
            
    return result


@router.post("/speech/transcribe")
async def transcribe_speech(audio: UploadFile = File(...)):
    contents = await audio.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

    result = speech_engine.transcribe_audio(contents, audio.filename or "recording.wav")
    return result


@router.post("/translate/image")
async def translate_image(file: UploadFile = File(...), strategy: str = "rag_grounded"):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    ocr_res = ocr_engine.extract_text_from_image(contents, file.filename or "uploaded.png")
    if not ocr_res["success"]:
        raise HTTPException(status_code=422, detail=ocr_res["error"])

    extracted_text = ocr_res["extracted_text"]
    alpha_words = re.findall(r'[a-zA-Z]{2,}', extracted_text)

    # If OCR extracted nothing or returned a low-confidence non-lexical artifact (like '11')
    if not extracted_text or ocr_res.get("is_artifact", False) or len(alpha_words) == 0:
        logger.info(f"[Image-to-Sign] Artifact or empty text ('{extracted_text}'), translation suppressed")
        return {
            "ocr_result": ocr_res,
            "translation": None,
            "message": (
                f"The image yielded a graphic or border artifact ('{extracted_text}') with no legible English words. "
                "Please enter the intended text in the editor to generate ASL signs."
                if extracted_text else "No readable English text could be recognized from the image."
            )
        }

    # Pass verified extracted text to shared translation engine
    translation_res = translation_engine.process(extracted_text, strategy=strategy)
    translation_res["confidence"]["ocr_quality"] = ocr_res["confidence"]

    # When OCR confidence is low, flag for user verification
    if ocr_res.get("is_low_confidence", False) or ocr_res["confidence"] < 0.50:
        translation_res["confidence"]["overall_label"] = "Low OCR Confidence (Manual verification recommended)"
        translation_res["confidence"]["clarification_needed"] = True
        translation_res["confidence"]["clarification_prompt"] = (
            f"The OCR engine extracted '{extracted_text}' with low confidence. "
            "This may be an image border or graphic artifact. Please verify and edit the text before confirming ASL signs."
        )

    logger.info(f"[Image-to-Sign] Extracted: '{extracted_text}' ({ocr_res.get('engine')}, conf: {ocr_res.get('confidence')}) -> ASL Gloss: '{translation_res.get('asl_gloss')}'")

    return {
        "ocr_result": ocr_res,
        "translation": translation_res
    }


@router.post("/retrieve", response_model=RetrievalResponse)
def retrieve_knowledge(req: RetrievalRequest):
    results = rag_retriever.retrieve(req.query, top_k=req.top_k, min_score=req.min_score)
    typed_results = [RetrievedEntry(**r) for r in results]
    return RetrievalResponse(
        query=req.query,
        results=typed_results,
        total_found=len(typed_results)
    )


@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate_strategies(req: EvaluationRequest):
    eval_results = benchmark_runner.run_benchmark(strategies=req.strategies)
    if "error" in eval_results:
        raise HTTPException(status_code=500, detail=eval_results["error"])
    return eval_results
