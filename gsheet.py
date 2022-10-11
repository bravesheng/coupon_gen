from __future__ import print_function

import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# The ID and range of coupon spreadsheet.
TOKEN_NAME = 'token.json'
CLIENT_SECRETS_FILE = "client_secret.json"

class GoogleSheetTools():
    def __init__(self, spreadsheetId, range, creds):
        try:
            service = build('sheets', 'v4', credentials=creds)
        except HttpError as err:
            print(err)
            
        self.sheet = service.spreadsheets()
        self.__spreadsheetId = spreadsheetId
        self.__range = range

    def get_data(self):
        result = self.sheet.values().get(spreadsheetId=self.__spreadsheetId, range=self.__range).execute()
        return result.get('values', [])

    def update_data(self, update_range, value_range_body):
        request = self.sheet.values().update(spreadsheetId=self.__spreadsheetId, range=update_range, valueInputOption='USER_ENTERED', body=value_range_body)
        response = request.execute()

    def append(self, value_range_body):
        request = self.sheet.values().append(spreadsheetId=self.__spreadsheetId, range=self.__range, valueInputOption='USER_ENTERED', body=value_range_body)
        response = request.execute()
