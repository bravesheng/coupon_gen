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
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                #os.remove(TOKEN_NAME)
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                #creds = flow.run_local_server(port=5050)
                creds = flow.run_console()
            # Save the credentials for the next run
            with open(TOKEN_NAME, 'w') as token:
                token.write(creds.to_json())
        try:
            service = build('sheets', 'v4', credentials=creds)
        except HttpError as err:
            print(err)

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
