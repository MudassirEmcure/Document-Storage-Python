"""Azure AD OpenID Connect configuration using Authlib with SSL bypass."""

import ssl
import httpx
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.httpx_client import AsyncOAuth2Client

from app.config import get_settings

settings = get_settings()

# Disable SSL verification for corporate network
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

oauth = OAuth()

oauth.register(
    name="azure",
    client_id=settings.AZURE_CLIENT_ID,
    client_secret=settings.AZURE_CLIENT_SECRET,
    server_metadata_url=(
        f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration"
    ),
    client_kwargs={
        "scope": "openid email profile",
    },
)
