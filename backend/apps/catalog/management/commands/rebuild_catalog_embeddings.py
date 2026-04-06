from django.core.management.base import BaseCommand, CommandError

from apps.catalog.models import CatalogItem
from services.matching.embeddings import EmbeddingConfigurationError, update_catalog_item_embedding


class Command(BaseCommand):
    help = "Generate or rebuild embeddings for catalog items."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only-missing",
            action="store_true",
            help="Generate embeddings only for catalog items without them.",
        )

    def handle(self, *args, **options):
        queryset = CatalogItem.objects.select_related("group").all()
        if options["only_missing"]:
            queryset = queryset.filter(embedding=None)

        updated = 0
        try:
            for catalog_item in queryset.iterator():
                update_catalog_item_embedding(catalog_item)
                updated += 1
        except EmbeddingConfigurationError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(f"Updated embeddings for {updated} catalog items."))
