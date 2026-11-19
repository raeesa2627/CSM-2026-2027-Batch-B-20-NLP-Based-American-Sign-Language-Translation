import pytest
from app.nlp.grammar_transformer import grammar_transformer
from app.vocabulary.repository import vocab_repo
from app.retrieval.vector_rag import rag_retriever
from app.translation.engine import translation_engine
from app.evaluation.benchmark_runner import benchmark_runner


def test_grammar_transformer_wh_movement():
    text = "Where is the hospital?"
    gloss, tokens, keywords = grammar_transformer.transform_to_asl_gloss(text)
    assert "HOSPITAL" in gloss
    assert "WHERE" in gloss
    assert "{q}" in gloss
    assert "IS" not in tokens  # Copula deleted
    assert "THE" not in tokens  # Article deleted


def test_grammar_transformer_time_fronting():
    text = "I will go tomorrow"
    gloss, tokens, keywords = grammar_transformer.transform_to_asl_gloss(text)
    assert gloss.startswith("TOMORROW")
    assert "GO" in gloss


def test_grammar_transformer_negation():
    text = "I do not understand"
    gloss, tokens, keywords = grammar_transformer.transform_to_asl_gloss(text)
    assert "UNDERSTAND" in gloss
    assert "NOT" in gloss
    assert "{neg}" in gloss


def test_vocabulary_repository_lookup():
    hello_entry = vocab_repo.lookup_term("hello")
    assert hello_entry is not None
    assert hello_entry["asl_gloss"] == "HELLO"
    assert hello_entry["review_status"] == "approved"

    # Test synonym
    hi_entry = vocab_repo.lookup_term("hi")
    assert hi_entry is not None
    assert hi_entry["asl_gloss"] == "HELLO"

    # Hey is distinct informal attention getter
    hey_entry = vocab_repo.lookup_term("hey")
    assert hey_entry is not None
    assert hey_entry["asl_gloss"] == "HEY"
    assert hey_entry["media"]["verified"] is False


def test_vector_rag_retrieval():
    results = rag_retriever.retrieve("doctor hospital medicine", top_k=3)
    assert len(results) > 0
    top_ids = [r["id"] for r in results]
    assert any("doctor" in i or "hospital" in i for i in top_ids)


def test_translation_engine_system_c():
    res = translation_engine.process("Hello, what is your name?", strategy="rag_grounded")
    assert res["request_id"].startswith("req-")
    assert "HELLO" in res["asl_gloss"]
    assert "NAME" in res["asl_gloss"]
    assert "WHAT" in res["asl_gloss"]
    assert res["confidence"]["vocabulary_coverage"] > 0.8
    assert len(res["signs"]) > 0
    assert len(res["retrieval_evidence"]) > 0


def test_benchmark_runner():
    res = benchmark_runner.run_benchmark(strategies=["baseline_lexical", "rag_grounded"])
    assert res["dataset_name"] == "core_asl_bench_v1"
    assert res["metric_engine"] == "sacrebleu-v2.6"
    assert "bleu_4" in res["metric_signature"]
    assert len(res["results"]) == 2
    strat_map = {r["strategy"]: r for r in res["results"]}
    assert strat_map["rag_grounded"]["bleu_4"] > strat_map["baseline_lexical"]["bleu_4"]
    assert strat_map["rag_grounded"]["chrf_score"] > strat_map["baseline_lexical"]["chrf_score"]


def test_calculate_bleu_sacrebleu_empty_and_valid():
    from app.evaluation.benchmark_runner import calculate_bleu
    # Empty inputs
    assert calculate_bleu("", "HELLO WORLD") == {"bleu_1": 0.0, "bleu_2": 0.0, "bleu_4": 0.0}
    assert calculate_bleu("HELLO WORLD", "") == {"bleu_1": 0.0, "bleu_2": 0.0, "bleu_4": 0.0}
    assert calculate_bleu("", "") == {"bleu_1": 0.0, "bleu_2": 0.0, "bleu_4": 0.0}
    assert calculate_bleu("   ", "   ") == {"bleu_1": 0.0, "bleu_2": 0.0, "bleu_4": 0.0}

    # Identical input
    res = calculate_bleu("HELLO NAME WHAT", "HELLO NAME WHAT")
    assert res["bleu_1"] == 100.0
    assert res["bleu_4"] == 100.0


