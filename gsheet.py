from __future__ import print_function
from datetime import datetime
import os
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import json

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# The ID and range of coupon spreadsheet.
TOKEN_NAME = 'token.json'

class GoogleSheetTools():
    def __init__(self, spreadsheetId, range):
        self.__auth()
        self.__spreadsheetId = spreadsheetId
        self.__range = range

    def __auth(self):
        creds = None
        # The file token.json stores the user's access and refresh tokens, and is
        # # created automatically when the authorization flow completes for the first
        # # time.
        if os.path.exists(TOKEN_NAME):
                creds = Credentials.from_authorized_user_file(TOKEN_NAME, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # os.remove(TOKEN_NAME)
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open('token.json', 'w') as token:
                token.write(creds.to_json())
        service = build('sheets', 'v4', credentials=creds)
        self.sheet = service.spreadsheets()

    def get_data(self):
        result = self.sheet.values().get(spreadsheetId=self.__spreadsheetId, range=self.__range).execute()
        return result.get('values', [])

    def update_data(self, update_range, value_range_body):
        request = self.sheet.values().update(spreadsheetId=self.__spreadsheetId, range=update_range, valueInputOption='USER_ENTERED', body=value_range_body)
        response = request.execute()

    def append(self, value_range_body):
        request = self.sheet.values().append(spreadsheetId=self.__spreadsheetId, range=self.__range, valueInputOption='USER_ENTERED', body=value_range_body)
        response = request.execute()
