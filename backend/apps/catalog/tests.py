from unittest.mock import patch

from django.test import TestCase

from apps.catalog.models import CatalogGroup, CatalogItem


class CatalogItemTests(TestCase):
    @patch("django.db.transaction.on_commit", side_effect=lambda callback: callback())
    @patch("services.matching.embeddings.refresh_catalog_item_embedding")
    def test_save_sets_normalized_name_and_refreshes_embedding_on_create(
        self,
        refresh_catalog_item_embedding,
        _on_commit,
    ):
        catalog_item = CatalogItem.objects.create(name="  MONITOR   27  ", article="A-1")

        self.assertEqual(catalog_item.normalized_name, "monitor 27")
        refresh_catalog_item_embedding.assert_called_once()

    @patch("django.db.transaction.on_commit", side_effect=lambda callback: callback())
    @patch("services.matching.embeddings.refresh_catalog_item_embedding")
    def test_save_refreshes_embedding_when_name_changes(
        self,
        refresh_catalog_item_embedding,
        _on_commit,
    ):
        catalog_item = CatalogItem.objects.create(name="Monitor", article="A-1")
        refresh_catalog_item_embedding.reset_mock()

        catalog_item.name = "Monitor Pro"
        catalog_item.save(update_fields=["name"])

        catalog_item.refresh_from_db()
        self.assertEqual(catalog_item.normalized_name, "monitor pro")
        refresh_catalog_item_embedding.assert_called_once()

    @patch("django.db.transaction.on_commit", side_effect=lambda callback: callback())
    @patch("services.matching.embeddings.refresh_catalog_item_embedding")
    def test_save_does_not_refresh_embedding_for_irrelevant_field_change(
        self,
        refresh_catalog_item_embedding,
        _on_commit,
    ):
        catalog_item = CatalogItem.objects.create(name="Monitor", article="A-1", unit="pcs")
        refresh_catalog_item_embedding.reset_mock()

        catalog_item.unit = "set"
        catalog_item.save(update_fields=["unit"])

        refresh_catalog_item_embedding.assert_not_called()

    @patch("django.db.transaction.on_commit", side_effect=lambda callback: callback())
    @patch("services.matching.embeddings.refresh_catalog_item_embedding")
    def test_save_refreshes_embedding_when_group_changes(
        self,
        refresh_catalog_item_embedding,
        _on_commit,
    ):
        first_group = CatalogGroup.objects.create(name="Displays")
        second_group = CatalogGroup.objects.create(name="Office")
        catalog_item = CatalogItem.objects.create(name="Monitor", article="A-1", group=first_group)
        refresh_catalog_item_embedding.reset_mock()

        catalog_item.group = second_group
        catalog_item.save(update_fields=["group"])

        refresh_catalog_item_embedding.assert_called_once()

    @patch("django.db.transaction.on_commit", side_effect=lambda callback: callback())
    @patch("services.matching.embeddings.refresh_catalog_group_embeddings")
    def test_group_rename_refreshes_related_item_embeddings(
        self,
        refresh_catalog_group_embeddings,
        _on_commit,
    ):
        group = CatalogGroup.objects.create(name="Displays")
        CatalogItem.objects.create(name="Monitor", article="A-1", group=group)
        refresh_catalog_group_embeddings.reset_mock()

        group.name = "Office Displays"
        group.save(update_fields=["name"])

        refresh_catalog_group_embeddings.assert_called_once_with(group)