def test_calculate_chrf_sacrebleu_empty_and_valid():
    from app.evaluation.benchmark_runner import calculate_chrf
    # Empty inputs
    assert calculate_chrf("", "HELLO WORLD") == 0.0
    assert calculate_chrf("HELLO WORLD", "") == 0.0
    assert calculate_chrf("", "") == 0.0

    # Identical input
    score = calculate_chrf("HELLO NAME WHAT", "HELLO NAME WHAT")
    assert score == 100.0


def test_corpus_level_aggregation_and_three_strategy_consistency():
    import sacrebleu
    res = benchmark_runner.run_benchmark(strategies=["baseline_lexical", "rule_nlp", "rag_grounded"])
    assert res["metric_engine"] == "sacrebleu-v2.6"
    assert len(res["results"]) == 3

    strat_map = {r["strategy"]: r for r in res["results"]}
    for strat, data in strat_map.items():
        assert data["total_samples"] == 15
        assert 0.0 <= data["bleu_4"] <= 100.0
        assert 0.0 <= data["chrf_score"] <= 100.0
        # Consistent coverage + unsupported definition
        assert round(data["vocabulary_coverage_rate"] + data["unsupported_output_rate"], 2) == 1.0

    # Rule-aware systems outperform direct word-by-word substitution on standard corpus metrics
    assert strat_map["rag_grounded"]["bleu_4"] > strat_map["baseline_lexical"]["bleu_4"]
    assert strat_map["rag_grounded"]["chrf_score"] > strat_map["baseline_lexical"]["chrf_score"]
    assert strat_map["rule_nlp"]["bleu_4"] > strat_map["baseline_lexical"]["bleu_4"]

    # Verify summary analysis does not claim unverified statistical significance
    summary = res["summary_analysis"]
    assert "statistically significant" not in summary.lower()
    assert "p <" not in summary.lower()
    assert "SacreBLEU" in summary


def test_buddy_synonym_mapping_to_friend():
    # Verify BUDDY maps to canonical ASL sign FRIEND via documented synonym mapping
    sign_media = vocab_repo.resolve_sign_media("BUDDY", term="buddy", source_token="BUDDY")
    assert sign_media.gloss == "FRIEND"
    assert sign_media.source_token == "BUDDY"
    assert sign_media.is_fingerspelled is False
    assert sign_media.verified is True
    assert sign_media.media_url == "/media/asl/friend.mp4"
    assert sign_media.definition is not None
    assert "index fingers hook together" in sign_media.definition.lower()


def test_hey_buddy_translation_flow_distinguishes_input_from_canonical():
    # Verify input text remains distinct from canonical sign concepts
    res = translation_engine.process("HEY, BUDDY", strategy="rag_grounded")
    assert res["original_text"] == "HEY, BUDDY"
    assert res["asl_gloss"] == "HEY BUDDY"
    assert len(res["signs"]) == 2
    
    # Sign 1: HEY (informal greeting) - Pending authentic video verification (NOT falsely mapped to HELLO salute)
    assert res["signs"][0]["gloss"] == "HEY"
    assert res["signs"][0]["source_token"] == "HEY"
    assert res["signs"][0]["verified"] is False
    assert res["signs"][0]["media_url"] is None
    assert res["signs"][0]["gloss"] != "HELLO"

    # Sign 2: FRIEND (from BUDDY) - Mapped synonym with verified video
    assert res["signs"][1]["gloss"] == "FRIEND"
    assert res["signs"][1]["source_token"] == "BUDDY"
    assert res["signs"][1]["verified"] is True
    assert res["signs"][1]["media_url"] == "/media/asl/friend.mp4"
    assert res["confidence"]["vocabulary_coverage"] == 1.0  # Both concepts are recognized ASL catalog entries


