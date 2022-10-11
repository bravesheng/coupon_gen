random_code_list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
CP_COUPON_CODE = 0
CP_DATE_OF_USE = 1
CP_OWNER = 2
CP_EXPIRY_DATE = 3
CP_NOTES = 4
SPREADSHEET_ID = '1hPciz779MX8IEUdYxtTDNkwTNN0YFod-3JZbJWJirlU'
PAGE_NAME = '2023'
RANGE_NAME = 'A:E'
from gsheet import GoogleSheetTools
from datetime import timedelta, date

def random_char(code_length):
    import random
    result_str = ''
    for x in range(code_length):
        result_str += random.choice(random_code_list)
    return result_str

class Coupon():
    def __init__(self, row_idx, row_data):
        self.row_idx = row_idx #record the order related to google sheets
        self.row_data = row_data
        if len(row_data) <= CP_NOTES:   #append column if column shoter
            for i in range(len(row_data), CP_NOTES+1):
                row_data.append('')

    def get_coupon_code(self):
        return self.row_data[CP_COUPON_CODE]

    def set_coupon_code(self, code):
        self.row_data[CP_COUPON_CODE] = code

    def get_date_of_use(self):
        if len(self.row_data[CP_DATE_OF_USE]) > 0:
            return date.fromisoformat(self.row_data[CP_DATE_OF_USE])    

    def set_date_of_use(self, date_of_use):
        if type(date_of_use) is date:
            self.row_data[CP_DATE_OF_USE] = date_of_use.strftime("%Y-%m-%d")
        elif type(date_of_use) is str and date_of_use != '':
            self.row_data[CP_DATE_OF_USE]= date_of_use

    def use_this_coupon(self):
        import datetime
        self.set_date_of_use(datetime.date.today())

    def get_owner(self):
        return self.row_data[CP_OWNER]

    def set_owner(self, owner):
        self.row_data[CP_OWNER] = owner

    def get_expiry_date(self):
        if len(self.row_data[CP_EXPIRY_DATE]) > 0:
            return date.fromisoformat(self.row_data[CP_EXPIRY_DATE])

    def set_expiry_date(self, expiry_date):
        if type(expiry_date) is date:
            self.row_data[CP_EXPIRY_DATE] = expiry_date.strftime("%Y-%m-%d")
        elif type(expiry_date) is str and expiry_date != '':
            self.row_data[CP_EXPIRY_DATE] = expiry_date

    def get_notes(self):
        return self.row_data[CP_NOTES]

    def set_notes(self, notes):
        self.row_data[CP_NOTES] = notes

class CouponTable():
    def __init__(self, creds):
        self.mysheet = GoogleSheetTools(SPREADSHEET_ID, PAGE_NAME + '!' + RANGE_NAME, creds)
        self.rows = self.mysheet.get_data()

    def find_coupon_by_sn(self, sn):
        if self.rows:
            for x in range(1, len(self.rows)):
                y = self.rows[x]
                if y[CP_COUPON_CODE] == sn:
                    result = Coupon(x, y)
                    return result
        return None

    def update_coupon(self, coupon:Coupon):
        row = self.rows[coupon.row_idx]
        value_range_body = {"values": [[row[CP_COUPON_CODE], row[CP_DATE_OF_USE], row[CP_OWNER], row[CP_EXPIRY_DATE], row[CP_NOTES]]]}
        self.mysheet.update_data(PAGE_NAME + '!' + 'R['+str(coupon.row_idx)+']', value_range_body)

    def generate_new_coupon(self):
        last_code = self.rows[-1][0] #last coupon code in rows
        last_number = last_code[0:4]
        new_sn = int(last_number)+1
        new_code = str(new_sn).zfill(4) + random_char(3)
        expiry_date = date.today() + timedelta(days=365)
        expiry_date.strftime("%Y-%m-%d")
        self.rows.append([new_code, '', '', expiry_date.strftime("%Y-%m-%d"), '可抵用主商品100元租金'])
        new_row = self.rows[-1]
        new_coupon = Coupon(len(self.rows)-1, new_row)
        value_range_body = {"values": [[new_row[CP_COUPON_CODE], new_row[CP_DATE_OF_USE], new_row[CP_OWNER], new_row[CP_EXPIRY_DATE], new_row[CP_NOTES]]]}
        self.mysheet.append(value_range_body)
        return new_coupon
 
def main():
    table = CouponTable()
    #old_coupon = table.find_coupon_by_sn("9754JXS")
    #print(old_coupon.get_owner())
    #old_coupon.set_notes('test notes')
    #old_coupon.use_this_coupon()
    #table.update_coupon(old_coupon)
    table.generate_new_coupon()


if __name__ == '__main__':
    main()