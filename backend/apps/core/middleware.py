"""
RequestIDMiddleware: assigns/propagates X-Request-ID so error responses can
include a `request_id` for support/debugging correlation (contract §0.6).
"""

import uuid


class RequestIDMiddleware:
    header_name = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.META.get("HTTP_X_REQUEST_ID")
        request_id = incoming or f"req_{uuid.uuid4().hex[:16]}"
        request.request_id = request_id

        response = self.get_response(request)
        response[self.header_name] = request_id
        return response