def test_hey_what_are_you_doing_no_unrelated_hello_mapping():
    """
    Test 'Hey what are you doing':
    - ASL gloss includes HEY, YOU, DO/DOING, WHAT, {q}
    - Active signs must NEVER map to unrelated HELLO or hello.webm
    - Active gloss and active media must strictly match the sign concept
    - Unverified signs preserve honest uncertainty
    """
    res = translation_engine.process("Hey what are you doing", strategy="rag_grounded")
    assert res["original_text"] == "Hey what are you doing"
    assert "HEY" in res["asl_gloss"]
    assert "YOU" in res["asl_gloss"]
    assert "DOING" in res["asl_gloss"] or "DO" in res["asl_gloss"]
    assert "WHAT" in res["asl_gloss"]
    assert "{q}" in res["asl_gloss"]

    signs = res["signs"]
    assert len(signs) == 4

    # Sign 0: HEY (NOT HELLO, NO hello.webm)
    assert signs[0]["gloss"] == "HEY"
    assert signs[0]["source_token"] == "HEY"
    assert signs[0]["verified"] is False
    assert signs[0]["media_url"] is None

    # Crucial assertion: None of the signs must be labeled HELLO or load hello.webm
    for s in signs:
        assert s["gloss"] != "HELLO", f"Sign '{s['gloss']}' unexpectedly mapped to HELLO"
        assert s["media_url"] != "/media/asl/hello.webm", f"Sign '{s['gloss']}' incorrectly reused hello.webm"

    # Verify signs 1, 2, 3
    assert signs[1]["gloss"] == "YOU"
    assert signs[2]["gloss"] in ("DO", "DOING")
    assert signs[3]["gloss"] == "WHAT"

    # All 4 concepts are recognized catalog entries
    assert res["confidence"]["vocabulary_coverage"] == 1.0


def test_missing_and_unverified_media_honest_fallback():
    """Verify that unavailable or unverified media never invents verification or borrows unrelated videos."""
    # Rare word fingerspelling
    res_fs = translation_engine.process("quarantine", strategy="rag_grounded")
    assert res_fs["signs"][0]["gloss"] == "FS:QUARANTINE"
    assert res_fs["signs"][0]["verified"] is False
    assert res_fs["signs"][0]["media_url"] is None
    assert res_fs["signs"][0]["is_fingerspelled"] is True

    # Catalog sign without verified video (BYE)
    res_bye = translation_engine.process("BYE", strategy="rag_grounded")
    assert res_bye["signs"][0]["gloss"] == "BYE"
    assert res_bye["signs"][0]["verified"] is False
    assert res_bye["signs"][0]["media_url"] is None

    # Verified signs (HELLO, BOOK) remain genuinely verified
    res_hello = translation_engine.process("HELLO", strategy="rag_grounded")
    assert res_hello["signs"][0]["gloss"] == "HELLO"
    assert res_hello["signs"][0]["verified"] is True
    assert res_hello["signs"][0]["media_url"] == "/media/asl/hello.webm"

    res_book = translation_engine.process("BOOK", strategy="rag_grounded")
    assert res_book["signs"][0]["gloss"] == "BOOK"
    assert res_book["signs"][0]["verified"] is True
    assert res_book["signs"][0]["media_url"] == "/media/asl/book.webm"


def test_verified_media_lookup_hello_and_book():
    """Verify authentic locally-served media for HELLO and BOOK."""
    hello_media = vocab_repo.resolve_sign_media("HELLO", term="hello")
    assert hello_media.gloss == "HELLO"
    assert hello_media.verified is True
    assert hello_media.media_url == "/media/asl/hello.webm"
    assert "Wikimedia Commons" in (hello_media.source or "")
    assert hello_media.license == "CC BY-SA 3.0"

    book_media = vocab_repo.resolve_sign_media("BOOK", term="book")
    assert book_media.gloss == "BOOK"
    assert book_media.verified is True
    assert book_media.media_url == "/media/asl/book.webm"
    assert "Richard Goodrow" in (book_media.source or "")
    assert book_media.license == "CC BY 3.0"


def test_common_phrases_translation_pipeline():
    """Verify translation of standard communicative phrases."""
    phrases = [
        ("Hello, what is your name?", ["HELLO", "YOUR", "NAME", "WHAT", "{q}"]),
        ("Where is the nearest hospital?", ["HOSPITAL", "NEAR", "WHERE", "{q}"]),
        ("I will see the doctor tomorrow.", ["TOMORROW", "I", "SEE", "DOCTOR"]),
        ("Please help me, I do not understand.", ["PLEASE", "HELP", "ME", "I", "UNDERSTAND", "NOT", "{neg}"]),
        ("Can you please write it down?", ["PLEASE", "CAN", "YOU", "WRITE", "IT", "DOWN", "{yn_q}"]),
    ]
    for text, expected_tokens in phrases:
        res = translation_engine.process(text, strategy="rag_grounded")
        assert res["original_text"] == text
        for token in expected_tokens:
            assert token in res["asl_gloss"], f"Expected '{token}' in gloss for '{text}'"
        # Signs array must not include grammatical tags like {q} or {neg}
        sign_glosses = [s["gloss"] for s in res["signs"]]
        assert "{q}" not in sign_glosses
        assert "{neg}" not in sign_glosses
        assert "{yn_q}" not in sign_glosses


