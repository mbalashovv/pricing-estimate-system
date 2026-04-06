from decimal import Decimal
from unittest.mock import Mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from apps.catalog.models import CatalogItem
from apps.estimates.models import Estimate, EstimateItem
from apps.matching.models import EstimateItemMatch
from apps.projects.models import Project
from services.matching.matcher import SimpleMatcher, upsert_match


class SimpleMatcherTests(TestCase):
    def setUp(self):
        self.matcher = SimpleMatcher()
        self.project = Project.objects.create(name="Project")
        self.estimate = Estimate.objects.create(
            project=self.project,
            name="Estimate",
            source_file=SimpleUploadedFile("estimate.xlsx", b"test"),
        )

    def test_returns_no_match_when_embedding_cannot_be_generated(self):
        CatalogItem.objects.create(article="ABC-123", name="Catalog item")
        estimate_item = EstimateItem.objects.create(
            estimate=self.estimate,
            article="",
            name="Estimate item",
            quantity=Decimal("1"),
        )

        result = self.matcher.match(estimate_item)

        self.assertIsNone(result.catalog_item)
        self.assertEqual(result.status, EstimateItemMatch.Status.NO_MATCH)
        self.assertEqual(result.method, "")
        self.assertIsNone(result.confidence)

    def test_exact_normalized_name_match_returns_full_confidence(self):
        service = Mock()
        self.matcher = SimpleMatcher(embedding_service=service)
        catalog_item = CatalogItem.objects.create(name="monitor")
        estimate_item = EstimateItem.objects.create(
            estimate=self.estimate,
            article="",
            name=" MONITOR ",
            quantity=Decimal("1"),
        )

        result = self.matcher.match(estimate_item)

        self.assertEqual(result.catalog_item, catalog_item)
        self.assertEqual(result.status, EstimateItemMatch.Status.MATCHED)
        self.assertEqual(result.method, EstimateItemMatch.Method.AI)
        self.assertEqual(result.confidence, 1.0)
        service.embed.assert_not_called()

    def test_upsert_match_persists_ai_match(self):
        service = Mock()
        service.embed.return_value = [0.1] * 1536
        self.matcher = SimpleMatcher(embedding_service=service)

        catalog_item = CatalogItem.objects.create(
            article="ABC-123",
            name="Catalog item",
            embedding=[0.1] * 1536,
        )
        estimate_item = EstimateItem.objects.create(
            estimate=self.estimate,
            article="XYZ-999",
            name="Estimate item",
            quantity=Decimal("1"),
        )

        match = upsert_match(estimate_item, self.matcher.match(estimate_item))

        self.assertEqual(match.catalog_item, catalog_item)
        self.assertEqual(match.status, EstimateItemMatch.Status.MATCHED)
        self.assertEqual(match.method, EstimateItemMatch.Method.AI)

    def test_uses_ai_match(self):
        service = Mock()
        service.embed.return_value = [0.1] * 1536
        self.matcher = SimpleMatcher(embedding_service=service)

        catalog_item = CatalogItem.objects.create(
            article="CAT-1",
            name="Cable copper 3x2.5",
            embedding=[0.1] * 1536,
        )
        estimate_item = EstimateItem.objects.create(
            estimate=self.estimate,
            article="EST-1",
            name="Copper cable 3x2.5",
            quantity=Decimal("1"),
        )

        result = self.matcher.match(estimate_item)

        self.assertEqual(result.catalog_item, catalog_item)
        self.assertEqual(result.status, EstimateItemMatch.Status.MATCHED)
        self.assertEqual(result.method, EstimateItemMatch.Method.AI)
        self.assertEqual(result.confidence, 1.0)

    def test_calls_embedding_service_even_when_article_matches(self):
        service = Mock()
        service.embed.return_value = [0.1] * 1536
        self.matcher = SimpleMatcher(embedding_service=service)

        CatalogItem.objects.create(
            article="ABC-123",
            name="Exact item",
            embedding=[0.9] * 1536,
        )
        ai_item = CatalogItem.objects.create(
            article="OTHER-1",
            name="Embedding item",
            embedding=[0.1] * 1536,
        )
        estimate_item = EstimateItem.objects.create(
            estimate=self.estimate,
            article="ABC-123",
            name="Estimate item",
            quantity=Decimal("1"),
        )

        result = self.matcher.match(estimate_item)

        self.assertEqual(result.catalog_item, ai_item)
        self.assertEqual(result.method, EstimateItemMatch.Method.AI)
        service.embed.assert_called_once()
