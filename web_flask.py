# save this as app.py
from http import HTTPStatus
from flask import Flask, render_template, request
from google.auth.transport.requests import Request

import os
import flask
import requests

import google.oauth2.credentials
import google_auth_oauthlib.flow

import coupon

CLIENT_SECRETS_FILE = "client_secret.json"
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
API_SERVICE_NAME = 'sheets'
API_VERSION = 'v4'
FORCE_HTTPS = True

app = Flask(__name__)
# Note: A secret key is included in the sample so that it works.
# If you use this code in your application, replace this with a truly secret
# key. See https://flask.palletsprojects.com/quickstart/#sessions.
app.secret_key = 'b802a26fcce058997a8f1e74e61c7a5c24d4bf4d29d92c06cbbe26cf2d760192'
g_coupon_table = None

@app.route("/")
def hello():
    if 'localhost' in flask.request.host_url:
        FORCE_HTTPS = False

    if 'credentials' not in flask.session:
        return flask.redirect('authorize')
        
    # Load credentials
    credentials = google.oauth2.credentials.Credentials(**flask.session['credentials'])

    if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
    #sonething we can do when ceredentials successed.
    global g_coupon_table
    if(g_coupon_table == None):
        g_coupon_table = coupon.CouponTable(credentials)

    # Save credentials back to session in case access token was refreshed.
    flask.session['credentials'] = credentials_to_dict(credentials)

    leave_msg = flask.session
    return render_template('hello.html', **locals())


@app.route('/authorize')
def authorize():
    # Create flow instance to manage the OAuth 2.0 Authorization Grant Flow steps.
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES)

    # The URI created here must exactly match one of the authorized redirect URIs
    # # for the OAuth 2.0 client, which you configured in the API Console. If this
    # # value doesn't match an authorized URI, you will get a 'redirect_uri_mismatch'
    # # error.
    if FORCE_HTTPS:
        flow.redirect_uri = flask.url_for('oauth2callback', _external=True, _scheme='https')
    else:
        flow.redirect_uri = flask.url_for('oauth2callback', _external=True)

    authorization_url, state = flow.authorization_url(
    # Enable offline access so that you can refresh an access token without
    # re-prompting the user for permission. Recommended for web server apps.
    access_type='offline',
    approval_prompt='force',
    # Enable incremental authorization. Recommended as a best practice.
    include_granted_scopes='true')

    # Store the state so the callback can verify the auth server response.
    flask.session['state'] = state

    return flask.redirect(authorization_url)


@app.route('/oauth2callback')
def oauth2callback():
    # Specify the state when creating the flow in the callback so that it can
    # verified in the authorization server response.
    state = flask.session['state']

    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES, state=state)
    if FORCE_HTTPS:
        flow.redirect_uri = flask.url_for('oauth2callback', _external=True, _scheme='https')
    else:
        flow.redirect_uri = flask.url_for('oauth2callback', _external=True)

    # Use the authorization server's response to fetch the OAuth 2.0 tokens.
    if FORCE_HTTPS:
        authorization_response = flask.request.url.replace('http','https')
    else:
        authorization_response = flask.request.url
    flow.fetch_token(authorization_response=authorization_response)

    # Store credentials in the session.
    credentials = flow.credentials
    flask.session['credentials'] = credentials_to_dict(credentials)

    return flask.redirect(flask.url_for('hello'))


@app.route('/revoke')
def revoke():
    if 'credentials' not in flask.session:
        return ('You need to <a href="/authorize">authorize</a> before testing the code to revoke credentials.')

    credentials = google.oauth2.credentials.Credentials(**flask.session['credentials'])

    revoke = requests.post('https://oauth2.googleapis.com/revoke', params={'token': credentials.token}, headers = {'content-type': 'application/x-www-form-urlencoded'})

    status_code = getattr(revoke, 'status_code')
    if status_code == 200:
        return('Credentials successfully revoked.' + print_index_table())
    else:
        return('An error occurred.' + print_index_table())


@app.route('/clear')
def clear_credentials():
    if 'credentials' in flask.session:
        del flask.session['credentials']
    return ('Credentials have been cleared.<br><br>' + print_index_table())


def credentials_to_dict(credentials):
    return {'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes}


def print_index_table():
    return ('<table>' +
          '<tr><td><a href="/test">Test an API request</a></td>' +
          '<td>Submit an API request and see a formatted JSON response. ' +
          '    Go through the authorization flow if there are no stored ' +
          '    credentials for the user.</td></tr>' +
          '<tr><td><a href="/authorize">Test the auth flow directly</a></td>' +
          '<td>Go directly to the authorization flow. If there are stored ' +
          '    credentials, you still might not be prompted to reauthorize ' +
          '    the application.</td></tr>' +
          '<tr><td><a href="/revoke">Revoke current credentials</a></td>' +
          '<td>Revoke the access token associated with the current user ' +
          '    session. After revoking credentials, if you go to the test ' +
          '    page, you should see an <code>invalid_grant</code> error.' +
          '</td></tr>' +
          '<tr><td><a href="/clear">Clear credentials</a></td>' +
          '<td>Clear the access token currently stored in server. ' +
          '    After clearing the token, if you <a href="/test">test the ' +
          '    API request</a> again, you should go back to the auth flow.' +
          '</td></tr></table>')


@app.route('/find_coupon', methods=['POST'])
def find_coupon():
    find_text = request.values['find_text']
    result = g_coupon_table.find_coupon_by_sn(find_text)
    if result == None:
        leave_msg = 'No data match, Please search again.'
        return render_template('hello.html', **locals())
    return render_template('find_coupon.html', **locals())


@app.route('/coupon_action', methods=['POST'])
def coupon_action():
    result = g_coupon_table.find_coupon_by_sn(request.values['coupon_code'])
    action = request.values['action']
    if action == 'Use Coupon':
        result.use_this_coupon()
        g_coupon_table.update_coupon(result)
        return render_template('find_coupon.html', **locals())
    elif action == 'Update':
        result.set_owner(request.values['owner'])
        result.set_date_of_use(request.values['date_of_use'])
        result.set_expiry_date(request.values['expiry_date'])
        result.set_notes(request.values['notes'])
        g_coupon_table.update_coupon(result)
        return render_template('find_coupon.html', **locals())
        

@app.route('/generate_new')
def generate_new():
    global g_coupon_table
    if(g_coupon_table == None):
        g_coupon_table = coupon.CouponTable()
    result = g_coupon_table.generate_new_coupon()
    return render_template('generate_new.html', **locals())

if __name__ == '__main__':
  # When running locally, disable OAuthlib's HTTPs verification.
  # ACTION ITEM for developers:
  #     When running in production *do not* leave this option enabled.
    if not FORCE_HTTPS:
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
    #app.run(debug=True, port=8080)
    app.run(debug=True, host='0.0.0.0', port=8080)