def test_punctuation_and_contraction_handling():
    """Verify punctuation cleanup, contraction expansion, and multiple sentences."""
    # Contractions: what's -> what is -> WHAT {q}
    res_cont = translation_engine.process("What's your name???", strategy="rag_grounded")
    assert "WHAT {q}" in res_cont["asl_gloss"]
    assert "YOUR" in res_cont["asl_gloss"]
    assert "NAME" in res_cont["asl_gloss"]

    # Multiple punctuation marks: clean tokens
    res_punct = translation_engine.process("Hello!! Where is the hospital?!", strategy="rag_grounded")
    assert "HELLO" in res_punct["asl_gloss"]
    assert "WHERE {q}" in res_punct["asl_gloss"]
    for s in res_punct["signs"]:
        assert not any(p in s["gloss"] for p in ["!", "?", ",", "."])


def test_synonyms_resolve_to_canonical_gloss_with_source_token():
    """Verify synonyms map to catalog entries while preserving original source tokens."""
    # Buddy -> FRIEND
    res1 = translation_engine.process("buddy", strategy="rag_grounded")
    assert res1["signs"][0]["gloss"] == "FRIEND"
    assert res1["signs"][0]["source_token"] == "BUDDY"

    # Reading / Volume -> BOOK
    res2 = translation_engine.process("novel", strategy="rag_grounded")
    assert res2["signs"][0]["gloss"] == "BOOK"
    assert res2["signs"][0]["source_token"] == "NOVEL"

    # Automobile -> CAR
    res3 = translation_engine.process("automobile", strategy="rag_grounded")
    assert res3["signs"][0]["gloss"] == "CAR"
    assert res3["signs"][0]["source_token"] == "AUTOMOBILE"


def test_unsupported_vocabulary_fingerspelling_without_hallucination():
    """Verify unsupported words are never invented; they must be finger-spelled and unverified."""
    rare_word = "Xylophone"
    res = translation_engine.process(rare_word, strategy="rag_grounded")
    assert len(res["signs"]) == 1
    sign = res["signs"][0]
    assert sign["gloss"] == "FS:XYLOPHONE"
    assert sign["is_fingerspelled"] is True
    assert sign["verified"] is False
    assert "XYLOPHONE" in res["missing_vocabulary"]
    assert "XYLOPHONE" in res["fingerspelled_tokens"]
    assert res["confidence"]["vocabulary_coverage"] == 0.0


def test_hello_single_sign_verified_video():
    """Test HELLO: single verified authentic video."""
    res = translation_engine.process("HELLO", strategy="rag_grounded")
    assert res["asl_gloss"] == "HELLO"
    assert len(res["signs"]) == 1
    assert res["signs"][0]["gloss"] == "HELLO"
    assert res["signs"][0]["verified"] is True
    assert res["signs"][0]["media_url"] == "/media/asl/hello.webm"
    assert res["confidence"]["vocabulary_coverage"] == 1.0


def test_book_single_sign_verified_video():
    """Test BOOK: single verified authentic video."""
    res = translation_engine.process("BOOK", strategy="rag_grounded")
    assert res["asl_gloss"] == "BOOK"
    assert len(res["signs"]) == 1
    assert res["signs"][0]["gloss"] == "BOOK"
    assert res["signs"][0]["verified"] is True
    assert res["signs"][0]["media_url"] == "/media/asl/book.webm"
    assert res["confidence"]["vocabulary_coverage"] == 1.0


def test_bye_single_sign_concept_pending_video():
    """Test BYE: recognized concept in catalog, pending authentic video verification."""
    res = translation_engine.process("BYE", strategy="rag_grounded")
    assert res["asl_gloss"] == "BYE"
    assert len(res["signs"]) == 1
    assert res["signs"][0]["gloss"] == "BYE"
    assert res["signs"][0]["verified"] is False
    assert res["signs"][0]["is_fingerspelled"] is False
    assert res["signs"][0]["category"] == "greetings"
    assert res["confidence"]["vocabulary_coverage"] == 1.0


def test_i_need_food_multi_word_translation():
    """Test 'I NEED FOOD': multi-word sentence with recognized ASL catalog concepts."""
    res = translation_engine.process("I NEED FOOD", strategy="rag_grounded")
    assert res["asl_gloss"] == "I NEED FOOD"
    assert len(res["signs"]) == 3
    glosses = [s["gloss"] for s in res["signs"]]
    assert glosses == ["I", "NEED", "FOOD"]
    assert res["confidence"]["vocabulary_coverage"] == 1.0
    # Verified flag accurately reflects current video availability (honest reporting)
    for s in res["signs"]:
        assert s["is_fingerspelled"] is False


