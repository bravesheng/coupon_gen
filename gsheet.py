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
# CLIENT_SECRETS_FILE = "client_secret.json" # Removed: Not used by GoogleSheetTools directly

class GoogleSheetTools():
    def __init__(self, spreadsheetId, range, creds):
        try:
            service = build('sheets', 'v4', credentials=creds)
            self.sheet = service.spreadsheets() # Initialize self.sheet only on success
            self.__spreadsheetId = spreadsheetId
            self.__range = range
        except HttpError as err:
            print(f"Failed to initialize Google Sheets service: {err}") # Optional: log the error
            raise # Re-raise the caught HttpError

    def get_data(self):
        result = self.sheet.values().get(spreadsheetId=self.__spreadsheetId, range=self.__range).execute()
        return result.get('values', [])

    def update_data(self, update_range, value_range_body):
        request = self.sheet.values().update(spreadsheetId=self.__spreadsheetId, range=update_range, valueInputOption='USER_ENTERED', body=value_range_body)
        response = request.execute()

    def append(self, value_range_body):
        request = self.sheet.values().append(spreadsheetId=self.__spreadsheetId, range=self.__range, valueInputOption='USER_ENTERED', body=value_range_body)
        response = request.execute()

if __name__ == '__main__':
    print("This module provides Google Sheet tools and is not intended to be run directly.")
