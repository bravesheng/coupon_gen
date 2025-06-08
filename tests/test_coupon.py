import unittest
from unittest.mock import MagicMock, patch # Added
from datetime import date, timedelta
import sys
import os

# Add the parent directory to sys.path to allow module import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from coupon import Coupon, CouponTable, CP_COUPON_CODE, CP_DATE_OF_USE, CP_OWNER, CP_EXPIRY_DATE, CP_NOTES # Added CouponTable

class TestCoupon(unittest.TestCase):

    def test_coupon_creation_and_getters(self):
        row_data = ["TEST001", "2023-01-01", "John Doe", "2023-12-31", "Test note"]
        coupon = Coupon(1, row_data)
        self.assertEqual(coupon.get_coupon_code(), "TEST001")
        self.assertEqual(coupon.get_date_of_use(), date(2023, 1, 1))
        self.assertEqual(coupon.get_owner(), "John Doe")
        self.assertEqual(coupon.get_expiry_date(), date(2023, 12, 31))
        self.assertEqual(coupon.get_notes(), "Test note")
        self.assertEqual(coupon.row_idx, 1)

    def test_coupon_creation_short_row_data(self):
        row_data = ["SHORT01"] # Only coupon code
        coupon = Coupon(2, row_data)
        self.assertEqual(coupon.get_coupon_code(), "SHORT01")
        self.assertIsNone(coupon.get_date_of_use()) # Should be None as data is missing
        self.assertEqual(coupon.get_owner(), "")    # Should be empty string
        self.assertIsNone(coupon.get_expiry_date())
        self.assertEqual(coupon.get_notes(), "")

    def test_setters(self):
        coupon = Coupon(3, ["", "", "", "", ""])

        coupon.set_coupon_code("NEWCODE")
        self.assertEqual(coupon.get_coupon_code(), "NEWCODE")

        coupon.set_owner("Jane Doe")
        self.assertEqual(coupon.get_owner(), "Jane Doe")

        coupon.set_notes("New note")
        self.assertEqual(coupon.get_notes(), "New note")

    def test_date_of_use_setter_and_getter(self):
        coupon = Coupon(4, ["", "", "", "", ""])
        # Test setting with date object
        d_obj = date(2024, 5, 15)
        coupon.set_date_of_use(d_obj)
        self.assertEqual(coupon.row_data[CP_DATE_OF_USE], "2024-05-15")
        self.assertEqual(coupon.get_date_of_use(), d_obj)

        # Test setting with valid date string
        coupon.set_date_of_use("2024-06-20")
        self.assertEqual(coupon.row_data[CP_DATE_OF_USE], "2024-06-20")
        self.assertEqual(coupon.get_date_of_use(), date(2024, 6, 20))

        # Test setting with empty string (should clear it)
        coupon.set_date_of_use("")
        self.assertEqual(coupon.row_data[CP_DATE_OF_USE], "")
        self.assertIsNone(coupon.get_date_of_use())

        coupon.set_date_of_use("")
        self.assertEqual(coupon.row_data[CP_DATE_OF_USE], "")


    def test_expiry_date_setter_and_getter(self):
        coupon = Coupon(5, ["", "", "", "", ""])
        # Test setting with date object
        d_obj = date(2025, 7, 25)
        coupon.set_expiry_date(d_obj)
        self.assertEqual(coupon.row_data[CP_EXPIRY_DATE], "2025-07-25")
        self.assertEqual(coupon.get_expiry_date(), d_obj)

        # Test setting with valid date string
        coupon.set_expiry_date("2025-08-30")
        self.assertEqual(coupon.row_data[CP_EXPIRY_DATE], "2025-08-30")
        self.assertEqual(coupon.get_expiry_date(), date(2025, 8, 30))

        # Test setting with empty string
        coupon.set_expiry_date("")
        self.assertEqual(coupon.row_data[CP_EXPIRY_DATE], "")
        self.assertIsNone(coupon.get_expiry_date())

    def test_use_this_coupon(self):
        coupon = Coupon(6, ["", "", "", "", ""])
        coupon.use_this_coupon()
        today = date.today()
        self.assertEqual(coupon.get_date_of_use(), today)
        self.assertEqual(coupon.row_data[CP_DATE_OF_USE], today.strftime("%Y-%m-%d"))