def test_i_want_to_buy_a_book_sentence_translation_and_fallback():
    """Test 'I WANT TO BUY A BOOK': grammatical transformation with mixed media availability."""
    res = translation_engine.process("I WANT TO BUY A BOOK", strategy="rag_grounded")
    # ASL grammar drops infinitive particle 'to' and article 'a'
    assert res["asl_gloss"] == "I WANT BUY BOOK"
    assert len(res["signs"]) == 4
    glosses = [s["gloss"] for s in res["signs"]]
    assert glosses == ["I", "WANT", "BUY", "BOOK"]

    # BOOK has verified authentic video
    book_sign = next(s for s in res["signs"] if s["gloss"] == "BOOK")
    assert book_sign["verified"] is True
    assert book_sign["media_url"] == "/media/asl/book.webm"

    # I, WANT, BUY have validated linguistic concept metadata
    want_sign = next(s for s in res["signs"] if s["gloss"] == "WANT")
    assert want_sign["category"] == "descriptors"
    buy_sign = next(s for s in res["signs"] if s["gloss"] == "BUY")
    assert buy_sign["category"] == "actions"

    assert res["confidence"]["vocabulary_coverage"] == 1.0


def test_mixed_known_and_unknown_vocabulary_does_not_crash():
    """Test mixed sentences with out-of-catalog words; fingerspells without rejecting sentence."""
    res = translation_engine.process("I need quantum food", strategy="rag_grounded")
    assert res["asl_gloss"] == "I NEED QUANTUM FOOD"
    assert len(res["signs"]) == 4
    quantum_sign = next(s for s in res["signs"] if s["gloss"] == "FS:QUANTUM")
    assert quantum_sign["is_fingerspelled"] is True
    assert quantum_sign["verified"] is False
    assert "QUANTUM" in res["missing_vocabulary"]
    assert res["confidence"]["vocabulary_coverage"] == 0.75


def test_sentence_with_several_available_sign_videos():
    """Focused test: A sentence where every semantic sign has a verified, playable video."""
    res = translation_engine.process("Where is your school?", strategy="rag_grounded")
    assert res["asl_gloss"] == "YOUR SCHOOL WHERE {q}"
    assert len(res["signs"]) == 3
    
    expected_glosses = ["YOUR", "SCHOOL", "WHERE"]
    for i, gloss in enumerate(expected_glosses):
        sign = res["signs"][i]
        assert sign["gloss"] == gloss
        assert sign["verified"] is True
        assert sign["is_fingerspelled"] is False
        assert sign["media_url"] is not None
        assert sign["media_url"].startswith("/media/asl/")
        assert sign["media_url"].endswith(".mp4")
    
    assert res["confidence"]["vocabulary_coverage"] == 1.0


def test_sentence_with_both_available_and_unavailable_signs():
    """Focused test: A sentence with a mix of verified playable videos, unverified concepts, and fingerspelling."""
    # Sentence 1: Verified videos + unverified catalog concept (INTERPRETER)
    res1 = translation_engine.process("Where is your interpreter?", strategy="rag_grounded")
    assert res1["asl_gloss"] == "YOUR INTERPRETER WHERE {q}"
    signs1 = res1["signs"]
    assert len(signs1) == 3
    
    # YOUR and WHERE have verified local playable video
    assert signs1[0]["gloss"] == "YOUR"
    assert signs1[0]["verified"] is True
    assert signs1[0]["media_url"] == "/media/asl/your.mp4"
    
    # INTERPRETER is a catalog concept pending authentic video
    assert signs1[1]["gloss"] == "INTERPRETER"
    assert signs1[1]["verified"] is False
    assert signs1[1]["media_url"] is None
    assert signs1[1]["is_fingerspelled"] is False
    
    assert signs1[2]["gloss"] == "WHERE"
    assert signs1[2]["verified"] is True
    assert signs1[2]["media_url"] == "/media/asl/where.mp4"

    # Sentence 2: Verified video + out-of-catalog fingerspelled fallback
    res2 = translation_engine.process("Please stop the algorithm", strategy="rag_grounded")
    assert res2["asl_gloss"] == "PLEASE STOP ALGORITHM"
    signs2 = res2["signs"]
    assert len(signs2) == 3
    
    assert signs2[0]["gloss"] == "PLEASE"
    assert signs2[0]["verified"] is True
    assert signs2[0]["media_url"] == "/media/asl/please.mp4"
    
    assert signs2[1]["gloss"] == "STOP"
    assert signs2[1]["verified"] is True
    assert signs2[1]["media_url"] == "/media/asl/stop.mp4"
    
    assert signs2[2]["gloss"] == "FS:ALGORITHM"
    assert signs2[2]["verified"] is False
    assert signs2[2]["is_fingerspelled"] is True
    assert signs2[2]["media_url"] is None


