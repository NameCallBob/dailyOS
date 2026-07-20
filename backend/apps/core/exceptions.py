"""
Custom DRF exception handler enforcing the contract error envelope:

    { "code": str, "message": str, "field_errors": {...}?, "request_id": str? }

See contract/api-design.md §0.6. Raw framework exceptions / stack traces
must never leak to the client.
"""

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

_DEFAULT_MESSAGES = {
    "validation_error": "資料格式不正確。",
    "not_found": "找不到指定的資源。",
    "unauthorized": "請先登入。",
    "forbidden": "沒有權限執行此操作。",
    "not_acceptable": "無法接受的請求格式。",
    "method_not_allowed": "不支援的請求方法。",
    "unsupported_media_type": "不支援的媒體類型。",
    "throttled": "請求過於頻繁，請稍後再試。",
    "parse_error": "請求內容無法解析。",
    "http_500": "伺服器發生錯誤，請稍後再試。",
}

_CODE_BY_EXCEPTION = {
    drf_exceptions.NotAuthenticated: "unauthorized",
    drf_exceptions.AuthenticationFailed: "unauthorized",
    drf_exceptions.PermissionDenied: "forbidden",
    drf_exceptions.NotFound: "not_found",
    drf_exceptions.NotAcceptable: "not_acceptable",
    drf_exceptions.MethodNotAllowed: "method_not_allowed",
    drf_exceptions.UnsupportedMediaType: "unsupported_media_type",
    drf_exceptions.Throttled: "throttled",
    drf_exceptions.ParseError: "parse_error",
    drf_exceptions.ValidationError: "validation_error",
}


def _extract_field_errors(detail):
    """DRF puts field errors in a dict-of-lists (or nested) shape; the
    contract wants {field: [messages]} with snake_case keys (DRF already
    uses whatever field names the serializer declares, which are
    snake_case throughout this codebase)."""
    if isinstance(detail, dict):
        field_errors = {}
        non_field = []
        for key, value in detail.items():
            messages = [str(v) for v in value] if isinstance(value, list) else [str(value)]
            if key in ("non_field_errors", "detail"):
                non_field.extend(messages)
            else:
                field_errors[key] = messages
        return field_errors or None, non_field
    return None, None


def build_error_payload(code, message, field_errors=None, request=None):
    request_id = getattr(request, "request_id", None) if request is not None else None
    return {
        "code": code,
        "message": message,
        "field_errors": field_errors,
        "request_id": request_id,
    }


def error_response(
    code, message, field_errors=None, status_code=status.HTTP_400_BAD_REQUEST, request=None
):
    """Build a Response matching the contract error envelope (§0.6) for
    call sites that need a business-specific `code` (e.g. `email_taken`,
    `invalid_credentials`) that the generic exception handler below can't
    infer from the exception type alone."""
    return Response(
        build_error_payload(code, message, field_errors=field_errors, request=request),
        status=status_code,
    )


def custom_exception_handler(exc, context):
    request = context.get("request")
    request_id = getattr(request, "request_id", None) if request is not None else None

    # Translate exception types DRF's default handler doesn't cover.
    if isinstance(exc, Http404):
        exc = drf_exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = drf_exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)

    if response is None:
        # Unhandled exception -> never leak internals, log server-side.
        logger.exception("Unhandled exception", exc_info=exc)
        return Response(
            {
                "code": "http_500",
                "message": _DEFAULT_MESSAGES["http_500"],
                "field_errors": None,
                "request_id": request_id,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = _CODE_BY_EXCEPTION.get(type(exc), "error")
    field_errors, non_field_messages = _extract_field_errors(
        exc.detail if hasattr(exc, "detail") else None
    )

    if non_field_messages:
        message = " ".join(non_field_messages)
    elif field_errors:
        message = _DEFAULT_MESSAGES.get(code, "資料格式不正確。")
    elif hasattr(exc, "detail"):
        message = str(exc.detail)
    else:
        message = _DEFAULT_MESSAGES.get(code, str(exc))

    payload = {
        "code": code,
        "message": message,
        "field_errors": field_errors,
        "request_id": request_id,
    }

    if isinstance(exc, drf_exceptions.Throttled) and exc.wait is not None:
        response["Retry-After"] = str(int(exc.wait))

    response.data = payload
    return response
