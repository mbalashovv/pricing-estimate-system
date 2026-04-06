from decimal import Decimal
from unittest.mock import Mock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import CatalogItem
from apps.price_lists.models import PriceList, PriceListItem
from apps.suppliers.models import Supplier
from services.price_list.matcher import PriceListMatcher, run_price_list_matching


class PriceListMatchingTests(APITestCase):
    def setUp(self):
        self.supplier = Supplier.objects.create(name="Supplier", inn="123456789012")
        self.price_list = PriceList.objects.create(
            supplier=self.supplier,
            name="Price list",
            source_file=SimpleUploadedFile("prices.xlsx", b"test"),
        )

    def test_run_price_list_matching_sets_ai_match(self):
        service = Mock()
        service.embed.return_value = [0.1] * 1536
        matcher = PriceListMatcher(embedding_service=service)
        catalog_item = CatalogItem.objects.create(
            article="CAT-1",
            name="Cable copper 3x2.5",
            embedding=[0.1] * 1536,
        )
        price_list_item = PriceListItem.objects.create(
            price_list=self.price_list,
            article="SUP-1",
            name="Copper cable 3x2.5",
            price=Decimal("10.00"),
        )

        result = matcher.match(price_list_item)

        self.assertEqual(result.catalog_item, catalog_item)
        self.assertEqual(result.status, PriceListItem.MatchStatus.MATCHED)
        self.assertEqual(result.method, PriceListItem.MatchMethod.AI)
        self.assertEqual(result.confidence, 1.0)

    def test_exact_normalized_name_match_returns_full_confidence(self):
        service = Mock()
        matcher = PriceListMatcher(embedding_service=service)
        catalog_item = CatalogItem.objects.create(name="monitor")
        price_list_item = PriceListItem.objects.create(
            price_list=self.price_list,
            article="SUP-1",
            name=" MONITOR ",
            price=Decimal("10.00"),
        )

        result = matcher.match(price_list_item)

        self.assertEqual(result.catalog_item, catalog_item)
        self.assertEqual(result.status, PriceListItem.MatchStatus.MATCHED)
        self.assertEqual(result.method, PriceListItem.MatchMethod.AI)
        self.assertEqual(result.confidence, 1.0)
        service.embed.assert_not_called()

    def test_run_price_list_matching_updates_item_and_progress(self):
        service = Mock()
        service.embed.return_value = [0.1] * 1536
        CatalogItem.objects.create(
            article="CAT-1",
            name="Cable copper 3x2.5",
            embedding=[0.1] * 1536,
        )
        PriceListItem.objects.create(
            price_list=self.price_list,
            article="SUP-1",
            name="Copper cable 3x2.5",
            price=Decimal("10.00"),
        )

        with patch("services.price_list.matcher.EmbeddingService", return_value=service):
            processed = run_price_list_matching(self.price_list, task_id="task-1")

        self.price_list.refresh_from_db()
        matched_item = self.price_list.items.get()
        self.assertEqual(processed, 1)
        self.assertEqual(self.price_list.matching_status, PriceList.MatchingStatus.COMPLETED)
        self.assertEqual(self.price_list.matching_progress, 100)
        self.assertEqual(self.price_list.matching_task_id, "task-1")
        self.assertEqual(matched_item.match_method, PriceListItem.MatchMethod.AI)
        self.assertEqual(matched_item.match_status, PriceListItem.MatchStatus.MATCHED)
        self.assertIsNotNone(matched_item.catalog_item)

    def test_set_match_marks_item_as_manual(self):
        catalog_item = CatalogItem.objects.create(article="CAT-1", name="Catalog item")
        price_list_item = PriceListItem.objects.create(
            price_list=self.price_list,
            name="Supplier item",
            price=Decimal("10.00"),
        )

        response = self.client.post(
            reverse("price-list-item-set-match", args=[price_list_item.id]),
            {"catalog_item": catalog_item.id},
            format="json",
        )

        price_list_item.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(price_list_item.catalog_item, catalog_item)
        self.assertEqual(price_list_item.match_status, PriceListItem.MatchStatus.MANUAL)
        self.assertEqual(price_list_item.match_method, PriceListItem.MatchMethod.MANUAL)
        self.assertEqual(price_list_item.match_confidence, Decimal("1.00"))

    def test_mark_no_match_clears_catalog_item(self):
        catalog_item = CatalogItem.objects.create(article="CAT-1", name="Catalog item")
        price_list_item = PriceListItem.objects.create(
            price_list=self.price_list,
            catalog_item=catalog_item,
            name="Supplier item",
            price=Decimal("10.00"),
            match_status=PriceListItem.MatchStatus.MANUAL,
            match_method=PriceListItem.MatchMethod.MANUAL,
            match_confidence=Decimal("1.00"),
        )

        response = self.client.post(
            reverse("price-list-item-mark-no-match", args=[price_list_item.id]),
            {},
            format="json",
        )

        price_list_item.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(price_list_item.catalog_item)
        self.assertEqual(price_list_item.match_status, PriceListItem.MatchStatus.NOT_MATCHED)
        self.assertEqual(price_list_item.match_method, PriceListItem.MatchMethod.MANUAL)
        self.assertIsNone(price_list_item.match_confidence)