def test_correct_gloss_to_video_association_and_no_borrowing():
    """Focused test: Ensure each playable clip genuinely corresponds to its sign and no videos are borrowed."""
    verified_pairs = [
        ("HELLO", "/media/asl/hello.webm"),
        ("BOOK", "/media/asl/book.webm"),
        ("YOUR", "/media/asl/your.mp4"),
        ("PLEASE", "/media/asl/please.mp4"),
        ("THANK-YOU", "/media/asl/thankyou.mp4"),
        ("HELP", "/media/asl/help.mp4"),
        ("FRIEND", "/media/asl/friend.mp4"),
        ("SCHOOL", "/media/asl/school.mp4"),
        ("WATER", "/media/asl/water.mp4"),
        ("FOOD", "/media/asl/food.mp4"),
    ]
    for gloss, expected_url in verified_pairs:
        media = vocab_repo.resolve_sign_media(gloss, term=gloss.lower())
        assert media.gloss == gloss
        assert media.verified is True
        assert media.media_url == expected_url
        assert media.source is not None
        assert media.license is not None
    
    # HEY must never borrow hello.webm
    hey_media = vocab_repo.resolve_sign_media("HEY", term="hey")
    assert hey_media.gloss == "HEY"
    assert hey_media.media_url != "/media/asl/hello.webm"
    assert hey_media.verified is False


def test_missing_and_failed_media_integrity():
    """Focused test: Verify missing or failed media produces honest null URLs and no 403 hotlinks."""
    unverified_catalog_glosses = ["PAIN", "MONEY", "NEAR", "FAR", "INTERPRETER", "BYE", "HEY", "DO"]
    for gloss in unverified_catalog_glosses:
        media = vocab_repo.resolve_sign_media(gloss, term=gloss.lower())
        assert media.gloss == gloss
        assert media.verified is False
        assert media.media_url is None, f"Gloss '{gloss}' should have media_url=None, got '{media.media_url}'"
        assert media.is_fingerspelled is False
    
    # Out of vocabulary word
    oov_media = vocab_repo.resolve_sign_media("CYBERNETICS", term="cybernetics")
    assert oov_media.gloss == "FS:CYBERNETICS"
    assert oov_media.verified is False
    assert oov_media.media_url is None
    assert oov_media.is_fingerspelled is True


def test_sequence_advancement_and_grammatical_token_exclusion():
    """Focused test: Verify grammatical markers ({q}, {neg}, {yn_q}) are excluded from signs array."""
    res_q = translation_engine.process("Where do you work?", strategy="rag_grounded")
    assert "{q}" in res_q["asl_gloss"]
    sign_glosses_q = [s["gloss"] for s in res_q["signs"]]
    assert "{q}" not in sign_glosses_q
    assert "{neg}" not in sign_glosses_q
    assert "{yn_q}" not in sign_glosses_q
    
    # Check that sequence signs correspond 1-to-1 with content tokens (no indexing offset)
    assert len(res_q["signs"]) == 3
    assert sign_glosses_q == ["YOU", "WORK", "WHERE"]
    
    # Both YOU and WORK and WHERE have verified playable videos
    for s in res_q["signs"]:
        assert s["verified"] is True
        assert s["media_url"] is not None


def test_existing_hello_book_bye_cases_regression():
    """Focused test: Explicit regression test for existing HELLO, BOOK, and BYE cases."""
    # HELLO
    hello_res = translation_engine.process("HELLO", strategy="rag_grounded")
    assert hello_res["signs"][0]["gloss"] == "HELLO"
    assert hello_res["signs"][0]["verified"] is True
    assert hello_res["signs"][0]["media_url"] == "/media/asl/hello.webm"
    assert hello_res["signs"][0]["license"] == "CC BY-SA 3.0"

    # BOOK
    book_res = translation_engine.process("BOOK", strategy="rag_grounded")
    assert book_res["signs"][0]["gloss"] == "BOOK"
    assert book_res["signs"][0]["verified"] is True
    assert book_res["signs"][0]["media_url"] == "/media/asl/book.webm"
    assert book_res["signs"][0]["license"] == "CC BY 3.0"

    # BYE
    bye_res = translation_engine.process("BYE", strategy="rag_grounded")
    assert bye_res["signs"][0]["gloss"] == "BYE"
    assert bye_res["signs"][0]["verified"] is False
    assert bye_res["signs"][0]["media_url"] is None
    assert bye_res["signs"][0]["is_fingerspelled"] is False


