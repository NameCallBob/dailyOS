"""
Standard DRF-style pagination: { results, count, next, previous }.

See contract/api-design.md §0.5.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500
    page_query_param = "page"

    def get_paginated_response(self, data):
        return Response(
            {
                "results": data,
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "results": schema,
                "count": {"type": "integer", "minimum": 0},
                "next": {"type": ["string", "null"]},
                "previous": {"type": ["string", "null"]},
            },
            "required": ["results", "count", "next", "previous"],
        }