# (Assuming TestCoupon class is already defined above in the same file)
class TestCouponTable(unittest.TestCase):

    @patch('coupon.GoogleSheetTools') # Mock GoogleSheetTools where it's used in coupon.py
    def setUp(self, MockGoogleSheetTools): # noqa: N802
        # This setup runs before each test method in this class
        self.mock_gsheet_instance = MockGoogleSheetTools.return_value
        self.creds_mock = MagicMock() # Mock credentials object

        # Sample data that CouponTable would get from GoogleSheetTools
        self.sample_sheet_data = [
            ["COUPON_CODE", "DATE_OF_USE", "OWNER", "EXPIRY_DATE", "NOTES"], # Header
            ["VALID01", "", "Owner1", "2024-12-31", "Note1"],
            ["USED002", "2023-01-15", "Owner2", "2023-12-31", "Note2"],
            ["EXPIRED", "2022-01-01", "Owner3", "2022-12-31", "Note3"]
        ]
        self.mock_gsheet_instance.get_data.return_value = self.sample_sheet_data

        # Initialize CouponTable with the mocked gsheet instance
        self.coupon_table = CouponTable(creds=self.creds_mock)
        # Verify GoogleSheetTools was called correctly during CouponTable init
        MockGoogleSheetTools.assert_called_once_with('1hPciz779MX8IEUdYxtTDNkwTNN0YFod-3JZbJWJirlU', '2023!A:E', self.creds_mock)


    def test_find_coupon_by_sn_found(self):
        found_coupon = self.coupon_table.find_coupon_by_sn("VALID01")
        self.assertIsNotNone(found_coupon)
        self.assertEqual(found_coupon.get_coupon_code(), "VALID01")
        self.assertEqual(found_coupon.get_owner(), "Owner1")
        self.assertEqual(found_coupon.row_idx, 1) # 1-based index in the data rows

    def test_find_coupon_by_sn_not_found(self):
        found_coupon = self.coupon_table.find_coupon_by_sn("INVALID")
        self.assertIsNone(found_coupon)

    def test_update_coupon(self):
        # Create a coupon object as if it was found and modified
        # row_idx here is the 0-based index for self.rows, so 1 for the first data row.
        # The sheet row index for A1 notation update is this idx + 1.
        coupon_to_update = Coupon(row_idx=1, row_data=["VALID01", "", "New Owner", "2024-12-31", "Updated Note"])

        self.coupon_table.update_coupon(coupon_to_update)

        # Verify that mysheet.update_data was called with correct parameters
        # The row_idx for Coupon is 1 (from sample_sheet_data[1])
        # The A1 notation range should be PAGE_NAME + '!A' + str(row_idx+1) + ':E' + str(row_idx+1)
        # PAGE_NAME is '2023' (from coupon.py global)
        expected_range = f'2023!A{coupon_to_update.row_idx + 1}:E{coupon_to_update.row_idx + 1}' # e.g., 2023!A2:E2
        expected_values = {"values": [coupon_to_update.row_data]}

        self.mock_gsheet_instance.update_data.assert_called_once_with(expected_range, expected_values)

    @patch('coupon.random_char')
    @patch('coupon.date') # This patches the 'date' class imported in the coupon module
    def test_generate_new_coupon(self, mock_date_class, mock_random_char):
        # Configure mock_date_class.today()
        today_instance = date(2023, 7, 15) # The specific date instance we want today() to return
        mock_date_class.today.return_value = today_instance
        # Ensure fromisoformat still works as expected on the class, by routing it to the original date.fromisoformat
        mock_date_class.fromisoformat.side_effect = lambda s: date.fromisoformat(s)

        # Configure mock_random_char
        mock_random_char.return_value = "XYZ" # Predictable random characters

        # Last coupon in sample_sheet_data is "EXPIRED" (row_data index 3)
        # Its code is "EXPIRED". The generation logic expects "NNNNXXX" format for the *last* code.
        # Let's adjust self.coupon_table.rows for this test or provide a more suitable last row.
        self.coupon_table.rows.append(["9999ABC", "", "", "", ""]) # Simulate a last coupon

        new_coupon = self.coupon_table.generate_new_coupon()

        self.assertIsNotNone(new_coupon)
        self.assertEqual(new_coupon.get_coupon_code(), "10000XYZ") # 9999 + 1 = 10000

        expected_expiry_date = today_instance + timedelta(days=365)
        self.assertEqual(new_coupon.get_expiry_date(), expected_expiry_date)
        self.assertEqual(new_coupon.get_notes(), "可抵用主商品100元租金")

        # Verify that mysheet.append was called
        expected_append_values = {"values": [new_coupon.row_data]}
        self.mock_gsheet_instance.append.assert_called_once_with(expected_append_values)

if __name__ == '__main__':
    unittest.main()
