"""
/api/v1/auth/ endpoints -- see contract/api-design.md §1.

POST /api/v1/auth/register/  { email, password } -> { token, user }
POST /api/v1/auth/login/     { email, password } -> { token, user }
POST /api/v1/auth/logout/    (Token auth required)  -> 204
"""

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import AuthUserSerializer, LoginSerializer, RegisterSerializer
from apps.core.exceptions import error_response


def _first_error_code(errors, default="validation_error"):
    for value in errors.values():
        items = value if isinstance(value, list) else [value]
        for item in items:
            code = getattr(item, "code", None)
            if code and code not in ("invalid", "required", "blank", "null"):
                return code
    return default


def _first_error_message(errors, fallback):
    for value in errors.values():
        items = value if isinstance(value, list) else [value]
        if items:
            return str(items[0])
    return fallback


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            code = _first_error_code(serializer.errors)
            message = _first_error_message(serializer.errors, "註冊資料不正確。")
            field_errors = {k: [str(v) for v in vs] for k, vs in serializer.errors.items()}
            return error_response(code, message, field_errors=field_errors, request=request)

        user = serializer.save()
        token, _created = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": AuthUserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            code = _first_error_code(serializer.errors, default="invalid_credentials")
            message = _first_error_message(serializer.errors, "登入失敗。")
            return error_response(
                code,
                message,
                status_code=status.HTTP_401_UNAUTHORIZED,
                request=request,
            )

        user = serializer.validated_data["user"]
        token, _created = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": AuthUserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET /api/v1/auth/me/ -- convenience endpoint (not in the frozen
    contract's endpoint table, but harmless/additive) used by the smoke
    test to verify token auth end-to-end."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AuthUserSerializer(request.user).data)
