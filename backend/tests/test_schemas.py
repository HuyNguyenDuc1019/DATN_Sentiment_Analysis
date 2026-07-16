import unittest
from pydantic import ValidationError

from app.schemas import BatchPredictRequest, FeedbackBatchRequest, PredictRequest


class SchemaTests(unittest.TestCase):
    def test_predict_request_accepts_text(self):
        payload = PredictRequest(text="Phục vụ tốt")

        self.assertEqual(payload.text, "Phục vụ tốt")

    def test_batch_request_requires_review_content(self):
        payload = BatchPredictRequest(
            reviews=[{"content": "Món ngon", "review_date": "2026-07-16"}],
            user_id="user-1",
            source_url="https://www.foody.vn/example",
        )

        self.assertEqual(payload.reviews[0].content, "Món ngon")

    def test_feedback_batch_rejects_empty_items(self):
        with self.assertRaises(ValidationError):
            FeedbackBatchRequest(items=[])


if __name__ == "__main__":
    unittest.main()
