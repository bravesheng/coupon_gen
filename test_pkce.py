from google_auth_oauthlib.flow import Flow
import json

with open("client_secret.json", "w") as f:
    json.dump({"web": {"client_id": "test", "client_secret": "test", "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}}, f)

flow = Flow.from_client_secrets_file("client_secret.json", scopes=["https://www.googleapis.com/auth/spreadsheets"])
url, state = flow.authorization_url()
print("hasattr code_verifier:", hasattr(flow, "code_verifier"))
