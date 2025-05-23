# Coupon Management Web Application

## Description
This project is a Flask-based web application designed to manage coupons. It uses Google Sheets as a backend to store and manage coupon data, leveraging Google OAuth 2.0 for secure access.

## Features
*   **Google Sheets Integration:** All coupon data is stored and managed in a Google Spreadsheet.
*   **OAuth 2.0 Authentication:** Securely authenticates with Google services to access the spreadsheet.
*   **Find Coupons:** Users can search for existing coupons by their serial number.
*   **Use/Redeem Coupons:** Mark coupons as used, automatically setting the date of use.
*   **Update Coupon Details:** Modify information such as the coupon owner, date of use, expiry date, and notes.
*   **Generate New Coupons:** Create new coupons with a unique, randomly generated code and a default expiry date (typically one year from creation).

## Project Structure
*   `web_flask.py`: The main Flask application file. It handles all web routes, user interface interactions, and core application logic.
*   `coupon.py`: Contains the `Coupon` class definition (representing a single coupon) and the `CouponTable` class (for managing the collection of coupons and interacting with the Google Sheet logic).
*   `gsheet.py`: Implements the `GoogleSheetTools` class, which handles all direct communication with the Google Sheets API, including reading, updating, and appending data.
*   `templates/`: This directory holds all HTML templates used for rendering the web pages.
    *   `base.html`: Base template, likely for common layout.
    *   `find_coupon.html`: Template for displaying coupon search results and actions.
    *   `generate_new.html`: Template for confirming new coupon generation.
    *   `hello.html`: Main landing page template.
    *   `privacy.html`, `terms_of_service.html`: Placeholder static pages.
*   `requirements.txt`: Lists all Python dependencies required to run the project (e.g., Flask, google-api-python-client, google-auth-httplib2, google-auth-oauthlib).
*   `Dockerfile`: Provides instructions to build a Docker container for the application, enabling easy deployment.
*   `client_secret.json`: **Important:** This file contains your Google Cloud API credentials. It is **required** for the application to authenticate with Google services. You must obtain this file from the Google Cloud Console. **Do NOT commit this file to public repositories if it contains your actual sensitive credentials.**
*   `LICENSE`: Contains the project's license information (MIT License).
*   `.gitignore`: Specifies intentionally untracked files that Git should ignore.

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Create a Virtual Environment (Recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up Google API Credentials:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Enable the **Google Sheets API** for your project.
    *   Create OAuth 2.0 credentials:
        *   Go to "Credentials" in the APIs & Services section.
        *   Click "Create Credentials" -> "OAuth client ID".
        *   Choose "Web application" as the application type.
        *   Add **Authorized JavaScript origins**: Your application's host (e.g., `http://localhost:8080`, `http://127.0.0.1:8080`).
        *   Add **Authorized redirect URIs**: The callback URL for the OAuth flow. This should be `http://localhost:8080/oauth2callback` or `http://127.0.0.1:8080/oauth2callback` for local development. If deploying, adjust accordingly and ensure it's HTTPS.
        *   Download the JSON file. Rename it to `client_secret.json` and place it in the root directory of the project.

5.  **Configure Google Sheet:**
    *   Create a new Google Sheet or use an existing one.
    *   Note its **Spreadsheet ID**. You can find this in the URL of the spreadsheet (e.g., `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`).
    *   Open `coupon.py` and update the `SPREADSHEET_ID` constant with your actual Spreadsheet ID:
        ```python
        SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID'
        ```
    *   Ensure the sheet (e.g., `2023` as per `PAGE_NAME` in `coupon.py`) has columns in the order expected: Coupon Code, Date of Use, Owner, Expiry Date, Notes.

6.  **Run the Application:**
    ```bash
    python web_flask.py
    ```
    The application will typically be available at `http://localhost:8080` or `http://0.0.0.0:8080`.

## Usage
Once the application is running:
1.  Open your web browser and navigate to the application's URL (e.g., `http://localhost:8080`).
2.  You will be prompted to authorize the application to access your Google Sheets data. Follow the on-screen instructions.
3.  After authorization, you can:
    *   **Find a Coupon:** Enter a coupon code in the search box on the main page and submit.
    *   **Use a Coupon:** On the coupon details page, click "Use Coupon".
    *   **Update Coupon Details:** Modify the fields on the coupon details page and click "Update".
    *   **Generate a New Coupon:** Click the "Generate New Coupon" link/button.

## Contributing
Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.