def test_regression_i_do_not_understand_negation_maps_to_no_media():
    """Verify that 'I do not understand' maps negation to verified NO sign media, preserves I as honest concept card, avoiding FS:NOT fingerspelling."""
    res = translation_engine.process("I do not understand", strategy="rag_grounded")
    assert res["asl_gloss"] == "I UNDERSTAND NOT {neg}"
    assert "FS:NOT" not in [s["gloss"] for s in res["signs"]]
    assert "NOT" not in res["missing_vocabulary"]
    assert "NOT" not in res["fingerspelled_tokens"]

    # Locate I sign - honest linguistic fallback concept card (no authentic personal pronoun video in dataset)
    i_sign = next((s for s in res["signs"] if s["gloss"] == "I"), None)
    assert i_sign is not None, "Concept card for 'I' must exist"
    assert i_sign["media_url"] is None, "Must not point to unrelated video or falsely verified asset"
    assert i_sign["verified"] is False, "Must honestly declare pending verification"
    assert i_sign["is_fingerspelled"] is False, "Must be an explicit concept card, not fingerspelled"

    # Locate UNDERSTAND sign - verified local video
    understand_sign = next((s for s in res["signs"] if s["gloss"] == "UNDERSTAND"), None)
    assert understand_sign is not None
    assert understand_sign["verified"] is True
    assert understand_sign["media_url"] == "/media/asl/understand.mp4"
    assert understand_sign["is_fingerspelled"] is False

    # Locate negation sign in the resolved signs sequence - mapped to verified NO sign
    no_sign = next((s for s in res["signs"] if s["source_token"] == "NOT" or s["gloss"] in ["NO", "NOT"]), None)
    assert no_sign is not None, "Negation sign must be resolved in signs sequence"
    assert no_sign["gloss"] == "NO", "Negation concept must map to canonical ASL gloss NO"
    assert no_sign["media_url"] == "/media/asl/no.mp4", "Must reference verified local no.mp4 media asset"
    assert no_sign["verified"] is True, "Must be verified citation sign"
    assert no_sign["is_fingerspelled"] is False, "Must not degrade to fingerspelling"
    assert no_sign["non_manual_signal"] == "headshake"


def test_regression_additional_negative_sentence_i_do_not_have_a_car():
    """Verify second negative sentence: 'I do not have a car' resolves negation to verified NO media without fingerspelling."""
    res = translation_engine.process("I do not have a car", strategy="rag_grounded")
    assert res["asl_gloss"] == "I HAVE CAR NOT {neg}"
    assert "FS:NOT" not in [s["gloss"] for s in res["signs"]]
    assert "NOT" not in res["missing_vocabulary"]

    # Verify HAVE, CAR, and NO are all verified with correct media URLs
    have_sign = next((s for s in res["signs"] if s["gloss"] == "HAVE"), None)
    car_sign = next((s for s in res["signs"] if s["gloss"] == "CAR"), None)
    no_sign = next((s for s in res["signs"] if s["source_token"] == "NOT" or s["gloss"] == "NO"), None)

    assert have_sign is not None and have_sign["verified"] is True and have_sign["media_url"] == "/media/asl/have.mp4"
    assert car_sign is not None and car_sign["verified"] is True and car_sign["media_url"] == "/media/asl/car.mp4"
    assert no_sign is not None and no_sign["verified"] is True and no_sign["media_url"] == "/media/asl/no.mp4"
    assert no_sign["is_fingerspelled"] is False


