import json
import os
from typing import Dict, List, Optional, Tuple
from app.schemas.translation import SignMedia


class VocabularyRepository:
    def __init__(self, data_path: Optional[str] = None):
        if not data_path:
            # Default to ../../datasets/asl_vocabulary.json relative to this file
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            data_path = os.path.join(os.path.dirname(base_dir), "datasets", "asl_vocabulary.json")
            if not os.path.exists(data_path):
                # Fallback to local datasets
                data_path = os.path.join(base_dir, "datasets", "asl_vocabulary.json")
        
        self.data_path = data_path
        self.entries_by_id: Dict[str, dict] = {}
        self.term_index: Dict[str, dict] = {}
        self.gloss_index: Dict[str, dict] = {}
        self.load_data()

    def load_data(self):
        if not os.path.exists(self.data_path):
            print(f"Warning: Vocabulary file not found at {self.data_path}")
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.entries_by_id.clear()
        self.term_index.clear()
        self.gloss_index.clear()

        for item in data:
            self.entries_by_id[item["id"]] = item
            
            # Map canonical English term
            norm_term = item["english_term"].strip().lower()
            self.term_index[norm_term] = item
            
            # Map gloss
            norm_gloss = item["asl_gloss"].strip().upper()
            self.gloss_index[norm_gloss] = item
            
            # Map synonyms
            for syn in item.get("synonyms", []):
                norm_syn = syn.strip().lower()
                if norm_syn not in self.term_index:
                    self.term_index[norm_syn] = item
                upper_syn = syn.strip().upper()
                if upper_syn not in self.gloss_index:
                    self.gloss_index[upper_syn] = item

    def get_all(self) -> List[dict]:
        return list(self.entries_by_id.values())

    def lookup_term(self, term: str) -> Optional[dict]:
        norm = term.strip().lower()
        return self.term_index.get(norm)

    def lookup_gloss(self, gloss: str) -> Optional[dict]:
        norm = gloss.strip().upper()
        return self.gloss_index.get(norm)

    def resolve_sign_media(
        self,
        gloss: str,
        term: Optional[str] = None,
        source_token: Optional[str] = None
    ) -> SignMedia:
        """
        Resolves media asset for a given gloss or English term.
        If not in verified catalog, generates a graceful fingerspelled fallback.
        """
        entry = self.lookup_gloss(gloss)
        if not entry and term:
            entry = self.lookup_term(term)
        if not entry and gloss:
            entry = self.lookup_term(gloss.lower())

        if not entry:
            # Linguistic inflection normalization: ASL signs use root lemmas
            check_term = (term or gloss).lower()
            irregulars = {
                "went": "go", "gone": "go", "goes": "go", "going": "go",
                "saw": "see", "seen": "see", "seeing": "see",
                "ate": "food", "eating": "food", "eats": "food",
                "drank": "drink", "drinking": "drink", "drinks": "drink",
                "came": "come", "coming": "come", "comes": "come",
                "bought": "buy", "buying": "buy", "buys": "buy",
                "wrote": "write", "writing": "write", "written": "write",
                "met": "meet", "meeting": "meet",
                "doing": "do", "did": "do", "does": "do",
                "working": "work", "works": "work", "worked": "work",
                "playing": "play", "plays": "play", "played": "play",
                "learning": "learn", "learns": "learn", "learned": "learn",
                "needing": "need", "needs": "need", "needed": "need",
                "wanting": "want", "wants": "want", "wanted": "want",
                "helping": "help", "helps": "help", "helped": "help",
                "has": "have", "had": "have", "having": "have"
            }
            if check_term in irregulars:
                entry = self.lookup_term(irregulars[check_term])
            else:
                lemmas = []
                if check_term.endswith("ing") and len(check_term) > 4:
                    base = check_term[:-3]
                    lemmas.extend([base, base + "e"])
                    if len(base) > 2 and base[-1] == base[-2]:
                        lemmas.append(base[:-1])
                elif check_term.endswith("ed") and len(check_term) > 3:
                    base = check_term[:-2]
                    lemmas.extend([base, base + "e"])
                    if len(base) > 2 and base[-1] == base[-2]:
                        lemmas.append(base[:-1])
                elif check_term.endswith("s") and len(check_term) > 2:
                    lemmas.append(check_term[:-1])
                elif check_term.endswith("est") and len(check_term) > 4:
                    base = check_term[:-3]
                    lemmas.extend([base, base + "e"])
                    if len(base) > 2 and base[-1] == base[-2]:
                        lemmas.append(base[:-1])
                elif check_term.endswith("er") and len(check_term) > 3:
                    base = check_term[:-2]
                    lemmas.extend([base, base + "e"])
                    if len(base) > 2 and base[-1] == base[-2]:
                        lemmas.append(base[:-1])

                for lem in lemmas:
                    entry = self.lookup_term(lem)
                    if entry:
                        break

        effective_source = source_token or term or gloss

        if entry and entry.get("review_status") == "approved":
            media = entry.get("media", {})
            return SignMedia(
                gloss=entry["asl_gloss"],
                media_url=media.get("url"),
                fallback_image=media.get("fallback_image"),
                thumbnail_url=media.get("thumbnail_url"),
                media_type=media.get("type", "video"),
                source=media.get("source"),
                license=media.get("license"),
                verified=media.get("verified", False),
                is_fingerspelled=False,
                category=entry.get("category"),
                non_manual_signal=entry.get("non_manual_signal"),
                source_token=effective_source,
                definition=entry.get("definition")
            )

        # Fallback to finger-spelling
        clean_gloss = gloss.replace("FS:", "").strip().upper()
        return SignMedia(
            gloss=f"FS:{clean_gloss}",
            media_url=None,
            fallback_image=None,
            thumbnail_url=None,
            media_type="fingerspell",
            source="System Fingerspelling Fallback",
            license="Open Access",
            verified=False,
            is_fingerspelled=True,
            category="fingerspelling",
            non_manual_signal="neutral",
            source_token=effective_source,
            definition=None
        )


# Global singleton instance
vocab_repo = VocabularyRepository()

