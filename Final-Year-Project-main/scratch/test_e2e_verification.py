import urllib.request
import json

def test_frontend():
    print("--- 1. Testing Frontend Dev Server ---")
    req = urllib.request.Request("http://localhost:5173/text-to-sign")
    with urllib.request.urlopen(req) as resp:
        print(f"Frontend Status: {resp.status}")
        content = resp.read().decode('utf-8')
        assert "html" in content.lower()
        print("Frontend served index HTML successfully!")

def test_backend_and_ai_translation():
    print("\n--- 2. Testing Translation for 'Where is the nearest hospital?' ---")
    data = json.dumps({"text": "Where is the nearest hospital?", "strategy": "rag_grounded"}).encode('utf-8')
    req = urllib.request.Request(
        "http://localhost:5000/api/translate/text",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read().decode('utf-8'))
        res = body.get("data", body)
        signs = res.get("signs", [])
        print("Original Text:", res.get("original_text"))
        print("ASL Gloss:", res.get("asl_gloss"))
        print(f"Signs count: {len(signs)}")
        for s in signs:
            print(f"  - Gloss: {s.get('gloss'):10} | Source Token: {s.get('source_token', ''):10} | Verified: {str(s.get('verified')):5} | Media: {s.get('media_url')}")
            
        near_sign = next((s for s in signs if s.get('gloss') == 'NEAR'), None)
        assert near_sign is not None, "NEAR sign must be in results"
        assert near_sign.get('media_url') is None, "NEAR must have no video media_url to trigger fallback card"
        assert near_sign.get('verified') is False, "NEAR must not be marked verified video"
        print("Verified: NEAR has null media_url and verified=False -> Triggers dark black fallback card!")

        hospital_sign = next((s for s in signs if s.get('gloss') == 'HOSPITAL'), None)
        assert hospital_sign is not None, "HOSPITAL sign must be in results"
        assert hospital_sign.get('media_url') is not None, "HOSPITAL must have verified media_url"
        print(f"Verified: HOSPITAL has playable media {hospital_sign.get('media_url')}")

def test_all_30_sentences_e2e():
    print("\n--- 3. Testing All 30 Sentences via Backend API ---")
    sentences = [
        "HELLO, WHAT YOUR NAME?",
        "MY NAME.",
        "HOW YOU TODAY?",
        "HAPPY TODAY.",
        "YOU MY FRIEND.",
        "MY FAMILY GOOD.",
        "LOVE MY FAMILY.",
        "LIKE BOOK.",
        "WANT BUY BOOK.",
        "WHERE BATHROOM?",
        "NEED WATER NOW.",
        "PLEASE HELP.",
        "WANT FOOD.",
        "FOOD GOOD.",
        "HAVE CAR.",
        "COME MY HOUSE.",
        "WANT GO.",
        "GO SCHOOL TODAY.",
        "MY STUDENT.",
        "MY TEACHER GOOD.",
        "WANT LEARN.",
        "NEED HELP.",
        "WHERE HOSPITAL?",
        "NEED DOCTOR.",
        "SORRY.",
        "PLEASE STOP NOW.",
        "UNDERSTAND YOU.",
        "NO UNDERSTAND.",
        "THANK YOU HELP.",
        "SEE YOU TOMORROW."
    ]

    all_passed = True
    for i, s in enumerate(sentences, 1):
        data = json.dumps({"text": s, "strategy": "rag_grounded"}).encode('utf-8')
        req = urllib.request.Request(
            "http://localhost:5000/api/translate/text",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req) as resp:
                body = json.loads(resp.read().decode('utf-8'))
                res = body.get("data", body)
                signs = res.get("signs", [])
                glosses = [x.get('gloss') for x in signs]
                print(f"[{i:2d}/30] '{s}' -> Gloss: {' '.join(glosses)} ({len(signs)} signs)")
        except Exception as e:
            print(f"[{i:2d}/30] ERROR on '{s}': {e}")
            all_passed = False

    assert all_passed, "All 30 sentences must translate successfully via backend API!"
    print("\nALL 30 SENTENCES TESTED SUCCESSFULLY END-TO-END!")

if __name__ == "__main__":
    test_frontend()
    test_backend_and_ai_translation()
    test_all_30_sentences_e2e()