def test_regression_where_is_nearest_hospital_resolves_to_near():
    """Verify that 'Where is the nearest hospital?' resolves superlative NEAREST to the approved NEAR concept and topic-comment order."""
    res = translation_engine.process("Where is the nearest hospital?", strategy="rag_grounded")
    assert res["asl_gloss"] == "HOSPITAL NEAR WHERE {q}", "Topic noun must precede descriptor and question marker"
    assert "FS:NEAREST" not in [s["gloss"] for s in res["signs"]]
    assert "NEAREST" not in res["missing_vocabulary"]

    # Verify NEAREST resolves to the approved NEAR concept card rather than fingerspelled FS:NEAREST
    near_sign = next((s for s in res["signs"] if s["source_token"] == "NEAREST" or s["gloss"] == "NEAR"), None)
    assert near_sign is not None, "NEAREST must resolve in signs sequence"
    assert near_sign["gloss"] == "NEAR", "NEAREST must normalize to root lemma NEAR"
    assert near_sign["source_token"] == "NEAREST", "Must preserve original English source token"
    assert near_sign["is_fingerspelled"] is False, "Must not be fingerspelled"
    assert near_sign["category"] == "descriptors"
    assert near_sign["media_url"] is None, "Honest fallback: no verified local video asset for NEAR"
    assert near_sign["verified"] is False, "Must honestly declare pending verification"

    # Both HOSPITAL and WHERE must play verified video
    hospital_sign = next((s for s in res["signs"] if s["gloss"] == "HOSPITAL"), None)
    where_sign = next((s for s in res["signs"] if s["gloss"] == "WHERE"), None)
    assert hospital_sign is not None and hospital_sign["verified"] is True and hospital_sign["media_url"] == "/media/asl/hospital.mp4"
    assert where_sign is not None and where_sign["verified"] is True and where_sign["media_url"] == "/media/asl/where.mp4"


def test_regression_i_will_see_doctor_tomorrow_eliminates_auxiliary_will():
    """Verify that 'I will see the doctor tomorrow' eliminates redundant auxiliary 'will' and does not fingerspell FS:WILL."""
    res = translation_engine.process("I will see the doctor tomorrow.", strategy="rag_grounded")
    
    # Gloss must start with temporal frame TOMORROW and must not contain WILL
    assert res["asl_gloss"].startswith("TOMORROW"), "Time marker must be fronted"
    assert "WILL" not in res["asl_gloss"], "Auxiliary 'will' must be eliminated when temporal frame is established"
    assert "SEE" in res["asl_gloss"]
    assert "DOCTOR" in res["asl_gloss"]

    # Signs must not contain fingerspelled FS:WILL
    sign_glosses = [s["gloss"] for s in res["signs"]]
    assert "FS:WILL" not in sign_glosses, "Must not introduce fingerspelled auxiliary FS:WILL"
    assert "WILL" not in sign_glosses

    # TOMORROW, SEE, and DOCTOR must all have verified video media
    tomorrow_sign = next((s for s in res["signs"] if s["gloss"] == "TOMORROW"), None)
    see_sign = next((s for s in res["signs"] if s["gloss"] == "SEE"), None)
    doctor_sign = next((s for s in res["signs"] if s["gloss"] == "DOCTOR"), None)

    assert tomorrow_sign is not None and tomorrow_sign["verified"] is True and tomorrow_sign["media_url"] == "/media/asl/tomorrow.mp4"
    assert see_sign is not None and see_sign["verified"] is True and see_sign["media_url"] == "/media/asl/see.mp4"
    assert doctor_sign is not None and doctor_sign["verified"] is True and doctor_sign["media_url"] == "/media/asl/doctor.mp4"


def test_approved_verified_example_phrases_play_100_percent_verified_videos():
    """Verify that all public UI approved example phrases resolve 100% of their signs to verified, playable local videos."""
    approved_phrases = [
        "Hello, what is your name?",
        "Where is the hospital?",
        "Where is the bathroom?",
        "Do you need help?",
        "Do you want water?",
        "Where do you work?",
        "Do you have a car?"
    ]
    for phrase in approved_phrases:
        res = translation_engine.process(phrase, strategy="rag_grounded")
        assert len(res["signs"]) > 0, f"Phrase '{phrase}' must produce signs"
        assert res["missing_vocabulary"] == [], f"Phrase '{phrase}' must have no missing vocabulary"
        assert res["fingerspelled_tokens"] == [], f"Phrase '{phrase}' must have no fingerspelled tokens"
        for sign in res["signs"]:
            assert sign["verified"] is True, f"Sign '{sign['gloss']}' in phrase '{phrase}' must be verified"
            assert sign["media_url"] is not None, f"Sign '{sign['gloss']}' in phrase '{phrase}' must have media_url"
            assert sign["media_url"].startswith("/media/asl/"), f"Sign '{sign['gloss']}' must reference local media"
            assert sign["is_fingerspelled"] is False, f"Sign '{sign['gloss']}' must not be fingerspelled"






